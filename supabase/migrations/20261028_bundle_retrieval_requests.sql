-- Allow lecturers to request a physical exam bundle. Officers locate it, then
-- the lecturer is notified of the storage location and can scan the bundle QR.
-- Non-destructive: archive-based requests keep working.

alter table public.retrieval_requests
  alter column archive_id drop not null;

alter table public.retrieval_requests
  add column if not exists bundle_id uuid references public.exam_bundles (id) on delete cascade;

create index if not exists retrieval_requests_bundle_idx
  on public.retrieval_requests (bundle_id, created_at desc);

alter table public.retrieval_requests
  drop constraint if exists retrieval_requests_target_check;

alter table public.retrieval_requests
  add constraint retrieval_requests_target_check
  check (archive_id is not null or bundle_id is not null);

create or replace function public.on_retrieval_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notice_title text;
  notice_body text;
  location_text text;
begin
  if tg_op = 'INSERT' then
    if new.archive_id is not null then
      update public.examination_archives
        set is_requested = true,
            vault_status = 'Requested'
        where id = new.archive_id;
    end if;

    insert into public.notifications (audience, title, body, request_id)
    values (
      'officer',
      'New lecturer request',
      new.requester_name || ' requested ' || new.course_code
        || case
             when new.bundle_id is not null then ' (physical bundle ' || coalesce(new.reg_or_cohort, '') || ')'
             else ''
           end,
      new.id
    );

    insert into public.notifications (user_id, audience, title, body, request_id)
    values (
      new.requester_id,
      'user',
      'Request sent',
      'Your request for ' || new.course_code
        || ' was sent to the examination office. You will be notified when the bundle is located.',
      new.id
    );
  elsif tg_op = 'UPDATE' then
    if new.archive_id is not null then
      update public.examination_archives
        set is_requested = new.current_step < 5,
            vault_status = case
              when new.current_step >= 5 then 'Dispatched'
              when new.current_step >= 4 then 'Staged in Vault'
              else 'Requested'
            end
        where id = new.archive_id;
    end if;

    if new.current_step is distinct from old.current_step
       or new.officer_status is distinct from old.officer_status then
      location_text := coalesce(nullif(btrim(new.shelf_location), ''), '');
      if location_text = '' and new.bundle_id is not null then
        select btrim(concat_ws(' → ', b.store, b.shelf, b.rack, b.position))
          into location_text
          from public.exam_bundles b
         where b.id = new.bundle_id;
        location_text := coalesce(location_text, '');
      end if;

      if lower(coalesce(new.officer_status, '')) = 'located' then
        notice_title := 'Location found';
        notice_body := 'The examination officer located '
          || coalesce(nullif(btrim(new.reg_or_cohort), ''), new.course_code)
          || case
               when location_text <> '' then ' at ' || location_text
               else ''
             end
          || '. Go to that store location and scan the QR code on the physical bundle.';
      else
        notice_title := 'Request status updated';
        notice_body := new.course_code || ' is now ' || coalesce(new.officer_status, 'updated')
          || case
               when location_text <> '' then '. Found at ' || location_text
               else ''
             end
          || '.';
      end if;

      insert into public.notifications (user_id, audience, title, body, request_id)
      values (new.requester_id, 'user', notice_title, notice_body, new.id);
    end if;
  elsif tg_op = 'DELETE' then
    if old.archive_id is not null then
      update public.examination_archives
        set is_requested = false,
            vault_status = 'Verified in Vault'
        where id = old.archive_id;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;
