import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const MAX_SCRIPT_LEN = 4000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const script = typeof body?.script === "string" ? body.script.trim().slice(0, MAX_SCRIPT_LEN) : "";
  const tokensUsed = typeof body?.tokensUsed === "number" ? body.tokensUsed : null;

  if (!script) {
    return NextResponse.json({ error: "bad_request", message: "A reel script is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const { data: post } = await supabase.from("posts").select("id, user_id").eq("id", id).maybeSingle();
  if (!post || post.user_id !== user.id) {
    return NextResponse.json({ error: "not_found", message: "Post not found" }, { status: 404 });
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!analysis) {
    return NextResponse.json({ error: "not_found", message: "No analysis found for this post" }, { status: 404 });
  }

  const { data: updatedAnalysis, error: updateError } = await supabase
    .from("analyses")
    .update({ reel_script: script, reel_script_tokens_used: tokensUsed })
    .eq("id", analysis.id)
    .select()
    .single();

  if (updateError || !updatedAnalysis) {
    return NextResponse.json({ error: "db_error", message: "Could not save the reel script" }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    action: "save_reel_script",
    user_id: user.id,
    post_id: id,
    risk_level: "low",
    after_value: script,
  });

  return NextResponse.json({ analysis: updatedAnalysis });
}
