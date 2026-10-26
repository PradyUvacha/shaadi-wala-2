-- Community checklist templates. v1 copies the Hindu list onto each wedding.
-- Apply after 20261026190000_feedback_screenshot.sql. Safe to run again.
-- If permissions.sql is applied after this file, run this file again so
-- protect_task_update still stops a friend from changing position or function.

alter table public.weddings add column if not exists community text not null default 'hindu';
alter table public.weddings drop constraint if exists weddings_community_not_blank;
alter table public.weddings add constraint weddings_community_not_blank
  check (char_length(trim(community)) > 0);

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  community text not null,
  version integer not null,
  created_at timestamptz not null default now(),
  constraint checklist_templates_community_not_blank check (char_length(trim(community)) > 0),
  constraint checklist_templates_version_positive check (version > 0),
  constraint checklist_templates_community_version unique (community, version)
);

create table if not exists public.checklist_template_functions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  name text not null,
  position integer not null,
  constraint checklist_template_functions_name_not_blank check (char_length(trim(name)) > 0),
  constraint checklist_template_functions_position_positive check (position > 0),
  constraint checklist_template_functions_template_name unique (template_id, name),
  constraint checklist_template_functions_template_position unique (template_id, position)
);

create table if not exists public.checklist_template_rituals (
  id uuid primary key default gen_random_uuid(),
  function_id uuid not null references public.checklist_template_functions (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null check (category in ('Venue', 'Catering', 'Decor', 'Attire', 'Invitations', 'Other')),
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  position integer not null,
  constraint checklist_template_rituals_title_not_blank check (char_length(trim(title)) > 0),
  constraint checklist_template_rituals_position_positive check (position > 0),
  constraint checklist_template_rituals_function_title unique (function_id, title),
  constraint checklist_template_rituals_function_position unique (function_id, position)
);

create table if not exists public.wedding_functions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wedding_functions_name_not_blank check (char_length(trim(name)) > 0),
  constraint wedding_functions_position_nonnegative check (position >= 0),
  constraint wedding_functions_wedding_name unique (wedding_id, name)
);

create index if not exists wedding_functions_wedding_id_idx on public.wedding_functions (wedding_id);
create index if not exists checklist_template_functions_template_idx on public.checklist_template_functions (template_id);
create index if not exists checklist_template_rituals_function_idx on public.checklist_template_rituals (function_id);

-- Custom function names are allowed. Position is not unique so a reorder can swap two rows.
alter table public.tasks drop constraint if exists tasks_ceremony_check;
alter table public.tasks add column if not exists function_id uuid references public.wedding_functions (id) on delete cascade;
alter table public.tasks add column if not exists position integer not null default 0;
alter table public.tasks drop constraint if exists tasks_position_check;
alter table public.tasks add constraint tasks_position_check check (position >= 0);
create index if not exists tasks_function_id_idx on public.tasks (function_id);

-- Hindu v1 is the existing 53 hindu-starter rituals, grouped in ceremony order.
do $$
declare
  new_template uuid;
begin
  if exists (select 1 from public.checklist_templates where community = 'hindu' and version = 1) then
    return;
  end if;
  insert into public.checklist_templates (community, version)
  values ('hindu', 1)
  returning id into new_template;

  insert into public.checklist_template_functions (template_id, name, position)
  select new_template, items.ceremony, row_number() over (order by min(items.sort_order), items.ceremony)
  from public.ritual_template_items items
  where items.template_slug = 'hindu-starter'
  group by items.ceremony;

  insert into public.checklist_template_rituals (function_id, title, description, category, priority, position)
  select fn.id, items.title, items.description, items.category, items.priority,
         row_number() over (partition by items.ceremony order by items.sort_order, items.title)
  from public.ritual_template_items items
  join public.checklist_template_functions fn
    on fn.template_id = new_template and fn.name = items.ceremony
  where items.template_slug = 'hindu-starter';
end $$;

create or replace function public.copy_checklist(p_wedding_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wedding_community text;
  template uuid;
  fn public.checklist_template_functions%rowtype;
  new_function uuid;
  sort_base integer := 0;
  ritual_count integer := 0;
begin
  if exists (select 1 from public.wedding_functions where wedding_id = p_wedding_id) then
    return;
  end if;
  select community into wedding_community from public.weddings where id = p_wedding_id;
  if wedding_community is null then
    return;
  end if;
  select id into template
  from public.checklist_templates
  where community = wedding_community
  order by version desc
  limit 1;
  if template is null then
    return;
  end if;
  for fn in
    select * from public.checklist_template_functions
    where template_id = template
    order by position
  loop
    insert into public.wedding_functions (wedding_id, name, position)
    values (p_wedding_id, fn.name, fn.position)
    returning id into new_function;
    insert into public.tasks (
      wedding_id, function_id, title, description, category, priority,
      ceremony, status, template_title, sort_order, position
    )
    select
      p_wedding_id, new_function, ritual.title, ritual.description, ritual.category, ritual.priority,
      fn.name, 'Pending', ritual.title, sort_base + ritual.position, ritual.position
    from public.checklist_template_rituals ritual
    where ritual.function_id = fn.id
    order by ritual.position;
    select count(*) into ritual_count
    from public.checklist_template_rituals
    where function_id = fn.id;
    sort_base := sort_base + ritual_count;
  end loop;
end;
$$;

create or replace function public.backfill_checklists()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wedding record;
  ceremony_name text;
  ceremony_position integer;
  new_function uuid;
begin
  for wedding in select id from public.weddings loop
    if exists (select 1 from public.wedding_functions where wedding_id = wedding.id) then
      continue;
    end if;
    if exists (select 1 from public.tasks where wedding_id = wedding.id) then
      ceremony_position := 0;
      for ceremony_name in
        select grouped.name
        from (
          select coalesce(nullif(trim(ceremony), ''), 'Wedding') as name, min(sort_order) as ord
          from public.tasks
          where wedding_id = wedding.id
          group by 1
        ) grouped
        order by grouped.ord, grouped.name
      loop
        ceremony_position := ceremony_position + 1;
        insert into public.wedding_functions (wedding_id, name, position)
        values (wedding.id, ceremony_name, ceremony_position)
        returning id into new_function;
        update public.tasks as task
        set function_id = new_function,
            position = numbered.rn
        from (
          select id, row_number() over (order by sort_order, id) as rn
          from public.tasks
          where wedding_id = wedding.id
            and coalesce(nullif(trim(ceremony), ''), 'Wedding') = ceremony_name
        ) numbered
        where task.id = numbered.id;
      end loop;
    else
      perform public.copy_checklist(wedding.id);
    end if;
  end loop;
end;
$$;

-- Keep the 5-argument signature. v1 always stores community hindu and copies that template.
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
  return new_id;
end;
$$;

create or replace function public.sync_function_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.tasks set ceremony = new.name where function_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists wedding_functions_updated_at on public.wedding_functions;
create trigger wedding_functions_updated_at
before update on public.wedding_functions
for each row execute function public.set_updated_at();

drop trigger if exists wedding_functions_sync_name on public.wedding_functions;
create trigger wedding_functions_sync_name
after update on public.wedding_functions
for each row execute function public.sync_function_name();

create or replace function public.protect_task_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  scope text := public.permission_scope(old.wedding_id, 'tasks.edit');
  actor_side text := public.member_side(old.wedding_id);
begin
  if auth.uid() is null then
    return new;
  end if;
  if scope = 'all' then
    return new;
  end if;
  if scope = 'own_side' then
    if old.side is distinct from actor_side or new.side is distinct from actor_side then
      raise exception 'family can only edit their own side';
    end if;
    return new;
  end if;
  if scope = 'assigned' then
    if old.assigned_to is distinct from auth.uid() then
      raise exception 'friends can only update tasks assigned to them';
    end if;
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.category is distinct from old.category
      or new.priority is distinct from old.priority
      or new.ceremony is distinct from old.ceremony
      or new.due_date is distinct from old.due_date
      or new.assigned_to is distinct from old.assigned_to
      or new.side is distinct from old.side
      or new.template_title is distinct from old.template_title
      or new.sort_order is distinct from old.sort_order
      or new.position is distinct from old.position
      or new.function_id is distinct from old.function_id
      or new.wedding_id is distinct from old.wedding_id
    then
      raise exception 'friends can only complete tasks assigned to them';
    end if;
    return new;
  end if;
  raise exception 'no task access';
end;
$$;

select public.backfill_checklists();

alter table public.checklist_templates enable row level security;
alter table public.checklist_template_functions enable row level security;
alter table public.checklist_template_rituals enable row level security;
alter table public.wedding_functions enable row level security;

drop policy if exists checklist_templates_read on public.checklist_templates;
create policy checklist_templates_read on public.checklist_templates
for select to authenticated
using (true);

drop policy if exists checklist_template_functions_read on public.checklist_template_functions;
create policy checklist_template_functions_read on public.checklist_template_functions
for select to authenticated
using (true);

drop policy if exists checklist_template_rituals_read on public.checklist_template_rituals;
create policy checklist_template_rituals_read on public.checklist_template_rituals
for select to authenticated
using (true);

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

revoke all on function public.copy_checklist(uuid) from public;
revoke all on function public.backfill_checklists() from public;
revoke all on function public.sync_function_name() from public;
revoke all on function public.create_wedding(text, date, text, text, text) from public;
grant execute on function public.create_wedding(text, date, text, text, text) to authenticated;

grant select on public.checklist_templates, public.checklist_template_functions, public.checklist_template_rituals to authenticated;
grant select, insert, update, delete on public.wedding_functions to authenticated;
