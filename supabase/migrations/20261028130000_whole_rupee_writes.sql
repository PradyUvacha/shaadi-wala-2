-- New task costs and payments must be whole rupees, from 0 (costs) or 1 (payments)
-- up to ₹10 crore. An update that does not change the amount leaves an older
-- paise value in place.

create or replace function public.enforce_whole_rupee_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  amount numeric;
  previous numeric;
  allow_zero boolean := tg_argv[0] = 'allow_zero';
begin
  if tg_table_name = 'task_costs' then
    amount := new.actual_cost;
    if tg_op = 'UPDATE' then
      previous := old.actual_cost;
    end if;
  else
    amount := new.amount;
    if tg_op = 'UPDATE' then
      previous := old.amount;
    end if;
  end if;

  if tg_op = 'UPDATE' and amount is not distinct from previous then
    return new;
  end if;

  if tg_table_name = 'task_costs' and amount is null then
    return new;
  end if;

  if amount is null
    or amount <> trunc(amount)
    or amount > 100000000
    or (allow_zero and amount < 0)
    or (not allow_zero and amount <= 0)
  then
    raise exception 'enter whole rupees from % to 100000000',
      case when allow_zero then '0' else '1' end;
  end if;

  return new;
end;
$$;

drop trigger if exists task_costs_whole_rupees on public.task_costs;
create trigger task_costs_whole_rupees
  before insert or update on public.task_costs
  for each row execute function public.enforce_whole_rupee_write('allow_zero');

drop trigger if exists part_payments_whole_rupees on public.part_payments;
create trigger part_payments_whole_rupees
  before insert or update on public.part_payments
  for each row execute function public.enforce_whole_rupee_write('payment');

revoke all on function public.enforce_whole_rupee_write() from public;
