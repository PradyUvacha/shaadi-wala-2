-- C-11 in 20261027130000 inserted A-P once, and skipped any row that already
-- had an 'Earlier spend (migrated)' note. A budget row written after that
-- file, or a later increase of actual, can still sit above the payment sum.
-- Insert the remaining gap for every currency. A second run inserts nothing,
-- because the new row makes the payment sum equal actual.
-- The whole-rupee trigger rejects a paise gap. It is off only for this insert,
-- and it is turned back on if the insert fails.

do $$
begin
  alter table public.part_payments disable trigger part_payments_whole_rupees;
  begin
    insert into public.part_payments (budget_item_id, amount, paid_by, paid_by_side, paid_on, notes)
    select
      b.id,
      b.actual - coalesce(paid.total, 0),
      'Earlier spend (migrated)',
      null,
      current_date,
      'Earlier spend (migrated)'
    from public.budget_items b
    left join (
      select budget_item_id, sum(amount) as total
      from public.part_payments
      group by budget_item_id
    ) paid on paid.budget_item_id = b.id
    where b.actual > coalesce(paid.total, 0);
    alter table public.part_payments enable trigger part_payments_whole_rupees;
  exception
    when others then
      alter table public.part_payments enable trigger part_payments_whole_rupees;
      raise;
  end;
end;
$$;
