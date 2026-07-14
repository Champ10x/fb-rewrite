# Copy Playbook — fb-rewrite

Reference for what makes a rewrite convert. Anchors the six-step framework behind `hook_score` / `cta_score` / `urgency_score` in [lib/ai/rewrite.ts](../lib/ai/rewrite.ts) to a repeatable writing method, and maps the inputs it needs onto existing `BrandVoice` fields ([lib/types.ts](../lib/types.ts)).

## Core Principle

A rewrite converts when the reader feels the cost of ignoring the post is higher than the effort of acting on it. Every line either sharpens that feeling or removes a reason to hesitate — nothing else earns its place.

**Effective ≠ manipulative.** If the reader wouldn't thank the business after responding, the fix is a better offer, not more pressure. Score honestly — don't manufacture urgency or scarcity that isn't real.

## The Six Steps

| # | Step | What it does | Maps to |
|---|------|---------------|---------|
| 1 | Reader | Names the exact person and situation the post is for, not a generic audience | `target_audience`, `persona_note` |
| 2 | Tension | Leads with the cost of the status quo — what the reader is already losing by not acting | `hook_score` |
| 3 | Proof | Replaces adjectives ("trusted", "best") with a specific, checkable fact — a number, a name, a guarantee | `confidence`, `lead_gen_score` |
| 4 | Objection | Names the one reason the reader won't act and answers it in the same breath | `cta_score` |
| 5 | Risk | Shrinks the first ask — a DM, call, or message, not a purchase | `cta_score` |
| 6 | The Ask | One verb, one contact method, stated once — never diluted by a second competing CTA | `cta_score`, `urgency_score` |

Steps 1–2 belong in the **hook** (first sentence). Steps 3–4 belong in the **body**. Steps 5–6 belong in the **CTA line**.

## Inputs Required Before Rewriting

These should come from the business's saved `BrandVoice`, not be invented per post:

| Question | BrandVoice field |
|---|---|
| Who exactly is this business's customer? | `target_audience` |
| What do they already want or fear? | `audience_feelings` |
| What's the one outcome the business delivers? | `persona_note`, `topics` |
| Words that sound like this business | `words_to_use` |
| Words that never sound like this business | `words_to_avoid` |
| How this business asks for contact | `cta_style`, `cta_examples` |

If a field is empty for a user, fall back to the generic rules in `BASE_PROMPT` rather than inventing specifics.

## Format Discipline by Platform

Already encoded in `PLATFORM_GUIDANCE` ([lib/platforms.ts](../lib/platforms.ts)) — this playbook governs *what* to say; that file governs *how long and in what tone* per platform.

## Pre-Rewrite Checklist

- [ ] First sentence names the reader's situation, not the business's category
- [ ] At least one claim is a specific, checkable fact — not just an adjective
- [ ] The most likely objection ("too expensive," "does this work for me") is answered somewhere in the post
- [ ] Exactly one CTA, with one contact method
- [ ] Reading it back, ignoring the post feels more costly than responding to it
