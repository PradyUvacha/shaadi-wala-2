-- #10. wedding_functions.phase may be null. Null shows no phase label.
-- Known template names and the spec's aliases still receive a default phase.
-- Existing rows are left as they are. A couple or planner can clear the phase in the editor.

create or replace function public.default_function_phase(p_name text)
returns text
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_name, '')))
    when 'roka' then 'pre_wedding'
    when 'sagai' then 'pre_wedding'
    when 'haldi' then 'pre_wedding'
    when 'mehendi' then 'pre_wedding'
    when 'sangeet' then 'pre_wedding'
    when 'wedding' then 'wedding_day'
    when 'vidaai' then 'wedding_day'
    when 'kanyadaan' then 'wedding_day'
    when 'saat phere' then 'wedding_day'
    when 'mangalsutra' then 'wedding_day'
    when 'reception' then 'post_wedding'
    when 'griha pravesh' then 'post_wedding'
    else 'pre_wedding'
  end
$$;

alter table public.wedding_functions alter column phase drop not null;

alter table public.wedding_functions drop constraint if exists wedding_functions_phase_check;
alter table public.wedding_functions
  add constraint wedding_functions_phase_check
  check (phase in ('pre_wedding', 'wedding_day', 'post_wedding'));

comment on column public.wedding_functions.phase is
  'pre_wedding, wedding_day, post_wedding, or null when the event has no phase.';
