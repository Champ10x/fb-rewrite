import type { SupabaseClient } from "@supabase/supabase-js";

export type StyleEditKind = "text" | "image";

const DISTILL_THRESHOLD = 3;
const MAX_NOTES_LEN = 500;

/**
 * Best-effort personalization: records a (AI draft -> user's final version)
 * pair when they meaningfully differ, and periodically distills recent pairs
 * into short style notes fed back into future prompts for this user. Never
 * throws — a failure here should never break the save/generate it's attached to.
 */
export async function recordStyleEdit(
  supabase: SupabaseClient,
  userId: string,
  kind: StyleEditKind,
  aiDraft: string,
  userFinal: string,
): Promise<void> {
  try {
    const draft = aiDraft.trim();
    const final = userFinal.trim();
    if (!draft || !final || draft === final) return;

    await supabase.from("style_edits").insert({ user_id: userId, kind, ai_draft: draft, user_final: final });
    await maybeDistillStyle(supabase, userId, kind);
  } catch (err) {
    console.error("style edit tracking failed (non-fatal)", err);
  }
}

async function maybeDistillStyle(supabase: SupabaseClient, userId: string, kind: StyleEditKind): Promise<void> {
  const { data: undistilled } = await supabase
    .from("style_edits")
    .select("id, ai_draft, user_final")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("distilled", false)
    .order("created_at", { ascending: true })
    .limit(10);

  if (!undistilled || undistilled.length < DISTILL_THRESHOLD) return;

  const notesColumn = kind === "text" ? "learned_style_notes" : "learned_image_style_notes";
  const { data: brandVoice } = await supabase
    .from("brand_voices")
    .select(notesColumn)
    .eq("user_id", userId)
    .maybeSingle();

  const existingNotes = (brandVoice as Record<string, string | null> | null)?.[notesColumn] ?? null;
  const notes = await distillStyleNotes(kind, existingNotes, undistilled);
  if (!notes) return;

  await supabase
    .from("brand_voices")
    .update({ [notesColumn]: notes, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  await supabase
    .from("style_edits")
    .update({ distilled: true })
    .in("id", undistilled.map((e) => e.id));
}

async function distillStyleNotes(
  kind: StyleEditKind,
  existingNotes: string | null,
  edits: { ai_draft: string; user_final: string }[],
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const subject =
    kind === "text"
      ? "how a specific user edits AI-written social media posts"
      : "how a specific user edits AI-drafted image-generation prompts";
  const focus =
    kind === "text"
      ? "sentence length and rhythm, punctuation habits, word choices, formatting quirks, and tone adjustments — not content topics"
      : "visual style preferences: photography vs illustration, lighting, mood, composition, and what they tend to add or remove — not the specific subject matter";

  const examplesText = edits
    .map((e, i) => `Example ${i + 1}:\nAI draft: ${e.ai_draft}\nUser's final version: ${e.user_final}`)
    .join("\n\n");

  const systemPrompt = `You are analyzing ${subject}. Given pairs of (AI draft -> user's final version), write concise, actionable style notes (3-6 short plain sentences) describing ${focus}.${
    existingNotes ? ` Refine and update these existing notes with the new examples rather than starting over:\n${existingNotes}` : ""
  }\n\nKeep the total under ${MAX_NOTES_LEN} characters. Respond with ONLY the notes as plain text — no markdown, no preamble, no numbering.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: examplesText },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;

    return content.trim().slice(0, MAX_NOTES_LEN);
  } catch (err) {
    console.error("style distillation failed (non-fatal)", err);
    return null;
  }
}
