-- Phase 3: student-level index for combined PDF archives.
-- One examination_archives row can have many archived_scripts (page ranges).
-- Non-destructive: keeps existing booklet_scripts and backfills from it.

create table if not exists public.archived_scripts (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.examination_archives (id) on delete cascade,
  booklet_id uuid references public.booklets (id) on delete set null,
  student_name text not null default '',
  registration_number text not null default '',
  first_page integer,
  last_page integer,
  created_at timestamptz not null default now()
);

create index if not exists archived_scripts_archive_idx
  on public.archived_scripts (archive_id);

create index if not exists archived_scripts_booklet_idx
  on public.archived_scripts (booklet_id);

create index if not exists archived_scripts_student_idx
  on public.archived_scripts (registration_number, student_name);

create unique index if not exists archived_scripts_archive_reg_idx
  on public.archived_scripts (archive_id, lower(registration_number))
  where btrim(registration_number) <> '';

alter table public.archived_scripts enable row level security;

revoke all on public.archived_scripts from anon;
grant select, insert, update, delete on public.archived_scripts to authenticated;

drop policy if exists archived_scripts_select on public.archived_scripts;
create policy archived_scripts_select
  on public.archived_scripts
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

drop policy if exists archived_scripts_write on public.archived_scripts;
create policy archived_scripts_write
  on public.archived_scripts
  for all
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

-- Backfill from booklet_scripts where an archive link exists.
insert into public.archived_scripts (
  archive_id,
  booklet_id,
  student_name,
  registration_number,
  first_page,
  last_page
)
select
  s.archive_id,
  s.booklet_id,
  coalesce(s.student_name, ''),
  coalesce(s.registration_no, ''),
  s.start_page,
  s.end_page
from public.booklet_scripts s
where
  s.archive_id is not null
  and not exists (
    select 1
    from public.archived_scripts a
    where
      a.archive_id = s.archive_id
      and (
        (
          btrim(coalesce(s.registration_no, '')) <> ''
          and lower(a.registration_number) = lower(s.registration_no)
        )
        or (
          btrim(coalesce(s.registration_no, '')) = ''
          and lower(a.student_name) = lower(coalesce(s.student_name, ''))
          and a.first_page is not distinct from s.start_page
        )
      )
  );
