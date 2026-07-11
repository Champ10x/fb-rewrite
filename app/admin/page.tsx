import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin-dashboard";
import type { AuditLog, Profile, QuotaRequest } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) {
    redirect("/");
  }

  const [{ data: profiles }, { data: quotaRequests }, { data: auditLogs }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("quota_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
  ]);

  return (
    <AdminDashboard
      initialProfiles={(profiles ?? []) as Profile[]}
      quotaRequests={(quotaRequests ?? []) as QuotaRequest[]}
      auditLogs={(auditLogs ?? []) as AuditLog[]}
    />
  );
}
