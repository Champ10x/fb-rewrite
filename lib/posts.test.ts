import { describe, expect, it } from "vitest";
import { latestAnalysis, sortPosts } from "./posts";
import type { Analysis, PostWithRelations } from "./types";

function makeAnalysis(overrides: Partial<Analysis>): Analysis {
  return {
    id: "a-1",
    post_id: "p-1",
    user_id: null,
    hook_score: null,
    hook_score_source: null,
    hook_score_confidence: null,
    hook_score_review_status: null,
    cta_score: null,
    cta_score_source: null,
    cta_score_confidence: null,
    cta_score_review_status: null,
    urgency_score: null,
    urgency_score_source: null,
    urgency_score_confidence: null,
    urgency_score_review_status: null,
    lead_gen_score: null,
    lead_gen_score_source: null,
    lead_gen_score_confidence: null,
    lead_gen_score_review_status: null,
    rewritten_text: null,
    rewritten_text_source: null,
    rewritten_text_confidence: null,
    rewritten_text_review_status: null,
    rationale: null,
    follow_up_posts: [],
    image_url: null,
    image_prompt: null,
    rewrite_tokens_used: null,
    image_tokens_used: null,
    selected_image_url: null,
    selected_image_text: null,
    selected_image_tokens_used: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makePost(overrides: Partial<PostWithRelations>): PostWithRelations {
  return {
    id: "p-1",
    user_id: null,
    raw_text: "raw",
    final_text: null,
    status: "draft",
    platform: "facebook",
    target_char_count: null,
    tone: "brand-voice",
    created_at: "2026-01-01T00:00:00Z",
    analyses: [],
    revisions: [],
    ...overrides,
  };
}

describe("latestAnalysis", () => {
  it("returns null when there are no analyses", () => {
    expect(latestAnalysis(makePost({ analyses: [] }))).toBeNull();
  });

  it("returns the most recently created analysis", () => {
    const older = makeAnalysis({ id: "a-old", created_at: "2026-01-01T00:00:00Z", lead_gen_score: 10 });
    const newer = makeAnalysis({ id: "a-new", created_at: "2026-01-02T00:00:00Z", lead_gen_score: 90 });
    const post = makePost({ analyses: [older, newer] });
    expect(latestAnalysis(post)?.id).toBe("a-new");
  });
});

describe("sortPosts", () => {
  it("sorts by lead_gen_score descending, treating failed/missing scores as lowest", () => {
    const high = makePost({ id: "high", analyses: [makeAnalysis({ lead_gen_score: 90 })] });
    const low = makePost({ id: "low", analyses: [makeAnalysis({ lead_gen_score: 20 })] });
    const failed = makePost({ id: "failed", analyses: [makeAnalysis({ lead_gen_score: null })] });
    const noAnalysis = makePost({ id: "none", analyses: [] });

    const sorted = sortPosts([low, failed, high, noAnalysis]);
    expect(sorted.map((p) => p.id)).toEqual(["high", "low", "failed", "none"]);
  });
});
