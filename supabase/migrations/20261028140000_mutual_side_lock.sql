-- Family may still insert a guest as Mutual or as their own side, and may still
-- update a Mutual guest's other fields. A family update cannot move that guest
-- off side 'both'. Couple and planner (guests.edit = all) can change the side.
-- The check sees the old and new rows, which a policy WITH CHECK cannot do on its own.

create or replace function public.protect_mutual_guest_side()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.side = 'both'
    and new.side is distinct from 'both'
    and public.permission_scope(new.wedding_id, 'guests.edit') = 'own_side'
  then
    raise exception 'Only the couple or planner can change this.';
  end if;
  return new;
end;
$$;

drop trigger if exists guests_protect_mutual_side on public.guests;
create trigger guests_protect_mutual_side
  before update on public.guests
  for each row execute function public.protect_mutual_guest_side();

revoke all on function public.protect_mutual_guest_side() from public;
