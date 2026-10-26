-- Live checklist sync. Family members receive couple and planner edits on this wedding.
-- Apply after 20261026200000_checklist_templates.sql. Safe to run again.
-- Hosted Supabase already has the supabase_realtime publication. This file adds the
-- per-wedding tables to it. It does not change role_permissions.

alter table public.tasks replica identity full;
alter table public.wedding_functions replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wedding_functions'
  ) then
    alter publication supabase_realtime add table public.wedding_functions;
  end if;
end $$;
