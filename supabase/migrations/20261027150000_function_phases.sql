-- #10. Three phases. Known ceremonies are placed by name. Custom functions stay pre_wedding until edited.
-- pre_wedding: Roka, Sagai, Haldi, Mehendi, Sangeet
-- wedding_day: Wedding, Vidaai
-- post_wedding: Reception

create or replace function public.default_function_phase(p_name text)
returns text
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_name, '')))
    when 'wedding' then 'wedding_day'
    when 'vidaai' then 'wedding_day'
    when 'reception' then 'post_wedding'
    else 'pre_wedding'
  end
$$;

alter table public.wedding_functions
  add column if not exists phase text not null default 'pre_wedding';

alter table public.wedding_functions drop constraint if exists wedding_functions_phase_check;
alter table public.wedding_functions
  add constraint wedding_functions_phase_check
  check (phase in ('pre_wedding', 'wedding_day', 'post_wedding'));

update public.wedding_functions
set phase = public.default_function_phase(name)
where phase = 'pre_wedding'
  and lower(btrim(name)) in ('wedding', 'vidaai', 'reception');

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
    insert into public.wedding_functions (wedding_id, name, position, phase)
    values (p_wedding_id, fn.name, fn.position, public.default_function_phase(fn.name))
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

revoke all on function public.default_function_phase(text) from public;
grant execute on function public.default_function_phase(text) to authenticated;
