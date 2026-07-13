-- Stores the image generated with a chosen follow-up post's text overlaid
-- onto it, so a user's selection survives a page reload.
alter table analyses add column if not exists selected_image_url text;
alter table analyses add column if not exists selected_image_text text;
alter table analyses add column if not exists selected_image_tokens_used integer;

-- Re-selecting a different follow-up post overwrites the same storage path
-- (upsert), which needs an update policy in addition to the existing insert
-- policy from 0006_post_images.sql.
drop policy if exists "post_images_owner_update" on storage.objects;
create policy "post_images_owner_update" on storage.objects for update
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
