-- Four new scoring dimensions for the rewritten post, alongside the
-- existing hook/cta/urgency/lead-gen scores.
alter table analyses add column if not exists audience_score numeric;
alter table analyses add column if not exists pain_score numeric;
alter table analyses add column if not exists solution_score numeric;
alter table analyses add column if not exists viral_score numeric;

-- "Before" scores for the original raw post, on the same seven-dimension
-- rubric, so the UI can show a before/after comparison.
alter table analyses add column if not exists raw_hook_score numeric;
alter table analyses add column if not exists raw_cta_score numeric;
alter table analyses add column if not exists raw_urgency_score numeric;
alter table analyses add column if not exists raw_audience_score numeric;
alter table analyses add column if not exists raw_pain_score numeric;
alter table analyses add column if not exists raw_solution_score numeric;
alter table analyses add column if not exists raw_viral_score numeric;
alter table analyses add column if not exists raw_lead_gen_score numeric;
