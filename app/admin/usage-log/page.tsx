import { createClient } from "@/lib/supabase/server";
import { AdminUsageLog } from "@/components/admin-usage-log";
import type { Profile, SessionFeedback } from "@/lib/types";

export default async function AdminUsageLogPage() {
  const supabase = await createClient();

  const [{ data: entries }, { data: profiles }] = await Promise.all([
    supabase.from("session_feedback").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email"),
  ]);

  return (
    <AdminUsageLog
      entries={(entries ?? []) as SessionFeedback[]}
      profiles={(profiles ?? []) as Pick<Profile, "id" | "email">[]}
    />
  );
}
