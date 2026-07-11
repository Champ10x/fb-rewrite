import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

const DEFAULT_PROFILE: Omit<Profile, "id" | "created_at" | "updated_at"> = {
  email: null,
  weekly_credit_allocation: 3,
  expiry_date: null,
  ip_address: null,
  browser: null,
  status: "active",
  referral: null,
  is_admin: false,
};

export async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      response: NextResponse.json(
        { error: "unauthorized", message: "Please log in to do this" },
        { status: 401 },
      ),
    };
  }

  const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile: Profile = profileRow ?? { id: user.id, created_at: "", updated_at: "", ...DEFAULT_PROFILE };

  if (profile.status !== "active") {
    return {
      user: null,
      profile: null,
      response: NextResponse.json(
        { error: "account_inactive", message: `Your account is currently ${profile.status}. Contact support for help.` },
        { status: 403 },
      ),
    };
  }

  if (profile.expiry_date && new Date(profile.expiry_date) < new Date()) {
    return {
      user: null,
      profile: null,
      response: NextResponse.json(
        { error: "account_expired", message: "Your access has expired. Contact support to renew." },
        { status: 403 },
      ),
    };
  }

  return { user, profile, response: null };
}

export async function requireAdmin(supabase: SupabaseClient) {
  const result = await requireUser(supabase);
  if (!result.user) return result;

  if (!result.profile.is_admin) {
    return {
      user: null,
      profile: null,
      response: NextResponse.json({ error: "forbidden", message: "Admin access required" }, { status: 403 }),
    };
  }

  return result;
}
