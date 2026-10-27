-- #19. Mutual is guests.side = 'both'. The value is already allowed.
-- This restates the check so Mutual cannot be dropped by a later edit.
-- Family and friends still cannot read the opposite side. guests_select_by_permission
-- shows own side or both. guests.edit = none keeps friends read-only.

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
      and pg_get_constraintdef(con.oid) ilike '%side%'
      and pg_get_constraintdef(con.oid) not ilike '%rsvp%'
  loop
    execute format('alter table public.guests drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.guests drop constraint if exists guests_side_check;
alter table public.guests
  add constraint guests_side_check
  check (side is null or side in ('bride', 'groom', 'both'));

comment on column public.guests.side is
  'bride, groom, or both. both is Mutual and is visible to both sides.';
