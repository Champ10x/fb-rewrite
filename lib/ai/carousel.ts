import type { BrandVoice } from "@/lib/types";

export const CAROUSEL_SLIDE_COUNT = 5;

export type CarouselPromptsResult = {
  prompts: string[];
  tokensUsed: number | null;
};

function brandImageContext(brandVoice: BrandVoice | null | undefined): string {
  if (!brandVoice) return "";
  const lines: string[] = [];
  if (brandVoice.target_audience) lines.push(`Target audience (match this in any people shown): ${brandVoice.target_audience}`);
  if (brandVoice.color_theme) lines.push(`Color theme / visual mood: ${brandVoice.color_theme}`);
  if (!lines.length) return "";
  return `\n\nBrand context:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

export async function generateCarouselPrompts(
  rewrittenText: string,
  brandVoice: BrandVoice | null | undefined,
): Promise<CarouselPromptsResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const systemPrompt = `You are an Instagram carousel designer. Given a finished social media post, write exactly ${CAROUSEL_SLIDE_COUNT} image-generation prompts, one per carousel slide, that together tell a visual story a reader would swipe through: slide 1 is a scroll-stopping hook, the middle slides build the problem/proof/solution, and the final slide is a clear call-to-action visual. Each prompt is 2-3 sentences, concrete and specific, describing a single photo or illustration. Do not include any text, words, letters, or logos in the image itself — captions are added separately. If people appear, match the brand's target audience described below. Keep a consistent visual style and color mood across all slides so they read as one carousel, not five unrelated images.${brandImageContext(brandVoice)}

Respond with ONLY a JSON object, no markdown, matching exactly this shape: {"prompts": string[]} with exactly ${CAROUSEL_SLIDE_COUNT} entries, in slide order.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rewrittenText },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response missing message content");
  }

  let parsed: { prompts?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  const prompts = Array.isArray(parsed.prompts)
    ? parsed.prompts.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];

  if (prompts.length !== CAROUSEL_SLIDE_COUNT) {
    throw new Error("OpenAI response did not include the expected number of carousel prompts");
  }

  const tokensUsed = typeof data?.usage?.total_tokens === "number" ? data.usage.total_tokens : null;

  return { prompts, tokensUsed };
}
