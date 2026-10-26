-- PDF booklet retrieval for the Lecturer portal.
-- Non-destructive: creates new objects and only adds missing columns.

-- ---------------------------------------------------------------------------
-- Booklets metadata (digitised PDFs). Physical vault rows stay in
-- examination_archives.
-- ---------------------------------------------------------------------------

create table if not exists public.booklets (
  id uuid primary key default gen_random_uuid(),
  unit_code text not null default '',
  unit_name text not null default '',
  programme text not null default '',
  school text not null default '',
  academic_session text not null default '',
  registration_no text not null default '',
  student_name text not null default '',
  pdf_path text,
  page_count integer,
  digitised boolean not null default false,
  uploaded_by uuid references public.profiles (id),
  archive_id uuid references public.examination_archives (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.booklets add column if not exists unit_code text not null default '';
alter table public.booklets add column if not exists unit_name text not null default '';
alter table public.booklets add column if not exists programme text not null default '';
alter table public.booklets add column if not exists school text not null default '';
alter table public.booklets add column if not exists academic_session text not null default '';
alter table public.booklets add column if not exists registration_no text not null default '';
alter table public.booklets add column if not exists student_name text not null default '';
alter table public.booklets add column if not exists pdf_path text;
alter table public.booklets add column if not exists page_count integer;
alter table public.booklets add column if not exists digitised boolean not null default false;
alter table public.booklets add column if not exists uploaded_by uuid references public.profiles (id);
alter table public.booklets add column if not exists archive_id uuid references public.examination_archives (id) on delete set null;
alter table public.booklets add column if not exists created_at timestamptz not null default now();

create index if not exists booklets_search_idx
  on public.booklets (school, programme, academic_session, unit_code);

create index if not exists booklets_created_idx
  on public.booklets (created_at desc);

alter table public.booklets enable row level security;

revoke all on public.booklets from anon;
grant select on public.booklets to authenticated;
grant insert, update on public.booklets to authenticated;

drop policy if exists booklets_select on public.booklets;
create policy booklets_select
  on public.booklets
  for select
  to authenticated
  using (
    public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin')
  );

drop policy if exists booklets_insert on public.booklets;
create policy booklets_insert
  on public.booklets
  for insert
  to authenticated
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

drop policy if exists booklets_update on public.booklets;
create policy booklets_update
  on public.booklets
  for update
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

-- ---------------------------------------------------------------------------
-- Download / view audit log
-- ---------------------------------------------------------------------------

create table if not exists public.booklet_downloads (
  id uuid primary key default gen_random_uuid(),
  booklet_id uuid not null references public.booklets (id) on delete cascade,
  lecturer_id uuid not null references public.profiles (id),
  action text not null,
  created_at timestamptz not null default now(),
  constraint booklet_downloads_action_check check (action in ('view', 'download'))
);

create index if not exists booklet_downloads_lecturer_idx
  on public.booklet_downloads (lecturer_id, created_at desc);

alter table public.booklet_downloads enable row level security;

revoke all on public.booklet_downloads from anon;
grant select, insert on public.booklet_downloads to authenticated;

drop policy if exists booklet_downloads_select on public.booklet_downloads;
create policy booklet_downloads_select
  on public.booklet_downloads
  for select
  to authenticated
  using (
    lecturer_id = auth.uid()
    or public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  );

drop policy if exists booklet_downloads_insert on public.booklet_downloads;
create policy booklet_downloads_insert
  on public.booklet_downloads
  for insert
  to authenticated
  with check (
    lecturer_id = auth.uid()
    and public.profile_role(auth.uid()) = 'Lecturer'
  );

-- ---------------------------------------------------------------------------
-- Private storage bucket. Object key convention:
-- {academic_session}/{unit_code}/{registration_no}.pdf
-- Lecturers read via signed URLs (createSignedUrl requires SELECT).
-- Only Examination Officer / Admin may upload or replace.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booklets',
  'booklets',
  false,
  20971520,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

-- Mirror existing physical archive rows as not-yet-digitised booklets so
-- lecturer search has real records to return. No invented student data.
insert into public.booklets (
  unit_code,
  unit_name,
  programme,
  school,
  academic_session,
  registration_no,
  student_name,
  digitised,
  archive_id
)
select
  a.unit_code,
  a.unit_name,
  a.programme,
  a.school,
  a.academic_session,
  a.admission_number,
  a.student_name,
  false,
  a.id
from public.examination_archives a
where not exists (
  select 1 from public.booklets b where b.archive_id = a.id
);
