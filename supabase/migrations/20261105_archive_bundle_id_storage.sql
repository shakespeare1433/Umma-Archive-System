-- Bundle ID on examination archives + keep storage columns as text selectors.
alter table public.examination_archives
  add column if not exists bundle_id text not null default '';
