"use client";

import { useState } from "react";
import type { Profile, SessionFeedback } from "@/lib/types";
import { displayTokens } from "@/lib/tokens";

export function AdminUsageLog({
  entries,
  profiles,
}: {
  entries: SessionFeedback[];
  profiles: Pick<Profile, "id" | "email">[];
}) {
  const [exportStatus, setExportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);

  const emailFor = (userId: string) => profiles.find((p) => p.id === userId)?.email ?? userId;

  async function handleExport() {
    setExportStatus("sending");
    setExportError(null);
    try {
      const res = await fetch("/api/admin/export-usage-log", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setExportStatus("error");
        setExportError(data.message ?? "Could not export the usage log");
        return;
      }
      setExportStatus("sent");
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch {
      setExportStatus("error");
      setExportError("Could not export the usage log — check your connection");
    }
  }

  const avgRating = entries.length
    ? (entries.reduce((sum, e) => sum + e.rating, 0) / entries.length).toFixed(1)
    : "—";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Usage log ({entries.length}) — avg rating {avgRating}/10
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exportStatus === "sending"}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportStatus === "sending"
              ? "Exporting…"
              : exportStatus === "sent"
                ? "Sent to patrick@idealchamp.com"
                : "Export usage log"}
          </button>
          {exportStatus === "error" && <span className="text-xs text-red-600">{exportError}</span>}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          No feedback submitted yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Rating</th>
                <th className="px-4 py-2 font-medium">Feedback</th>
                <th className="px-4 py-2 font-medium">Session tries</th>
                <th className="px-4 py-2 font-medium">Session tokens</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-neutral-100 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{emailFor(entry.user_id)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        entry.rating >= 8
                          ? "bg-emerald-100 text-emerald-700"
                          : entry.rating >= 5
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.rating}/10
                    </span>
                  </td>
                  <td className="max-w-xs whitespace-pre-wrap break-words px-4 py-2 text-neutral-600">
                    {entry.feedback ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{entry.session_tries ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">
                    {entry.session_tokens_used != null ? displayTokens(entry.session_tokens_used) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
