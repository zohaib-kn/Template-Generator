/**
 * Fonts the exporters may write into documents. Client-supplied font names outside this
 * list fall back to the document default instead of being embedded verbatim.
 */
export const EXPORT_FONTS = [
  "Calibri", "Times New Roman", "Arial", "Georgia", "Garamond", "Inter", "Roboto",
  "Verdana", "Trebuchet MS", "Courier New", "Helvetica", "Cambria", "Open Sans",
] as const;

const allowed = new Set(EXPORT_FONTS.map((f) => f.toLowerCase()));

export function isAllowedExportFont(font: string | null | undefined): boolean {
  return Boolean(font) && allowed.has(font!.trim().toLowerCase());
}

/** First family of a CSS font-family list, if allow-listed; otherwise the fallback. */
export function resolveExportFont(requested: string | null | undefined, fallback: string): string {
  const first = (requested || "").replace(/['"]/g, "").split(",")[0].trim();
  return isAllowedExportFont(first) ? EXPORT_FONTS.find((f) => f.toLowerCase() === first.toLowerCase())! : fallback;
}
