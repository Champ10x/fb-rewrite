export type ParsedBrandVoice = {
  voice_keywords: string[];
  words_to_use: string[];
  words_to_avoid: string[];
  content_style: string[];
  caption_length_pref: string | null;
  script_length_pref: string | null;
  cta_style: string[];
  cta_examples: string[];
  topics: string[];
  persona_note: string | null;
  audience_feelings: string[];
  target_audience: string | null;
  color_theme: string | null;
};

const SYSTEM_PROMPT = `You extract a structured brand-voice profile from a free-form document (markdown, notes, or plain text describing someone's writing/content voice).

Map whatever is present in the document onto this exact JSON schema. Use an empty array or null for anything not present — do not invent information that isn't in the document.

{"voice_keywords": string[], "words_to_use": string[], "words_to_avoid": string[], "content_style": string[], "caption_length_pref": string|null, "script_length_pref": string|null, "cta_style": string[], "cta_examples": string[], "topics": string[], "persona_note": string|null, "audience_feelings": string[], "target_audience": string|null, "color_theme": string|null}

target_audience: who the content is for (demographics, life stage, region, situation) — often labeled "TARGET AUDIENCE" in the doc.
color_theme: the visual palette/mood described for images or branding — often labeled "COLOR THEME" in the doc.

Respond with ONLY that JSON object, no markdown.`;

export async function parseBrandVoiceDoc(docText: string): Promise<ParsedBrandVoice> {
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
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: docText },
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

  const parsed = JSON.parse(content);
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    voice_keywords: arr(parsed.voice_keywords),
    words_to_use: arr(parsed.words_to_use),
    words_to_avoid: arr(parsed.words_to_avoid),
    content_style: arr(parsed.content_style),
    caption_length_pref: str(parsed.caption_length_pref),
    script_length_pref: str(parsed.script_length_pref),
    cta_style: arr(parsed.cta_style),
    cta_examples: arr(parsed.cta_examples),
    topics: arr(parsed.topics),
    persona_note: str(parsed.persona_note),
    audience_feelings: arr(parsed.audience_feelings),
    target_audience: str(parsed.target_audience),
    color_theme: str(parsed.color_theme),
  };
}
