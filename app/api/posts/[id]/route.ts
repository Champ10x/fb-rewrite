import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

const MAX_LEN = 2000;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const finalText = typeof body?.final_text === "string" ? body.final_text.trim() : "";

  if (!finalText) {
    return NextResponse.json({ error: "empty_text", message: "Rewrite text cannot be empty" }, { status: 400 });
  }
  if (finalText.length > MAX_LEN) {
    return NextResponse.json(
      { error: "too_long", message: `Post too long (max ${MAX_LEN} characters)` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const { data: existing } = await supabase.from("posts").select("final_text").eq("id", id).single();

  const { data: post, error } = await supabase
    .from("posts")
    .update({ final_text: finalText, status: "accepted" })
    .eq("id", id)
    .select()
    .single();

  if (error || !post) {
    return NextResponse.json(
      { error: "forbidden", message: "You don't have permission to edit this post" },
      { status: 403 },
    );
  }

  await writeAuditLog(supabase, {
    action: "save_final",
    user_id: user.id,
    post_id: id,
    risk_level: "medium",
    before_value: existing?.final_text ?? null,
    after_value: finalText,
  });

  return NextResponse.json({ post });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const { data: existing } = await supabase.from("posts").select("raw_text, final_text").eq("id", id).single();

  const { data: deleted, error } = await supabase.from("posts").delete().eq("id", id).select();

  if (error) {
    return NextResponse.json({ error: "db_error", message: "Delete failed — check connection" }, { status: 500 });
  }
  if (!deleted || deleted.length === 0) {
    return NextResponse.json(
      { error: "forbidden", message: "You don't have permission to delete this post" },
      { status: 403 },
    );
  }

  await writeAuditLog(supabase, {
    action: "delete_post",
    user_id: user.id,
    post_id: id,
    risk_level: "critical",
    before_value: existing?.final_text ?? existing?.raw_text ?? null,
  });

  return NextResponse.json({ ok: true });
}
