-- Messages users leave when they hit their weekly post quota and want more.
create table if not exists quota_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  message text,
  created_at timestamptz not null default now()
);

alter table quota_requests enable row level security;

create policy "quota_requests_owner_select" on quota_requests for select
  using (auth.uid() = user_id);
create policy "quota_requests_owner_insert" on quota_requests for insert
  with check (auth.uid() = user_id);
