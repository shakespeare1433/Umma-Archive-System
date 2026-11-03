-- Distinguish physical booklet access requests from missing-PDF investigations.
-- Non-destructive: preserves existing retrieval_requests rows.

alter table public.retrieval_requests
  add column if not exists request_kind text not null default 'PHYSICAL_BOOKLET';

alter table public.retrieval_requests
  add column if not exists position text;

update public.retrieval_requests
set request_kind = 'MISSING_PDF_INVESTIGATION'
where archive_id is null
  and coalesce(request_kind, '') = 'PHYSICAL_BOOKLET';

alter table public.retrieval_requests
  drop constraint if exists retrieval_requests_kind_check;

alter table public.retrieval_requests
  add constraint retrieval_requests_kind_check
  check (request_kind in ('PHYSICAL_BOOKLET', 'MISSING_PDF_INVESTIGATION'));
