import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRewrite } from "@/lib/ai/rewrite";
import { generateImage } from "@/lib/ai/image";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { WEEKLY_POST_QUOTA, getWeekStart } from "@/lib/quota";

const MAX_LEN = 2000;

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawText = typeof body?.raw_text === "string" ? body.raw_text.trim() : "";
  const force = body?.force === true;

  if (!rawText) {
    return NextResponse.json({ error: "empty_text", message: "Please paste a post first" }, { status: 400 });
  }
  if (rawText.length > MAX_LEN) {
    return NextResponse.json(
      { error: "too_long", message: `Post too long (max ${MAX_LEN} characters)` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const { count: quotaUsed } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", getWeekStart().toISOString());

  if ((quotaUsed ?? 0) >= WEEKLY_POST_QUOTA) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: `Thanks for using fb-rewrite this week! You've used all ${WEEKLY_POST_QUOTA} of your posts — your quota resets Monday.`,
      },
      { status: 403 },
    );
  }

  const rateLimited = await checkRateLimit(supabase, "posts", user.id, { limit: 10, windowMinutes: 10 });
  if (rateLimited) return rateLimited;

  if (!force) {
    const normalized = normalize(rawText);
    const { data: existingPosts } = await supabase
      .from("posts")
      .select("id, raw_text")
      .eq("user_id", user.id);
    const duplicate = existingPosts?.find((p) => normalize(p.raw_text) === normalized);
    if (duplicate) {
      return NextResponse.json(
        {
          error: "duplicate",
          message: "You've already rewritten a very similar post.",
          existingPostId: duplicate.id,
        },
        { status: 409 },
      );
    }
  }

  const [{ data: post, error: insertError }, { data: brandVoice }] = await Promise.all([
    supabase.from("posts").insert({ raw_text: rawText, status: "draft", user_id: user.id }).select().single(),
    supabase.from("brand_voices").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (insertError || !post) {
    return NextResponse.json({ error: "db_error", message: "Could not save your post" }, { status: 500 });
  }

  try {
    const result = await generateRewrite(rawText, brandVoice);

    let imageUrl: string | null = null;
    let imageTokensUsed: number | null = null;
    if (result.image_prompt) {
      try {
        const image = await generateImage(result.image_prompt);
        const path = `${user.id}/${post.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(path, Buffer.from(image.base64, "base64"), { contentType: "image/png", upsert: true });
        if (!uploadError) {
          imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
          imageTokensUsed = image.tokensUsed;
        }
      } catch (imgErr) {
        console.error("image generation failed (non-fatal)", imgErr);
      }
    }

    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .insert({
        post_id: post.id,
        user_id: user.id,
        hook_score: result.hook_score,
        hook_score_source: "openai-gpt-4o",
        hook_score_confidence: result.confidence,
        hook_score_review_status: "unreviewed",
        cta_score: result.cta_score,
        cta_score_source: "openai-gpt-4o",
        cta_score_confidence: result.confidence,
        cta_score_review_status: "unreviewed",
        urgency_score: result.urgency_score,
        urgency_score_source: "openai-gpt-4o",
        urgency_score_confidence: result.confidence,
        urgency_score_review_status: "unreviewed",
        lead_gen_score: result.lead_gen_score,
        lead_gen_score_source: "openai-gpt-4o",
        lead_gen_score_confidence: result.confidence,
        lead_gen_score_review_status: "unreviewed",
        rewritten_text: result.rewritten_text,
        rewritten_text_source: "openai-gpt-4o",
        rewritten_text_confidence: result.confidence,
        rewritten_text_review_status: "unreviewed",
        rationale: result.rationale,
        follow_up_posts: result.follow_up_posts,
        image_url: imageUrl,
        image_prompt: result.image_prompt || null,
        rewrite_tokens_used: result.tokens_used,
        image_tokens_used: imageTokensUsed,
      })
      .select()
      .single();

    if (analysisError || !analysis) {
      throw new Error("Failed to save analysis");
    }

    const { data: updatedPost } = await supabase
      .from("posts")
      .update({ final_text: result.rewritten_text })
      .eq("id", post.id)
      .select()
      .single();

    await writeAuditLog(supabase, {
      action: "rewrite_post",
      user_id: user.id,
      post_id: post.id,
      risk_level: "low",
      after_value: result.rewritten_text,
    });

    return NextResponse.json({ post: updatedPost ?? post, analysis });
  } catch (err) {
    console.error("rewrite failed", err);

    const { data: failedAnalysis } = await supabase
      .from("analyses")
      .insert({
        post_id: post.id,
        user_id: user.id,
        rewritten_text_review_status: "failed",
        lead_gen_score_review_status: "failed",
        rationale: "AI rewrite failed",
      })
      .select()
      .single();

    await writeAuditLog(supabase, {
      action: "rewrite_post",
      user_id: user.id,
      post_id: post.id,
      risk_level: "low",
      after_value: "failed",
    });

    return NextResponse.json({
      post,
      analysis: failedAnalysis ?? null,
      error: "ai_failed",
      message: "Rewrite failed — please try again. Your raw post has been saved.",
    });
  }
}
