-- Academic sessions: sample years 2023–2026 with Jan–Apr, May–Aug, Sep–Dec terms.

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

delete from public.academic_sessions
where name like '% January – May'
   or name like '% May – September'
   or name like '% January – April'
   or name like '% May – August'
   or name like '% September – December';

update public.vault_settings
set sessions = array[
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
where id = 1;
