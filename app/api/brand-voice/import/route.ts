import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { parseBrandVoiceDoc } from "@/lib/ai/brand-voice-import";

const MAX_LEN = 20000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "empty_text", message: "Please provide some text or a file" }, { status: 400 });
  }
  if (text.length > MAX_LEN) {
    return NextResponse.json(
      { error: "too_long", message: `Document too long (max ${MAX_LEN} characters)` },
      { status: 400 },
    );
  }

  try {
    const parsed = await parseBrandVoiceDoc(text);

    const { data, error } = await supabase
      .from("brand_voices")
      .upsert({ user_id: user.id, ...parsed, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "db_error", message: "Could not save your brand voice" }, { status: 500 });
    }

    return NextResponse.json({ brandVoice: data });
  } catch (err) {
    console.error("brand voice import failed", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Could not read that document — please try again or answer the questions instead." },
      { status: 502 },
    );
  }
}
