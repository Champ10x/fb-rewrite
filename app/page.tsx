import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/home-client";
import type { PostWithRelations } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("*, analyses(*), revisions(*)")
    .order("created_at", { ascending: false });

  const initialPosts = (data ?? []) as PostWithRelations[];

  return <HomeClient initialPosts={initialPosts} />;
}
