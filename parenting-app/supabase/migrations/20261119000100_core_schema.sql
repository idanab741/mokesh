-- =============================================================================
-- Core schema: users, families, children, tracking, health, growth, sharing.
-- All timestamps are stored in UTC (timestamptz). Display timezone is a client concern.
-- =============================================================================

-- ---------- Enums ------------------------------------------------------------
create type public.family_role as enum ('owner', 'parent', 'caregiver', 'relative');
create type public.child_sex as enum ('female', 'male', 'unspecified');
create type public.activity_type as enum ('bottle', 'nursing', 'pumping', 'sleep', 'diaper', 'solids', 'other');
create type public.milestone_domain as enum ('gross_motor', 'fine_motor', 'language', 'social', 'cognitive');
create type public.health_record_type as enum ('symptom', 'vaccination', 'visit_summary', 'note');
create type public.appointment_kind as enum ('tipat_halav', 'pediatrician', 'specialist', 'other');
create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled');

-- ---------- Generic triggers -------------------------------------------------
create function public.tg_touch_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  -- Optimistic concurrency: every server-side update bumps the version.
  if to_jsonb(new) ? 'version' then
    new.version := old.version + 1;
  end if;
  return new;
end $$;

create function public.tg_set_created_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Never trust a client-supplied author. Service-role writes (auth.uid() is null) keep the given value.
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;

-- ---------- Users (profile mirror of auth.users) -----------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  locale text not null default 'he',
  timezone text not null default 'Asia/Jerusalem',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_touch before update on public.users
  for each row execute function public.tg_touch_row();

create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------- Families ---------------------------------------------------------
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger families_touch before update on public.families
  for each row execute function public.tg_touch_row();

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.family_role not null,
  can_edit_tracking boolean not null default false,
  can_view_health boolean not null default false,
  can_edit_health boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id),
  -- Editing health implies viewing it.
  check (not can_edit_health or can_view_health)
);
create index family_members_user_idx on public.family_members (user_id);
create trigger family_members_touch before update on public.family_members
  for each row execute function public.tg_touch_row();

-- ---------- Children ---------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  birth_date date not null check (birth_date <= (now() at time zone 'utc')::date + 1),
  sex public.child_sex not null default 'unspecified',
  gestational_weeks smallint check (gestational_weeks between 22 and 44),
  photo_path text,
  notes text check (char_length(notes) <= 2000),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);
create index children_family_idx on public.children (family_id) where deleted_at is null;
create index children_updated_idx on public.children (family_id, updated_at);
create trigger children_touch before update on public.children
  for each row execute function public.tg_touch_row();
create trigger children_created_by before insert on public.children
  for each row execute function public.tg_set_created_by();

-- ---------- Activity events (central tracking table) -------------------------
create function public.is_valid_activity_payload(p_type public.activity_type, p jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  n numeric;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  case p_type
    when 'bottle' then
      if not (p ->> 'milkType' in ('formula', 'breast_milk')) then return false; end if;
      if jsonb_typeof(p -> 'amountMl') is distinct from 'number' then return false; end if;
      n := (p ->> 'amountMl')::numeric;
      return n > 0 and n <= 500;
    when 'nursing' then
      if jsonb_typeof(p -> 'leftSec') is distinct from 'number'
         or jsonb_typeof(p -> 'rightSec') is distinct from 'number' then return false; end if;
      return (p ->> 'leftSec')::numeric between 0 and 14400
         and (p ->> 'rightSec')::numeric between 0 and 14400;
    when 'pumping' then
      if jsonb_typeof(p -> 'leftMl') is distinct from 'number'
         or jsonb_typeof(p -> 'rightMl') is distinct from 'number' then return false; end if;
      return (p ->> 'leftMl')::numeric between 0 and 1000
         and (p ->> 'rightMl')::numeric between 0 and 1000;
    when 'sleep' then
      return true;
    when 'diaper' then
      return p ->> 'kind' in ('wet', 'dirty', 'both');
    when 'solids' then
      return jsonb_typeof(p -> 'foods') = 'array' and jsonb_array_length(p -> 'foods') <= 30;
    when 'other' then
      return char_length(coalesce(p ->> 'title', '')) between 1 and 80;
  end case;
  return false;
end $$;

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  activity_type public.activity_type not null,
  occurred_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  notes text check (char_length(notes) <= 2000),
  client_event_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  constraint activity_payload_valid check (public.is_valid_activity_payload(activity_type, payload)),
  constraint activity_time_order check (ended_at is null or started_at is null or ended_at >= started_at),
  constraint activity_sleep_has_start check (activity_type <> 'sleep' or started_at is not null),
  constraint activity_not_far_future check (occurred_at <= created_at + interval '1 day'),
  -- Idempotency: a device retrying the same write can never create a duplicate.
  constraint activity_client_event_unique unique (child_id, client_event_id)
);
create index activity_child_time_idx on public.activity_events (child_id, occurred_at desc) where deleted_at is null;
create index activity_child_type_time_idx on public.activity_events (child_id, activity_type, occurred_at desc) where deleted_at is null;
-- Incremental sync cursor (includes soft-deleted rows on purpose).
create index activity_child_updated_idx on public.activity_events (child_id, updated_at);
create trigger activity_touch before update on public.activity_events
  for each row execute function public.tg_touch_row();
create trigger activity_created_by before insert on public.activity_events
  for each row execute function public.tg_set_created_by();

create function public.tg_lock_identity_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.child_id is distinct from old.child_id then
    raise exception 'child_id is immutable' using errcode = '42501';
  end if;
  if to_jsonb(new) ? 'created_by' and (to_jsonb(new) ->> 'created_by') is distinct from (to_jsonb(old) ->> 'created_by')
     and auth.uid() is not null then
    raise exception 'created_by is immutable' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger activity_lock_identity before update on public.activity_events
  for each row execute function public.tg_lock_identity_columns();

-- ---------- Growth -----------------------------------------------------------
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  measured_at date not null,
  weight_g integer check (weight_g between 300 and 40000),
  length_mm integer check (length_mm between 200 and 1400),
  head_circumference_mm integer check (head_circumference_mm between 150 and 700),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  check (weight_g is not null or length_mm is not null or head_circumference_mm is not null)
);
create index measurements_child_idx on public.measurements (child_id, measured_at desc) where deleted_at is null;
create index measurements_child_updated_idx on public.measurements (child_id, updated_at);
create trigger measurements_touch before update on public.measurements for each row execute function public.tg_touch_row();
create trigger measurements_created_by before insert on public.measurements for each row execute function public.tg_set_created_by();
create trigger measurements_lock_identity before update on public.measurements for each row execute function public.tg_lock_identity_columns();

-- ---------- Media (metadata; binaries live in Storage) -----------------------
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  storage_path text not null unique,
  mime_type text not null,
  byte_size integer check (byte_size >= 0),
  is_medical boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index media_assets_child_idx on public.media_assets (child_id);
create trigger media_assets_created_by before insert on public.media_assets for each row execute function public.tg_set_created_by();

-- ---------- Milestones (what a family recorded; the catalog is app content) --
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  catalog_key text,
  domain public.milestone_domain not null,
  title text not null check (char_length(title) between 1 and 160),
  achieved_on date,
  notes text check (char_length(notes) <= 2000),
  media_asset_id uuid references public.media_assets (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);
create unique index milestones_child_catalog_idx on public.milestones (child_id, catalog_key) where catalog_key is not null and deleted_at is null;
create index milestones_child_idx on public.milestones (child_id);
create trigger milestones_touch before update on public.milestones for each row execute function public.tg_touch_row();
create trigger milestones_created_by before insert on public.milestones for each row execute function public.tg_set_created_by();
create trigger milestones_lock_identity before update on public.milestones for each row execute function public.tg_lock_identity_columns();

-- ---------- Health -----------------------------------------------------------
create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  record_type public.health_record_type not null,
  occurred_at timestamptz not null,
  title text check (char_length(title) <= 160),
  temperature_c numeric(3, 1) check (temperature_c between 30 and 45),
  symptoms text[] not null default '{}',
  details jsonb not null default '{}'::jsonb,
  notes text check (char_length(notes) <= 4000),
  media_asset_id uuid references public.media_assets (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);
create index health_records_child_idx on public.health_records (child_id, occurred_at desc) where deleted_at is null;
create trigger health_records_touch before update on public.health_records for each row execute function public.tg_touch_row();
create trigger health_records_created_by before insert on public.health_records for each row execute function public.tg_set_created_by();
create trigger health_records_lock_identity before update on public.health_records for each row execute function public.tg_lock_identity_columns();

-- Medications: everything here is typed by the parent from a clinician's instructions.
-- The system never computes or suggests a dose.
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  instructions text check (char_length(instructions) <= 2000),
  dose_text text check (char_length(dose_text) <= 120),
  prescribed_by text check (char_length(prescribed_by) <= 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);
create index medications_child_idx on public.medications (child_id);
create trigger medications_touch before update on public.medications for each row execute function public.tg_touch_row();
create trigger medications_created_by before insert on public.medications for each row execute function public.tg_set_created_by();
create trigger medications_lock_identity before update on public.medications for each row execute function public.tg_lock_identity_columns();

create table public.medication_administrations (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  given_at timestamptz not null,
  dose_text text check (char_length(dose_text) <= 120),
  notes text check (char_length(notes) <= 1000),
  client_event_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1,
  unique (child_id, client_event_id)
);
create index med_admin_child_idx on public.medication_administrations (child_id, given_at desc);
create trigger med_admin_touch before update on public.medication_administrations for each row execute function public.tg_touch_row();
create trigger med_admin_created_by before insert on public.medication_administrations for each row execute function public.tg_set_created_by();
create trigger med_admin_lock_identity before update on public.medication_administrations for each row execute function public.tg_lock_identity_columns();

create function public.tg_med_admin_same_child() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.medications m where m.id = new.medication_id and m.child_id = new.child_id) then
    raise exception 'medication does not belong to this child' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger med_admin_same_child before insert or update on public.medication_administrations
  for each row execute function public.tg_med_admin_same_child();

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  kind public.appointment_kind not null,
  title text not null check (char_length(title) between 1 and 160),
  scheduled_at timestamptz not null,
  location text check (char_length(location) <= 200),
  status public.appointment_status not null default 'scheduled',
  summary text check (char_length(summary) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);
create index appointments_child_idx on public.appointments (child_id, scheduled_at);
create trigger appointments_touch before update on public.appointments for each row execute function public.tg_touch_row();
create trigger appointments_created_by before insert on public.appointments for each row execute function public.tg_set_created_by();
create trigger appointments_lock_identity before update on public.appointments for each row execute function public.tg_lock_identity_columns();

-- ---------- Reminders & notification preferences -----------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('medication', 'appointment', 'feeding', 'custom')),
  title text not null check (char_length(title) between 1 and 160),
  remind_at timestamptz not null,
  repeat_rule text check (char_length(repeat_rule) <= 200),
  ref_table text check (ref_table in ('medications', 'appointments')),
  ref_id uuid,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_user_idx on public.reminders (user_id, remind_at) where is_enabled;
create trigger reminders_touch before update on public.reminders for each row execute function public.tg_touch_row();

create table public.notification_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  push_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  categories jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Invitations ------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  invited_by uuid references public.users (id) on delete set null,
  role public.family_role not null check (role <> 'owner'),
  can_edit_tracking boolean not null default false,
  can_view_health boolean not null default false,
  can_edit_health boolean not null default false,
  -- Only the SHA-256 of the token is stored; the token itself is shown once to the inviter.
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references public.users (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (not can_edit_health or can_view_health)
);
create index invitations_family_idx on public.invitations (family_id);

-- ---------- Audit log & consents --------------------------------------------
-- The audit log stores who/what/when only. No payloads, no child data.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  family_id uuid references public.families (id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index audit_logs_family_idx on public.audit_logs (family_id, created_at desc);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'ai_processing', 'analytics')),
  document_version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, consent_type, created_at desc);
