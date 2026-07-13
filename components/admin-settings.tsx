"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/types";

export function AdminSettings({ initialSettings }: { initialSettings: AppSettings }) {
  const [defaultCredits, setDefaultCredits] = useState(initialSettings.default_weekly_credit_allocation);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_weekly_credit_allocation: defaultCredits }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not save settings");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">New user defaults</h2>
      <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-neutral-700" htmlFor="default-credits">
          Default rewrites per week for new users
        </label>
        <p className="mt-1 text-xs text-neutral-500">
          Applied automatically when someone signs up. Existing users are unaffected — edit them individually from
          Users &amp; Activity.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            id="default-credits"
            type="number"
            min={0}
            value={defaultCredits}
            onChange={(e) => setDefaultCredits(Number(e.target.value))}
            className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}
