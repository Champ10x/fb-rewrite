import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const MAX_FEEDBACK_LEN = 2000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rating = typeof body?.rating === "number" ? Math.round(body.rating) : null;
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim().slice(0, MAX_FEEDBACK_LEN) : null;
  const sessionTokensUsed = typeof body?.session_tokens_used === "number" ? Math.round(body.session_tokens_used) : null;
  const sessionTries = typeof body?.session_tries === "number" ? Math.round(body.session_tries) : null;

  if (rating == null || rating < 1 || rating > 10) {
    return NextResponse.json({ error: "bad_request", message: "A rating from 1 to 10 is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { user, response } = await requireUser(supabase);
  if (!user) return response;

  const { error } = await supabase.from("session_feedback").insert({
    user_id: user.id,
    rating,
    feedback: feedback || null,
    session_tokens_used: sessionTokensUsed,
    session_tries: sessionTries,
  });

  if (error) {
    return NextResponse.json({ error: "db_error", message: "Could not save your feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
