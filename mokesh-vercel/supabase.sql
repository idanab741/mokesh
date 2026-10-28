-- הסכמה שכבר הופעלה על פרויקט ה-Supabase שלך (שמורה כאן לתיעוד / לשחזור)
create table if not exists public.mokesh_rooms (code text primary key, state jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.mokesh_inbox (id text primary key, code text not null references public.mokesh_rooms(code) on delete cascade, action jsonb not null, at timestamptz not null default now());
create index if not exists mokesh_inbox_code_at on public.mokesh_inbox(code, at);
alter table public.mokesh_rooms enable row level security;
alter table public.mokesh_inbox enable row level security;
create policy mokesh_rooms_anon on public.mokesh_rooms for all to anon using (true) with check (true);
create policy mokesh_inbox_anon on public.mokesh_inbox for all to anon using (true) with check (true);
alter publication supabase_realtime add table public.mokesh_rooms;
alter publication supabase_realtime add table public.mokesh_inbox;
create or replace function public.mokesh_cleanup() returns void language sql security definer as $$ delete from public.mokesh_rooms where updated_at < now() - interval '6 hours'; $$;
grant execute on function public.mokesh_cleanup() to anon;
