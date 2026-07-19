import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { user, response } = await requireAdmin(supabase);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.default_weekly_credit_allocation !== "number" || body.default_weekly_credit_allocation < 0) {
    return NextResponse.json({ error: "bad_request", message: "default_weekly_credit_allocation must be a non-negative number" }, { status: 400 });
  }
  if (typeof body.token_display_markup !== "number" || body.token_display_markup <= 0) {
    return NextResponse.json({ error: "bad_request", message: "token_display_markup must be a positive number" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("app_settings")
    .update({
      default_weekly_credit_allocation: Math.floor(body.default_weekly_credit_allocation),
      token_display_markup: body.token_display_markup,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "db_error", message: "Could not update settings" }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
