import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRewrite } from "@/lib/ai/rewrite";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const postId = typeof body?.post_id === "string" ? body.post_id : "";
  const rawText = typeof body?.raw_text === "string" ? body.raw_text.trim() : "";

  if (!postId || !rawText) {
    return NextResponse.json({ error: "bad_request", message: "post_id and raw_text are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  try {
    const { data: brandVoice } = await supabase
      .from("brand_voices")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    const result = await generateRewrite(rawText, brandVoice);

    const { data: revision, error } = await supabase
      .from("revisions")
      .insert({
        post_id: postId,
        user_id: user.id,
        rewritten_text: result.rewritten_text,
        lead_gen_score: result.lead_gen_score,
      })
      .select()
      .single();

    if (error || !revision) {
      throw new Error("Failed to save revision");
    }

    await writeAuditLog(supabase, {
      action: "generate_revision",
      user_id: user.id,
      post_id: postId,
      risk_level: "medium",
      after_value: result.rewritten_text,
    });

    return NextResponse.json({ revision });
  } catch (err) {
    console.error("revision failed", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Rewrite failed — please try again." },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("post_id");
  if (!postId) {
    return NextResponse.json({ error: "bad_request", message: "post_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revisions")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ revisions: data ?? [] });
}
