"use client";

import { useState } from "react";
import type { UsageLogRow } from "@/lib/usage-log";
import { displayTokens } from "@/lib/tokens";

export function AdminUsageLog({ rows, tokenMarkup }: { rows: UsageLogRow[]; tokenMarkup: number }) {
  const [exportStatus, setExportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);

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

  const rated = rows.filter((r) => r.latestRating != null);
  const avgRating = rated.length
    ? (rated.reduce((sum, r) => sum + (r.latestRating ?? 0), 0) / rated.length).toFixed(1)
    : "—";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Usage log ({rows.length} users, {rated.length} rated) — avg rating {avgRating}/10
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

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          No users yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Date joined</th>
                <th className="px-4 py-2 font-medium">Lifetime tries</th>
                <th className="px-4 py-2 font-medium">Lifetime tokens</th>
                <th className="px-4 py-2 font-medium">Latest rating</th>
                <th className="px-4 py-2 font-medium">Latest feedback</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b border-neutral-100 align-top last:border-0">
                  <td className="px-4 py-2 text-neutral-700">{row.email}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                    {row.joinedAt ? new Date(row.joinedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{row.lifetimeTries}</td>
                  <td className="px-4 py-2 text-neutral-500">{displayTokens(row.lifetimeTokens, tokenMarkup)}</td>
                  <td className="px-4 py-2">
                    {row.latestRating == null ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.latestRating >= 8
                            ? "bg-emerald-100 text-emerald-700"
                            : row.latestRating >= 5
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.latestRating}/10
                        {row.feedbackCount > 1 ? ` (${row.feedbackCount}x)` : ""}
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs whitespace-pre-wrap break-words px-4 py-2 text-neutral-600">
                    {row.latestFeedback ?? "—"}
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
