import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotificationEmail } from "@/lib/email";

const ERROR_NOTIFY_EMAIL = "patrick@idealchamp.com";
const MAX_DETAIL_LEN = 2000;

function detailFromError(err: unknown): string | null {
  if (err instanceof Error) return `${err.message}\n${err.stack ?? ""}`.slice(0, MAX_DETAIL_LEN);
  if (typeof err === "string") return err.slice(0, MAX_DETAIL_LEN);
  try {
    return JSON.stringify(err).slice(0, MAX_DETAIL_LEN);
  } catch {
    return null;
  }
}

/**
 * Records a server-side failure and emails the admin. Best-effort — never
 * throws, so it can't turn a handled error into an unhandled one.
 */
export async function logError(
  supabase: SupabaseClient,
  params: {
    source: string;
    message: string;
    err?: unknown;
    userId?: string | null;
    postId?: string | null;
  },
): Promise<void> {
  const detail = params.err !== undefined ? detailFromError(params.err) : null;

  try {
    await supabase.from("error_logs").insert({
      source: params.source,
      message: params.message,
      detail,
      user_id: params.userId ?? null,
      post_id: params.postId ?? null,
    });
  } catch (err) {
    console.error("error_logs insert failed (non-fatal)", err);
  }

  await sendNotificationEmail(
    `fb-rewrite error — ${params.source}`,
    `${params.message}${detail ? `\n\n${detail}` : ""}`,
    { to: ERROR_NOTIFY_EMAIL },
  );
}
