-- Replace the single weekly text-only quota with two separate monthly
-- quotas: text generation (default 60/mo) and image generation, including
-- carousels (default 10/mo).
alter table profiles add column if not exists monthly_text_quota integer not null default 60;
alter table profiles add column if not exists monthly_image_quota integer not null default 10;
alter table profiles drop column if exists weekly_credit_allocation;

alter table app_settings add column if not exists default_monthly_text_quota integer not null default 60;
alter table app_settings add column if not exists default_monthly_image_quota integer not null default 10;
alter table app_settings drop column if exists default_weekly_credit_allocation;

-- New signups now pick up both monthly defaults instead of the old single
-- weekly one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_text_quota integer;
  default_image_quota integer;
begin
  select default_monthly_text_quota, default_monthly_image_quota
    into default_text_quota, default_image_quota
    from public.app_settings where id = 1;

  insert into public.profiles (id, email, is_admin, monthly_text_quota, monthly_image_quota)
  values (
    new.id,
    new.email,
    new.email = 'patrick@idealchamp.com',
    coalesce(default_text_quota, 60),
    coalesce(default_image_quota, 10)
  )
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;
