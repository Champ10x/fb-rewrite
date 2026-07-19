import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/home-client";
import { WEEKLY_POST_QUOTA } from "@/lib/quota";
import { DEFAULT_TOKEN_DISPLAY_MARKUP } from "@/lib/tokens";
import type { BrandVoice, PostWithRelations } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const [{ data: posts }, { data: userData }, { data: appSettings }] = await Promise.all([
    supabase.from("posts").select("*, analyses(*), revisions(*)").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
    supabase.from("app_settings").select("token_display_markup").eq("id", 1).maybeSingle(),
  ]);
  const tokenMarkup = appSettings?.token_display_markup ?? DEFAULT_TOKEN_DISPLAY_MARKUP;

  const initialPosts = (posts ?? []) as PostWithRelations[];
  const currentUser = userData?.user ? { id: userData.user.id, email: userData.user.email ?? "" } : null;

  let initialBrandVoice: BrandVoice | null = null;
  let weeklyQuota = WEEKLY_POST_QUOTA;
  let isAdmin = false;
  if (currentUser) {
    const [{ data: brandVoice }, { data: profile }] = await Promise.all([
      supabase.from("brand_voices").select("*").eq("user_id", currentUser.id).maybeSingle(),
      supabase.from("profiles").select("weekly_credit_allocation, is_admin").eq("id", currentUser.id).maybeSingle(),
    ]);
    initialBrandVoice = brandVoice ?? null;
    weeklyQuota = profile?.weekly_credit_allocation ?? WEEKLY_POST_QUOTA;
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <HomeClient
      initialPosts={initialPosts}
      currentUser={currentUser}
      initialBrandVoice={initialBrandVoice}
      weeklyQuota={weeklyQuota}
      isAdmin={isAdmin}
      tokenMarkup={tokenMarkup}
    />
  );
}
