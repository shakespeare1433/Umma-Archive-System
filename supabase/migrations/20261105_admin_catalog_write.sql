-- Allow admins to manage the catalog lists used by officers and lecturers.

grant insert, update, delete on public.schools to authenticated;
grant insert, update, delete on public.programmes to authenticated;
grant insert, update, delete on public.academic_sessions to authenticated;

drop policy if exists schools_write_admin on public.schools;
create policy schools_write_admin
  on public.schools
  for all
  to authenticated
  using (public.profile_role(auth.uid()) = 'Admin')
  with check (public.profile_role(auth.uid()) = 'Admin');

drop policy if exists programmes_write_admin on public.programmes;
create policy programmes_write_admin
  on public.programmes
  for all
  to authenticated
  using (public.profile_role(auth.uid()) = 'Admin')
  with check (public.profile_role(auth.uid()) = 'Admin');

drop policy if exists sessions_write_admin on public.academic_sessions;
create policy sessions_write_admin
  on public.academic_sessions
  for all
  to authenticated
  using (public.profile_role(auth.uid()) = 'Admin')
  with check (public.profile_role(auth.uid()) = 'Admin');
