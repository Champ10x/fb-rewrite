# PRD — fb-rewrite

## Problem
Business owners post raw, unpolished Facebook content that fails to generate leads. They lack the skill or time to rewrite posts for engagement and conversion.

## Target User
Solo business owner or marketer who writes their own Facebook posts and wants better lead results without hiring a copywriter.

## Core Objects
- **Post** — raw input text, rewritten output, deployment score, platform metadata
- **Analysis** — hook strength, CTA clarity, audience fit, urgency, lead-gen score
- **Revision** — saved alternative rewrites per post

## MVP Must-Haves
- [ ] Paste raw Facebook post text into an input form
- [ ] AI rewrites the post optimised for lead generation
- [ ] Analysis panel shows scores: hook, CTA, urgency, overall lead-gen score (0–100)
- [ ] User can accept rewrite, request another, or manually edit
- [ ] All versions (raw + rewrites) saved to database
- [ ] Demo works for anonymous visitors — no login required

## Non-Goals (v1)
- Scheduling or publishing to Facebook
- Multi-platform support (Instagram, LinkedIn)
- Team collaboration / sharing
- Paid tiers / billing
- Authentication (deferred to lock-down sprint)

## Success Criteria
**End-to-end scenario:** A visitor pastes a raw "plumber in Dublin" post, clicks Rewrite, receives a lead-gen-optimised version with a scored analysis panel, edits one line, saves — and the post list shows both the raw and final versions with scores. All in under 30 seconds, no login required.

## Definition of Done
The rewrite button calls the AI, stores raw + rewrite + scores in Supabase, and renders the result. Empty state, loading state, and API error are all handled with real UI copy. No dead buttons.