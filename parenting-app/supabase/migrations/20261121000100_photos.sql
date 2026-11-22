-- Photo journal: one row per photo, the image file in the private bucket `family-media`
-- at <family_id>/general/<photo_id>.jpg. On the shared MOKESH project this was applied through
-- the Supabase MCP as "parenting_photos_and_storage" (the bucket and its three policies are
-- created here too, because migration 000300 was never installed there).
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  taken_on date not null,
  caption text check (char_length(caption) <= 300),
  storage_path text not null,
  thumb text check (char_length(thumb) <= 80000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1
);
create index photos_child_idx on public.photos (child_id, taken_on desc);
create trigger photos_touch before update on public.photos for each row execute function public.tg_touch_row();
create trigger photos_created_by before insert on public.photos for each row execute function public.tg_set_created_by();
create trigger photos_lock_identity before update on public.photos for each row execute function public.tg_lock_identity_columns();

alter table public.photos enable row level security;
revoke all on public.photos from anon, public;
grant select, insert, update on public.photos to authenticated;
create policy photos_select on public.photos for select to authenticated using (public.can_read_child(child_id));
create policy photos_insert on public.photos for insert to authenticated with check (public.can_write_tracking(child_id));
create policy photos_update on public.photos for update to authenticated
  using (public.can_write_tracking(child_id)) with check (public.can_write_tracking(child_id));

-- Shared project only (a dedicated project gets the bucket from 000300):
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   values ('family-media', 'family-media', false, 3145728, array['image/jpeg']) on conflict (id) do nothing;
-- create policy family_media_read   on storage.objects for select to authenticated using (bucket_id = 'family-media' and public.is_family_member(((storage.foldername(name))[1])::uuid));
-- create policy family_media_write  on storage.objects for insert to authenticated with check (bucket_id = 'family-media' and (storage.foldername(name))[2] = 'general' and public.is_family_member(((storage.foldername(name))[1])::uuid));
-- create policy family_media_delete on storage.objects for delete to authenticated using (bucket_id = 'family-media' and (owner = auth.uid() or public.is_family_owner(((storage.foldername(name))[1])::uuid)));
