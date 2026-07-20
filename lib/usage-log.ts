import type { SupabaseClient } from "@supabase/supabase-js";

export type UsageLogRow = {
  userId: string;
  email: string;
  joinedAt: string;
  lifetimeTries: number;
  lifetimeTokens: number;
  feedbackCount: number;
  latestRating: number | null;
  latestFeedback: string | null;
  latestFeedbackAt: string | null;
};

// One row per user — every user with an account shows up, with lifetime
// tries/tokens always populated. Feedback/rating are optional extras layered
// on top for whoever has actually submitted a session rating.
export async function buildUsageLogRows(supabase: SupabaseClient): Promise<UsageLogRow[]> {
  const [{ data: profiles }, { data: posts }, { data: feedbackRows }] = await Promise.all([
    supabase.from("profiles").select("id, email, created_at"),
    supabase.from("posts").select("user_id, analyses(rewrite_tokens_used, image_tokens_used)"),
    supabase.from("session_feedback").select("user_id, rating, feedback, created_at").order("created_at", { ascending: false }),
  ]);

  const lifetimeByUser = new Map<string, { tries: number; tokens: number }>();
  for (const post of posts ?? []) {
    if (!post.user_id) continue;
    const entry = lifetimeByUser.get(post.user_id) ?? { tries: 0, tokens: 0 };
    entry.tries += 1;
    for (const analysis of post.analyses ?? []) {
      entry.tokens += (analysis.rewrite_tokens_used ?? 0) + (analysis.image_tokens_used ?? 0);
    }
    lifetimeByUser.set(post.user_id, entry);
  }

  // feedbackRows is ordered newest-first, so the first row seen per user is
  // their latest submission.
  const feedbackByUser = new Map<
    string,
    { count: number; latestRating: number | null; latestFeedback: string | null; latestAt: string | null }
  >();
  for (const row of feedbackRows ?? []) {
    const existing = feedbackByUser.get(row.user_id);
    if (existing) {
      existing.count += 1;
    } else {
      feedbackByUser.set(row.user_id, {
        count: 1,
        latestRating: row.rating,
        latestFeedback: row.feedback,
        latestAt: row.created_at,
      });
    }
  }

  const rows: UsageLogRow[] = (profiles ?? []).map((profile) => {
    const lifetime = lifetimeByUser.get(profile.id) ?? { tries: 0, tokens: 0 };
    const feedback = feedbackByUser.get(profile.id);
    return {
      userId: profile.id,
      email: profile.email ?? profile.id,
      joinedAt: profile.created_at,
      lifetimeTries: lifetime.tries,
      lifetimeTokens: lifetime.tokens,
      feedbackCount: feedback?.count ?? 0,
      latestRating: feedback?.latestRating ?? null,
      latestFeedback: feedback?.latestFeedback ?? null,
      latestFeedbackAt: feedback?.latestAt ?? null,
    };
  });

  rows.sort((a, b) => b.lifetimeTries - a.lifetimeTries);
  return rows;
}
