import type { PostWithRelations, Analysis } from "./types";

export function latestAnalysis(post: PostWithRelations): Analysis | null {
  if (!post.analyses?.length) return null;
  return [...post.analyses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

export function sortPosts(posts: PostWithRelations[]): PostWithRelations[] {
  return [...posts].sort((a, b) => {
    const scoreA = latestAnalysis(a)?.lead_gen_score ?? -1;
    const scoreB = latestAnalysis(b)?.lead_gen_score ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
