-- Sprint 4: lock down RLS to owner-only writes. Rows with user_id IS NULL are
-- the public demo/seed rows and stay readable by everyone but are immutable
-- (nobody can update/delete a seed row, matching "Anonymous visitor sees demo
-- seed rows only (read-only)").

-- posts
drop policy if exists "posts_v1_read" on posts;
drop policy if exists "posts_v1_write" on posts;

create policy "posts_read" on posts for select
  using (user_id is null or auth.uid() = user_id);
create policy "posts_insert" on posts for insert
  with check (auth.uid() = user_id);
create policy "posts_update" on posts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "posts_delete" on posts for delete
  using (auth.uid() = user_id);

-- analyses
drop policy if exists "analyses_v1_read" on analyses;
drop policy if exists "analyses_v1_write" on analyses;

create policy "analyses_read" on analyses for select
  using (user_id is null or auth.uid() = user_id);
create policy "analyses_insert" on analyses for insert
  with check (auth.uid() = user_id);
create policy "analyses_update" on analyses for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "analyses_delete" on analyses for delete
  using (auth.uid() = user_id);

-- revisions
drop policy if exists "revisions_v1_read" on revisions;
drop policy if exists "revisions_v1_write" on revisions;

create policy "revisions_read" on revisions for select
  using (user_id is null or auth.uid() = user_id);
create policy "revisions_insert" on revisions for insert
  with check (auth.uid() = user_id);
create policy "revisions_update" on revisions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "revisions_delete" on revisions for delete
  using (auth.uid() = user_id);

-- audit_logs: append-only. Users can insert their own actions and read only
-- their own log (no cross-user visibility, no admin role exists yet).
drop policy if exists "audit_logs_v1_read" on audit_logs;
drop policy if exists "audit_logs_v1_write" on audit_logs;

create policy "audit_logs_read" on audit_logs for select
  using (auth.uid() = user_id);
create policy "audit_logs_insert" on audit_logs for insert
  with check (auth.uid() = user_id);
-- no update/delete policy: append-only, matches SECURITY.md
