import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "unauthorized", message: "Please log in to do this" },
        { status: 401 },
      ),
    };
  }

  return { user, response: null };
}
