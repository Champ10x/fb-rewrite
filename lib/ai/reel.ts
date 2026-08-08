import type { BrandVoice } from "@/lib/types";

export type ReelScriptResult = {
  script: string;
  tokensUsed: number | null;
};

function brandReelContext(brandVoice: BrandVoice | null | undefined): string {
  if (!brandVoice) return "";
  const lines: string[] = [];
  if (brandVoice.target_audience) lines.push(`Exact viewer this is for: ${brandVoice.target_audience}`);
  if (brandVoice.persona_note) lines.push(`The outcome this business delivers: ${brandVoice.persona_note}`);
  if (brandVoice.cta_style.length) lines.push(`How this business asks for contact: ${brandVoice.cta_style.join(", ")}`);
  if (brandVoice.cta_examples.length) lines.push(`CTA examples to model: ${brandVoice.cta_examples.join(" | ")}`);
  if (!lines.length) return "";
  return `\n\nBrand context:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

export async function generateReelScript(
  rewrittenText: string,
  brandVoice: BrandVoice | null | undefined,
): Promise<ReelScriptResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const systemPrompt = `You are a short-form video (Reels/TikTok-style) scriptwriter. Given a finished social media post, write an editable script and shot list for a 15-30 second vertical video someone will actually film. Structure it as plain text with clear sections, in this exact style:

HOOK (0-3s): one punchy spoken line that stops the scroll — describe the shot too.
SCENE 1 (Xs-Ys): shot direction (what the camera sees / what the person does). Voiceover: the line spoken here. On-screen text: short caption overlay, if any.
SCENE 2, SCENE 3 as needed (2-4 scenes total, each 3-8 seconds) building the problem, proof, or offer.
CTA (final 3-5s): shot direction. Voiceover: one clear call to action, one contact method.

Keep total runtime under 30 seconds. Voiceover lines should be short enough to actually say in the time given. Base the content on the post below, and reuse its hook, proof point, and CTA rather than inventing new ones.${brandReelContext(brandVoice)}

Respond with ONLY a JSON object, no markdown, matching exactly this shape: {"script": string} where script is the full formatted script as one string with real line breaks (\\n).`;

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

  let parsed: { script?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  if (typeof parsed.script !== "string" || !parsed.script.trim()) {
    throw new Error("OpenAI response missing script field");
  }

  const tokensUsed = typeof data?.usage?.total_tokens === "number" ? data.usage.total_tokens : null;

  return { script: parsed.script, tokensUsed };
}
