-- AI-generated image per rewrite, plus token usage tracking.
alter table analyses add column if not exists image_url text;
alter table analyses add column if not exists image_prompt text;
alter table analyses add column if not exists rewrite_tokens_used integer;
alter table analyses add column if not exists image_tokens_used integer;

-- Public storage bucket for generated images, one owner-scoped folder per user
-- (path convention: {user_id}/{post_id}.png).
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "post_images_owner_insert" on storage.objects;
create policy "post_images_owner_insert" on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "post_images_owner_delete" on storage.objects;
create policy "post_images_owner_delete" on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "post_images_public_read" on storage.objects;
create policy "post_images_public_read" on storage.objects for select
  using (bucket_id = 'post-images');
