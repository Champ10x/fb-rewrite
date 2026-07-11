# Intelligence Layer — fb-rewrite

## Messy Input
Raw Facebook post: informal tone, missing CTA, no hook, vague offer, filler words.

## Auto-Structure Schema
Server prompt instructs GPT-4o to return:
```json
{
  "rewritten_text": "Are burst pipes ruining your morning? Call Dublin's #1 plumber — fixed in 60 mins or it's free. DM now for same-day slots.",
  "hook_score": 8.5,
  "cta_score": 9.0,
  "urgency_score": 8.0,
  "lead_gen_score": 85,
  "confidence": 0.88,
  "rationale": "Strong pain-point hook, clear offer, urgency via time guarantee."
}
```
All values stored with `_source = 'openai-gpt-4o'` and `_review_status = 'unreviewed'`.

## Scoring Rules (rule-based baseline, AI on top)
- Hook score: does first sentence name a pain point or ask a question? (+3)
- CTA score: explicit verb + contact method present? (+4)
- Urgency score: time-bound phrase or scarcity signal? (+3)
- Lead-gen score: weighted average × 10, capped at 100

## What Gets Ranked
Posts sorted by `lead_gen_score` descending in the history list.

## v1 vs Later
- **v1:** Single AI rewrite + score display
- **Later:** Side-by-side revision comparison, audience-fit scoring, A/B score prediction, prompt fine-tuning per industry