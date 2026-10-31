-- מחיקת חשבון מתוך המשחק (דרישה של App Store ו-Google Play).
-- כל הטבלאות מקושרות ל-auth.users עם ON DELETE CASCADE, ולכן מחיקת המשתמש מוחקת הכל.
create or replace function public.mokesh_delete_me() returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'login'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.mokesh_delete_me() from public, anon;
grant execute on function public.mokesh_delete_me() to authenticated;
