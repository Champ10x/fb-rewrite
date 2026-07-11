import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * DB-backed rate limit — counts rows a user created in `table` within the
 * last `windowMinutes`. Works correctly across serverless instances since
 * Postgres is the shared source of truth (no in-memory store needed).
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  table: "posts" | "revisions",
  userId: string,
  { limit, windowMinutes }: { limit: number; windowMinutes: number },
) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if ((count ?? 0) >= limit) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `You're doing that a lot — please wait a few minutes before trying again.`,
      },
      { status: 429 },
    );
  }

  return null;
}
