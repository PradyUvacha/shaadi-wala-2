-- #10. A task belongs to an event through tasks.function_id.
-- The event phase lives on wedding_functions.phase.
-- Every member can read events. Only tasks.edit = all (couple and planner) can insert, update, or delete an event, including its phase.
-- A friend cannot move a task onto another event: protect_task_update rejects a function_id change when the scope is assigned.

alter table public.tasks
  add column if not exists function_id uuid references public.wedding_functions (id) on delete cascade;

create index if not exists tasks_function_id_idx on public.tasks (function_id);

alter table public.wedding_functions
  add column if not exists phase text not null default 'pre_wedding';

alter table public.wedding_functions drop constraint if exists wedding_functions_phase_check;
alter table public.wedding_functions
  add constraint wedding_functions_phase_check
  check (phase in ('pre_wedding', 'wedding_day', 'post_wedding'));

comment on column public.tasks.function_id is
  'Event (wedding function) this task belongs to. A null link is shown under Other tasks.';
comment on column public.wedding_functions.phase is
  'pre_wedding, wedding_day, or post_wedding.';

drop policy if exists wedding_functions_select on public.wedding_functions;
create policy wedding_functions_select on public.wedding_functions
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

drop policy if exists wedding_functions_insert on public.wedding_functions;
create policy wedding_functions_insert on public.wedding_functions
  for insert to authenticated
  with check (public.permission_scope(wedding_id, 'tasks.edit') = 'all');

drop policy if exists wedding_functions_update on public.wedding_functions;
create policy wedding_functions_update on public.wedding_functions
  for update to authenticated
  using (public.permission_scope(wedding_id, 'tasks.edit') = 'all')
  with check (public.permission_scope(wedding_id, 'tasks.edit') = 'all');

drop policy if exists wedding_functions_delete on public.wedding_functions;
create policy wedding_functions_delete on public.wedding_functions
  for delete to authenticated
  using (public.permission_scope(wedding_id, 'tasks.edit') = 'all');
