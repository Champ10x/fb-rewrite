-- Which platform this post is optimised for, and an optional target length
-- for the rewrite, so retries can reuse the same settings.
alter table posts add column if not exists platform text not null default 'facebook';
alter table posts add column if not exists target_char_count integer;
