-- Live guests. The Guests screen refetches when a guest or a function link changes.
-- REPLICA IDENTITY FULL keeps side and wedding_id on the old row. Without those
-- columns, RLS cannot see that the viewer was allowed to read the row, and a
-- guest who leaves that side produces no event.
-- Safe to run again.

alter table public.guests replica identity full;
alter table public.guest_functions replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guests'
  ) then
    alter publication supabase_realtime add table public.guests;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guest_functions'
  ) then
    alter publication supabase_realtime add table public.guest_functions;
  end if;
end $$;
