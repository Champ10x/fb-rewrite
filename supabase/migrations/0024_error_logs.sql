-- Error detection module: every server-side AI/generation failure is logged
-- here and emailed to the admin. Shown on the home screen for admins until
-- marked resolved.
create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  detail text,
  user_id uuid,
  post_id uuid,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz not null default now()
);

alter table error_logs enable row level security;
drop policy if exists "error_logs_v1_select" on error_logs;
create policy "error_logs_v1_select" on error_logs for select using (public.is_admin());
drop policy if exists "error_logs_v1_insert" on error_logs;
create policy "error_logs_v1_insert" on error_logs for insert with check (true);
drop policy if exists "error_logs_v1_update" on error_logs;
create policy "error_logs_v1_update" on error_logs for update using (public.is_admin());
