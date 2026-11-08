-- Phase 5: location history, custody status on archives, notification inserts for request flow.

-- ---------------------------------------------------------------------------
-- Location history
-- ---------------------------------------------------------------------------
create table if not exists public.location_history (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.examination_archives (id) on delete cascade,
  from_location text not null default '',
  to_location text not null default '',
  moved_by uuid references public.profiles (id) on delete set null,
  moved_at timestamptz not null default now()
);

create index if not exists location_history_archive_idx
  on public.location_history (archive_id, moved_at desc);

alter table public.location_history enable row level security;

revoke all on public.location_history from anon;
grant select, insert on public.location_history to authenticated;

drop policy if exists location_history_select on public.location_history;
create policy location_history_select
  on public.location_history
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

drop policy if exists location_history_insert on public.location_history;
create policy location_history_insert
  on public.location_history
  for insert
  to authenticated
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

-- ---------------------------------------------------------------------------
-- Archive custody status + last verified
-- ---------------------------------------------------------------------------
alter table public.examination_archives
  add column if not exists custody_status text not null default 'On shelf';

alter table public.examination_archives
  add column if not exists last_verified_at timestamptz;

update public.examination_archives
set custody_status = 'On shelf'
where custody_status is null
   or btrim(custody_status) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'examination_archives_custody_status_check'
  ) then
    alter table public.examination_archives
      add constraint examination_archives_custody_status_check
      check (custody_status in ('On shelf', 'Taken out', 'Moved'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Allow authenticated roles to create notifications (request flow)
-- ---------------------------------------------------------------------------
grant insert on public.notifications to authenticated;

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert
  on public.notifications
  for insert
  to authenticated
  with check (
    public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin')
  );
