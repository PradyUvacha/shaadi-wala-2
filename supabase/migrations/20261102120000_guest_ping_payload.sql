-- The guest ping must not tell a member which hidden guest changed.
-- realtime.send receives only the table name and the wedding id.
-- Safe to run again. Does not alter or grant on realtime.messages.

create or replace function public.ping_guest_list()
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
  ping := jsonb_build_object('table', tg_table_name, 'wedding_id', target);
  ping := jsonb_build_object('table', ping ->> 'table', 'wedding_id', ping ->> 'wedding_id');
  begin
    perform realtime.send(
      ping,
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
