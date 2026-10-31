-- ===== מוקש! — סטטיסטיקה מורחבת לעמוד הניהול: משחקים, מילים, שעות, חזרה, משחק מהיר, תקלות והגדרות =====
create table if not exists public.mokesh_events(
  id bigserial primary key,
  at timestamptz not null default now(),
  uid text not null,
  kind text not null,
  data jsonb not null default '{}'::jsonb
);
create index if not exists mokesh_events_kind_at on public.mokesh_events(kind, at);
alter table public.mokesh_events enable row level security; -- רק דרך הפונקציות

-- אירוע מהמשחק: start / end / quit / card / qm / err. מוגבל בגודל ובסוג
create or replace function public.mokesh_ev(p_uid text, p_kind text, p_data jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.mokesh_events(uid, kind, data)
  select p_uid, p_kind, coalesce(p_data, '{}'::jsonb)
  where p_uid ~ '^[A-Za-z0-9_-]{1,40}$' and p_kind in ('start', 'end', 'quit', 'card', 'qm', 'err')
    and jsonb_typeof(coalesce(p_data, '{}'::jsonb)) = 'object' and pg_column_size(coalesce(p_data, '{}'::jsonb)) < 800;
$$;
revoke all on function public.mokesh_ev(text, text, jsonb) from public;
grant execute on function public.mokesh_ev(text, text, jsonb) to anon, authenticated;

create or replace function public.mokesh_stats2(p_key text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  today date := (now() at time zone 'Asia/Jerusalem')::date;
  since timestamptz := now() - interval '30 days';
  ok boolean;
begin
  select exists(select 1 from public.mokesh_admin a where a.key_hash = extensions.crypt(coalesce(p_key, ''), a.key_hash)) into ok;
  if not ok then perform pg_sleep(1); return jsonb_build_object('error', 'key'); end if;
  return jsonb_build_object(
    -- 2. משפך: נכנסו → פתחו משחק → התחילו → סיימו
    'funnel', jsonb_build_object(
      'devices', (select count(distinct uid) from mokesh_hits where kind = 'visit' and day > today - 30),
      'opened', (select coalesce(sum(n), 0) from mokesh_hits where kind in ('online', 'quick', 'local', 'ai') and day > today - 30),
      'started', (select count(*) from mokesh_events where kind = 'start' and at > since),
      'ended', (select count(*) from mokesh_events where kind = 'end' and at > since),
      'quit', (select count(*) from mokesh_events where kind = 'quit' and at > since),
      'avgMin', (select round(avg((data ->> 'dur')::numeric), 1) from mokesh_events where kind = 'end' and at > since and data ? 'dur')),
    -- 4. שעות וימים (שעון ישראל): משחקים שהתחילו
    'hours', (select coalesce(jsonb_agg(c order by h), '[]'::jsonb) from (select g h, (select count(*) from mokesh_events e where e.kind = 'start' and e.at > since and extract(hour from e.at at time zone 'Asia/Jerusalem') = g) c from generate_series(0, 23) g) x),
    'dows', (select coalesce(jsonb_agg(c order by d), '[]'::jsonb) from (select g d, (select count(*) from mokesh_events e where e.kind = 'start' and e.at > since and extract(dow from e.at at time zone 'Asia/Jerusalem') = g) c from generate_series(0, 6) g) x),
    -- 5. חזרה: מי שנכנס לראשונה — כמה חזרו למחרת, וכמה תוך שבוע
    'retention', (with f as (select uid, min(day) d0 from mokesh_hits where kind = 'visit' group by uid)
      select jsonb_build_object(
        'd1base', (select count(*) from f where d0 between today - 30 and today - 1),
        'd1', (select count(*) from f where d0 between today - 30 and today - 1 and exists(select 1 from mokesh_hits h where h.uid = f.uid and h.kind = 'visit' and h.day = f.d0 + 1)),
        'd7base', (select count(*) from f where d0 between today - 37 and today - 7),
        'd7', (select count(*) from f where d0 between today - 37 and today - 7 and exists(select 1 from mokesh_hits h where h.uid = f.uid and h.kind = 'visit' and h.day between f.d0 + 1 and f.d0 + 7)),
        'cohorts', (select coalesce(jsonb_agg(jsonb_build_object('d', d0, 'n', n, 'r', r) order by d0 desc), '[]'::jsonb) from (
            select d0, count(*) n, count(*) filter (where exists(select 1 from mokesh_hits h where h.uid = f.uid and h.kind = 'visit' and h.day > f.d0)) r
            from f where d0 > today - 14 group by d0) c))),
    -- 3. מילים: כמה פעמים הופיעה, ומה קרה
    'cards', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'n', n, 'ok', okc, 'trap', trapc, 'skip', skipc, 'miss', missc, 'ms', ms)), '[]'::jsonb) from (
        select data ->> 'id' id, count(*) n,
          count(*) filter (where data ->> 'r' = 'correct') okc, count(*) filter (where data ->> 'r' = 'trap') trapc,
          count(*) filter (where data ->> 'r' = 'skip') skipc, count(*) filter (where data ->> 'r' = 'missed') missc,
          round(avg((data ->> 'ms')::numeric) filter (where data ->> 'r' = 'correct')) ms
        from mokesh_events where kind = 'card' and at > since and data ? 'id' group by 1) w),
    -- 6. משחק מהיר
    'qm', (select jsonb_build_object(
        'match', count(*) filter (where data ->> 'r' = 'match'), 'bots', count(*) filter (where data ->> 'r' = 'bots'), 'cancel', count(*) filter (where data ->> 'r' = 'cancel'),
        'wait', round(avg((data ->> 'w')::numeric) filter (where data ->> 'r' = 'match')), 'players', round(avg((data ->> 'n')::numeric) filter (where data ->> 'r' = 'match'), 1))
      from mokesh_events where kind = 'qm' and at > since),
    -- 7. תקלות (14 ימים), מקובצות לפי הודעה
    'errors', (select coalesce(jsonb_agg(jsonb_build_object('m', m, 'c', c, 'u', u, 'last', last, 'v', v, 's', s) order by last desc), '[]'::jsonb) from (
        select data ->> 'm' m, count(*) c, count(distinct uid) u, max(at) last, max(data ->> 'v') v, max(data ->> 's') s
        from mokesh_events where kind = 'err' and at > now() - interval '14 days' group by 1 order by max(at) desc limit 20) x),
    -- 8. הגדרות ומצבים במשחקים שהתחילו
    'settings', (select jsonb_build_object(
        'games', count(*), 'word', count(*) filter (where (data ->> 'wm') = '1'),
        'ct1', count(*) filter (where (data ->> 'ct') = '1'), 'ct2', count(*) filter (where (data ->> 'ct') = '2'),
        'online', count(*) filter (where data ->> 'm' = 'online' and coalesce(data ->> 'q', '0') = '0'), 'quick', count(*) filter (where data ->> 'q' = '1'),
        'local', count(*) filter (where data ->> 'm' = 'local'), 'ai', count(*) filter (where data ->> 'm' = 'ai'),
        'humans', round(avg((data ->> 'h')::numeric), 1), 'bots', round(avg((data ->> 'b')::numeric), 1))
      from mokesh_events where kind = 'start' and at > since),
    'at', now()
  );
end $$;
revoke all on function public.mokesh_stats2(text) from public;
grant execute on function public.mokesh_stats2(text) to anon, authenticated;

-- ניקוי: אירועים ישנים מ-120 יום נמחקים
create or replace function public.mokesh_cleanup() returns void language sql security definer set search_path = public as $$
  delete from public.mokesh_rooms where updated_at < now() - interval '30 minutes';
  delete from public.mokesh_invites where created_at < now() - interval '1 day';
  delete from public.mokesh_queue where joined_at < now() - interval '30 minutes';
  delete from public.mokesh_events where at < now() - interval '120 days';
$$;
grant execute on function public.mokesh_cleanup() to anon, authenticated;
