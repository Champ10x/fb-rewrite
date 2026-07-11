import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

const VALID_STATUSES = ["active", "suspended", "pending"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, response } = await requireAdmin(supabase);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "bad_request", message: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.weekly_credit_allocation === "number" && body.weekly_credit_allocation >= 0) {
    updates.weekly_credit_allocation = Math.floor(body.weekly_credit_allocation);
  }
  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status)) {
    updates.status = body.status;
  }
  if (body.expiry_date === null || typeof body.expiry_date === "string") {
    updates.expiry_date = body.expiry_date;
  }

  const { data, error } = await supabase.from("profiles").update(updates).eq("id", id).select().single();

  if (error || !data) {
    return NextResponse.json({ error: "db_error", message: "Could not update profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
