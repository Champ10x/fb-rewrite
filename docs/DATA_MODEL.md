# Data Model — fb-rewrite

## posts
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid nullable | owner scope (v2) |
| raw_text | text | original pasted post |
| final_text | text | accepted/edited rewrite |
| status | text | `draft` / `accepted` / `published` |
| created_at | timestamptz | default now() |

## analyses
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK → posts.id | |
| user_id | uuid nullable | |
| hook_score | numeric | AI field — 0–10 |
| hook_score_source | text | `openai-gpt-4o` |
| hook_score_confidence | numeric | 0–1 |
| hook_score_review_status | text | default `unreviewed` |
| cta_score | numeric | AI field — 0–10 |
| cta_score_source | text | |
| cta_score_confidence | numeric | |
| cta_score_review_status | text | |
| urgency_score | numeric | AI field — 0–10 |
| urgency_score_source | text | |
| urgency_score_confidence | numeric | |
| urgency_score_review_status | text | |
| lead_gen_score | numeric | overall 0–100 |
| lead_gen_score_source | text | |
| lead_gen_score_confidence | numeric | |
| lead_gen_score_review_status | text | default `unreviewed` |
| rewritten_text | text | AI-generated rewrite |
| rewritten_text_source | text | |
| rewritten_text_confidence | numeric | |
| rewritten_text_review_status | text | default `unreviewed` |
| created_at | timestamptz | |

## revisions
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK → posts.id | |
| user_id | uuid nullable | |
| rewritten_text | text | alternative rewrite |
| lead_gen_score | numeric | |
| created_at | timestamptz | |

## RLS
All tables: RLS enabled. v1 permissive policies allow anonymous read/write. Lock-down sprint replaces with `auth.uid() = user_id`.