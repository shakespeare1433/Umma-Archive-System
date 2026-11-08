-- UMMA Exam Archive backend.
-- Run this once in the Supabase SQL editor.
-- Passwords are stored only by Supabase Auth (hashed). This script never inserts a password.
-- After this script, create the administrator with: node scripts/provision-admin.mjs

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Reference lists (not examination records)
-- ---------------------------------------------------------------------------

create table if not exists public.schools (
  name text primary key
);

create table if not exists public.programmes (
  school text not null references public.schools (name) on update cascade,
  code text not null,
  primary key (school, code)
);

create table if not exists public.academic_sessions (
  name text primary key
);

insert into public.schools (name) values
  ('School of Business and Technology'),
  ('School of Nursing and Midwifery'),
  ('School of Education'),
  ('School of Law and Sheria')
on conflict (name) do nothing;

insert into public.programmes (school, code) values
  ('School of Business and Technology', 'BSIT'),
  ('School of Business and Technology', 'BSCS'),
  ('School of Business and Technology', 'BCOM'),
  ('School of Business and Technology', 'BBM'),
  ('School of Business and Technology', 'BBIT'),
  ('School of Education', 'English Literature'),
  ('School of Education', 'Kiswahili Literature'),
  ('School of Education', 'History'),
  ('School of Education', 'IRE'),
  ('School of Education', 'Sciences'),
  ('School of Nursing and Midwifery', 'Nursing'),
  ('School of Nursing and Midwifery', 'Midwifery'),
  ('School of Law and Sheria', 'Law'),
  ('School of Law and Sheria', 'Islamic Studies'),
  ('School of Law and Sheria', 'Sheria')
on conflict (school, code) do nothing;

insert into public.academic_sessions (name) values
  ('2023 Jan – Apr'),
  ('2023 May – Aug'),
  ('2023 Sep – Dec'),
  ('2024 Jan – Apr'),
  ('2024 May – Aug'),
  ('2024 Sep – Dec'),
  ('2025 Jan – Apr'),
  ('2025 May – Aug'),
  ('2025 Sep – Dec'),
  ('2026 Jan – Apr'),
  ('2026 May – Aug'),
  ('2026 Sep – Dec')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Profiles. Role is the source of truth for Lecturer / Examination Officer / Admin.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  email text not null,
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  avatar_url text not null default '',
  role text not null,
  department text not null default '',
  faculty text not null default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('Lecturer', 'Examination Officer', 'Admin')),
  constraint profiles_status_check check (status in ('Active', 'Suspended'))
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create or replace function public.profile_role(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = uid;
$$;

create or replace function public.profile_status(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status from public.profiles where id = uid;
$$;

create or replace function public.guard_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text;
begin
  if lower(new.username) = 'admin' and new.role <> 'Admin' then
    raise exception 'The ADMIN username is reserved for the administrator.';
  end if;

  actor := public.profile_role(auth.uid());

  if new.role = 'Admin' and coalesce(auth.role(), '') <> 'service_role' and actor is distinct from 'Admin' then
    if not exists (
      select 1
      from auth.users
      where id = new.id
        and coalesce(raw_app_meta_data->>'role', '') = 'Admin'
    ) then
      raise exception 'Only an administrator can assign the Admin role.';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and coalesce(auth.role(), '') <> 'service_role'
     and actor is distinct from 'Admin' then
    new.role := old.role;
    new.status := old.status;
    if lower(new.username) = 'admin' then
      new.username := old.username;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before insert or update on public.profiles
  for each row execute function public.guard_profile();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role text;
  next_username text;
begin
  if coalesce(new.raw_app_meta_data->>'role', '') = 'Admin' then
    next_role := 'Admin';
  elsif coalesce(new.raw_user_meta_data->>'role', '') = 'Examination Officer' then
    next_role := 'Examination Officer';
  else
    next_role := 'Lecturer';
  end if;

  next_username := coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1));

  insert into public.profiles (id, username, email, name, phone, address, role, department, faculty, status)
  values (
    new.id,
    next_username,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    next_role,
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'faculty', ''),
    'Active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Username or email → auth email. Returns nothing else.
create or replace function public.resolve_sign_in_email(identifier text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where lower(username) = lower(btrim(identifier))
     or lower(email) = lower(btrim(identifier))
  limit 1;
$$;

revoke all on function public.resolve_sign_in_email(text) from public;
grant execute on function public.resolve_sign_in_email(text) to anon, authenticated;
grant execute on function public.profile_role(uuid) to authenticated;
grant execute on function public.profile_status(uuid) to authenticated;

alter table public.profiles enable row level security;

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

revoke insert, delete on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Examination archive. Officer writes. Lecturer search reads the same rows.
-- ---------------------------------------------------------------------------

create table if not exists public.examination_archives (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  programme text not null default '',
  academic_session text not null,
  unit_code text not null,
  unit_name text not null,
  student_name text not null default '',
  admission_number text not null default '',
  bundle_id text not null default '',
  script_count integer not null default 1,
  shelf text not null,
  rack text not null,
  box text not null,
  position text not null,
  status text not null default 'Original Booklet',
  vault_status text not null default 'Verified in Vault',
  is_requested boolean not null default false,
  archived_at timestamptz not null default now(),
  archived_by uuid references public.profiles (id)
);

alter table public.examination_archives
  add column if not exists archived_by uuid references public.profiles (id);

alter table public.examination_archives
  add column if not exists bundle_id text not null default '';

create index if not exists examination_archives_search_idx
  on public.examination_archives (school, programme, academic_session, unit_code);

alter table public.examination_archives enable row level security;

revoke all on public.examination_archives from anon;
grant select, insert, update on public.examination_archives to authenticated;

drop policy if exists "examination_archives_select" on public.examination_archives;
drop policy if exists "examination_archives_insert" on public.examination_archives;
drop policy if exists "examination_archives_update" on public.examination_archives;
drop policy if exists archives_select on public.examination_archives;
drop policy if exists archives_insert on public.examination_archives;
drop policy if exists archives_update on public.examination_archives;

create policy archives_select
  on public.examination_archives
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

create policy archives_insert
  on public.examination_archives
  for insert
  to authenticated
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

create policy archives_update
  on public.examination_archives
  for update
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

create or replace function public.search_examination_archives(
  p_school text default null,
  p_programme text default null,
  p_session text default null,
  p_unit_code text default null,
  p_unit_name text default null,
  p_student_name text default null,
  p_admission_number text default null,
  p_bundle_id text default null,
  p_query text default null
)
returns setof public.examination_archives
language sql
stable
as $$
  select *
  from public.examination_archives a
  where
    (p_school is null or p_school = '' or p_school = 'All schools' or a.school = p_school)
    and (p_programme is null or p_programme = '' or p_programme = 'All programmes' or a.programme ilike '%' || p_programme || '%')
    and (p_session is null or p_session = '' or p_session = 'All sessions' or a.academic_session = p_session)
    and (
      p_unit_code is null or p_unit_code = ''
      or a.unit_code ilike '%' || p_unit_code || '%'
      or a.unit_name ilike '%' || p_unit_code || '%'
    )
    and (
      p_unit_name is null or p_unit_name = ''
      or a.unit_name ilike '%' || p_unit_name || '%'
      or a.unit_code ilike '%' || p_unit_name || '%'
    )
    and (p_student_name is null or p_student_name = '' or a.student_name ilike '%' || p_student_name || '%')
    and (p_admission_number is null or p_admission_number = '' or a.admission_number ilike '%' || p_admission_number || '%')
    and (p_bundle_id is null or btrim(p_bundle_id) = '' or a.bundle_id ilike '%' || btrim(p_bundle_id) || '%')
    and (
      p_query is null or btrim(p_query) = ''
      or a.unit_code ilike '%' || p_query || '%'
      or a.unit_name ilike '%' || p_query || '%'
      or a.programme ilike '%' || p_query || '%'
      or a.student_name ilike '%' || p_query || '%'
      or a.admission_number ilike '%' || p_query || '%'
      or a.bundle_id ilike '%' || p_query || '%'
    )
  order by a.archived_at desc;
$$;

grant execute on function public.search_examination_archives to authenticated;

-- ---------------------------------------------------------------------------
-- Lecturer retrieval requests and status
-- ---------------------------------------------------------------------------

create table if not exists public.retrieval_requests (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.examination_archives (id) on delete cascade,
  requester_id uuid not null references public.profiles (id),
  requester_name text not null,
  request_type text not null,
  course_code text not null,
  course_title text not null,
  academic_session text not null,
  school text not null,
  reg_or_cohort text not null default '',
  student_name text not null default '',
  current_step integer not null default 1,
  total_steps integer not null default 4,
  step_status_text text,
  shelf_location text,
  rack text,
  box text,
  ready_eta text,
  custodian text,
  officer_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retrieval_requests_type_check check (request_type in ('PHYSICAL RETRIEVAL', 'MODERATION PULL')),
  constraint retrieval_requests_step_check check (current_step between 1 and 5)
);

create index if not exists retrieval_requests_requester_idx
  on public.retrieval_requests (requester_id, created_at desc);

alter table public.retrieval_requests enable row level security;

revoke all on public.retrieval_requests from anon;
grant select, insert, update, delete on public.retrieval_requests to authenticated;

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
-- Notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  audience text not null,
  title text not null,
  body text not null,
  request_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_audience_check check (audience in ('user', 'officer', 'admin', 'lecturer'))
);

create index if not exists notifications_created_idx
  on public.notifications (created_at desc);

alter table public.notifications enable row level security;

revoke all on public.notifications from anon;
grant select, update, delete on public.notifications to authenticated;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select
  on public.notifications
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or (audience = 'officer' and public.profile_role(auth.uid()) = 'Examination Officer')
    or (audience = 'admin' and public.profile_role(auth.uid()) = 'Admin')
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
-- Search history
-- ---------------------------------------------------------------------------

create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  title text not null,
  category text not null default '',
  time_text text not null,
  is_today boolean not null default true,
  icon_name text not null default 'folder-outline',
  searched_at timestamptz not null default now()
);

create index if not exists search_history_user_idx
  on public.search_history (user_id, searched_at desc);

alter table public.search_history enable row level security;

revoke all on public.search_history from anon;
grant select, insert, delete on public.search_history to authenticated;

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
-- Vault settings (configuration, not archive records)
-- ---------------------------------------------------------------------------

create table if not exists public.vault_settings (
  id integer primary key default 1,
  academic_year text not null,
  dispatch_hours integer not null default 4,
  faculties text[] not null,
  sessions text[] not null,
  constraint vault_settings_singleton check (id = 1)
);

insert into public.vault_settings (id, academic_year, dispatch_hours, faculties, sessions)
values (
  1,
  '2024/2025 Academic Year',
  4,
  array[
    'School of Business and Technology',
    'School of Nursing and Midwifery',
    'School of Education',
    'School of Law and Sheria'
  ],
  array[
    '2023 Jan – Apr',
    '2023 May – Aug',
    '2023 Sep – Dec',
    '2024 Jan – Apr',
    '2024 May – Aug',
    '2024 Sep – Dec',
    '2025 Jan – Apr',
    '2025 May – Aug',
    '2025 Sep – Dec',
    '2026 Jan – Apr',
    '2026 May – Aug',
    '2026 Sep – Dec'
  ]
)
on conflict (id) do nothing;

alter table public.vault_settings enable row level security;

revoke all on public.vault_settings from anon;
grant select, update on public.vault_settings to authenticated;

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

grant select on public.schools to authenticated;
grant select on public.programmes to authenticated;
grant select on public.academic_sessions to authenticated;

alter table public.schools enable row level security;
alter table public.programmes enable row level security;
alter table public.academic_sessions enable row level security;

drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools for select to authenticated using (true);

drop policy if exists programmes_select on public.programmes;
create policy programmes_select on public.programmes for select to authenticated using (true);

drop policy if exists sessions_select on public.academic_sessions;
create policy sessions_select on public.academic_sessions for select to authenticated using (true);

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

-- Keep archive request flags in sync with retrieval_requests. Lecturers do not update archive rows.
create or replace function public.on_retrieval_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.examination_archives
      set is_requested = true,
          vault_status = 'Requested'
      where id = new.archive_id;

    insert into public.notifications (audience, title, body, request_id)
    values (
      'officer',
      'New lecturer request',
      new.requester_name || ' requested ' || new.course_code,
      new.id
    );

    insert into public.notifications (audience, title, body, request_id)
    values (
      'admin',
      'Lecturer: New lecturer request',
      new.requester_name || ' requested ' || new.course_code,
      new.id
    );

    insert into public.notifications (user_id, audience, title, body, request_id)
    values (
      new.requester_id,
      'user',
      'Request sent',
      'Your request for ' || new.course_code || ' was sent to the examination office.',
      new.id
    );
  elsif tg_op = 'UPDATE' then
    update public.examination_archives
      set is_requested = new.current_step < 5,
          vault_status = case
            when new.current_step >= 5 then 'Dispatched'
            when new.current_step >= 4 then 'Staged in Vault'
            else 'Requested'
          end
      where id = new.archive_id;

    if new.current_step is distinct from old.current_step
       or new.officer_status is distinct from old.officer_status then
      insert into public.notifications (user_id, audience, title, body, request_id)
      values (
        new.requester_id,
        'user',
        'Request status updated',
        new.course_code || ' is now ' || coalesce(new.officer_status, 'updated')
        || case
             when coalesce(new.shelf_location, '') <> '' then '. Booklet found at ' || new.shelf_location
             else ''
           end
        || '.',
        new.id
      );

      insert into public.notifications (audience, title, body, request_id)
      values (
        'admin',
        'Officer: Request status updated',
        new.course_code || ' is now ' || coalesce(new.officer_status, 'updated')
        || case
             when coalesce(new.shelf_location, '') <> '' then '. Booklet found at ' || new.shelf_location
             else ''
           end
        || '.',
        new.id
      );
    end if;
  elsif tg_op = 'DELETE' then
    update public.examination_archives
      set is_requested = false,
          vault_status = 'Verified in Vault'
      where id = old.archive_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists retrieval_requests_sync on public.retrieval_requests;
create trigger retrieval_requests_sync
  after insert or update or delete on public.retrieval_requests
  for each row execute function public.on_retrieval_request();
