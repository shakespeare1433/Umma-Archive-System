grant delete on public.notifications to authenticated;

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
