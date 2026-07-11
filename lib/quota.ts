// Fallback default when a user has no profiles row yet. The actual per-user
// limit lives in profiles.weekly_credit_allocation.
export const WEEKLY_POST_QUOTA = 3;

/** Start of the current quota week (Monday 00:00 UTC). */
export function getWeekStart(now: Date = new Date()): Date {
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday, 0, 0, 0));
}

export function countPostsSince(createdAts: string[], since: Date): number {
  const sinceMs = since.getTime();
  return createdAts.filter((iso) => new Date(iso).getTime() >= sinceMs).length;
}
