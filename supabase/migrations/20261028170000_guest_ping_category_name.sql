-- A guest who leaves a member's side produces no postgres_changes event: RLS
-- drops it. This file sends a payload-free ping so that member can refetch.
-- The ping carries the table name and wedding id only.
-- A new category name must not repeat another name in the same wedding once
-- spaces and case are ignored. Rows already stored are left as they are.
-- Safe to run again. Does not replace a hosted realtime.send.

do $stub$
begin
  if to_regnamespace('realtime') is null then
    execute 'create schema realtime';
  end if;
  if to_regclass('realtime.messages') is null then
    execute $sql$
      create table realtime.messages (
        id bigint generated always as identity primary key,
        payload jsonb,
        event text,
        topic text,
        private boolean,
        extension text,
        inserted_at timestamptz not null default now()
      )
    $sql$;
  end if;
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null
     and to_regprocedure('realtime.send(jsonb,text,text)') is null then
    execute $sql$
      create function realtime.send(payload jsonb, event text, topic text, private boolean default true)
      returns void
      language plpgsql
      security definer
      set search_path = realtime, public
      as $fn$
      begin
        insert into realtime.messages (payload, event, topic, private, extension)
        values (payload, event, topic, private, 'broadcast');
      end;
      $fn$;
    $sql$;
  end if;
  if to_regprocedure('realtime.topic()') is null then
    execute $sql$
      create function realtime.topic()
      returns text
      language sql
      stable
      as $fn$
        select nullif(current_setting('realtime.topic', true), '');
      $fn$;
    $sql$;
  end if;
end
$stub$;

do $grant$
begin
  execute 'grant usage on schema realtime to authenticated';
  execute 'grant select on realtime.messages to authenticated';
  execute 'grant execute on function realtime.topic() to authenticated';
exception
  when insufficient_privilege then
    null;
end
$grant$;

create or replace function public.guest_ping_topic_wedding(topic text)
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
  matched := substring(topic from '^wedding:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}):guests$');
  if matched is null then
    return null;
  end if;
  return matched::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function public.guest_ping_topic_wedding(text) from public;
grant execute on function public.guest_ping_topic_wedding(text) to authenticated;

alter table realtime.messages enable row level security;

drop policy if exists wedding_members_read_guest_pings on realtime.messages;
create policy wedding_members_read_guest_pings
  on realtime.messages
  for select
  to authenticated
  using (
    topic = realtime.topic()
    and public.is_wedding_member(public.guest_ping_topic_wedding(realtime.topic()))
  );

create or replace function public.ping_guest_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
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
  begin
    perform realtime.send(
      jsonb_build_object('table', tg_table_name, 'wedding_id', target),
      'guest_ping',
      'wedding:' || target::text || ':guests',
      true
    );
  exception
    when others then
      raise warning 'guest list ping skipped: %', sqlerrm;
  end;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.ping_guest_list() from public;
grant execute on function public.ping_guest_list() to authenticated;

drop trigger if exists guests_ping_list on public.guests;
create trigger guests_ping_list
  after insert or update or delete on public.guests
  for each row execute function public.ping_guest_list();

drop trigger if exists guest_functions_ping_list on public.guest_functions;
create trigger guest_functions_ping_list
  after insert or update or delete on public.guest_functions
  for each row execute function public.ping_guest_list();

create or replace function public.enforce_budget_category_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and lower(btrim(new.category)) is not distinct from lower(btrim(old.category)) then
    return new;
  end if;
  if exists (
    select 1
    from public.budget_items
    where wedding_id = new.wedding_id
      and id is distinct from new.id
      and lower(btrim(category)) = lower(btrim(new.category))
  ) then
    raise exception 'A category with this name already exists.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_budget_category_name() from public;
grant execute on function public.enforce_budget_category_name() to authenticated;

drop trigger if exists budget_items_unique_name on public.budget_items;
create trigger budget_items_unique_name
  before insert or update of category on public.budget_items
  for each row execute function public.enforce_budget_category_name();
