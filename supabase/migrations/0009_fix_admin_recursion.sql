-- 0008's admin policies caused infinite recursion (42P17) because the
-- policy on `profiles` queried `profiles` itself, re-triggering the same
-- policy. Fix: a SECURITY DEFINER helper function bypasses RLS for the
-- admin check, breaking the recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "profiles_admin_select" on profiles;
create policy "profiles_admin_select" on profiles for select
  using (public.is_admin());

drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles for update
  using (public.is_admin());

drop policy if exists "audit_logs_admin_select" on audit_logs;
create policy "audit_logs_admin_select" on audit_logs for select
  using (public.is_admin());

drop policy if exists "quota_requests_admin_select" on quota_requests;
create policy "quota_requests_admin_select" on quota_requests for select
  using (public.is_admin());
