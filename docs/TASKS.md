# Tasks — fb-rewrite

## Sprint 1 — Database & Demo Seed
**Goal:** Schema live in Supabase; seed data visible without login.
- Create `posts`, `analyses`, `revisions`, `audit_logs` tables with migration SQL
- Enable RLS + v1 permissive policies on all tables
- Seed 3 demo posts with analyses (varying scores)
- Confirm tables readable via Supabase dashboard

**Definition of Done:** Supabase table editor shows seeded rows; anon select returns data via API.

---

## Sprint 2 — Core Rewrite Engine ✦ v1 functional milestone ✦
**Goal:** Paste → Rewrite → Score → Save works end-to-end. No login required.
- Build `/api/rewrite` server route: call OpenAI, parse JSON response, write to `posts` + `analyses`
- Build homepage with textarea input, Rewrite button, loading spinner
- Render rewrite output panel with score cards (hook, CTA, urgency, lead-gen)
- Inline edit of `final_text` + Save button → PATCH `posts.final_text`
- Handle loading / empty / error states with real copy
- Post history list sorted by `lead_gen_score` desc (includes seeded demo rows)

**Definition of Done:** Paste a real post, click Rewrite, see scores, edit, save — record in Supabase updated. Error banner shown if OpenAI fails.

---

## Sprint 3 — Revisions & Polish
**Goal:** Alternative rewrites; UI fit for sharing a screenshot.
- "Try Another Rewrite" button → calls `/api/rewrite` again, saves to `revisions`
- Revision history tab per post
- Delete post with confirmation modal → audit log entry
- Empty state copy on history list when no posts exist
- Score badge colour coding (red <50, amber 50–74, green ≥75)

**Definition of Done:** User can generate, compare, and delete revisions; audit_logs row written on delete.

---

## Sprint 4 — Lock It Down
**Goal:** Per-user data isolation; app safe for real content.
- Add Supabase Auth (email magic link)
- Set `user_id NOT NULL`; migrate existing rows if needed
- Replace v1 RLS policies with `auth.uid() = user_id` owner policies
- Signup / login page; redirect unauthenticated users to login for write actions
- Per-user post history

**Definition of Done:** User A cannot read User B's posts. Anonymous visitor sees demo seed rows only (read-only). Confirmed via Supabase RLS policy test.

---

## Gantt (sprint → feature)
```
Sprint 1: DB schema, RLS, seed data
Sprint 2: Rewrite API, homepage UI, score display, save, post list  ← v1 functional
Sprint 3: Revisions, delete, polish, score colours
Sprint 4: Auth, RLS lock-down, per-user isolation
```