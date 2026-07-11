export type RewriteResult = {
  rewritten_text: string;
  hook_score: number;
  cta_score: number;
  urgency_score: number;
  lead_gen_score: number;
  confidence: number;
  rationale: string;
};

const SYSTEM_PROMPT = `You are an expert Facebook copywriter specializing in lead generation for local service businesses.

Given a raw, unpolished Facebook post, rewrite it to maximize leads:
- First sentence names a pain point or asks a question (the hook)
- Explicit call-to-action with a contact method (DM, call, link, message)
- A time-bound or scarcity urgency signal

Then score the rewrite you produced:
- hook_score (0-10): does the first sentence name a pain point or ask a question?
- cta_score (0-10): is there an explicit verb + contact method?
- urgency_score (0-10): is there a time-bound phrase or scarcity signal?
- lead_gen_score (0-100): overall lead-gen strength, a weighted average of the three above scaled to 100, capped at 100
- confidence (0-1): your confidence in these scores
- rationale: one sentence explaining the scores

Respond with ONLY a JSON object, no markdown, matching exactly this shape:
{"rewritten_text": string, "hook_score": number, "cta_score": number, "urgency_score": number, "lead_gen_score": number, "confidence": number, "rationale": string}`;

export async function generateRewrite(rawText: string): Promise<RewriteResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawText },
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

  let parsed: Partial<RewriteResult>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  if (
    typeof parsed.rewritten_text !== "string" ||
    typeof parsed.hook_score !== "number" ||
    typeof parsed.cta_score !== "number" ||
    typeof parsed.urgency_score !== "number" ||
    typeof parsed.lead_gen_score !== "number"
  ) {
    throw new Error("OpenAI response missing required fields");
  }

  return {
    rewritten_text: parsed.rewritten_text,
    hook_score: parsed.hook_score,
    cta_score: parsed.cta_score,
    urgency_score: parsed.urgency_score,
    lead_gen_score: Math.min(100, parsed.lead_gen_score),
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
  };
}
