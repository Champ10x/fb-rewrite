import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";

const MAX_LEN = 1000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, profile, response } = await requireUser(supabase);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_LEN) : "";

  const { error } = await supabase.from("quota_requests").insert({ user_id: user.id, message: message || null });

  if (error) {
    return NextResponse.json({ error: "db_error", message: "Could not send your request" }, { status: 500 });
  }

  await sendNotificationEmail(
    "fb-rewrite: quota increase request",
    `${profile.email ?? user.id} has used their weekly quota and requested more posts.\n\nMessage: ${message || "(no message)"}\n\nReview at /admin.`,
  );

  return NextResponse.json({ ok: true });
}
