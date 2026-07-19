"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubscribe() {
    const value = email.trim();
    if (!value) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      setStatus(res.ok ? "sent" : "error");
      if (res.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
        Thanks — you're subscribed.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
        />
        <button
          onClick={handleSubscribe}
          disabled={status === "sending" || !email.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "sending" ? "Subscribing…" : "Notify me"}
        </button>
      </div>
      {status === "error" && <p className="mt-2 text-sm text-red-600">Could not subscribe — please try again.</p>}
    </div>
  );
}
