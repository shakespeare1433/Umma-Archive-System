-- Mirror lecturer/officer request activity to Admin notifications.

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
