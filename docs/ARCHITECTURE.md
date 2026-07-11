# Architecture — fb-rewrite

## Stack
- **Frontend:** Next.js 14 (App Router) on Vercel
- **Database:** Supabase (Postgres + RLS)
- **AI:** OpenAI GPT-4o via server-side API route
- **Styling:** Tailwind CSS

## Now vs Later
**Now:** Post input → AI rewrite → score display → save → post history list
**Later:** Auth + per-user isolation, revision comparison view, publish to Facebook API, analytics dashboard

## Key User Action — Step-by-Step
1. User pastes raw post into textarea and clicks **Rewrite**
2. Next.js API route (`/api/rewrite`) receives text — secrets never leave the server
3. Route calls OpenAI with a structured prompt requesting rewritten copy + JSON analysis scores
4. Response parsed; rewrite text + score fields written to `posts` table in Supabase
5. Frontend receives the saved record and renders the rewrite panel + score cards
6. User edits inline → clicks Save → PATCH updates `posts.final_text` in Supabase
7. Post list re-fetches and shows updated record with score badge

## Layer Plan
1. **Data first** — `posts` and `analyses` tables with constraints; seed demo rows
2. **App logic** — CRUD routes, rewrite API route, score parsing, edit/save flow
3. **Smart features** — AI prompt tuning, confidence scores, alternative revision generation

## Core Without AI
If the AI call fails, the form saves the raw post as-is with `analysis.review_status = 'failed'` and shows an error banner. The save, list, and edit flows work regardless.