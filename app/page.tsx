import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/home-client";
import { WEEKLY_POST_QUOTA } from "@/lib/quota";
import type { BrandVoice, PostWithRelations } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const [{ data: posts }, { data: userData }] = await Promise.all([
    supabase.from("posts").select("*, analyses(*), revisions(*)").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const initialPosts = (posts ?? []) as PostWithRelations[];
  const currentUser = userData?.user ? { id: userData.user.id, email: userData.user.email ?? "" } : null;

  let initialBrandVoice: BrandVoice | null = null;
  let weeklyQuota = WEEKLY_POST_QUOTA;
  if (currentUser) {
    const [{ data: brandVoice }, { data: profile }] = await Promise.all([
      supabase.from("brand_voices").select("*").eq("user_id", currentUser.id).maybeSingle(),
      supabase.from("profiles").select("weekly_credit_allocation").eq("id", currentUser.id).maybeSingle(),
    ]);
    initialBrandVoice = brandVoice ?? null;
    weeklyQuota = profile?.weekly_credit_allocation ?? WEEKLY_POST_QUOTA;
  }

  return (
    <HomeClient
      initialPosts={initialPosts}
      currentUser={currentUser}
      initialBrandVoice={initialBrandVoice}
      weeklyQuota={weeklyQuota}
    />
  );
}
