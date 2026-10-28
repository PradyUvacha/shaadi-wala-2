-- Guest Manager. RSVP Maybe is already allowed; restate the check so this file stands alone.
-- guest_functions links a guest to the events they are invited to.
-- Visibility and writes follow the live guests policies. This file does not change guests_select_by_permission.
-- Family may insert, update, and remove links for their own side and for side 'both', matching guests insert/update.
-- Deleting a Mutual guest stays on guests_delete_by_permission (couple and planner only).

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

create table if not exists public.guest_functions (
  guest_id uuid not null references public.guests (id) on delete cascade,
  function_id uuid not null references public.wedding_functions (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  primary key (guest_id, function_id)
);

create index if not exists guest_functions_wedding_id_idx on public.guest_functions (wedding_id);
create index if not exists guest_functions_function_id_idx on public.guest_functions (function_id);

alter table public.guest_functions enable row level security;

create or replace function public.guest_functions_same_wedding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.guests
    where id = new.guest_id and wedding_id = new.wedding_id
  ) then
    raise exception 'guest_functions guest must belong to the same wedding';
  end if;
  if not exists (
    select 1 from public.wedding_functions
    where id = new.function_id and wedding_id = new.wedding_id
  ) then
    raise exception 'guest_functions function must belong to the same wedding';
  end if;
  return new;
end;
$$;

drop trigger if exists guest_functions_same_wedding on public.guest_functions;
create trigger guest_functions_same_wedding
  before insert or update on public.guest_functions
  for each row execute function public.guest_functions_same_wedding();

revoke all on function public.guest_functions_same_wedding() from public;
grant execute on function public.guest_functions_same_wedding() to authenticated;

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

drop policy if exists guest_functions_insert on public.guest_functions;
create policy guest_functions_insert on public.guest_functions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.guests g
      where g.id = guest_id
        and g.wedding_id = guest_functions.wedding_id
        and case public.permission_scope(guest_functions.wedding_id, 'guests.edit')
          when 'all' then true
          when 'own_side' then g.side = public.member_side(guest_functions.wedding_id) or g.side = 'both'
          else false
        end
    )
    and exists (
      select 1 from public.wedding_functions f
      where f.id = function_id and f.wedding_id = guest_functions.wedding_id
    )
  );

drop policy if exists guest_functions_update on public.guest_functions;
create policy guest_functions_update on public.guest_functions
  for update to authenticated
  using (
    exists (
      select 1 from public.guests g
      where g.id = guest_id
        and g.wedding_id = guest_functions.wedding_id
        and case public.permission_scope(guest_functions.wedding_id, 'guests.edit')
          when 'all' then true
          when 'own_side' then g.side = public.member_side(guest_functions.wedding_id) or g.side = 'both'
          else false
        end
    )
  )
  with check (
    exists (
      select 1 from public.guests g
      where g.id = guest_id
        and g.wedding_id = guest_functions.wedding_id
        and case public.permission_scope(guest_functions.wedding_id, 'guests.edit')
          when 'all' then true
          when 'own_side' then g.side = public.member_side(guest_functions.wedding_id) or g.side = 'both'
          else false
        end
    )
    and exists (
      select 1 from public.wedding_functions f
      where f.id = function_id and f.wedding_id = guest_functions.wedding_id
    )
  );

drop policy if exists guest_functions_delete on public.guest_functions;
create policy guest_functions_delete on public.guest_functions
  for delete to authenticated
  using (
    exists (
      select 1 from public.guests g
      where g.id = guest_id
        and g.wedding_id = guest_functions.wedding_id
        and case public.permission_scope(guest_functions.wedding_id, 'guests.edit')
          when 'all' then true
          when 'own_side' then g.side = public.member_side(guest_functions.wedding_id) or g.side = 'both'
          else false
        end
    )
  );

grant select, insert, update, delete on public.guest_functions to authenticated;
