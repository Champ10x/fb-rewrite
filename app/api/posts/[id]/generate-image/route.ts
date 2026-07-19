import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { generateImage } from "@/lib/ai/image";
import { writeAuditLog } from "@/lib/audit";

const MAX_PROMPT_LEN = 1000;
const RATE_LIMIT = 15;
const RATE_LIMIT_WINDOW_MINUTES = 10;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, MAX_PROMPT_LEN) : "";

  if (!prompt) {
    return NextResponse.json({ error: "bad_request", message: "An image prompt is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count: recentGenerations } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("action", "generate_image")
    .gte("created_at", since);
  if ((recentGenerations ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: "rate_limited", message: "You're doing that a lot — please wait a few minutes before trying again." },
      { status: 429 },
    );
  }

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

  try {
    const image = await generateImage(prompt);

    const path = `${user.id}/${id}.png`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, Buffer.from(image.base64, "base64"), { contentType: "image/png", upsert: true });

    if (uploadError) {
      throw new Error("Failed to upload image");
    }

    const publicUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    const bustUrl = `${publicUrl}?v=${Date.now()}`;

    const { data: updatedAnalysis, error: updateError } = await supabase
      .from("analyses")
      .update({
        image_url: bustUrl,
        image_prompt: prompt,
        image_tokens_used: image.tokensUsed,
      })
      .eq("id", analysis.id)
      .select()
      .single();

    if (updateError || !updatedAnalysis) {
      throw new Error("Failed to save generated image");
    }

    await writeAuditLog(supabase, {
      action: "generate_image",
      user_id: user.id,
      post_id: id,
      risk_level: "low",
      after_value: prompt,
    });

    return NextResponse.json({ analysis: updatedAnalysis });
  } catch (err) {
    console.error("generate-image failed", err);
    return NextResponse.json(
      { error: "ai_failed", message: "Could not create image — please try again." },
      { status: 502 },
    );
  }
}
