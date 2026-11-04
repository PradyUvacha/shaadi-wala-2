-- Announcements. Every member can read every post. Only the author can change
-- or remove their own post. A blank body is already rejected. Safe to run again.
-- Does not send push notifications.

drop policy if exists feed_update_author on public.wedding_feed;
create policy feed_update_author on public.wedding_feed
  for update to authenticated
  using (author_id = auth.uid() and public.is_wedding_member(wedding_id))
  with check (
    author_id = auth.uid()
    and public.is_wedding_member(wedding_id)
    and char_length(btrim(body)) > 0
  );

drop policy if exists feed_delete_author on public.wedding_feed;
create policy feed_delete_author on public.wedding_feed
  for delete to authenticated
  using (author_id = auth.uid() and public.is_wedding_member(wedding_id));

grant update, delete on public.wedding_feed to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wedding_feed'
  ) then
    alter publication supabase_realtime add table public.wedding_feed;
  end if;
end $$;
