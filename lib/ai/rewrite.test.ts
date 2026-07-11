import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRewrite } from "./rewrite";

function mockOpenAiResponse(body: Record<string, unknown>) {
  return {
    rewritten_text: "rewritten",
    hook_score: 8,
    cta_score: 7,
    urgency_score: 6,
    lead_gen_score: 80,
    confidence: 0.9,
    rationale: "good",
    ...body,
  };
}

function okFetchResponse(payload: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("generateRewrite — AI-failure fallback trigger", () => {
  it("throws immediately when OPENAI_API_KEY is not configured (triggers the saved-raw-text fallback in /api/rewrite)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(generateRewrite("some raw post")).rejects.toThrow("OPENAI_API_KEY is not configured");
  });

  it("retries once and succeeds if the second attempt works", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(okFetchResponse(mockOpenAiResponse({})));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateRewrite("some raw post");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.rewritten_text).toBe("rewritten");
  });

  it("throws after both attempts fail (this is what the route's catch block turns into the fallback response)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockRejectedValue(new Error("still down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateRewrite("some raw post")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("generateRewrite — brand voice guide", () => {
  it("includes brand voice keywords and avoided words in the system prompt sent to OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(okFetchResponse(mockOpenAiResponse({})));
    vi.stubGlobal("fetch", fetchMock);

    await generateRewrite("some raw post", {
      id: "bv-1",
      user_id: "u-1",
      voice_keywords: ["Calm", "Wise"],
      words_to_use: ["protect your family"],
      words_to_avoid: ["get rich quick"],
      content_style: [],
      caption_length_pref: null,
      script_length_pref: null,
      cta_style: [],
      cta_examples: [],
      topics: [],
      persona_note: null,
      audience_feelings: [],
      target_audience: "Singaporean, age 45-60, sole breadwinner",
      color_theme: "gold and black, mature",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const systemMessage = requestBody.messages[0].content as string;
    expect(systemMessage).toContain("Calm, Wise");
    expect(systemMessage).toContain("protect your family");
    expect(systemMessage).toContain("get rich quick");
    expect(systemMessage).toContain("Singaporean, age 45-60, sole breadwinner");
    expect(systemMessage).toContain("gold and black, mature");
  });
});

describe("generateRewrite — follow-up posts", () => {
  it("keeps at most 5 follow-up posts and truncates any over 120 characters", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const longPost = "x".repeat(150);
    const fetchMock = vi.fn().mockResolvedValue(
      okFetchResponse(
        mockOpenAiResponse({
          follow_up_posts: ["a", "b", "c", "d", "e", "f", longPost],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateRewrite("some raw post");

    expect(result.follow_up_posts).toHaveLength(5);
    expect(result.follow_up_posts).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("truncates an individual follow-up post longer than 120 characters", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const longPost = "y".repeat(150);
    const fetchMock = vi.fn().mockResolvedValue(
      okFetchResponse(mockOpenAiResponse({ follow_up_posts: [longPost] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateRewrite("some raw post");

    expect(result.follow_up_posts[0]).toHaveLength(120);
  });

  it("defaults to an empty array when follow_up_posts is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(okFetchResponse(mockOpenAiResponse({})));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateRewrite("some raw post");

    expect(result.follow_up_posts).toEqual([]);
  });
});
