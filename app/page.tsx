import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/home-client";
import { DEFAULT_MONTHLY_TEXT_QUOTA, DEFAULT_MONTHLY_IMAGE_QUOTA, getImageUsageThisMonth } from "@/lib/quota";
import { DEFAULT_TOKEN_DISPLAY_MARKUP } from "@/lib/tokens";
import type { BrandVoice, ErrorLog, PostWithRelations } from "@/lib/types";

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
  let textQuota = DEFAULT_MONTHLY_TEXT_QUOTA;
  let imageQuota = DEFAULT_MONTHLY_IMAGE_QUOTA;
  let isAdmin = false;
  let unresolvedErrors: ErrorLog[] = [];
  let initialImagesUsedThisMonth = 0;
  if (currentUser) {
    const [{ data: brandVoice }, { data: profile }, imagesUsed] = await Promise.all([
      supabase.from("brand_voices").select("*").eq("user_id", currentUser.id).maybeSingle(),
      supabase.from("profiles").select("monthly_text_quota, monthly_image_quota, is_admin").eq("id", currentUser.id).maybeSingle(),
      getImageUsageThisMonth(supabase, currentUser.id),
    ]);
    initialBrandVoice = brandVoice ?? null;
    textQuota = profile?.monthly_text_quota ?? DEFAULT_MONTHLY_TEXT_QUOTA;
    imageQuota = profile?.monthly_image_quota ?? DEFAULT_MONTHLY_IMAGE_QUOTA;
    isAdmin = profile?.is_admin ?? false;
    initialImagesUsedThisMonth = imagesUsed;

    if (isAdmin) {
      const { data: errors } = await supabase
        .from("error_logs")
        .select("*")
        .eq("resolved", false)
        .order("created_at", { ascending: false });
      unresolvedErrors = errors ?? [];
    }
  }

  return (
    <HomeClient
      initialPosts={initialPosts}
      currentUser={currentUser}
      initialBrandVoice={initialBrandVoice}
      textQuota={textQuota}
      imageQuota={imageQuota}
      initialImagesUsedThisMonth={initialImagesUsedThisMonth}
      isAdmin={isAdmin}
      tokenMarkup={tokenMarkup}
      initialUnresolvedErrors={unresolvedErrors}
    />
  );
}
