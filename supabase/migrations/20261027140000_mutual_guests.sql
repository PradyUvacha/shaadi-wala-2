-- Mutual guests (side 'both') are visible to both sides' family and friends.
-- guests_select_side was replaced by guests_select_by_permission. This updates that live SELECT policy.
-- Family on either side may INSERT and UPDATE their own side or side 'both'.
-- Postgres policies cover one command, so guests_write_family is INSERT and guests_update_family is UPDATE.
-- DELETE of side 'both' stays with guests.edit = all (couple and planner). Family may still delete their own side.
-- Friends stay guests.edit = none.
-- Maybe is an RSVP. Tiles count it under Pending. The row still shows Maybe.

alter table public.guests drop constraint if exists guests_rsvp_status_check;

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
      and rel.relname = 'guests'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%rsvp_status%'
  loop
    execute format('alter table public.guests drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.guests
  add constraint guests_rsvp_status_check
  check (rsvp_status in ('Pending', 'Maybe', 'Confirmed', 'Declined'));

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

drop policy if exists guests_write_by_permission on public.guests;
drop policy if exists guests_write_family on public.guests;
drop policy if exists guests_update_family on public.guests;
drop policy if exists guests_delete_by_permission on public.guests;

create policy guests_write_family on public.guests
  for insert to authenticated
  with check (
    case public.permission_scope(wedding_id, 'guests.edit')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id) or side = 'both'
      else false
    end
  );

create policy guests_update_family on public.guests
  for update to authenticated
  using (
    case public.permission_scope(wedding_id, 'guests.edit')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id) or side = 'both'
      else false
    end
  )
  with check (
    case public.permission_scope(wedding_id, 'guests.edit')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id) or side = 'both'
      else false
    end
  );

create policy guests_delete_by_permission on public.guests
  for delete to authenticated
  using (
    case public.permission_scope(wedding_id, 'guests.edit')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id)
      else false
    end
  );
