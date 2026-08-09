-- Learn from the user's own edits: whenever a saved final_text or a
-- generated image prompt differs from what the AI drafted, keep the pair
-- so we can periodically distill it into short style notes fed back into
-- future prompts for that user.
create table if not exists style_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('text', 'image')),
  ai_draft text not null,
  user_final text not null,
  distilled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table style_edits enable row level security;
drop policy if exists "style_edits_v1_select" on style_edits;
create policy "style_edits_v1_select" on style_edits for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "style_edits_v1_insert" on style_edits;
create policy "style_edits_v1_insert" on style_edits for insert with check (auth.uid() = user_id);

alter table brand_voices add column if not exists learned_style_notes text;
alter table brand_voices add column if not exists learned_image_style_notes text;
