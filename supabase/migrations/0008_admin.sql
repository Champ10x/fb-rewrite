-- Admin role: patrick@idealchamp.com is auto-granted admin on signup.
alter table profiles add column if not exists is_admin boolean not null default false;

-- Update the signup trigger to auto-grant admin for the designated address.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, is_admin)
  values (new.id, new.email = 'patrick@idealchamp.com')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill in case that account already existed before this migration.
update public.profiles
set is_admin = true
where id in (select id from auth.users where email = 'patrick@idealchamp.com');

-- Admins can see every user's audit trail, not just their own.
drop policy if exists "audit_logs_admin_select" on audit_logs;
create policy "audit_logs_admin_select" on audit_logs for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin));

-- Admins can see and edit every profile (credits, status, expiry).
drop policy if exists "profiles_admin_select" on profiles;
create policy "profiles_admin_select" on profiles for select
  using (exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.is_admin));

drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles for update
  using (exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.is_admin));

-- Admins can see every quota increase request.
drop policy if exists "quota_requests_admin_select" on quota_requests;
create policy "quota_requests_admin_select" on quota_requests for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin));
