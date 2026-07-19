export type ToneId = "brand-voice" | "authoritative" | "educational" | "story";

export const TONES: { id: ToneId; label: string }[] = [
  { id: "brand-voice", label: "Brand voice (default)" },
  { id: "authoritative", label: "Authoritative" },
  { id: "educational", label: "Educational" },
  { id: "story", label: "Story" },
];

export const TONE_GUIDANCE: Record<Exclude<ToneId, "brand-voice">, string> = {
  authoritative:
    "Authoritative: confident, expert, direct. State facts plainly, no hedging or excessive qualifiers. Sound like someone who has solved this problem for many people before.",
  educational:
    "Educational: clear, teaching tone. Explain the 'why' behind the advice in plain language, as if informing someone new to the topic. Avoid jargon; define anything unavoidable.",
  story:
    "Story: narrative, scene-setting tone. Open with a specific moment or small scene (a person, a place, a situation) before arriving at the point, rather than stating the point outright.",
};

export function isToneId(value: unknown): value is ToneId {
  return typeof value === "string" && TONES.some((t) => t.id === value);
}

export function toneLabel(id: string | null | undefined): string {
  return TONES.find((t) => t.id === id)?.label ?? "Brand voice (default)";
}
