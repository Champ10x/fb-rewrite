"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("sending");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Log in to fb-rewrite</h1>
        <p className="mt-1 text-sm text-neutral-500">
          We&apos;ll email you a magic link — no password needed.
        </p>

        {status === "sent" ? (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Check your inbox — click the link we sent to {email} to finish logging in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-500"
            />
            {status === "error" && (
              <p className="mt-2 text-sm text-red-600">{errorMessage ?? "Something went wrong — please try again."}</p>
            )}
            <button
              type="submit"
              disabled={status === "sending" || !email.trim()}
              className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}

        <Link href="/" className="mt-5 block text-center text-sm text-neutral-500 underline-offset-2 hover:underline">
          Back to demo
        </Link>
      </div>
    </main>
  );
}
