-- =============================================================================
-- Storage: one private bucket. Object path convention:
--   <family_id>/general/<file>   – photos (profile pictures, milestone photos)
--   <family_id>/medical/<child_id>/<file> – medical documents (health permission required)
-- Requires the Supabase `storage` schema, so it is not part of the local RLS test run.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('family-media', 'family-media', false)
on conflict (id) do nothing;

create policy family_media_read on storage.objects for select to authenticated
  using (
    bucket_id = 'family-media'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
    and ((storage.foldername(name))[2] <> 'medical'
         or public.can_read_health(((storage.foldername(name))[3])::uuid))
  );

create policy family_media_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'family-media'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
    and (storage.foldername(name))[2] in ('general', 'medical')
    and ((storage.foldername(name))[2] <> 'medical'
         or public.can_write_health(((storage.foldername(name))[3])::uuid))
  );

create policy family_media_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'family-media'
    and (owner = auth.uid() or public.is_family_owner(((storage.foldername(name))[1])::uuid))
  );
