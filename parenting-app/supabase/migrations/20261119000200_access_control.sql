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
