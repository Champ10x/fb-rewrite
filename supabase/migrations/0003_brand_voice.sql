-- Sprint 5: brand_voices — one profile per user, used as a style/reference
-- guide when rewriting posts. Structure mirrors a typical brand-voice.md:
-- voice keywords, words to use/avoid, content style, length prefs, CTA
-- style + examples, recurring topics, persona note, and how the audience
-- should feel.

create table if not exists brand_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  voice_keywords text[] not null default '{}',
  words_to_use text[] not null default '{}',
  words_to_avoid text[] not null default '{}',
  content_style text[] not null default '{}',
  caption_length_pref text,
  script_length_pref text,
  cta_style text[] not null default '{}',
  cta_examples text[] not null default '{}',
  topics text[] not null default '{}',
  persona_note text,
  audience_feelings text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table brand_voices enable row level security;

create policy "brand_voices_owner_select" on brand_voices for select
  using (auth.uid() = user_id);
create policy "brand_voices_owner_insert" on brand_voices for insert
  with check (auth.uid() = user_id);
create policy "brand_voices_owner_update" on brand_voices for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "brand_voices_owner_delete" on brand_voices for delete
  using (auth.uid() = user_id);
