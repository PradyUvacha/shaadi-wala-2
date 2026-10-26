-- A family member may log a payment on their own side, but they cannot edit the budget row.
-- Keep the spent total in step with those payments inside the database.

create or replace function public.sync_budget_actual_from_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_id uuid := coalesce(new.budget_item_id, old.budget_item_id);
  delta numeric := 0;
begin
  if tg_op = 'INSERT' then
    delta := new.amount;
  elsif tg_op = 'DELETE' then
    delta := -old.amount;
  elsif tg_op = 'UPDATE' then
    if new.budget_item_id is distinct from old.budget_item_id then
      update public.budget_items
      set actual = greatest(0, actual - old.amount)
      where id = old.budget_item_id;
      update public.budget_items
      set actual = actual + new.amount
      where id = new.budget_item_id;
      return new;
    end if;
    delta := new.amount - old.amount;
  end if;

  update public.budget_items
  set actual = greatest(0, actual + delta)
  where id = item_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists part_payments_sync_actual on public.part_payments;
create trigger part_payments_sync_actual
  after insert or update or delete on public.part_payments
  for each row execute function public.sync_budget_actual_from_payment();

revoke all on function public.sync_budget_actual_from_payment() from public;
