-- Optional feedback screenshot. The file lives in a private bucket.
-- The first folder of the object name is the uploader's user id, and storage
-- policies allow only that person to read or write it. Safe to run again.

alter table public.feedback add column if not exists screenshot_path text;

insert into storage.buckets (id, name, public)
values ('feedback-screenshots', 'feedback-screenshots', false)
on conflict (id) do nothing;

grant usage on schema storage to authenticated;
grant select on storage.buckets to authenticated;
grant select, insert, delete on storage.objects to authenticated;

drop policy if exists feedback_screenshot_read on storage.objects;
create policy feedback_screenshot_read on storage.objects
for select to authenticated
using (
  bucket_id = 'feedback-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists feedback_screenshot_insert on storage.objects;
create policy feedback_screenshot_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'feedback-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists feedback_screenshot_delete on storage.objects;
create policy feedback_screenshot_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'feedback-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);
