-- Removes everything install.sql created. Deletes all parenting-app data in this project.
begin;
drop table if exists public.consents, public.audit_logs, public.invitations, public.notification_preferences,
  public.reminders, public.appointments, public.medication_administrations, public.medications,
  public.health_records, public.photos, public.milestones, public.media_assets, public.measurements,
  public.activity_events, public.children, public.family_members, public.families, public.users cascade;
drop function if exists public.delete_my_data(), public.revoke_invitation(uuid), public.accept_invitation(text),
  public.create_invitation(uuid, public.family_role, boolean, boolean, boolean), public.create_family(text),
  public.tg_protect_last_owner(), public.tg_audit_membership(), public.write_audit(uuid, text, text, uuid),
  public.can_manage_children(uuid), public.can_write_health(uuid), public.can_read_health(uuid),
  public.can_write_tracking(uuid), public.can_read_child(uuid), public.shares_family_with(uuid),
  public.is_family_owner(uuid), public.is_family_member(uuid), public.tg_med_admin_same_child(),
  public.tg_lock_identity_columns(), public.is_valid_activity_payload(public.activity_type, jsonb),
  public.handle_new_auth_user(), public.tg_set_created_by(), public.tg_touch_row() cascade;
drop type if exists public.appointment_status, public.appointment_kind, public.health_record_type,
  public.milestone_domain, public.activity_type, public.child_sex, public.family_role;
-- The photo files: empty the bucket `family-media` in Storage, then:
--   drop policy family_media_read on storage.objects; drop policy family_media_write on storage.objects;
--   drop policy family_media_delete on storage.objects; delete from storage.buckets where id = 'family-media';
commit;
