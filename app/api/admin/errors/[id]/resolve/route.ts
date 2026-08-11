import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, response } = await requireAdmin(supabase);
  if (!user) return response;

  const { data, error } = await supabase
    .from("error_logs")
    .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "db_error", message: "Could not resolve error" }, { status: 500 });
  }

  return NextResponse.json({ error_log: data });
}
