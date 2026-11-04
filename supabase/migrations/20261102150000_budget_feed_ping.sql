-- Payments, budget items, and feed deletes can leave another member's
-- filtered subscription with a stale row. These pings tell members to
-- refetch. Each payload is only the table name and the wedding id.
-- Safe to run again. Does not alter or grant on realtime.messages.

create or replace function public.budget_ping_topic_wedding(topic text)
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
  matched := substring(topic from '^wedding:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}):budget$');
  if matched is null then
    return null;
  end if;
  return matched::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.feed_ping_topic_wedding(topic text)
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
  matched := substring(topic from '^wedding:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}):feed$');
  if matched is null then
    return null;
  end if;
  return matched::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke all on function public.budget_ping_topic_wedding(text) from public;
grant execute on function public.budget_ping_topic_wedding(text) to authenticated;
revoke all on function public.feed_ping_topic_wedding(text) from public;
grant execute on function public.feed_ping_topic_wedding(text) to authenticated;

drop policy if exists wedding_members_read_budget_pings on realtime.messages;
create policy wedding_members_read_budget_pings
  on realtime.messages
  for select
  to authenticated
  using (
    topic = realtime.topic()
    and public.is_wedding_member(public.budget_ping_topic_wedding(realtime.topic()))
  );

drop policy if exists wedding_members_read_feed_pings on realtime.messages;
create policy wedding_members_read_feed_pings
  on realtime.messages
  for select
  to authenticated
  using (
    topic = realtime.topic()
    and public.is_wedding_member(public.feed_ping_topic_wedding(realtime.topic()))
  );

create or replace function public.send_wedding_list_ping(
  target uuid,
  ping_table text,
  event_name text,
  topic_suffix text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ping jsonb;
begin
  if target is null or ping_table is null or event_name is null or topic_suffix is null then
    return;
  end if;
  if ping_table not in ('budget_items', 'part_payments', 'wedding_feed') then
    return;
  end if;
  if topic_suffix not in ('budget', 'feed') then
    return;
  end if;
  ping := jsonb_build_object('table', ping_table, 'wedding_id', target);
  ping := jsonb_build_object('table', ping ->> 'table', 'wedding_id', ping ->> 'wedding_id');
  begin
    perform realtime.send(
      ping,
      event_name,
      'wedding:' || target::text || ':' || topic_suffix,
      true
    );
  exception
    when others then
      raise warning 'list ping skipped: %', sqlerrm;
  end;
end;
$$;

revoke all on function public.send_wedding_list_ping(uuid, text, text, text) from public;
grant execute on function public.send_wedding_list_ping(uuid, text, text, text) to authenticated;

create or replace function public.ping_budget_item_list()
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
  perform public.send_wedding_list_ping(target, 'budget_items', 'budget_ping', 'budget');
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.ping_payment_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_id uuid;
  target uuid;
begin
  if tg_op = 'DELETE' then
    item_id := old.budget_item_id;
  else
    item_id := new.budget_item_id;
  end if;
  select wedding_id into target from public.budget_items where id = item_id;
  perform public.send_wedding_list_ping(target, 'part_payments', 'budget_ping', 'budget');
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.ping_feed_list()
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
  perform public.send_wedding_list_ping(target, 'wedding_feed', 'feed_ping', 'feed');
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.ping_budget_item_list() from public;
grant execute on function public.ping_budget_item_list() to authenticated;
revoke all on function public.ping_payment_list() from public;
grant execute on function public.ping_payment_list() to authenticated;
revoke all on function public.ping_feed_list() from public;
grant execute on function public.ping_feed_list() to authenticated;

drop trigger if exists budget_items_ping_list on public.budget_items;
create trigger budget_items_ping_list
  after insert or update or delete on public.budget_items
  for each row execute function public.ping_budget_item_list();

drop trigger if exists part_payments_ping_list on public.part_payments;
create trigger part_payments_ping_list
  after insert or update or delete on public.part_payments
  for each row execute function public.ping_payment_list();

drop trigger if exists wedding_feed_ping_list on public.wedding_feed;
create trigger wedding_feed_ping_list
  after insert or update or delete on public.wedding_feed
  for each row execute function public.ping_feed_list();
