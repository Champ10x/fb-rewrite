export function getWordCount(text: string | null | undefined): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function getCharCount(text: string | null | undefined): number {
  return text?.length ?? 0;
}
