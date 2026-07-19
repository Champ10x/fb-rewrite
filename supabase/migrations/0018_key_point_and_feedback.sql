-- Optional key point/angle the rewrite must incorporate (idea, not verbatim).
alter table posts add column if not exists key_point text;

-- Per-session feedback: a comment plus a required 1-10 satisfaction rating,
-- along with a snapshot of that session's usage. Feeds the admin Usage Log.
create table if not exists session_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback text,
  rating integer not null check (rating >= 1 and rating <= 10),
  session_tokens_used integer,
  session_tries integer,
  created_at timestamptz not null default now()
);

alter table session_feedback enable row level security;

drop policy if exists "session_feedback_owner_insert" on session_feedback;
create policy "session_feedback_owner_insert" on session_feedback for insert
  with check (auth.uid() = user_id);

drop policy if exists "session_feedback_admin_select" on session_feedback;
create policy "session_feedback_admin_select" on session_feedback for select
  using (public.is_admin());
