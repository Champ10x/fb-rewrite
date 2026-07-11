import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

const RISK_CLASSES: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: logs }, { data: profile }] = await Promise.all([
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F1E3] md:flex-row">
      <Sidebar isAdmin={profile?.is_admin ?? false} />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Activity log</h1>
            <p className="mt-1 text-sm text-neutral-500">Every action you've taken, for transparency.</p>
          </div>

          {!logs || logs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
              No activity yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">When</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                    <th className="px-4 py-2 font-medium">Risk</th>
                    <th className="px-4 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-2 text-neutral-500">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 font-medium text-neutral-900">{log.action}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_CLASSES[log.risk_level ?? "low"] ?? RISK_CLASSES.low}`}
                        >
                          {log.risk_level ?? "—"}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-neutral-500">
                        {log.after_value ?? log.before_value ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
