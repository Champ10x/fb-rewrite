-- IG carousel: editable AI-drafted prompts, one image per slide.
alter table analyses add column if not exists carousel_prompts text[] not null default '{}';
alter table analyses add column if not exists carousel_image_urls text[] not null default '{}';
alter table analyses add column if not exists carousel_tokens_used integer;
