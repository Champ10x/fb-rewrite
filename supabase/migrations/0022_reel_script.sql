-- Short-reel script + shot list (text only, no video generation).
alter table analyses add column if not exists reel_script text;
alter table analyses add column if not exists reel_script_tokens_used integer;
