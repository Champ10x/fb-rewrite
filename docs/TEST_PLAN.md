# Test Plan — fb-rewrite

## Success Scenario (manual)
1. Open homepage — post history loads with seeded demo rows (score badges visible)
2. Paste: `"we fix pipes call us anytime good prices dublin"` into textarea
3. Click **Rewrite** — spinner appears immediately
4. Rewrite panel renders: new copy + hook/CTA/urgency/lead-gen score cards
5. Edit one word in the rewrite inline
6. Click **Save** — button shows "Saving…" then "Saved"
7. Open Supabase table editor → `posts` row shows updated `final_text`
8. Post history list shows new row at top with correct lead-gen score badge

## Empty State
- Delete all non-seed posts → history list shows "No posts yet. Paste your first post above."
- Textarea empty → Rewrite button disabled or shows inline validation "Please paste a post first"

## Error States
- Kill `OPENAI_API_KEY` → banner: "Rewrite failed — please try again. Your raw post has been saved."
- Supabase offline → save button shows "Save failed — check connection"
- Raw post > 2000 chars → inline error before API call: "Post too long (max 2000 characters)"

## Score Colour Check
- Seed a post with `lead_gen_score = 30` → badge is red
- Seed a post with `lead_gen_score = 65` → badge is amber
- Seed a post with `lead_gen_score = 82` → badge is green

## Revision Flow
- Click "Try Another Rewrite" → second rewrite appears; `revisions` table gains a row
- Both revisions visible in Revision History tab

## Delete
- Click Delete on a post → confirmation modal appears
- Confirm → post removed from list; `audit_logs` row with `action = 'delete_post'` present