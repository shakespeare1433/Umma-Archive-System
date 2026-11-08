-- Phase 6: RLS review, notification insert, private booklets bucket, revoke public RPC abuse.
-- Safe to re-run. Does not drop tables or invent data.

-- ---------------------------------------------------------------------------
-- Private PDF bucket (signed URLs only)
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false
where id = 'booklets';

-- ---------------------------------------------------------------------------
-- Notifications: lecturers/officers must be able to insert for request flow
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select
  on public.notifications
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or (audience = 'officer' and public.profile_role(auth.uid()) = 'Examination Officer')
    or (audience = 'admin' and public.profile_role(auth.uid()) = 'Admin')
    or (audience = 'lecturer' and public.profile_role(auth.uid()) = 'Lecturer' and user_id = auth.uid())
  );

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert
  on public.notifications
  for insert
  to authenticated
  with check (
    public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin')
  );

drop policy if exists notifications_update on public.notifications;
create policy notifications_update
  on public.notifications
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or (audience = 'officer' and public.profile_role(auth.uid()) = 'Examination Officer')
    or (audience = 'admin' and public.profile_role(auth.uid()) = 'Admin')
  )
  with check (
    user_id = auth.uid()
    or (audience = 'officer' and public.profile_role(auth.uid()) = 'Examination Officer')
    or (audience = 'admin' and public.profile_role(auth.uid()) = 'Admin')
  );

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete
  on public.notifications
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or (audience = 'officer' and public.profile_role(auth.uid()) = 'Examination Officer')
    or (audience = 'admin' and public.profile_role(auth.uid()) = 'Admin')
  );

-- ---------------------------------------------------------------------------
-- Archives: lecturers read; officers/admins write
-- ---------------------------------------------------------------------------
drop policy if exists archives_select on public.examination_archives;
create policy archives_select
  on public.examination_archives
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

drop policy if exists archives_insert on public.examination_archives;
create policy archives_insert
  on public.examination_archives
  for insert
  to authenticated
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

drop policy if exists archives_update on public.examination_archives;
create policy archives_update
  on public.examination_archives
  for update
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

-- ---------------------------------------------------------------------------
-- Requests: lecturer inserts own; officers answer; own/officer/admin read
-- ---------------------------------------------------------------------------
drop policy if exists requests_select on public.retrieval_requests;
create policy requests_select
  on public.retrieval_requests
  for select
  to authenticated
  using (
    requester_id = auth.uid()
    or public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  );

drop policy if exists requests_insert on public.retrieval_requests;
create policy requests_insert
  on public.retrieval_requests
  for insert
  to authenticated
  with check (
    requester_id = auth.uid()
    and public.profile_role(auth.uid()) = 'Lecturer'
  );

drop policy if exists requests_update on public.retrieval_requests;
create policy requests_update
  on public.retrieval_requests
  for update
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

drop policy if exists requests_delete on public.retrieval_requests;
create policy requests_delete
  on public.retrieval_requests
  for delete
  to authenticated
  using (
    requester_id = auth.uid()
    or public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  );

-- ---------------------------------------------------------------------------
-- Search history: own rows (admin may read all)
-- ---------------------------------------------------------------------------
drop policy if exists history_select on public.search_history;
create policy history_select
  on public.search_history
  for select
  to authenticated
  using (user_id = auth.uid() or public.profile_role(auth.uid()) = 'Admin');

drop policy if exists history_insert on public.search_history;
create policy history_insert
  on public.search_history
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists history_delete on public.search_history;
create policy history_delete
  on public.search_history
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Profiles: self or admin; role/status locked by guard_profile()
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.profile_role(auth.uid()) = 'Admin');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.profile_role(auth.uid()) = 'Admin')
  with check (id = auth.uid() or public.profile_role(auth.uid()) = 'Admin');

-- ---------------------------------------------------------------------------
-- Vault settings: all signed-in roles read; admin updates
-- ---------------------------------------------------------------------------
drop policy if exists settings_select on public.vault_settings;
create policy settings_select
  on public.vault_settings
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

drop policy if exists settings_update on public.vault_settings;
create policy settings_update
  on public.vault_settings
  for update
  to authenticated
  using (public.profile_role(auth.uid()) = 'Admin')
  with check (public.profile_role(auth.uid()) = 'Admin');

-- ---------------------------------------------------------------------------
-- Phase 3–5 tables (only if already created)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.archived_scripts') is not null then
    execute 'drop policy if exists archived_scripts_select on public.archived_scripts';
    execute $p$
      create policy archived_scripts_select
        on public.archived_scripts for select to authenticated
        using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'))
    $p$;
    execute 'drop policy if exists archived_scripts_write on public.archived_scripts';
    execute $p$
      create policy archived_scripts_write
        on public.archived_scripts for all to authenticated
        using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
        with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
    $p$;
  end if;

  if to_regclass('public.storage_locations') is not null then
    execute 'drop policy if exists storage_locations_select on public.storage_locations';
    execute $p$
      create policy storage_locations_select
        on public.storage_locations for select to authenticated
        using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'))
    $p$;
    execute 'drop policy if exists storage_locations_write on public.storage_locations';
    execute $p$
      create policy storage_locations_write
        on public.storage_locations for all to authenticated
        using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
        with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
    $p$;
  end if;

  if to_regclass('public.location_history') is not null then
    execute 'drop policy if exists location_history_select on public.location_history';
    execute $p$
      create policy location_history_select
        on public.location_history for select to authenticated
        using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'))
    $p$;
    execute 'drop policy if exists location_history_insert on public.location_history';
    execute $p$
      create policy location_history_insert
        on public.location_history for insert to authenticated
        with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
    $p$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Booklets storage: authenticated roles may SELECT (needed for signed URLs);
-- only officer/admin upload
-- ---------------------------------------------------------------------------
drop policy if exists booklets_storage_select on storage.objects;
create policy booklets_storage_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'booklets'
    and public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin')
  );

drop policy if exists booklets_storage_insert on storage.objects;
create policy booklets_storage_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'booklets'
    and public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  );

drop policy if exists booklets_storage_update on storage.objects;
create policy booklets_storage_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'booklets'
    and public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  )
  with check (
    bucket_id = 'booklets'
    and public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  );

drop policy if exists booklets_storage_delete on storage.objects;
create policy booklets_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'booklets'
    and public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  );

-- ---------------------------------------------------------------------------
-- Harden SECURITY DEFINER helpers (triggers still work as table owner)
-- Keep resolve_sign_in_email for pre-auth login; profile_role for RLS.
-- ---------------------------------------------------------------------------
revoke all on function public.guard_profile() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.on_retrieval_request() from public, anon, authenticated;
revoke all on function public.sync_booklet_from_archive() from public, anon, authenticated;

revoke all on function public.profile_role(uuid) from public, anon;
grant execute on function public.profile_role(uuid) to authenticated;

revoke all on function public.profile_status(uuid) from public, anon;
grant execute on function public.profile_status(uuid) to authenticated;

revoke all on function public.resolve_sign_in_email(text) from public;
grant execute on function public.resolve_sign_in_email(text) to anon, authenticated;

-- Fix mutable search_path warning on search helper if present
do $$
begin
  alter function public.search_examination_archives(
    text, text, text, text, text, text, text, text
  ) set search_path to public;
exception when undefined_function then
  null;
end $$;
