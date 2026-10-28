-- Wedding deletion cascades through budget categories. A direct category delete
-- still stops when a task or payment is linked. Account deletion calls that
-- cascade, so the block must not run inside it, and the task-cost link must
-- not be ON DELETE RESTRICT.

create or replace function public.protect_budget_item_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Depth 1 is a direct delete. A wedding or account delete reaches this row
  -- from the foreign-key cascade, which is already a trigger.
  if pg_trigger_depth() > 1 then
    return old;
  end if;
  if exists (select 1 from public.part_payments where budget_item_id = old.id)
    or exists (select 1 from public.task_costs where budget_category_id = old.id) then
    raise exception 'Move linked tasks and payments before deleting this category.';
  end if;
  return old;
end;
$$;

drop trigger if exists budget_items_protect_delete on public.budget_items;
create trigger budget_items_protect_delete
  before delete on public.budget_items
  for each row execute function public.protect_budget_item_delete();

revoke all on function public.protect_budget_item_delete() from public;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'task_costs'
      and con.contype = 'f'
      and pg_get_constraintdef(con.oid) ilike '%budget_items%'
  loop
    execute format('alter table public.task_costs drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.task_costs
  add constraint task_costs_budget_category_id_fkey
  foreign key (budget_category_id) references public.budget_items (id) on delete cascade;
