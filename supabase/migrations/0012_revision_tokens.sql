-- Track token usage per revision, same as analyses.rewrite_tokens_used.
alter table revisions add column if not exists tokens_used integer;
