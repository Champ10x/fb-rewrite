import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "bad_request", message: "Enter a valid email address" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email, user_id: user?.id ?? null });

  if (error) {
    // Unique violation — already subscribed. Treat as success, not an error.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }
    return NextResponse.json({ error: "db_error", message: "Could not subscribe — please try again" }, { status: 500 });
  }

  await sendNotificationEmail("fb-rewrite: new newsletter subscriber", `${email} subscribed for updates.`);

  return NextResponse.json({ ok: true });
}
