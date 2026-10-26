-- Link archived booklets to Uploads and keep officer PDF uploads working.
-- Non-destructive: no drops of existing tables, no invented booklet rows.

alter table public.booklets
  drop constraint if exists booklets_archive_id_unique;

alter table public.booklets
  add constraint booklets_archive_id_unique unique (archive_id);

grant select, insert, update on public.booklets to authenticated;
grant execute on function public.profile_role(uuid) to authenticated;

create or replace function public.sync_booklet_from_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.booklets (
    unit_code,
    unit_name,
    programme,
    school,
    academic_session,
    registration_no,
    student_name,
    archive_id,
    uploaded_by,
    digitised
  )
  values (
    coalesce(new.unit_code, ''),
    coalesce(new.unit_name, ''),
    coalesce(new.programme, ''),
    coalesce(new.school, ''),
    coalesce(new.academic_session, ''),
    coalesce(new.admission_number, ''),
    coalesce(new.student_name, ''),
    new.id,
    coalesce(new.archived_by, auth.uid()),
    false
  )
  on conflict (archive_id) do update
  set
    unit_code = excluded.unit_code,
    unit_name = excluded.unit_name,
    programme = excluded.programme,
    school = excluded.school,
    academic_session = excluded.academic_session,
    registration_no = excluded.registration_no,
    student_name = excluded.student_name,
    uploaded_by = coalesce(public.booklets.uploaded_by, excluded.uploaded_by);

  return new;
end;
$$;

drop trigger if exists examination_archives_sync_booklet on public.examination_archives;
create trigger examination_archives_sync_booklet
  after insert or update of unit_code, unit_name, programme, school, academic_session, admission_number, student_name, archived_by
  on public.examination_archives
  for each row
  execute procedure public.sync_booklet_from_archive();
