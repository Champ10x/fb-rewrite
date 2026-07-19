import { createClient } from "@/lib/supabase/server";
import { AdminUsageLog } from "@/components/admin-usage-log";
import { DEFAULT_TOKEN_DISPLAY_MARKUP } from "@/lib/tokens";
import type { Profile, SessionFeedback } from "@/lib/types";

export default async function AdminUsageLogPage() {
  const supabase = await createClient();

  const [{ data: entries }, { data: profiles }, { data: appSettings }] = await Promise.all([
    supabase.from("session_feedback").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email"),
    supabase.from("app_settings").select("token_display_markup").eq("id", 1).maybeSingle(),
  ]);

  return (
    <AdminUsageLog
      entries={(entries ?? []) as SessionFeedback[]}
      profiles={(profiles ?? []) as Pick<Profile, "id" | "email">[]}
      tokenMarkup={appSettings?.token_display_markup ?? DEFAULT_TOKEN_DISPLAY_MARKUP}
    />
  );
}
