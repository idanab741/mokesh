-- ===== מוקש! — סטטיסטיקות לעמוד הניהול (/admin) =====
-- מריצים פעם אחת ב-Supabase → SQL Editor. בסוף הקובץ: שורה אחת עם הסיסמה שלכם (מחליפים לפני ההרצה).

-- כניסה = מכשיר (מזהה אקראי מקומי, בלי שום מידע אישי), פעם ביום; משחקים = כל התחלה
create table if not exists public.mokesh_hits(
  day date not null default (now() at time zone 'Asia/Jerusalem')::date,
  uid text not null,
  kind text not null,
  src text,
  dev text,
  n int not null default 1,
  first_at timestamptz not null default now(),
  primary key (day, uid, kind)
);
alter table public.mokesh_hits enable row level security; -- בלי הרשאות ישירות: רק דרך הפונקציות למטה

create table if not exists public.mokesh_admin(id int primary key default 1, key_hash text not null);
alter table public.mokesh_admin enable row level security;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.mokesh_hit(p_uid text, p_kind text, p_src text, p_dev text) returns void
language sql security definer set search_path = public as $$
  insert into public.mokesh_hits(uid, kind, src, dev)
  select p_uid, p_kind, left(coalesce(p_src, ''), 20), left(coalesce(p_dev, ''), 10)
  where p_uid ~ '^[A-Za-z0-9_-]{1,40}$' and p_kind in ('visit', 'online', 'quick', 'local', 'ai')
  on conflict (day, uid, kind) do update set n = public.mokesh_hits.n + 1;
$$;
revoke all on function public.mokesh_hit(text, text, text, text) from public;
grant execute on function public.mokesh_hit(text, text, text, text) to anon, authenticated;

create or replace function public.mokesh_stats(p_key text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  today date := (now() at time zone 'Asia/Jerusalem')::date;
  ok boolean;
begin
  select exists(select 1 from public.mokesh_admin a where a.key_hash = extensions.crypt(coalesce(p_key, ''), a.key_hash)) into ok;
  if not ok then perform pg_sleep(1); return jsonb_build_object('error', 'key'); end if;
  return jsonb_build_object(
    'today', (select count(distinct uid) from mokesh_hits where kind = 'visit' and day = today),
    'week',  (select count(distinct uid) from mokesh_hits where kind = 'visit' and day > today - 7),
    'month', (select count(distinct uid) from mokesh_hits where kind = 'visit' and day > today - 30),
    'total', (select count(distinct uid) from mokesh_hits where kind = 'visit'),
    'returning', (select count(*) from (select uid from mokesh_hits where kind = 'visit' and day > today - 7 group by uid having count(*) > 1) r),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'u', u, 'n', nw) order by d), '[]'::jsonb) from (
        select g::date d,
          (select count(distinct h.uid) from mokesh_hits h where h.kind = 'visit' and h.day = g::date) u,
          (select count(*) from (select uid, min(day) f from mokesh_hits where kind = 'visit' group by uid) fs where fs.f = g::date) nw
        from generate_series(today - 29, today, interval '1 day') g) x),
    'modes', (select coalesce(jsonb_object_agg(kind, c), '{}'::jsonb) from (select kind, sum(n) c from mokesh_hits where kind <> 'visit' and day > today - 30 group by kind) m),
    'modesToday', (select coalesce(jsonb_object_agg(kind, c), '{}'::jsonb) from (select kind, sum(n) c from mokesh_hits where kind <> 'visit' and day = today group by kind) m),
    'src', (select coalesce(jsonb_agg(jsonb_build_object('s', s, 'c', c) order by c desc), '[]'::jsonb) from (
        select coalesce(nullif(src, ''), 'direct') s, count(distinct uid) c from mokesh_hits where kind = 'visit' and day > today - 30 group by 1 order by 2 desc limit 8) y),
    'dev', (select coalesce(jsonb_object_agg(dv, c), '{}'::jsonb) from (select coalesce(nullif(dev, ''), 'other') dv, count(distinct uid) c from mokesh_hits where kind = 'visit' and day > today - 30 group by 1) z),
    'liveRooms', (select count(*) from mokesh_rooms where updated_at > now() - interval '2 minutes'),
    'livePlayers', (select coalesce(sum((select count(*) from jsonb_array_elements(r.state -> 'players') p where p ->> 'id' not like 'bot-%')), 0) from mokesh_rooms r where r.updated_at > now() - interval '2 minutes'),
    'at', now()
  );
end $$;
revoke all on function public.mokesh_stats(text) from public;
grant execute on function public.mokesh_stats(text) to anon, authenticated;

-- ↓↓↓ הסיסמה לעמוד הניהול: מחליפים את  הסיסמה-שלי  בסיסמה שתבחרו (לפחות 8 תווים), ואז מריצים את כל הקובץ ↓↓↓
insert into public.mokesh_admin(id, key_hash) values (1, extensions.crypt('הסיסמה-שלי', extensions.gen_salt('bf')))
  on conflict (id) do update set key_hash = excluded.key_hash;
