-- Final visibility: family and friends read their own side and Mutual (side 'both').
-- The opposite side stays hidden. Couple and planner still read every guest.
-- guests_select_side is the retired name. The live policy is guests_select_by_permission.
-- guest_functions select uses the same rule. Delete of a Mutual guest stays with
-- guests_delete_by_permission (couple and planner only). This file does not change that delete policy.
-- Custom events default to pre_wedding. The eight Hindu template names keep their phases.

drop policy if exists guests_select_side on public.guests;
drop policy if exists guests_select_by_permission on public.guests;
create policy guests_select_by_permission on public.guests
  for select to authenticated
  using (
    case public.permission_scope(wedding_id, 'guests.view')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id) or side = 'both'
      else false
    end
  );

drop policy if exists guest_functions_select on public.guest_functions;
create policy guest_functions_select on public.guest_functions
  for select to authenticated
  using (
    exists (
      select 1 from public.guests g
      where g.id = guest_id
        and g.wedding_id = guest_functions.wedding_id
        and case public.permission_scope(guest_functions.wedding_id, 'guests.view')
          when 'all' then true
          when 'own_side' then g.side = public.member_side(guest_functions.wedding_id) or g.side = 'both'
          else false
        end
    )
  );

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
    when 'reception' then 'post_wedding'
    else 'pre_wedding'
  end
$$;
