-- Singleton table for site-wide admin-configurable settings.
create table if not exists app_settings (
  id int primary key default 1,
  default_weekly_credit_allocation integer not null default 3,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into app_settings (id) values (1) on conflict (id) do nothing;

alter table app_settings enable row level security;

drop policy if exists "app_settings_admin_select" on app_settings;
create policy "app_settings_admin_select" on app_settings for select
  using (public.is_admin());

drop policy if exists "app_settings_admin_update" on app_settings;
create policy "app_settings_admin_update" on app_settings for update
  using (public.is_admin());

-- New profiles now default to whatever admins have configured, instead of a
-- hardcoded 3.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_credits integer;
begin
  select default_weekly_credit_allocation into default_credits from public.app_settings where id = 1;

  insert into public.profiles (id, email, is_admin, weekly_credit_allocation)
  values (new.id, new.email, new.email = 'patrick@idealchamp.com', coalesce(default_credits, 3))
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;
