import { createClient } from "@/lib/supabase/server";
import { AdminAccess } from "@/components/admin-access";
import type { Profile } from "@/lib/types";

export default async function AdminAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return <AdminAccess initialProfiles={(profiles ?? []) as Profile[]} currentUserId={user?.id ?? ""} />;
}
