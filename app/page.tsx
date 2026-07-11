import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/home-client";
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
  if (currentUser) {
    const { data: brandVoice } = await supabase
      .from("brand_voices")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    initialBrandVoice = brandVoice ?? null;
  }

  return (
    <HomeClient initialPosts={initialPosts} currentUser={currentUser} initialBrandVoice={initialBrandVoice} />
  );
}
