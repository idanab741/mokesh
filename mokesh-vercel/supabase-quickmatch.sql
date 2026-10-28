-- משחק מהיר עם אנשים מהרשת: תור המתנה + שיבוץ לחדר, ודיווחים על שחקנים
-- להרצה פעם אחת ב-Supabase: SQL Editor ← New query ← הדבקה ← Run
create table if not exists public.mokesh_queue (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,40}$'),
  name text not null check (char_length(name) between 1 and 16),
  avatar text not null check (avatar ~ '^[a-z0-9]{1,8}$'),
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  room text,
  is_host boolean not null default false,
  members jsonb
);
alter table public.mokesh_queue enable row level security;

create table if not exists public.mokesh_reports (
  id bigint generated always as identity primary key,
  reporter text not null check (char_length(reporter) <= 40),
  target text not null check (char_length(target) <= 40),
  target_name text check (char_length(target_name) <= 16),
  room text check (char_length(room) <= 12),
  reason text check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);
alter table public.mokesh_reports enable row level security;
drop policy if exists mokesh_reports_insert on public.mokesh_reports;
create policy mokesh_reports_insert on public.mokesh_reports for insert to anon, authenticated with check (true);

create or replace function public.mokesh_match(p_id text, p_name text, p_avatar text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.mokesh_queue; grp text[]; n int; oldest timestamptz; new_code text; mem jsonb; waiting int;
begin
  if p_id !~ '^[A-Za-z0-9_-]{1,40}$' then return jsonb_build_object('error','id'); end if;
  perform pg_advisory_xact_lock(424242);
  delete from public.mokesh_queue where (room is null and last_seen < now() - interval '12 seconds') or joined_at < now() - interval '30 minutes';
  insert into public.mokesh_queue(id, name, avatar) values (p_id, left(coalesce(nullif(trim(p_name),''),'שחקן'),16), case when p_avatar ~ '^[a-z0-9]{1,8}$' then p_avatar else 'u1' end)
    on conflict (id) do update set last_seen = now(), name = excluded.name, avatar = excluded.avatar;
  select * into me from public.mokesh_queue where id = p_id;
  if me.room is not null then return jsonb_build_object('room', me.room, 'host', me.is_host, 'members', me.members); end if;
  select array_agg(w.id order by w.joined_at), count(*), min(w.joined_at) into grp, n, oldest
    from (select q.id, q.joined_at from public.mokesh_queue q where q.room is null order by q.joined_at limit 6) w;
  if n >= 6 or (n >= 1 and oldest <= now() - interval '40 seconds') then
    loop
      new_code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '') from generate_series(1,6));
      exit when not exists (select 1 from public.mokesh_rooms r where r.code = new_code) and not exists (select 1 from public.mokesh_queue q where q.room = new_code);
    end loop;
    select jsonb_agg(jsonb_build_object('id', q.id, 'name', q.name, 'avatar', q.avatar) order by array_position(grp, q.id)) into mem from public.mokesh_queue q where q.id = any(grp);
    update public.mokesh_queue set room = new_code, is_host = (id = grp[1]), members = mem where id = any(grp);
    select * into me from public.mokesh_queue where id = p_id;
    if me.room is not null then return jsonb_build_object('room', me.room, 'host', me.is_host, 'members', me.members); end if;
  end if;
  select count(*) into waiting from public.mokesh_queue where room is null;
  return jsonb_build_object('waiting', waiting, 'since', me.joined_at, 'now', now());
end $$;

create or replace function public.mokesh_unqueue(p_id text) returns void
language sql security definer set search_path = public as $$ delete from public.mokesh_queue where id = p_id; $$;

revoke all on function public.mokesh_match(text,text,text) from public;
revoke all on function public.mokesh_unqueue(text) from public;
grant execute on function public.mokesh_match(text,text,text) to anon, authenticated;
grant execute on function public.mokesh_unqueue(text) to anon, authenticated;
