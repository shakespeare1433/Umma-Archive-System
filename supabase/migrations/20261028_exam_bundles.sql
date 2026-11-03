-- Physical examination bundles, cover-page booklet records, and bundle QR tokens.
-- Non-destructive: does not drop or rename existing tables.

create table if not exists public.exam_bundles (
  id uuid primary key default gen_random_uuid(),
  bundle_code text not null,
  qr_token uuid not null default gen_random_uuid(),
  qr_active boolean not null default true,
  school text not null,
  programme text not null,
  academic_year text not null,
  semester text not null,
  unit_code text not null,
  unit_name text not null,
  student_name text not null default '',
  registration_no text not null default '',
  store text not null,
  shelf text not null,
  rack text not null,
  position text not null,
  archived_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_bundles_code_not_blank check (btrim(bundle_code) <> ''),
  constraint exam_bundles_unit_not_blank check (btrim(unit_code) <> '' and btrim(unit_name) <> '')
);

create unique index if not exists exam_bundles_code_unique
  on public.exam_bundles (lower(btrim(bundle_code)));

create unique index if not exists exam_bundles_qr_token_unique
  on public.exam_bundles (qr_token);

create unique index if not exists exam_bundles_active_qr_unique
  on public.exam_bundles (qr_token)
  where qr_active = true;

create index if not exists exam_bundles_search_idx
  on public.exam_bundles (school, programme, academic_year, semester, unit_code);

create table if not exists public.exam_bundle_booklets (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.exam_bundles (id) on delete cascade,
  student_name text not null default '',
  registration_no text not null default '',
  school text not null default '',
  programme text not null default '',
  academic_year text not null default '',
  semester text not null default '',
  unit_code text not null default '',
  unit_name text not null default '',
  cover_path text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

create index if not exists exam_bundle_booklets_bundle_idx
  on public.exam_bundle_booklets (bundle_id, created_at);

alter table public.exam_bundles enable row level security;
alter table public.exam_bundle_booklets enable row level security;

revoke all on public.exam_bundles from anon;
revoke all on public.exam_bundle_booklets from anon;
grant select, insert, update on public.exam_bundles to authenticated;
grant select, insert, update on public.exam_bundle_booklets to authenticated;

drop policy if exists exam_bundles_select on public.exam_bundles;
create policy exam_bundles_select
  on public.exam_bundles
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

drop policy if exists exam_bundles_insert on public.exam_bundles;
create policy exam_bundles_insert
  on public.exam_bundles
  for insert
  to authenticated
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

drop policy if exists exam_bundles_update on public.exam_bundles;
create policy exam_bundles_update
  on public.exam_bundles
  for update
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

drop policy if exists exam_bundle_booklets_select on public.exam_bundle_booklets;
create policy exam_bundle_booklets_select
  on public.exam_bundle_booklets
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

drop policy if exists exam_bundle_booklets_insert on public.exam_bundle_booklets;
create policy exam_bundle_booklets_insert
  on public.exam_bundle_booklets
  for insert
  to authenticated
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

drop policy if exists exam_bundle_booklets_update on public.exam_bundle_booklets;
create policy exam_bundle_booklets_update
  on public.exam_bundle_booklets
  for update
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bundle-covers',
  'bundle-covers',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists bundle_covers_select on storage.objects;
create policy bundle_covers_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'bundle-covers'
    and public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin')
  );

drop policy if exists bundle_covers_insert on storage.objects;
create policy bundle_covers_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bundle-covers'
    and public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  );

drop policy if exists bundle_covers_update on storage.objects;
create policy bundle_covers_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'bundle-covers'
    and public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  )
  with check (
    bucket_id = 'bundle-covers'
    and public.profile_role(auth.uid()) in ('Examination Officer', 'Admin')
  );

create or replace function public.search_exam_bundles(
  p_school text default null,
  p_programme text default null,
  p_academic_year text default null,
  p_semester text default null,
  p_unit_code text default null,
  p_unit_name text default null,
  p_bundle_code text default null,
  p_student_name text default null,
  p_registration_no text default null
)
returns table (
  id uuid,
  bundle_code text,
  qr_token uuid,
  qr_active boolean,
  school text,
  programme text,
  academic_year text,
  semester text,
  unit_code text,
  unit_name text,
  student_name text,
  registration_no text,
  store text,
  shelf text,
  rack text,
  slot text,
  created_at timestamptz,
  booklet_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.id,
    b.bundle_code,
    b.qr_token,
    b.qr_active,
    b.school,
    b.programme,
    b.academic_year,
    b.semester,
    b.unit_code,
    b.unit_name,
    b.student_name,
    b.registration_no,
    b.store,
    b.shelf,
    b.rack,
    b.position as slot,
    b.created_at,
    (select count(*) from public.exam_bundle_booklets i where i.bundle_id = b.id) as booklet_count
  from public.exam_bundles b
  where
    (p_school is null or p_school = '' or p_school = 'All schools' or b.school = p_school)
    and (p_programme is null or p_programme = '' or p_programme = 'All programmes' or b.programme ilike '%' || p_programme || '%')
    and (p_academic_year is null or p_academic_year = '' or p_academic_year = 'All years' or b.academic_year = p_academic_year)
    and (p_semester is null or p_semester = '' or p_semester = 'All semesters' or b.semester = p_semester)
    and (p_unit_code is null or btrim(p_unit_code) = '' or b.unit_code ilike '%' || btrim(p_unit_code) || '%')
    and (p_unit_name is null or btrim(p_unit_name) = '' or b.unit_name ilike '%' || btrim(p_unit_name) || '%')
    and (p_bundle_code is null or btrim(p_bundle_code) = '' or b.bundle_code ilike '%' || btrim(p_bundle_code) || '%')
    and (
      p_student_name is null or btrim(p_student_name) = ''
      or b.student_name ilike '%' || btrim(p_student_name) || '%'
      or exists (
        select 1
        from public.exam_bundle_booklets i
        where i.bundle_id = b.id
          and i.student_name ilike '%' || btrim(p_student_name) || '%'
      )
    )
    and (
      p_registration_no is null or btrim(p_registration_no) = ''
      or b.registration_no ilike '%' || btrim(p_registration_no) || '%'
      or exists (
        select 1
        from public.exam_bundle_booklets i
        where i.bundle_id = b.id
          and i.registration_no ilike '%' || btrim(p_registration_no) || '%'
      )
    )
  order by b.created_at desc;
$$;

grant execute on function public.search_exam_bundles to authenticated;
