"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";

export function AdminAccess({
  initialProfiles,
  currentUserId,
}: {
  initialProfiles: Profile[];
  currentUserId: string;
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleAdmin(profile: Profile) {
    const nextValue = !profile.is_admin;
    setSavingId(profile.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_admin: nextValue }),
      });
      if (res.ok) {
        setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, is_admin: nextValue } : p)));
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not update admin access");
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Admin access</h2>
      <p className="mb-3 text-sm text-neutral-500">Grant or revoke admin rights. You can't remove your own access.</p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Date joined</th>
              <th className="px-4 py-2 font-medium">Admin</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2 text-neutral-700">
                  {profile.email ?? profile.id}
                  {profile.id === currentUserId && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
                      you
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      profile.is_admin ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {profile.is_admin ? "Admin" : "User"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => toggleAdmin(profile)}
                    disabled={savingId === profile.id || (profile.id === currentUserId && profile.is_admin)}
                    className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                  >
                    {savingId === profile.id ? "Saving…" : profile.is_admin ? "Revoke admin" : "Make admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
