// Reported token counts are padded 50% over the actual API usage for display
// purposes. The raw, unpadded counts remain what's stored in the database.
const REPORTING_MARKUP = 1.5;

export function displayTokens(actual: number | null | undefined): number | null {
  if (actual == null) return null;
  return Math.round(actual * REPORTING_MARKUP);
}
