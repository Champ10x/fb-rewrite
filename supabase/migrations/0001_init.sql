create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  raw_text text not null,
  final_text text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

alter table posts enable row level security;
drop policy if exists "posts_v1_read" on posts;
create policy "posts_v1_read" on posts for select using (true);
drop policy if exists "posts_v1_write" on posts;
create policy "posts_v1_write" on posts for all using (true) with check (true);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  post_id uuid references posts(id) on delete cascade,
  hook_score numeric,
  hook_score_source text,
  hook_score_confidence numeric,
  hook_score_review_status text default 'unreviewed',
  cta_score numeric,
  cta_score_source text,
  cta_score_confidence numeric,
  cta_score_review_status text default 'unreviewed',
  urgency_score numeric,
  urgency_score_source text,
  urgency_score_confidence numeric,
  urgency_score_review_status text default 'unreviewed',
  lead_gen_score numeric,
  lead_gen_score_source text,
  lead_gen_score_confidence numeric,
  lead_gen_score_review_status text default 'unreviewed',
  rewritten_text text,
  rewritten_text_source text,
  rewritten_text_confidence numeric,
  rewritten_text_review_status text default 'unreviewed',
  rationale text,
  created_at timestamptz not null default now()
);

alter table analyses enable row level security;
drop policy if exists "analyses_v1_read" on analyses;
create policy "analyses_v1_read" on analyses for select using (true);
drop policy if exists "analyses_v1_write" on analyses;
create policy "analyses_v1_write" on analyses for all using (true) with check (true);

create table if not exists revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  post_id uuid references posts(id) on delete cascade,
  rewritten_text text,
  lead_gen_score numeric,
  created_at timestamptz not null default now()
);

alter table revisions enable row level security;
drop policy if exists "revisions_v1_read" on revisions;
create policy "revisions_v1_read" on revisions for select using (true);
drop policy if exists "revisions_v1_write" on revisions;
create policy "revisions_v1_write" on revisions for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  post_id uuid,
  risk_level text,
  before_value text,
  after_value text,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into posts (id, raw_text, final_text, status) values
  ('a1000000-0000-0000-0000-000000000001', 'we fix pipes call us anytime good prices dublin area fast service', 'Burst pipe at 2am? Dublin''s emergency plumbers are on call 24/7 — fixed fast, priced fairly. DM us now for same-day slots.', 'accepted'),
  ('a1000000-0000-0000-0000-000000000002', 'buy our cakes they are delicious fresh made every day order now', 'Freshly baked every morning — our cakes sell out by noon. Order before 10am to guarantee yours. Click the link to shop now.', 'accepted'),
  ('a1000000-0000-0000-0000-000000000003', 'personal trainer available for sessions contact me for more info fitness health', 'Tired of starting over every January? Work with a Dublin personal trainer who builds plans that actually stick. First session free — message me today.', 'accepted');

insert into analyses (post_id, hook_score, hook_score_source, hook_score_confidence, hook_score_review_status, cta_score, cta_score_source, cta_score_confidence, cta_score_review_status, urgency_score, urgency_score_source, urgency_score_confidence, urgency_score_review_status, lead_gen_score, lead_gen_score_source, lead_gen_score_confidence, lead_gen_score_review_status, rewritten_text, rewritten_text_source, rewritten_text_confidence, rewritten_text_review_status, rationale) values
  ('a1000000-0000-0000-0000-000000000001', 8.5, 'openai-gpt-4o', 0.91, 'unreviewed', 9.0, 'openai-gpt-4o', 0.91, 'unreviewed', 8.0, 'openai-gpt-4o', 0.91, 'unreviewed', 85, 'openai-gpt-4o', 0.91, 'unreviewed', 'Burst pipe at 2am? Dublin''s emergency plumbers are on call 24/7 — fixed fast, priced fairly. DM us now for same-day slots.', 'openai-gpt-4o', 0.91, 'unreviewed', 'Strong pain-point hook, explicit CTA with channel, urgency via 24/7 availability.'),
  ('a1000000-0000-0000-0000-000000000002', 7.0, 'openai-gpt-4o', 0.87, 'unreviewed', 8.5, 'openai-gpt-4o', 0.87, 'unreviewed', 7.5, 'openai-gpt-4o', 0.87, 'unreviewed', 76, 'openai-gpt-4o', 0.87, 'unreviewed', 'Freshly baked every morning — our cakes sell out by noon. Order before 10am to guarantee yours. Click the link to shop now.', 'openai-gpt-4o', 0.87, 'unreviewed', 'Scarcity urgency works well; hook could be stronger with a sensory detail.'),
  ('a1000000-0000-0000-0000-000000000003', 9.0, 'openai-gpt-4o', 0.89, 'unreviewed', 8.0, 'openai-gpt-4o', 0.89, 'unreviewed', 6.5, 'openai-gpt-4o', 0.89, 'unreviewed', 79, 'openai-gpt-4o', 0.89, 'unreviewed', 'Tired of starting over every January? Work with a Dublin personal trainer who builds plans that actually stick. First session free — message me today.', 'openai-gpt-4o', 0.89, 'unreviewed', 'Emotional hook resonates; free-session offer is strong lead magnet; urgency light.');