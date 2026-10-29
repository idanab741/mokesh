-- מוקש! — הסכמה המלאה של פרויקט ה-Supabase של מוקש (tbnhqvabnzuxaxtrlmkg, ארגון BOX2.0)
-- להקמה מחדש: Supabase ← SQL Editor ← New query ← הדבקה ← Run

-- ===== חדרי משחק =====
create table if not exists public.mokesh_rooms (code text primary key, state jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.mokesh_inbox (id text primary key, code text not null references public.mokesh_rooms(code) on delete cascade, action jsonb not null, at timestamptz not null default now());
create index if not exists mokesh_inbox_code_at on public.mokesh_inbox(code, at);
alter table public.mokesh_rooms enable row level security;
alter table public.mokesh_inbox enable row level security;
create policy mokesh_rooms_all on public.mokesh_rooms for all to anon, authenticated using (true) with check (true);
create policy mokesh_inbox_all on public.mokesh_inbox for all to anon, authenticated using (true) with check (true);
create or replace function public.mokesh_cleanup() returns void language sql security definer set search_path = public as $$
  delete from public.mokesh_rooms where updated_at < now() - interval '6 hours'; $$;
grant execute on function public.mokesh_cleanup() to anon, authenticated;

-- ===== פרופילים, חברים, הזמנות =====
create table if not exists public.mokesh_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'שחקן' check (char_length(name) between 1 and 16),
  avatar text not null default 'u1' check (avatar ~ '^[a-z0-9]{1,8}$'),
  friend_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  stats jsonb not null default '{"games":0,"wins":0,"correct":0,"traps":0,"mvp":0}'::jsonb,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now());
create table if not exists public.mokesh_friends (
  a uuid not null references public.mokesh_profiles(id) on delete cascade,
  b uuid not null references public.mokesh_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  requested_by uuid not null, created_at timestamptz not null default now(),
  primary key (a, b), check (a < b), check (requested_by = a or requested_by = b));
create index if not exists mokesh_friends_b on public.mokesh_friends(b);
create table if not exists public.mokesh_invites (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.mokesh_profiles(id) on delete cascade,
  to_id uuid not null references public.mokesh_profiles(id) on delete cascade,
  room text not null check (char_length(room) <= 12), created_at timestamptz not null default now());
create index if not exists mokesh_invites_to on public.mokesh_invites(to_id, created_at);
alter table public.mokesh_profiles enable row level security;
alter table public.mokesh_friends enable row level security;
alter table public.mokesh_invites enable row level security;
create policy mokesh_profiles_read on public.mokesh_profiles for select to authenticated using (true);
create policy mokesh_profiles_insert on public.mokesh_profiles for insert to authenticated with check (id = (select auth.uid()));
create policy mokesh_profiles_update on public.mokesh_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update on public.mokesh_profiles from anon, authenticated;
grant insert (id, name, avatar) on public.mokesh_profiles to authenticated;
grant update (name, avatar, last_seen) on public.mokesh_profiles to authenticated;
create policy mokesh_friends_read on public.mokesh_friends for select to authenticated using ((select auth.uid()) in (a, b));
create policy mokesh_friends_delete on public.mokesh_friends for delete to authenticated using ((select auth.uid()) in (a, b));
create policy mokesh_invites_read on public.mokesh_invites for select to authenticated using ((select auth.uid()) in (from_id, to_id));
create policy mokesh_invites_insert on public.mokesh_invites for insert to authenticated with check (
  from_id = (select auth.uid()) and exists (select 1 from public.mokesh_friends f where f.status = 'accepted' and f.a = least(from_id, to_id) and f.b = greatest(from_id, to_id)));
create policy mokesh_invites_delete on public.mokesh_invites for delete to authenticated using ((select auth.uid()) in (from_id, to_id));

create or replace function public.mokesh_add_friend(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other uuid; x uuid; y uuid; cur public.mokesh_friends;
begin
  if me is null then return 'auth'; end if;
  select id into other from public.mokesh_profiles where friend_code = upper(trim(p_code));
  if other is null then return 'not_found'; end if;
  if other = me then return 'self'; end if;
  x := least(me, other); y := greatest(me, other);
  select * into cur from public.mokesh_friends where a = x and b = y;
  if cur.a is null then insert into public.mokesh_friends(a, b, status, requested_by) values (x, y, 'pending', me); return 'requested';
  elsif cur.status = 'accepted' then return 'already';
  elsif cur.requested_by <> me then update public.mokesh_friends set status = 'accepted' where a = x and b = y; return 'accepted';
  else return 'pending'; end if;
end $$;
create or replace function public.mokesh_accept_friend(p_other uuid) returns void
language sql security definer set search_path = public as $$
  update public.mokesh_friends set status = 'accepted'
  where a = least(auth.uid(), p_other) and b = greatest(auth.uid(), p_other) and status = 'pending' and requested_by <> auth.uid(); $$;
create or replace function public.mokesh_record_game(p_won boolean, p_correct int, p_traps int, p_mvp boolean) returns void
language sql security definer set search_path = public as $$
  update public.mokesh_profiles set stats = jsonb_build_object(
    'games', coalesce((stats->>'games')::int,0) + 1,
    'wins', coalesce((stats->>'wins')::int,0) + case when p_won then 1 else 0 end,
    'correct', coalesce((stats->>'correct')::int,0) + least(greatest(coalesce(p_correct,0),0),60),
    'traps', coalesce((stats->>'traps')::int,0) + least(greatest(coalesce(p_traps,0),0),60),
    'mvp', coalesce((stats->>'mvp')::int,0) + case when p_mvp then 1 else 0 end)
  where id = auth.uid(); $$;
revoke all on function public.mokesh_add_friend(text) from public, anon;
revoke all on function public.mokesh_accept_friend(uuid) from public, anon;
revoke all on function public.mokesh_record_game(boolean,int,int,boolean) from public, anon;
grant execute on function public.mokesh_add_friend(text) to authenticated;
grant execute on function public.mokesh_accept_friend(uuid) to authenticated;
grant execute on function public.mokesh_record_game(boolean,int,int,boolean) to authenticated;

-- ===== משחק מהיר ודיווחים =====
create table if not exists public.mokesh_queue (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,40}$'),
  name text not null check (char_length(name) between 1 and 16),
  avatar text not null check (avatar ~ '^[a-z0-9]{1,8}$'),
  joined_at timestamptz not null default now(), last_seen timestamptz not null default now(),
  room text, is_host boolean not null default false, members jsonb);
alter table public.mokesh_queue enable row level security;
create table if not exists public.mokesh_reports (
  id bigint generated always as identity primary key,
  reporter text not null check (char_length(reporter) <= 40), target text not null check (char_length(target) <= 40),
  target_name text check (char_length(target_name) <= 16), room text check (char_length(room) <= 12),
  reason text check (char_length(reason) <= 300), created_at timestamptz not null default now());
alter table public.mokesh_reports enable row level security;
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

-- ===== Realtime =====
alter publication supabase_realtime add table public.mokesh_rooms, public.mokesh_inbox, public.mokesh_invites, public.mokesh_friends;

-- ===== ניקוי אוטומטי (חיסכון בנפח): נקרא מהאתר בכל פתיחת חדר =====
-- חדר שלא עודכן 30 דקות (מנהל החדר שולח דופק כל 20 שניות כל עוד הוא מחובר) נמחק — יחד עם הצ'אט ותיבת הפעולות שלו.
-- גם הזמנות בנות יותר מיום, ותור משחק מהיר ישן.
create or replace function public.mokesh_cleanup() returns void language sql security definer set search_path = public as $$
  delete from public.mokesh_rooms where updated_at < now() - interval '30 minutes';
  delete from public.mokesh_invites where created_at < now() - interval '1 day';
  delete from public.mokesh_queue where joined_at < now() - interval '30 minutes';
$$;
grant execute on function public.mokesh_cleanup() to anon, authenticated;
