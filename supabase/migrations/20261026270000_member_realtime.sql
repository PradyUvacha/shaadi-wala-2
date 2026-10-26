-- Live membership for the signed-in person. Apply after 20261026260000_price_answer_leave.sql.
-- Safe to run again. Does not change role_permissions.
--
-- Realtime delivers UPDATE and DELETE only for rows the user can select.
-- members_select already allows user_id = auth.uid(), so a person receives
-- changes to their own wedding_members row. Replica identity full puts user_id
-- on the DELETE payload, which the client filter needs. A broadcast is not
-- required for removal.

alter table public.wedding_members replica identity full;

drop policy if exists members_select on public.wedding_members;
create policy members_select on public.wedding_members
for select to authenticated
using (user_id = auth.uid() or public.is_wedding_member(wedding_id));

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wedding_members'
  ) then
    alter publication supabase_realtime add table public.wedding_members;
  end if;
end $$;
