import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRewrite } from "@/lib/ai/rewrite";
import { writeAuditLog } from "@/lib/audit";

const MAX_LEN = 2000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawText = typeof body?.raw_text === "string" ? body.raw_text.trim() : "";

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

  const { data: post, error: insertError } = await supabase
    .from("posts")
    .insert({ raw_text: rawText, status: "draft" })
    .select()
    .single();

  if (insertError || !post) {
    return NextResponse.json({ error: "db_error", message: "Could not save your post" }, { status: 500 });
  }

  try {
    const result = await generateRewrite(rawText);

    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .insert({
        post_id: post.id,
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
        rewritten_text_review_status: "failed",
        lead_gen_score_review_status: "failed",
        rationale: "AI rewrite failed",
      })
      .select()
      .single();

    await writeAuditLog(supabase, {
      action: "rewrite_post",
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
