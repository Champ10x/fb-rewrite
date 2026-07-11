export type ScoreColor = "red" | "amber" | "green" | "gray";

export function scoreColor(score: number | null | undefined): ScoreColor {
  if (score == null) return "gray";
  if (score < 50) return "red";
  if (score < 75) return "amber";
  return "green";
}

export const scoreColorClasses: Record<ScoreColor, string> = {
  red: "bg-red-100 text-red-700 border-red-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  gray: "bg-neutral-100 text-neutral-500 border-neutral-200",
};
