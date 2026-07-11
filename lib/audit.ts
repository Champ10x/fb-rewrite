import type { SupabaseClient } from "@supabase/supabase-js";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export async function writeAuditLog(
  supabase: SupabaseClient,
  params: {
    action: string;
    post_id?: string | null;
    risk_level: RiskLevel;
    before_value?: string | null;
    after_value?: string | null;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    action: params.action,
    post_id: params.post_id ?? null,
    risk_level: params.risk_level,
    before_value: params.before_value ?? null,
    after_value: params.after_value ?? null,
  });
  if (error) {
    console.error("audit_logs insert failed", error);
  }
}
