import { createClient } from "@/lib/supabase/server";
import { AdminSettings } from "@/components/admin-settings";
import type { AppSettings } from "@/lib/types";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();

  return (
    <AdminSettings
      initialSettings={
        (settings as AppSettings | null) ?? {
          id: 1,
          default_weekly_credit_allocation: 3,
          token_display_markup: 1.5,
          updated_at: "",
        }
      }
    />
  );
}
