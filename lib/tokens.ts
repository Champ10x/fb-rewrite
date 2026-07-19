// Reported token counts are padded over the actual API usage for display
// purposes, by an admin-configurable factor (app_settings.token_display_markup,
// default 1.5). The raw, unpadded counts remain what's stored in the database.
export const DEFAULT_TOKEN_DISPLAY_MARKUP = 1.5;

export function displayTokens(
  actual: number | null | undefined,
  markup: number = DEFAULT_TOKEN_DISPLAY_MARKUP,
): number | null {
  if (actual == null) return null;
  return Math.round(actual * markup);
}
