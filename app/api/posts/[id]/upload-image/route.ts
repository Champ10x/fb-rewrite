import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { logError } from "@/lib/error-log";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const RATE_LIMIT = 15;
const RATE_LIMIT_WINDOW_MINUTES = 10;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "bad_request", message: "An image file is required" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "bad_request", message: "Please upload a PNG, JPEG, WebP, or GIF image" },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "bad_request", message: "Image must be under 8MB" }, { status: 400 });
  }

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count: recentUploads } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("action", "upload_image")
    .gte("created_at", since);
  if ((recentUploads ?? 0) >= RATE_LIMIT) {
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
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${user.id}/${id}-upload.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      throw new Error("Failed to upload image");
    }

    const publicUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    const bustUrl = `${publicUrl}?v=${Date.now()}`;

    const { data: updatedAnalysis, error: updateError } = await supabase
      .from("analyses")
      .update({
        image_url: bustUrl,
        image_prompt: null,
        image_tokens_used: null,
      })
      .eq("id", analysis.id)
      .select()
      .single();

    if (updateError || !updatedAnalysis) {
      throw new Error("Failed to save uploaded image");
    }

    await writeAuditLog(supabase, {
      action: "upload_image",
      user_id: user.id,
      post_id: id,
      risk_level: "low",
      after_value: path,
    });

    return NextResponse.json({ analysis: updatedAnalysis });
  } catch (err) {
    console.error("upload-image failed", err);
    await logError(supabase, { source: "upload-image", message: "Image upload failed", err, userId: user.id, postId: id });
    return NextResponse.json(
      { error: "upload_failed", message: "Could not upload image — please try again." },
      { status: 502 },
    );
  }
}
