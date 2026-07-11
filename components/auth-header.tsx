"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthHeader({ email }: { email: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Log in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-neutral-500">{email}</span>
      <Link href="/audit" className="font-medium text-neutral-500 underline-offset-2 hover:underline">
        Activity log
      </Link>
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Log out
      </button>
    </div>
  );
}
