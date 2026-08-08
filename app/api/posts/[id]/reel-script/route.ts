import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { generateReelScript } from "@/lib/ai/reel";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const { data: post } = await supabase.from("posts").select("id, user_id, final_text, raw_text").eq("id", id).maybeSingle();
  if (!post || post.user_id !== user.id) {
    return NextResponse.json({ error: "not_found", message: "Post not found" }, { status: 404 });
  }

  const { data: brandVoice } = await supabase.from("brand_voices").select("*").eq("user_id", user.id).maybeSingle();

  try {
    const result = await generateReelScript(post.final_text || post.raw_text, brandVoice);
    return NextResponse.json({ script: result.script, tokensUsed: result.tokensUsed });
  } catch (err) {
    console.error("reel-script failed", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Could not draft a reel script — please try again." },
      { status: 502 },
    );
  }
}
