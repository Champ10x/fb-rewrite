# Agentic Layer — fb-rewrite

## Risk Levels & Actions

### Low — auto-execute (no approval needed)
- `rewrite_post` — generate rewritten copy and scores from raw input
- `score_analysis` — parse AI response and write score fields to `analyses`
- `tag_status` — set post status to `draft` after rewrite

### Medium — light approval (user confirms)
- `save_final` — promote `rewritten_text` to `posts.final_text` and set status `accepted`
- `generate_revision` — produce an alternative rewrite and store in `revisions`

### High — always approval (v2+)
- `publish_to_facebook` — POST via Facebook Graph API (not v1)

### Critical — human-only
- `delete_post` — hard delete; requires explicit confirmation UI step

## Named Tools (server-side only)
- `openai.chat` — rewrite + score generation
- `supabase.from('posts').insert` — persist raw + final
- `supabase.from('analyses').insert` — persist scores
- `supabase.from('revisions').insert` — persist alternatives

## Audit Log Fields
`action`, `post_id`, `user_id` (nullable v1), `before_value`, `after_value`, `timestamp`, `risk_level`

## v1 vs Later
- **v1:** Low + medium actions only; no Facebook API calls
- **Later:** Publish action with OAuth token, scheduled posting agent