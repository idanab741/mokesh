-- אבטחת חדרי המשחק: אי אפשר יותר למחוק את כל החדרים בבת אחת.
-- קריאה, יצירה ועדכון נשארים פתוחים (המשחק צריך אותם). מחיקה: רק חדר אחד לפי קוד, דרך פונקציה.
drop policy if exists mokesh_rooms_all on public.mokesh_rooms;
create policy mokesh_rooms_sel on public.mokesh_rooms for select to anon, authenticated using (true);
create policy mokesh_rooms_ins on public.mokesh_rooms for insert to anon, authenticated with check (code ~ '^[A-Z0-9]{4,8}$');
create policy mokesh_rooms_upd on public.mokesh_rooms for update to anon, authenticated using (true) with check (code ~ '^[A-Z0-9]{4,8}$');
drop policy if exists mokesh_inbox_all on public.mokesh_inbox;
create policy mokesh_inbox_sel on public.mokesh_inbox for select to anon, authenticated using (true);
create policy mokesh_inbox_ins on public.mokesh_inbox for insert to anon, authenticated with check (true);
-- גודל מקסימלי לכל חדר ולכל פעולה, כדי שאי אפשר יהיה למלא את המסד בזבל
alter table public.mokesh_rooms drop constraint if exists mokesh_rooms_state_size;
alter table public.mokesh_rooms add constraint mokesh_rooms_state_size check (pg_column_size(state) < 300000) not valid;
alter table public.mokesh_inbox drop constraint if exists mokesh_inbox_action_size;
alter table public.mokesh_inbox add constraint mokesh_inbox_action_size check (pg_column_size(action) < 20000) not valid;
create or replace function public.mokesh_room_del(p_code text) returns void language sql security definer set search_path='' as $$
  delete from public.mokesh_rooms where code = p_code and p_code ~ '^[A-Z0-9]{4,8}$';
$$;
create or replace function public.mokesh_inbox_del(p_id text) returns void language sql security definer set search_path='' as $$
  delete from public.mokesh_inbox where id = p_id;
$$;
revoke all on function public.mokesh_room_del(text) from public; grant execute on function public.mokesh_room_del(text) to anon, authenticated;
revoke all on function public.mokesh_inbox_del(text) from public; grant execute on function public.mokesh_inbox_del(text) to anon, authenticated;
