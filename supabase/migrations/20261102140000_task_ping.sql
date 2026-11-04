-- A task that leaves a friend's assignment produces no postgres_changes event.
-- This ping tells members to refetch. The payload is only the table name and
-- the wedding id. Safe to run again. Does not alter or grant on realtime.messages.

create or replace function public.task_ping_topic_wedding(topic text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  matched text;
begin
  if topic is null then
    return null;
  end if;
  matched := substring(topic from '^wedding:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}):tasks$');
  if matched is null then
    return null;
  end if;
  return matched::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function public.task_ping_topic_wedding(text) from public;
grant execute on function public.task_ping_topic_wedding(text) to authenticated;

drop policy if exists wedding_members_read_task_pings on realtime.messages;
create policy wedding_members_read_task_pings
  on realtime.messages
  for select
  to authenticated
  using (
    topic = realtime.topic()
    and public.is_wedding_member(public.task_ping_topic_wedding(realtime.topic()))
  );

create or replace function public.ping_task_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  ping jsonb;
begin
  if tg_op = 'DELETE' then
    target := old.wedding_id;
  else
    target := new.wedding_id;
  end if;
  if target is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  ping := jsonb_build_object('table', 'tasks', 'wedding_id', target);
  ping := jsonb_build_object('table', ping ->> 'table', 'wedding_id', ping ->> 'wedding_id');
  begin
    perform realtime.send(
      ping,
      'task_ping',
      'wedding:' || target::text || ':tasks',
      true
    );
  exception
    when others then
      raise warning 'task list ping skipped: %', sqlerrm;
  end;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.ping_task_list() from public;
grant execute on function public.ping_task_list() to authenticated;

drop trigger if exists tasks_ping_list on public.tasks;
create trigger tasks_ping_list
  after insert or update or delete on public.tasks
  for each row execute function public.ping_task_list();
