/**
 * features/document-generator/utils/linkUtils.ts
 *
 * Normalizes email and web URLs for clickable hyperlinks in DOM and PDF annotations.
 */

export function normalizePdfUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();

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
