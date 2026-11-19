-- Parenting app on a database SHARED with another product (temporary test setup).
-- Generated from migrations 000100 + 000200. Differences from a dedicated project:
--   * runs as ONE transaction, so no table ever exists without RLS
--   * does not install the trigger on auth.users (the other product's sign-up is untouched)
--   * storage migration (000300) is not included
-- NOTE: on the MOKESH project this was applied through the Supabase MCP in four steps and
--   WITHOUT delete_my_data() (the account-deletion function), which is deferred to the
--   dedicated project. Everything else below is what is installed there.
-- Paste into Supabase > SQL Editor and Run. To undo: run teardown.sql.
begin;

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
exception when others then
  -- A profile row is a convenience; it must never be able to block a sign-up.
  -- create_family() and accept_invitation() create the row on demand anyway.
  return new;
end $$;
-- (shared project: the auth.users trigger is intentionally NOT installed)

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

-- =============================================================================
-- Access control: helper functions, RPCs and Row Level Security for every table.
-- Rule of thumb: the UI hides what a role cannot do, but THIS file is what enforces it.
-- =============================================================================

-- ---------- Permission helpers ----------------------------------------------
-- SECURITY DEFINER so policies on family_members can call them without recursion.
create function public.is_family_member(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m
                 where m.family_id = p_family and m.user_id = auth.uid());
$$;

create function public.is_family_owner(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m
                 where m.family_id = p_family and m.user_id = auth.uid() and m.role = 'owner');
$$;

create function public.shares_family_with(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members me
                 join public.family_members other on other.family_id = me.family_id
                 where me.user_id = auth.uid() and other.user_id = p_user);
$$;

create function public.can_read_child(p_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.children c
                 join public.family_members m on m.family_id = c.family_id
                 where c.id = p_child and m.user_id = auth.uid());
$$;

create function public.can_write_tracking(p_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.children c
                 join public.family_members m on m.family_id = c.family_id
                 where c.id = p_child and m.user_id = auth.uid() and m.can_edit_tracking);
$$;

create function public.can_read_health(p_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.children c
                 join public.family_members m on m.family_id = c.family_id
                 where c.id = p_child and m.user_id = auth.uid() and m.can_view_health);
$$;

create function public.can_write_health(p_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.children c
                 join public.family_members m on m.family_id = c.family_id
                 where c.id = p_child and m.user_id = auth.uid() and m.can_edit_health);
$$;

create function public.can_manage_children(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m
                 where m.family_id = p_family and m.user_id = auth.uid()
                   and m.role in ('owner', 'parent'));
$$;

-- ---------- Audit helper -----------------------------------------------------
create function public.write_audit(p_family uuid, p_action text, p_entity text, p_entity_id uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (family_id, actor_id, action, entity, entity_id)
  values (p_family, auth.uid(), p_action, p_entity, p_entity_id);
$$;
revoke all on function public.write_audit(uuid, text, text, uuid) from public, anon, authenticated;

create function public.tg_audit_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    -- Skip when the whole family is being removed (the audit row would have nothing to point at).
    if exists (select 1 from public.families f where f.id = old.family_id) then
      perform public.write_audit(old.family_id, 'member_removed', 'family_members', old.id);
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    perform public.write_audit(new.family_id, 'member_permissions_changed', 'family_members', new.id);
  else
    perform public.write_audit(new.family_id, 'member_added', 'family_members', new.id);
  end if;
  return new;
end $$;
create trigger family_members_audit after insert or update or delete on public.family_members
  for each row execute function public.tg_audit_membership();

-- A family must always keep at least one owner.
create function public.tg_protect_last_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from public.families f where f.id = old.family_id)
     and not exists (select 1 from public.family_members m
                     where m.family_id = old.family_id and m.role = 'owner' and m.id <> old.id) then
    raise exception 'a family must keep at least one owner' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.family_id <> old.family_id or new.user_id <> old.user_id then
    raise exception 'membership identity is immutable' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger family_members_protect_owner before update or delete on public.family_members
  for each row execute function public.tg_protect_last_owner();

-- ---------- RPC: create a family and become its owner ------------------------
create function public.create_family(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_family uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.users (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.families (name, created_by) values (p_name, auth.uid()) returning id into v_family;
  insert into public.family_members (family_id, user_id, role, can_edit_tracking, can_view_health, can_edit_health)
  values (v_family, auth.uid(), 'owner', true, true, true);
  return v_family;
end $$;

-- ---------- RPC: invitations --------------------------------------------------
-- Role defaults (least privilege). An owner may widen or narrow them per invitation.
--   parent    : edit tracking, view + edit health
--   caregiver : edit tracking, no health
--   relative  : read-only tracking, no health
create function public.create_invitation(
  p_family uuid,
  p_role public.family_role,
  p_can_edit_tracking boolean default null,
  p_can_view_health boolean default null,
  p_can_edit_health boolean default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_family_owner(p_family) then
    raise exception 'only a family owner can invite' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'cannot invite an owner' using errcode = '22023';
  end if;
  insert into public.invitations (family_id, invited_by, role, can_edit_tracking, can_view_health, can_edit_health, token_hash)
  values (
    p_family, auth.uid(), p_role,
    coalesce(p_can_edit_tracking, p_role in ('parent', 'caregiver')),
    coalesce(p_can_view_health, p_role = 'parent'),
    coalesce(p_can_edit_health, p_role = 'parent'),
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex')
  );
  perform public.write_audit(p_family, 'invitation_created', 'invitations', null);
  return v_token;
end $$;

create function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select * into v_inv from public.invitations i
   where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;
  -- One generic error for every failure mode, so tokens cannot be probed.
  if not found or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    raise exception 'invitation is not valid' using errcode = '22023';
  end if;
  insert into public.users (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.family_members (family_id, user_id, role, can_edit_tracking, can_view_health, can_edit_health)
  values (v_inv.family_id, auth.uid(), v_inv.role, v_inv.can_edit_tracking, v_inv.can_view_health, v_inv.can_edit_health)
  on conflict (family_id, user_id) do nothing;
  update public.invitations set accepted_by = auth.uid(), accepted_at = now() where id = v_inv.id;
  return v_inv.family_id;
end $$;

create function public.revoke_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_family uuid;
begin
  select family_id into v_family from public.invitations where id = p_invitation;
  if v_family is null or not public.is_family_owner(v_family) then
    raise exception 'only a family owner can revoke' using errcode = '42501';
  end if;
  update public.invitations set revoked_at = now()
   where id = p_invitation and accepted_at is null and revoked_at is null;
  perform public.write_audit(v_family, 'invitation_revoked', 'invitations', p_invitation);
end $$;

-- ---------- RPC: erase my data -------------------------------------------------
-- Removes the caller's profile and memberships. Families where the caller is the only
-- member are deleted with all of their children's data (FK cascade). If the caller is
-- the only owner of a family that still has other members, ownership must be handed
-- over first. Deleting the auth identity itself requires the service role and is done
-- by the `delete-account` edge function after this succeeds.
create function public.delete_my_data() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if exists (
    select 1 from public.family_members me
    where me.user_id = v_uid and me.role = 'owner'
      and exists (select 1 from public.family_members o where o.family_id = me.family_id and o.user_id <> v_uid)
      and not exists (select 1 from public.family_members o where o.family_id = me.family_id and o.user_id <> v_uid and o.role = 'owner')
  ) then
    raise exception 'transfer ownership before deleting your account' using errcode = '23514';
  end if;
  delete from public.families f
   where exists (select 1 from public.family_members m where m.family_id = f.id and m.user_id = v_uid)
     and not exists (select 1 from public.family_members m where m.family_id = f.id and m.user_id <> v_uid);
  delete from public.family_members where user_id = v_uid;
  delete from public.users where id = v_uid;
end $$;

revoke all on function public.create_family(text) from public, anon;
revoke all on function public.create_invitation(uuid, public.family_role, boolean, boolean, boolean) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.revoke_invitation(uuid) from public, anon;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.create_invitation(uuid, public.family_role, boolean, boolean, boolean) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.delete_my_data() to authenticated;

-- ---------- Enable RLS everywhere --------------------------------------------
alter table public.users enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.activity_events enable row level security;
alter table public.measurements enable row level security;
alter table public.milestones enable row level security;
alter table public.health_records enable row level security;
alter table public.medications enable row level security;
alter table public.medication_administrations enable row level security;
alter table public.appointments enable row level security;
alter table public.reminders enable row level security;
alter table public.media_assets enable row level security;
alter table public.invitations enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs enable row level security;
alter table public.consents enable row level security;

-- Nothing for anonymous visitors. Signed-in users get table privileges; RLS narrows rows.
-- The tables are listed explicitly: this project may share a database with another
-- product, and a blanket "all tables in schema public" would change that product's access.
do $$
declare
  t text;
begin
  foreach t in array array['users', 'families', 'family_members', 'children', 'activity_events', 'measurements',
                           'milestones', 'health_records', 'medications', 'medication_administrations',
                           'appointments', 'reminders', 'media_assets', 'invitations',
                           'notification_preferences', 'audit_logs', 'consents'] loop
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.invitations from authenticated;   -- RPC only
revoke insert on public.family_members from authenticated;                -- RPC only
revoke insert, delete on public.families from authenticated;              -- RPC only
revoke update, delete on public.consents from authenticated;              -- append-only

-- ---------- users ------------------------------------------------------------
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or public.shares_family_with(id));
create policy users_insert_self on public.users for insert to authenticated
  with check (id = auth.uid());
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- families / members -----------------------------------------------
create policy families_select on public.families for select to authenticated
  using (public.is_family_member(id));
create policy families_update on public.families for update to authenticated
  using (public.is_family_owner(id)) with check (public.is_family_owner(id));

create policy members_select on public.family_members for select to authenticated
  using (public.is_family_member(family_id));
create policy members_update on public.family_members for update to authenticated
  using (public.is_family_owner(family_id)) with check (public.is_family_owner(family_id));
-- Owners remove members; anyone may leave (the last-owner trigger still applies).
create policy members_delete on public.family_members for delete to authenticated
  using (public.is_family_owner(family_id) or user_id = auth.uid());

-- ---------- children ---------------------------------------------------------
create policy children_select on public.children for select to authenticated
  using (public.is_family_member(family_id));
create policy children_insert on public.children for insert to authenticated
  with check (public.can_manage_children(family_id));
create policy children_update on public.children for update to authenticated
  using (public.can_manage_children(family_id)) with check (public.can_manage_children(family_id));
create policy children_delete on public.children for delete to authenticated
  using (public.is_family_owner(family_id));

-- ---------- activity events (daily tracking) ----------------------------------
create policy activity_select on public.activity_events for select to authenticated
  using (public.can_read_child(child_id));
create policy activity_insert on public.activity_events for insert to authenticated
  with check (public.can_write_tracking(child_id));
create policy activity_update on public.activity_events for update to authenticated
  using (public.can_write_tracking(child_id)) with check (public.can_write_tracking(child_id));
-- No hard deletes from clients: deletion is a soft delete (UPDATE deleted_at) so it can sync.

-- ---------- health-gated tables ------------------------------------------------
-- Growth, milestones, health records, medications and appointments are all private by
-- default: only members with can_view_health may read, can_edit_health may write.
do $$
declare
  t text;
begin
  foreach t in array array['measurements', 'milestones', 'health_records', 'medications',
                           'medication_administrations', 'appointments'] loop
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (public.can_read_health(child_id))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.can_write_health(child_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (public.can_write_health(child_id)) with check (public.can_write_health(child_id))', t);
  end loop;
end $$;

-- ---------- media ------------------------------------------------------------
create policy media_select on public.media_assets for select to authenticated
  using (public.is_family_member(family_id)
         and (not is_medical or (child_id is not null and public.can_read_health(child_id))));
create policy media_insert on public.media_assets for insert to authenticated
  with check (
    public.is_family_member(family_id)
    and (child_id is null or exists (select 1 from public.children c where c.id = child_id and c.family_id = media_assets.family_id))
    and case when is_medical then child_id is not null and public.can_write_health(child_id)
             else child_id is null or public.can_write_tracking(child_id) end
  );
create policy media_delete on public.media_assets for delete to authenticated
  using (created_by = auth.uid() or public.is_family_owner(family_id));

-- ---------- reminders / preferences / consents (personal) ----------------------
create policy reminders_all on public.reminders for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_family_member(family_id)
              and (child_id is null or public.can_read_child(child_id)));
create policy notif_prefs_all on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy consents_select on public.consents for select to authenticated
  using (user_id = auth.uid());
create policy consents_insert on public.consents for insert to authenticated
  with check (user_id = auth.uid());

-- ---------- invitations / audit (owners read; writes go through RPCs) ----------
create policy invitations_select on public.invitations for select to authenticated
  using (public.is_family_owner(family_id));
create policy audit_select on public.audit_logs for select to authenticated
  using (family_id is not null and public.is_family_owner(family_id));
-- token_hash is useless without the token, but there is no reason to expose it either.
revoke select on public.invitations from authenticated;
grant select (id, family_id, invited_by, role, can_edit_tracking, can_view_health, can_edit_health,
              expires_at, accepted_by, accepted_at, revoked_at, created_at)
  on public.invitations to authenticated;

commit;
