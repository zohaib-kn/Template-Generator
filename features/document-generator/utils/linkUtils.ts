/**
 * features/document-generator/utils/linkUtils.ts
 *
 * Normalizes email and web URLs for clickable hyperlinks in DOM and PDF annotations.
 */

/**
 * Sanitizes user-entered website URLs by stripping duplicate protocols
 * (e.g. "https://https://...", "http://https://...") and leading/trailing whitespace.
 */
export function cleanWebsiteUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let clean = rawUrl.trim();

  // Strip duplicate protocol sequences like "https://https://", "https://http://", "http://https://"
  clean = clean.replace(/^(?:https?:\/\/)+(https?:\/\/)/i, "$1");
  while (/^(https?:\/\/){2,}/i.test(clean)) {
    clean = clean.replace(/^(https?:\/\/)+/i, "https://");
  }

  // Also remove redundant "Website:" prefix if user pasted it
  clean = clean.replace(/^website\s*:\s*/i, "").trim();

  return clean;
}

export function normalizePdfUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  const cleaned = cleanWebsiteUrl(rawUrl);
  const trimmed = cleaned.trim();

  // Already prefixed
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    return trimmed;
  }

  // Email address
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  // Domain or URL without protocol
  if (/^(www\.|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}
