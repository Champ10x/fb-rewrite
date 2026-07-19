-- Which fixed tone (if any) overrides the brand voice for a rewrite.
alter table posts add column if not exists tone text not null default 'brand-voice';

-- Email opt-ins for news about new apps and developments. Open to anonymous
-- visitors (not gated behind login) — only admins can read the list back.
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;

drop policy if exists "newsletter_subscribers_insert" on newsletter_subscribers;
create policy "newsletter_subscribers_insert" on newsletter_subscribers for insert
  with check (true);

drop policy if exists "newsletter_subscribers_admin_select" on newsletter_subscribers;
create policy "newsletter_subscribers_admin_select" on newsletter_subscribers for select
  using (public.is_admin());
