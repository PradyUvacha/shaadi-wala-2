-- Task costs live off public.tasks so a friend select, realtime payload, or RETURNING row cannot carry them.
-- (a) planner and friend changes to actual_cost / budget_category_id raise in a BEFORE INSERT OR UPDATE trigger.
-- (b) money is numeric. Sums stay numeric. There is no int4 cast.
-- (c) task_costs SELECT requires budget.view = all. Friend (budget.view none) gets no rows and no realtime events.
-- C-11: keep every payment. Drop the sync trigger first so an opening row is not added on top of actual.
-- Per item, A is budget_items.actual and P is the sum of existing payments. Insert one
-- 'Earlier spend (migrated)' payment for A-P only when A > P. Otherwise insert nothing.
-- Migrated actual is max(A, P). Safe to rerun: the note guard and the A > P check both hold.

alter table public.budget_items drop constraint if exists budget_items_category_name_check;

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
      and rel.relname = 'budget_items'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%category%'
      and pg_get_constraintdef(con.oid) not ilike '%estimated%'
      and pg_get_constraintdef(con.oid) not ilike '%actual%'
  loop
    execute format('alter table public.budget_items drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.budget_items
  add constraint budget_items_category_name_check
  check (char_length(btrim(category)) between 1 and 40);

create table if not exists public.task_costs (
  task_id uuid primary key references public.tasks (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  actual_cost numeric check (actual_cost is null or actual_cost >= 0),
  budget_category_id uuid references public.budget_items (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create index if not exists task_costs_wedding_id_idx on public.task_costs (wedding_id);
create index if not exists task_costs_budget_category_id_idx on public.task_costs (budget_category_id);

alter table public.task_costs replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_costs'
  ) then
    alter publication supabase_realtime add table public.task_costs;
  end if;
end $$;

alter table public.task_costs enable row level security;

drop policy if exists task_costs_select on public.task_costs;
drop policy if exists task_costs_insert on public.task_costs;
drop policy if exists task_costs_update on public.task_costs;
drop policy if exists task_costs_delete on public.task_costs;

create policy task_costs_select on public.task_costs
  for select to authenticated
  using (public.permission_scope(wedding_id, 'budget.view') = 'all');

create policy task_costs_insert on public.task_costs
  for insert to authenticated
  with check (public.is_wedding_member(wedding_id));

create policy task_costs_update on public.task_costs
  for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

create policy task_costs_delete on public.task_costs
  for delete to authenticated
  using (public.wedding_role(wedding_id) in ('bride', 'groom'));

grant select, insert, update, delete on public.task_costs to authenticated;

-- OQ-15. Flip together with PLANNER_CAN_EDIT_TASK_COSTS in src/config/budgetRules.ts.
create or replace function public.planner_can_edit_task_costs()
returns boolean
language sql
immutable
as $$
  select false
$$;

-- OQ-14. Flip together with ACTUAL_COUNTS_DONE_TASKS_ONLY in src/config/budgetRules.ts.
create or replace function public.task_cost_counts_when_done()
returns boolean
language sql
immutable
as $$
  select true
$$;

create or replace function public.protect_task_cost_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  task_side text;
  task_wedding uuid;
begin
  if auth.uid() is null then
    return new;
  end if;

  select wedding_id, side into task_wedding, task_side
  from public.tasks
  where id = new.task_id;

  if task_wedding is null or task_wedding is distinct from new.wedding_id then
    raise exception 'task cost wedding mismatch';
  end if;

  actor_role := public.wedding_role(new.wedding_id);

  if actor_role = 'friend' then
    raise exception 'friends cannot edit task costs';
  end if;

  if actor_role = 'planner' and not public.planner_can_edit_task_costs() then
    if tg_op = 'INSERT' then
      if new.actual_cost is not null or new.budget_category_id is not null then
        raise exception 'planners cannot edit task costs';
      end if;
    elsif new.actual_cost is distinct from old.actual_cost
      or new.budget_category_id is distinct from old.budget_category_id then
      raise exception 'planners cannot edit task costs';
    end if;
  end if;

  if actor_role = 'family' and task_side is distinct from public.member_side(new.wedding_id) then
    raise exception 'family can only edit costs on their own side';
  end if;

  if actor_role is null or actor_role not in ('bride', 'groom', 'family', 'planner') then
    raise exception 'no task cost access';
  end if;

  return new;
end;
$$;

drop trigger if exists task_costs_protect on public.task_costs;
create trigger task_costs_protect
  before insert or update on public.task_costs
  for each row execute function public.protect_task_cost_update();

drop trigger if exists task_costs_updated_at on public.task_costs;
create trigger task_costs_updated_at
  before update on public.task_costs
  for each row execute function public.set_updated_at();

revoke all on function public.protect_task_cost_update() from public;
revoke all on function public.planner_can_edit_task_costs() from public;
revoke all on function public.task_cost_counts_when_done() from public;
grant execute on function public.planner_can_edit_task_costs() to authenticated;
grant execute on function public.task_cost_counts_when_done() to authenticated;

create or replace view public.task_cost_rollups
with (security_invoker = true) as
select
  tc.wedding_id,
  tc.budget_category_id,
  sum(tc.actual_cost) filter (
    where not public.task_cost_counts_when_done() or t.status = 'Completed'
  ) as actual_cost
from public.task_costs tc
join public.tasks t on t.id = tc.task_id
where tc.actual_cost is not null
group by tc.wedding_id, tc.budget_category_id;

grant select on public.task_cost_rollups to authenticated;

create or replace function public.protect_budget_item_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

-- C-11. The sync trigger would add A-P onto actual. Drop it before inserting the gap.
drop trigger if exists part_payments_sync_actual on public.part_payments;

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
where b.actual > coalesce(paid.total, 0)
  and not exists (
    select 1
    from public.part_payments existing
    where existing.budget_item_id = b.id
      and existing.notes = 'Earlier spend (migrated)'
  );

create or replace function public.seed_default_budget_categories(p_wedding_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  category_name text;
  item_id uuid;
begin
  foreach category_name in array array[
    'Attire', 'Catering', 'Decor', 'Invitations', 'Make Up Artists', 'Photography', 'Venue'
  ]
  loop
    if exists (
      select 1 from public.budget_items
      where wedding_id = p_wedding_id and category = category_name
    ) then
      continue;
    end if;
    insert into public.budget_items (wedding_id, category, currency, estimated, actual, paid, notes, paid_by_side)
    values (p_wedding_id, category_name, 'INR', 0, 0, false, '', 'both')
    returning id into item_id;
    insert into public.budget_splits (budget_item_id, name, pct, side)
    values
      (item_id, 'Bride''s Family', 50, 'bride'),
      (item_id, 'Groom''s Family', 50, 'groom');
  end loop;
end;
$$;

revoke all on function public.seed_default_budget_categories(uuid) from public;
revoke all on function public.seed_default_budget_categories(uuid) from authenticated;

create or replace function public.create_wedding(
  p_couple_names text,
  p_wedding_date date,
  p_side text,
  p_display_name text,
  p_city text default ''
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  clean_side text := lower(trim(p_side));
  clean_city text := left(trim(coalesce(p_city, '')), 80);
begin
  if auth.uid() is null then raise exception 'sign in before creating a wedding'; end if;
  if clean_side not in ('bride', 'groom') then raise exception 'side must be bride or groom'; end if;
  if length(trim(p_couple_names)) = 0 then raise exception 'couple names are required'; end if;
  if length(trim(p_display_name)) = 0 then raise exception 'your name is required'; end if;
  if length(clean_city) = 0 then raise exception 'city is required'; end if;
  insert into public.weddings (couple_names, wedding_date, city, created_by, community)
  values (trim(p_couple_names), p_wedding_date, clean_city, auth.uid(), 'hindu')
  returning id into new_id;
  insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
  values (new_id, auth.uid(), clean_side, clean_side, trim(p_display_name));
  perform public.copy_checklist(new_id);
  perform public.seed_default_budget_categories(new_id);
  return new_id;
end;
$$;

select public.seed_default_budget_categories(id) from public.weddings;
