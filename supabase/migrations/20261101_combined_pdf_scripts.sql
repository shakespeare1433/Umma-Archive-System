-- Combined-PDF student page mapping and missing-booklet requests.
-- Non-destructive: no drops of existing tables or archive rows.

insert into public.schools (name) values
  ('School of Law and Sheria')
on conflict (name) do nothing;

create table if not exists public.booklet_scripts (
  id uuid primary key default gen_random_uuid(),
  booklet_id uuid not null references public.booklets (id) on delete cascade,
  archive_id uuid references public.examination_archives (id) on delete set null,
  student_name text not null default '',
  registration_no text not null default '',
  start_page integer,
  end_page integer,
  created_at timestamptz not null default now()
);

create index if not exists booklet_scripts_booklet_idx
  on public.booklet_scripts (booklet_id);

create index if not exists booklet_scripts_student_idx
  on public.booklet_scripts (registration_no, student_name);

create unique index if not exists booklet_scripts_booklet_reg_idx
  on public.booklet_scripts (booklet_id, lower(registration_no))
  where btrim(registration_no) <> '';

alter table public.booklets
  add column if not exists start_page integer;

alter table public.booklets
  add column if not exists end_page integer;

alter table public.booklets
  add column if not exists script_count integer;

alter table public.retrieval_requests
  add column if not exists lecturer_note text;

alter table public.retrieval_requests
  add column if not exists officer_note text;

alter table public.retrieval_requests
  drop constraint if exists retrieval_requests_target_check;

alter table public.booklet_scripts enable row level security;

revoke all on public.booklet_scripts from anon;
grant select, insert, update, delete on public.booklet_scripts to authenticated;

drop policy if exists booklet_scripts_select on public.booklet_scripts;
create policy booklet_scripts_select
  on public.booklet_scripts
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

drop policy if exists booklet_scripts_write on public.booklet_scripts;
create policy booklet_scripts_write
  on public.booklet_scripts
  for all
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

insert into public.booklet_scripts (
  booklet_id,
  archive_id,
  student_name,
  registration_no,
  start_page,
  end_page
)
select
  b.id,
  b.archive_id,
  coalesce(b.student_name, ''),
  coalesce(b.registration_no, ''),
  b.start_page,
  b.end_page
from public.booklets b
where
  (
    btrim(coalesce(b.student_name, '')) <> ''
    or btrim(coalesce(b.registration_no, '')) <> ''
  )
  and not exists (
    select 1 from public.booklet_scripts s where s.booklet_id = b.id
  );
