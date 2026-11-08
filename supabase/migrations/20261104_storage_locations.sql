-- Phase 4: vault storage locations (shelf options by school).
-- Officers pick shelves from this table instead of free-typed shelf text.

create table if not exists public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  shelf text not null,
  rack text not null default '',
  box text not null default '',
  slot text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists storage_locations_school_idx
  on public.storage_locations (school, is_active);

create unique index if not exists storage_locations_unique_idx
  on public.storage_locations (school, shelf, rack, box, slot);

alter table public.storage_locations enable row level security;

revoke all on public.storage_locations from anon;
grant select on public.storage_locations to authenticated;
grant insert, update, delete on public.storage_locations to authenticated;

drop policy if exists storage_locations_select on public.storage_locations;
create policy storage_locations_select
  on public.storage_locations
  for select
  to authenticated
  using (public.profile_role(auth.uid()) in ('Lecturer', 'Examination Officer', 'Admin'));

drop policy if exists storage_locations_write on public.storage_locations;
create policy storage_locations_write
  on public.storage_locations
  for all
  to authenticated
  using (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'))
  with check (public.profile_role(auth.uid()) in ('Examination Officer', 'Admin'));

-- Seed school shelves (Business A/B, Nursing C/D, Education E/F).
-- Law and Sheria: provisional G/H until the office confirms final letters.
insert into public.storage_locations (school, shelf, rack, box, slot)
select seed.school, seed.shelf, seed.rack, '', ''
from (
  values
    ('School of Business and Technology', 'Shelf A', 'Rack 1'),
    ('School of Business and Technology', 'Shelf A', 'Rack 2'),
    ('School of Business and Technology', 'Shelf A', 'Rack 3'),
    ('School of Business and Technology', 'Shelf B', 'Rack 1'),
    ('School of Business and Technology', 'Shelf B', 'Rack 2'),
    ('School of Business and Technology', 'Shelf B', 'Rack 3'),
    ('School of Nursing and Midwifery', 'Shelf C', 'Rack 1'),
    ('School of Nursing and Midwifery', 'Shelf C', 'Rack 2'),
    ('School of Nursing and Midwifery', 'Shelf D', 'Rack 1'),
    ('School of Nursing and Midwifery', 'Shelf D', 'Rack 2'),
    ('School of Education', 'Shelf E', 'Rack 1'),
    ('School of Education', 'Shelf E', 'Rack 2'),
    ('School of Education', 'Shelf F', 'Rack 1'),
    ('School of Education', 'Shelf F', 'Rack 2'),
    ('School of Law and Sheria', 'Shelf G', 'Rack 1'),
    ('School of Law and Sheria', 'Shelf H', 'Rack 1')
) as seed(school, shelf, rack)
where not exists (
  select 1
  from public.storage_locations s
  where s.school = seed.school
    and s.shelf = seed.shelf
    and s.rack = seed.rack
    and s.box = ''
    and s.slot = ''
);
