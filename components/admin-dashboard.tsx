"use client";

import { useState } from "react";
import type { AuditLog, Profile, QuotaRequest } from "@/lib/types";
import { Sidebar } from "@/components/sidebar";

const RISK_CLASSES: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = ["active", "suspended", "pending"];

export function AdminDashboard({
  initialProfiles,
  quotaRequests,
  auditLogs,
}: {
  initialProfiles: Profile[];
  quotaRequests: QuotaRequest[];
  auditLogs: AuditLog[];
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const emailFor = (userId: string | null) => profiles.find((p) => p.id === userId)?.email ?? userId ?? "—";

  function updateLocal(id: string, patch: Partial<Profile>) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function handleSave(profile: Profile) {
    setSavingId(profile.id);
    setSavedId(null);
    try {
      const res = await fetch(`/api/admin/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly_credit_allocation: profile.weekly_credit_allocation,
          status: profile.status,
          expiry_date: profile.expiry_date,
        }),
      });
      if (res.ok) {
        setSavedId(profile.id);
        setTimeout(() => setSavedId(null), 1500);
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F1E3] md:flex-row">
      <Sidebar isAdmin />
      <main className="flex-1 pb-24">
      <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Admin</h1>
        <p className="mt-1 text-sm text-neutral-500">Users, quota requests, and full activity log.</p>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Users ({profiles.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Credits/week</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Expiry</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 text-neutral-700">
                      {profile.email ?? profile.id}
                      {profile.is_admin && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        value={profile.weekly_credit_allocation}
                        onChange={(e) => updateLocal(profile.id, { weekly_credit_allocation: Number(e.target.value) })}
                        className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={profile.status}
                        onChange={(e) => updateLocal(profile.id, { status: e.target.value })}
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={profile.expiry_date ? profile.expiry_date.slice(0, 10) : ""}
                        onChange={(e) =>
                          updateLocal(profile.id, { expiry_date: e.target.value ? `${e.target.value}T00:00:00Z` : null })
                        }
                        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleSave(profile)}
                        disabled={savingId === profile.id}
                        className="rounded-lg bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                      >
                        {savingId === profile.id ? "Saving…" : savedId === profile.id ? "Saved" : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Quota increase requests ({quotaRequests.length})
          </h2>
          {quotaRequests.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
              No requests yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {quotaRequests.map((qr) => (
                <li key={qr.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-900">{emailFor(qr.user_id)}</span>
                    <span className="text-xs text-neutral-400">{new Date(qr.created_at).toLocaleString()}</span>
                  </div>
                  {qr.message && <p className="mt-1 text-sm text-neutral-600">{qr.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Activity log — all users ({auditLogs.length})
          </h2>
          {auditLogs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
              No activity yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">When</th>
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                    <th className="px-4 py-2 font-medium">Risk</th>
                    <th className="px-4 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-2 text-neutral-500">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-neutral-500">{emailFor(log.user_id)}</td>
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
        </section>
      </div>
      </main>
    </div>
  );
}
