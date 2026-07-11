# Security — fb-rewrite

## Secret Handling
- `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment variables only
- Never imported or referenced in any `app/` or `components/` file
- All AI calls made inside `/api/rewrite` server route — key never reaches the browser
- Public Supabase anon key used client-side (read/write gated by RLS, not the key itself)

## Permission Model (v1 — demo open)
- RLS enabled on all tables; v1 policies allow anonymous read and write
- No user identity required; `user_id` is nullable
- Lock-down sprint: swap policies to `auth.uid() = user_id`; add `NOT NULL` constraint to `user_id`

## Approved Tools Rule
- Agent may only call the four named Supabase tools and `openai.chat`
- No `eval`, `run_any`, `send_any`, or raw shell calls permitted
- Every meaningful action (rewrite, save, delete) writes a row to `audit_logs`

## Audit Principle
- Every state-changing action is logged before it executes
- Log includes: action name, affected `post_id`, risk level, timestamp
- Logs are append-only; no delete policy on `audit_logs`

## When to Stop and Get a Human
- Facebook Graph API OAuth setup — do not attempt without a security review
- Any change to RLS policies beyond the two standard patterns above