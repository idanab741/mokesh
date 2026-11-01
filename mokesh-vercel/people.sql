-- ספירת אנשים במקום מכשירים: מכשיר שנכנס ממנו משתמש רשום מקושר לחשבון שלו.
-- כל הכניסות מכל המכשירים של אותו משתמש נספרות כאדם אחד. אורחים בלי חשבון נספרים לפי מכשיר.
create table if not exists public.mokesh_dev_link(
  uid text primary key check (uid ~ '^[A-Za-z0-9_-]{1,40}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now());
alter table public.mokesh_dev_link enable row level security;
revoke all on public.mokesh_dev_link from anon, authenticated;

-- הטלפון מקשר את עצמו לחשבון שמחובר בו (רק לחשבון של מי שקורא לפונקציה)
create or replace function public.mokesh_link(p_uid text) returns void
language sql security definer set search_path to 'public' as $$
  insert into public.mokesh_dev_link(uid, user_id)
  select p_uid, auth.uid() where auth.uid() is not null and p_uid ~ '^[A-Za-z0-9_-]{1,40}$'
  on conflict (uid) do update set user_id = excluded.user_id, at = now();
$$;
revoke all on function public.mokesh_link(text) from public, anon;
grant execute on function public.mokesh_link(text) to authenticated;

-- כניסות עם מזהה אדם (pid): החשבון אם המכשיר מקושר, אחרת המכשיר
create or replace view public.mokesh_hits_p with (security_invoker = true) as
  select h.*, coalesce(l.user_id::text, h.uid) pid
  from public.mokesh_hits h left join public.mokesh_dev_link l on l.uid = h.uid;
revoke all on public.mokesh_hits_p from anon, authenticated;

-- לוח הבקרה: סופרים אנשים (pid). "המכשירים הכי פעילים" נשאר לפי מכשיר
create or replace function public.mokesh_stats(p_key text) returns jsonb
language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare
  today date := (now() at time zone 'Asia/Jerusalem')::date;
  ok boolean;
begin
  select exists(select 1 from public.mokesh_admin a where a.key_hash = extensions.crypt(coalesce(p_key, ''), a.key_hash)) into ok;
  if not ok then perform pg_sleep(1); return jsonb_build_object('error', 'key'); end if;
  return jsonb_build_object(
    'today', (select count(distinct pid) from mokesh_hits_p where kind = 'visit' and day = today),
    'week',  (select count(distinct pid) from mokesh_hits_p where kind = 'visit' and day > today - 7),
    'month', (select count(distinct pid) from mokesh_hits_p where kind = 'visit' and day > today - 30),
    'total', (select count(distinct pid) from mokesh_hits_p where kind = 'visit'),
    'todayV', (select coalesce(sum(n),0) from mokesh_hits where kind = 'visit' and day = today),
    'weekV',  (select coalesce(sum(n),0) from mokesh_hits where kind = 'visit' and day > today - 7),
    'monthV', (select coalesce(sum(n),0) from mokesh_hits where kind = 'visit' and day > today - 30),
    'totalV', (select coalesce(sum(n),0) from mokesh_hits where kind = 'visit'),
    'returning', (select count(*) from (select pid from mokesh_hits_p where kind = 'visit' and day > today - 7 group by pid having count(distinct day) > 1) r),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'u', u, 'v', v, 'n', nw) order by d), '[]'::jsonb) from (
        select g::date d,
          (select count(distinct h.pid) from mokesh_hits_p h where h.kind = 'visit' and h.day = g::date) u,
          (select coalesce(sum(h.n),0) from mokesh_hits h where h.kind = 'visit' and h.day = g::date) v,
          (select count(*) from (select pid, min(day) f from mokesh_hits_p where kind = 'visit' group by pid) fs where fs.f = g::date) nw
        from generate_series(today - 29, today, interval '1 day') g) x),
    'topDev', (select coalesce(jsonb_agg(t order by t.v desc), '[]'::jsonb) from (
        select right(uid, 4) id, max(dev) dev, sum(n) v, count(distinct day) days, max(day) last, min(day) first
        from mokesh_hits where kind = 'visit' and day > today - 30 group by uid order by sum(n) desc limit 15) t),
    'modes', (select coalesce(jsonb_object_agg(kind, c), '{}'::jsonb) from (select kind, sum(n) c from mokesh_hits where kind <> 'visit' and day > today - 30 group by kind) m),
    'modesToday', (select coalesce(jsonb_object_agg(kind, c), '{}'::jsonb) from (select kind, sum(n) c from mokesh_hits where kind <> 'visit' and day = today group by kind) m),
    'src', (select coalesce(jsonb_agg(jsonb_build_object('s', s, 'c', c) order by c desc), '[]'::jsonb) from (
        select coalesce(nullif(src, ''), 'direct') s, count(distinct pid) c from mokesh_hits_p where kind = 'visit' and day > today - 30 group by 1 order by 2 desc limit 8) y),
    'dev', (select coalesce(jsonb_object_agg(dv, c), '{}'::jsonb) from (select coalesce(nullif(dev, ''), 'other') dv, count(distinct uid) c from mokesh_hits where kind = 'visit' and day > today - 30 group by 1) z),
    'liveRooms', (select count(*) from mokesh_rooms where updated_at > now() - interval '2 minutes'),
    'livePlayers', (select coalesce(sum((select count(*) from jsonb_array_elements(r.state -> 'players') p where p ->> 'id' not like 'bot-%')), 0) from mokesh_rooms r where r.updated_at > now() - interval '2 minutes'),
    'at', now()
  );
end $function$;

-- רשימת המשתמשים: כניסות מכל המכשירים המקושרים. נתוני המשך (חוזרים, מסלול): לפי אדם
do $$
declare d text;
begin
  d := pg_get_functiondef('public.mokesh_users_admin'::regproc);
  d := replace(d, '(select coalesce(sum(h.n),0) from mokesh_hits h where h.uid=u.id::text)', '(select coalesce(sum(h.n),0) from mokesh_hits_p h where h.pid=u.id::text and h.kind=''visit'')');
  execute d;
  d := pg_get_functiondef('public.mokesh_stats2'::regproc);
  d := replace(d, '''devices'', (select count(distinct uid) from mokesh_hits where kind = ''visit'' and day > today - 30)', '''devices'', (select count(distinct pid) from mokesh_hits_p where kind = ''visit'' and day > today - 30)');
  d := replace(d, 'with f as (select uid, min(day) d0 from mokesh_hits where kind = ''visit'' group by uid)', 'with f as (select pid uid, min(day) d0 from mokesh_hits_p where kind = ''visit'' group by pid)');
  d := replace(d, 'select 1 from mokesh_hits h where h.uid = f.uid', 'select 1 from mokesh_hits_p h where h.pid = f.uid');
  execute d;
end $$;
