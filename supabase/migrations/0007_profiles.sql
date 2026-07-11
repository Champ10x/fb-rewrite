-- Per-user account metadata: credit allocation, access expiry, last-seen
-- connection info, account status, and a referral slot for later.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  weekly_credit_allocation integer not null default 3,
  expiry_date timestamptz,
  ip_address text,
  browser text,
  status text not null default 'active',
  referral text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_owner_select" on profiles;
create policy "profiles_owner_select" on profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_owner_update" on profiles;
create policy "profiles_owner_update" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
-- no insert/delete policy: rows are created only by the trigger below.

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already existed before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
