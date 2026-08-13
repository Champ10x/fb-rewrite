import type { SupabaseClient } from "@supabase/supabase-js";
import { CAROUSEL_SLIDE_COUNT } from "@/lib/ai/carousel";

// Fallback defaults when a user has no profiles row yet. The actual per-user
// limits live in profiles.monthly_text_quota / profiles.monthly_image_quota.
export const DEFAULT_MONTHLY_TEXT_QUOTA = 60;
export const DEFAULT_MONTHLY_IMAGE_QUOTA = 10;

/** Start of the current quota month (00:00 UTC on the 1st). */
export function getMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

export function countPostsSince(createdAts: string[], since: Date): number {
  const sinceMs = since.getTime();
  return createdAts.filter((iso) => new Date(iso).getTime() >= sinceMs).length;
}

/**
 * Image-generation "tries" used this month: each single image generation
 * counts as 1, each carousel generation counts as CAROUSEL_SLIDE_COUNT since
 * it produces that many images in one call. Sourced from audit_logs (the
 * append-only action ledger) rather than the analyses table, since a
 * regenerated image overwrites the same row instead of adding a new one.
 */
export async function getImageUsageThisMonth(supabase: SupabaseClient, userId: string): Promise<number> {
  const since = getMonthStart().toISOString();
  const [{ count: imageCount }, { count: carouselCount }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "generate_image")
      .gte("created_at", since),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", "generate_carousel")
      .gte("created_at", since),
  ]);
  return (imageCount ?? 0) + (carouselCount ?? 0) * CAROUSEL_SLIDE_COUNT;
}
