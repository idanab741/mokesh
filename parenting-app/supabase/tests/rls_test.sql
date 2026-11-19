-- RLS / permission tests. Each check raises on failure, so psql -v ON_ERROR_STOP=1 fails the run.
\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------- helpers ----------------------------------------------------------
create schema if not exists t;
grant usage on schema t to authenticated, anon;
create or replace function t.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
end $$;
create or replace function t.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'FAILED: %', p_name; end if;
  raise notice 'ok - %', p_name;
end $$;
-- Runs a statement and reports whether it was rejected (any error or zero affected rows).
create or replace function t.rejected(p_sql text) returns boolean language plpgsql as $$
declare n bigint;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    return n = 0;
  exception when others then
    return true;
  end;
end $$;
grant execute on all functions in schema t to authenticated, anon;

-- ---------- fixtures (as superuser) ------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'parent-a@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'caregiver-a@test.local'),
  ('00000000-0000-0000-0000-00000000000d', 'relative-a@test.local'),
  ('00000000-0000-0000-0000-00000000000e', 'owner-b@test.local');
select t.ok((select count(*) = 5 from public.users), 'auth trigger mirrors users into public.users');

create table t.ctx (k text primary key, v text);
grant select, insert, update on t.ctx to authenticated;

-- ---------- family A: owner creates family, child, invitations ----------------
set role authenticated;
select t.login('00000000-0000-0000-0000-00000000000a');
insert into t.ctx values ('fam_a', public.create_family('משפחה א')::text);
insert into public.children (id, family_id, name, birth_date, created_by)
  values ('10000000-0000-0000-0000-00000000000a', (select v::uuid from t.ctx where k = 'fam_a'), 'עלמה', current_date - 180,
          '00000000-0000-0000-0000-00000000000e');
select t.ok((select created_by = '00000000-0000-0000-0000-00000000000a' from public.children where id = '10000000-0000-0000-0000-00000000000a'),
            'created_by is forced to the caller, not the client-supplied value');

insert into t.ctx values ('tok_parent', public.create_invitation((select v::uuid from t.ctx where k = 'fam_a'), 'parent'));
insert into t.ctx values ('tok_caregiver', public.create_invitation((select v::uuid from t.ctx where k = 'fam_a'), 'caregiver'));
insert into t.ctx values ('tok_relative', public.create_invitation((select v::uuid from t.ctx where k = 'fam_a'), 'relative'));
insert into t.ctx values ('tok_revoked', public.create_invitation((select v::uuid from t.ctx where k = 'fam_a'), 'parent'));
select t.ok(t.rejected($$select public.create_invitation((select v::uuid from t.ctx where k = 'fam_a'), 'owner')$$), 'cannot invite an owner');

-- Owner writes tracking + health data.
insert into public.activity_events (id, child_id, activity_type, occurred_at, payload, client_event_id)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', 'bottle', now(),
          '{"milkType":"formula","amountMl":120}', '20000000-0000-0000-0000-000000000001');
insert into public.health_records (child_id, record_type, occurred_at, temperature_c)
  values ('10000000-0000-0000-0000-00000000000a', 'symptom', now(), 38.2);
insert into public.measurements (child_id, measured_at, weight_g)
  values ('10000000-0000-0000-0000-00000000000a', current_date, 7200);
insert into public.medications (id, child_id, name)
  values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', 'תרופה לבדיקה');

-- Payload validation & idempotency
select t.ok(t.rejected($$insert into public.activity_events (child_id, activity_type, occurred_at, payload, client_event_id)
  values ('10000000-0000-0000-0000-00000000000a', 'bottle', now(), '{"milkType":"formula","amountMl":-5}', gen_random_uuid())$$),
  'negative bottle amount is rejected by the database');
select t.ok(t.rejected($$insert into public.activity_events (child_id, activity_type, occurred_at, payload, client_event_id)
  values ('10000000-0000-0000-0000-00000000000a', 'diaper', now(), '{"kind":"unknown"}', gen_random_uuid())$$),
  'invalid diaper kind is rejected');
select t.ok(t.rejected($$insert into public.activity_events (child_id, activity_type, occurred_at, payload, client_event_id)
  values ('10000000-0000-0000-0000-00000000000a', 'bottle', now(), '{"milkType":"formula","amountMl":120}', '20000000-0000-0000-0000-000000000001')$$),
  'same client_event_id cannot create a duplicate event');
select t.ok(t.rejected($$insert into public.activity_events (child_id, activity_type, occurred_at, started_at, ended_at, payload, client_event_id)
  values ('10000000-0000-0000-0000-00000000000a', 'sleep', now(), now(), now() - interval '1 hour', '{}', gen_random_uuid())$$),
  'sleep cannot end before it starts');

-- Version bump on update (optimistic concurrency)
update public.activity_events set payload = '{"milkType":"formula","amountMl":150}' where id = '20000000-0000-0000-0000-000000000001' and version = 1;
select t.ok((select version = 2 from public.activity_events where id = '20000000-0000-0000-0000-000000000001'), 'update bumps version');
select t.ok(t.rejected($$update public.activity_events set notes = 'stale' where id = '20000000-0000-0000-0000-000000000001' and version = 1$$),
  'stale-version update affects no rows');
select t.ok(t.rejected($$delete from public.activity_events where id = '20000000-0000-0000-0000-000000000001'$$), 'hard delete of events is not allowed');

-- Revoke one invitation
reset role;
insert into t.ctx select 'inv_revoked', id::text from public.invitations
 where token_hash = encode(sha256(convert_to((select v from t.ctx where k = 'tok_revoked'), 'UTF8')), 'hex');
set role authenticated;
select t.ok(t.rejected($$select token_hash from public.invitations$$), 'token hashes are not readable by clients');
select public.revoke_invitation((select v::uuid from t.ctx where k = 'inv_revoked'));

-- ---------- members join -------------------------------------------------------
select t.login('00000000-0000-0000-0000-00000000000b');
select public.accept_invitation((select v from t.ctx where k = 'tok_parent'));
select t.ok(t.rejected($$select public.accept_invitation((select v from t.ctx where k = 'tok_parent'))$$), 'an invitation can be used once');
select t.login('00000000-0000-0000-0000-00000000000c');
select public.accept_invitation((select v from t.ctx where k = 'tok_caregiver'));
select t.login('00000000-0000-0000-0000-00000000000d');
select public.accept_invitation((select v from t.ctx where k = 'tok_relative'));
select t.ok(t.rejected($$select public.accept_invitation('not-a-real-token')$$), 'unknown token is rejected');

-- ---------- second parent ------------------------------------------------------
select t.login('00000000-0000-0000-0000-00000000000b');
select t.ok((select count(*) = 1 from public.activity_events), 'second parent sees the same activity');
select t.ok((select count(*) = 1 from public.health_records), 'second parent sees health records');
insert into public.activity_events (child_id, activity_type, occurred_at, payload, client_event_id)
  values ('10000000-0000-0000-0000-00000000000a', 'diaper', now(), '{"kind":"wet"}', gen_random_uuid());
select t.ok((select count(*) = 1 from public.activity_events where created_by = '00000000-0000-0000-0000-00000000000b'), 'events record who created them');
select t.ok(t.rejected($$update public.family_members set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000000b'$$), 'a parent cannot promote themselves');
select t.ok(t.rejected($$select public.create_invitation((select v::uuid from t.ctx where k = 'fam_a'), 'relative')$$), 'a non-owner cannot invite');
select t.ok(t.rejected($$update public.activity_events set child_id = gen_random_uuid() where id = '20000000-0000-0000-0000-000000000001'$$), 'child_id of an event is immutable');

-- ---------- caregiver: tracking yes, health no ----------------------------------
select t.login('00000000-0000-0000-0000-00000000000c');
select t.ok((select count(*) = 2 from public.activity_events), 'caregiver reads tracking events');
insert into public.activity_events (child_id, activity_type, occurred_at, payload, client_event_id)
  values ('10000000-0000-0000-0000-00000000000a', 'diaper', now(), '{"kind":"both"}', gen_random_uuid());
select t.ok((select count(*) = 3 from public.activity_events), 'caregiver can log tracking events');
select t.ok((select count(*) = 0 from public.health_records), 'caregiver cannot read health records');
select t.ok((select count(*) = 0 from public.measurements), 'caregiver cannot read measurements');
select t.ok((select count(*) = 0 from public.medications), 'caregiver cannot read medications');
select t.ok(t.rejected($$insert into public.health_records (child_id, record_type, occurred_at) values ('10000000-0000-0000-0000-00000000000a', 'note', now())$$), 'caregiver cannot write health records');
select t.ok(t.rejected($$insert into public.medication_administrations (medication_id, child_id, given_at, client_event_id) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', now(), gen_random_uuid())$$), 'caregiver cannot log medication');
select t.ok(t.rejected($$update public.children set name = 'x' where id = '10000000-0000-0000-0000-00000000000a'$$), 'caregiver cannot edit the child profile');
select t.ok(t.rejected($$update public.family_members set can_view_health = true where user_id = '00000000-0000-0000-0000-00000000000c'$$), 'caregiver cannot grant themselves health access');
select t.ok((select count(*) = 0 from public.audit_logs), 'caregiver cannot read the audit log');

-- ---------- relative: read-only -------------------------------------------------
select t.login('00000000-0000-0000-0000-00000000000d');
select t.ok((select count(*) = 3 from public.activity_events), 'relative reads tracking events');
select t.ok(t.rejected($$insert into public.activity_events (child_id, activity_type, occurred_at, payload, client_event_id) values ('10000000-0000-0000-0000-00000000000a', 'diaper', now(), '{"kind":"wet"}', gen_random_uuid())$$), 'relative cannot log events');
select t.ok(t.rejected($$update public.activity_events set notes = 'x' where id = '20000000-0000-0000-0000-000000000001'$$), 'relative cannot edit events');
select t.ok((select count(*) = 0 from public.health_records), 'relative cannot read health records');

-- ---------- another family: full isolation ----------------------------------------
select t.login('00000000-0000-0000-0000-00000000000e');
insert into t.ctx values ('fam_b', public.create_family('משפחה ב')::text);
select t.ok((select count(*) = 1 from public.families), 'family B sees only itself');
select t.ok((select count(*) = 0 from public.children), 'family B cannot see family A children');
select t.ok((select count(*) = 0 from public.activity_events), 'family B cannot see family A events');
select t.ok((select count(*) = 0 from public.health_records), 'family B cannot see family A health records');
select t.ok((select count(*) = 1 from public.family_members), 'family B cannot list family A members');
select t.ok((select count(*) = 1 from public.users), 'family B cannot see family A user profiles');
select t.ok(t.rejected($$insert into public.activity_events (child_id, activity_type, occurred_at, payload, client_event_id) values ('10000000-0000-0000-0000-00000000000a', 'diaper', now(), '{"kind":"wet"}', gen_random_uuid())$$), 'family B cannot write into family A child');
select t.ok(t.rejected($$insert into public.children (family_id, name, birth_date) values ((select v::uuid from t.ctx where k = 'fam_a'), 'x', current_date)$$), 'family B cannot add a child to family A');
select t.ok(t.rejected($$update public.children set name = 'hacked' where id = '10000000-0000-0000-0000-00000000000a'$$), 'family B cannot edit family A child');
select t.ok(t.rejected($$select public.accept_invitation((select v from t.ctx where k = 'tok_revoked'))$$), 'a revoked invitation cannot be accepted');
select t.ok(t.rejected($$insert into public.family_members (family_id, user_id, role) values ((select v::uuid from t.ctx where k = 'fam_a'), '00000000-0000-0000-0000-00000000000e', 'owner')$$), 'cannot insert a membership directly');

-- ---------- anonymous: nothing -----------------------------------------------------
reset role; set role anon;
select t.login(null);
select t.ok(t.rejected($$select count(*) from public.children having count(*) >= 0$$), 'anon has no access to children');
select t.ok(t.rejected($$select public.create_family('x')$$), 'anon cannot create a family');

-- ---------- owner management --------------------------------------------------------
reset role; set role authenticated;
select t.login('00000000-0000-0000-0000-00000000000a');
select t.ok((select count(*) = 4 from public.family_members), 'owner sees all four members');
select t.ok((select count(*) = 4 from public.users), 'members can see each other''s profiles');
update public.family_members set can_view_health = true where user_id = '00000000-0000-0000-0000-00000000000c';
select t.login('00000000-0000-0000-0000-00000000000c');
select t.ok((select count(*) = 1 from public.health_records), 'caregiver reads health only after the owner grants it');
select t.login('00000000-0000-0000-0000-00000000000a');
delete from public.family_members where user_id = '00000000-0000-0000-0000-00000000000d';
select t.login('00000000-0000-0000-0000-00000000000d');
select t.ok((select count(*) = 0 from public.activity_events), 'a removed member loses access immediately');
select t.login('00000000-0000-0000-0000-00000000000a');
select t.ok(t.rejected($$delete from public.family_members where user_id = '00000000-0000-0000-0000-00000000000a'$$), 'the last owner cannot leave');
select t.ok(t.rejected($$select public.delete_my_data()$$), 'sole owner with other members must hand over before deleting the account');
select t.ok((select count(*) >= 5 from public.audit_logs), 'membership changes are audited');

-- ---------- account deletion ---------------------------------------------------------
select t.login('00000000-0000-0000-0000-00000000000e');
select public.delete_my_data();
reset role;
select t.ok((select count(*) = 0 from public.families where id = (select v::uuid from t.ctx where k = 'fam_b')), 'deleting a sole-member account removes its family');
select t.ok((select count(*) = 0 from public.users where id = '00000000-0000-0000-0000-00000000000e'), 'deleting an account removes the profile');
select t.ok((select count(*) = 1 from public.children), 'other families are untouched by account deletion');

\echo ALL RLS TESTS PASSED
