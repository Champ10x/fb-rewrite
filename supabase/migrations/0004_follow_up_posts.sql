-- 5 short (<=120 char) follow-up posts generated alongside the main rewrite,
-- stored on the analysis row that produced them.
alter table analyses add column if not exists follow_up_posts text[] not null default '{}';
