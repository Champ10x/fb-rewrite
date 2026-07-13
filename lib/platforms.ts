export type PlatformId = "facebook" | "instagram" | "threads" | "linkedin" | "twitter";

export const PLATFORMS: { id: PlatformId; label: string }[] = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "threads", label: "Threads" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "Twitter (X)" },
];

export const PLATFORM_GUIDANCE: Record<PlatformId, string> = {
  facebook:
    "Facebook: lead-gen focused, warm and conversational, medium length, clear call-to-action with a contact method.",
  instagram:
    "Instagram: punchy and visual-first, short lines, can end with a few relevant hashtags, casual and scroll-stopping.",
  threads:
    "Threads: conversational and casual, like a text to a friend, short, opinion- or observation-led, minimal to no hashtags.",
  linkedin:
    "LinkedIn: professional and polished tone, thought-leadership framing, can be longer with structured short paragraphs, CTA is more consultative than salesy.",
  twitter:
    "Twitter (X): very short and punchy, well under 280 characters total, no fluff, strong hook, minimal hashtags.",
};

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === "string" && PLATFORMS.some((p) => p.id === value);
}

export function platformLabel(id: string | null | undefined): string {
  return PLATFORMS.find((p) => p.id === id)?.label ?? "Facebook";
}
