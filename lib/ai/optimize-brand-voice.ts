export type BrandVoiceFields = {
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

const SYSTEM_PROMPT = `You condense a brand-voice profile to minimize token usage while preserving every distinct piece of meaning. For each list: remove duplicates and near-duplicate synonyms, drop filler words, keep entries short (1-3 words where possible). For persona_note: rewrite as one concise sentence, no filler. For target_audience: keep ALL demographic/situational details (age, location, life stage, role) — only trim wording, never drop a detail, since this steers image generation. For color_theme: keep as a short comma-separated list, no filler. Never invent new information, never drop a genuinely distinct idea — only remove redundancy and wordiness. If a field is already empty or minimal, leave it as-is.

Respond with ONLY a JSON object, no markdown, matching exactly this shape (same fields as the input):
{"voice_keywords": string[], "words_to_use": string[], "words_to_avoid": string[], "content_style": string[], "caption_length_pref": string|null, "script_length_pref": string|null, "cta_style": string[], "cta_examples": string[], "topics": string[], "persona_note": string|null, "audience_feelings": string[], "target_audience": string|null, "color_theme": string|null}`;

function arr(v: unknown, fallback: string[]): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : fallback;
}

function str(v: unknown, fallback: string | null): string | null {
  return typeof v === "string" ? (v.trim() ? v.trim() : null) : fallback;
}

/**
 * Best-effort token-reduction pass. Never blocks saving — falls back to the
 * original fields untouched on any failure (missing key, bad response, etc.).
 */
export async function optimizeBrandVoice(fields: BrandVoiceFields): Promise<BrandVoiceFields> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fields;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(fields) },
        ],
      }),
    });

    if (!res.ok) return fields;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return fields;

    const parsed = JSON.parse(content);

    return {
      voice_keywords: arr(parsed.voice_keywords, fields.voice_keywords),
      words_to_use: arr(parsed.words_to_use, fields.words_to_use),
      words_to_avoid: arr(parsed.words_to_avoid, fields.words_to_avoid),
      content_style: arr(parsed.content_style, fields.content_style),
      caption_length_pref: str(parsed.caption_length_pref, fields.caption_length_pref),
      script_length_pref: str(parsed.script_length_pref, fields.script_length_pref),
      cta_style: arr(parsed.cta_style, fields.cta_style),
      cta_examples: arr(parsed.cta_examples, fields.cta_examples),
      topics: arr(parsed.topics, fields.topics),
      persona_note: str(parsed.persona_note, fields.persona_note),
      audience_feelings: arr(parsed.audience_feelings, fields.audience_feelings),
      target_audience: str(parsed.target_audience, fields.target_audience),
      color_theme: str(parsed.color_theme, fields.color_theme),
    };
  } catch (err) {
    console.error("brand voice optimization failed (non-fatal, saving unoptimized)", err);
    return fields;
  }
}
