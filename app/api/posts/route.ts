import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*, analyses(*), revisions(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
  }

  const posts = (data ?? []).sort((a, b) => {
    const scoreA = latestScore(a.analyses);
    const scoreB = latestScore(b.analyses);
    return scoreB - scoreA;
  });

  return NextResponse.json({ posts });
}

function latestScore(analyses: { lead_gen_score: number | null; created_at: string }[]) {
  if (!analyses?.length) return -1;
  const latest = [...analyses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
  return latest.lead_gen_score ?? -1;
}
