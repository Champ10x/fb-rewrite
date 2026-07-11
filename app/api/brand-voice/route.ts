import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

export async function GET() {
  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const { data, error } = await supabase
    .from("brand_voices")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ brandVoice: data ?? null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "bad_request", message: "Invalid request body" }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    voice_keywords: toStringArray(body.voice_keywords),
    words_to_use: toStringArray(body.words_to_use),
    words_to_avoid: toStringArray(body.words_to_avoid),
    content_style: toStringArray(body.content_style),
    caption_length_pref: typeof body.caption_length_pref === "string" ? body.caption_length_pref : null,
    script_length_pref: typeof body.script_length_pref === "string" ? body.script_length_pref : null,
    cta_style: toStringArray(body.cta_style),
    cta_examples: toStringArray(body.cta_examples),
    topics: toStringArray(body.topics),
    persona_note: typeof body.persona_note === "string" ? body.persona_note : null,
    audience_feelings: toStringArray(body.audience_feelings),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("brand_voices")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "db_error", message: "Could not save your brand voice" }, { status: 500 });
  }

  return NextResponse.json({ brandVoice: data });
}
