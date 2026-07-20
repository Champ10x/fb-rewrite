import { createClient } from "@/lib/supabase/server";
import { AdminUsageLog } from "@/components/admin-usage-log";
import { buildUsageLogRows } from "@/lib/usage-log";
import { DEFAULT_TOKEN_DISPLAY_MARKUP } from "@/lib/tokens";

export default async function AdminUsageLogPage() {
  const supabase = await createClient();

  const [rows, { data: appSettings }] = await Promise.all([
    buildUsageLogRows(supabase),
    supabase.from("app_settings").select("token_display_markup").eq("id", 1).maybeSingle(),
  ]);

  return <AdminUsageLog rows={rows} tokenMarkup={appSettings?.token_display_markup ?? DEFAULT_TOKEN_DISPLAY_MARKUP} />;
}
