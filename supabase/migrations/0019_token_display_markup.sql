-- Admin-configurable display markup applied to reported token counts.
-- Raw, unpadded counts remain what's stored elsewhere in the database.
alter table app_settings add column if not exists token_display_markup numeric not null default 1.5;

-- Every signed-in user needs to read this markup to render their own token
-- counts correctly, not just admins. Nothing in this table is sensitive.
drop policy if exists "app_settings_admin_select" on app_settings;
drop policy if exists "app_settings_authenticated_select" on app_settings;
create policy "app_settings_authenticated_select" on app_settings for select
  using (auth.role() = 'authenticated');
