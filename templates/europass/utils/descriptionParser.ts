/**
 * templates/europass/utils/descriptionParser.ts
 *
 * Pure utility — zero dependencies, fully testable.
 *
 * Converts a raw CRM work-experience description string into an ordered list
 * of clean bullet-point strings for structured PDF rendering.
 *
 * Priority order:
 *  1. Text already has manual bullet markers (•, -, *) on new lines → use them
 *  2. Text has multiple sentences (≥ 20 chars each) → each sentence = bullet
 *  3. Single long sentence (> 120 chars) → split on ; / em-dash / " — "
 *  4. Short text (≤ 80 chars) → single plain item (caller renders as plain text)
 *
 * Guarantees:
 *  - Never returns an empty array.
 *  - Each item is trimmed and non-empty.
 *  - Maximum of MAX_BULLETS items (prevents PDF layout overflow).
 */

const MAX_BULLETS = 6;
const MIN_ITEM_LENGTH = 10;

/**
 * Strip all leading bullet marker characters from a string repeatedly.
 * Handles •, ◦, ▪, ●, -, *, –, —, ·, ., quotes, ticks, and any surrounding spaces.
 * Ensures multi-bullet sequences like "• • • " or "- - " are stripped completely down to the actual text.
 */
export function stripLeadingMarkers(s: string): string {
  if (!s) return "";
  return s.replace(/^[\s\u2022\u25E6\u25AA\u25CF\-\*\u2013\u2014\u2018\u2019\'\"·\.]+/g, "").trim();
}

/**
 * Capitalise the first character of a string.
 */
function capitaliseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Clean and filter a list of candidate bullet strings.
 * - Strips all leading markers
 * - Capitalises first letter
 * - Removes items shorter than MIN_ITEM_LENGTH
 * - Caps at MAX_BULLETS
 */
function cleanAndCap(items: string[]): string[] {
  return items
    .map(stripLeadingMarkers)
    .map(capitaliseFirst)
    .filter((s) => s.length >= MIN_ITEM_LENGTH)
    .slice(0, MAX_BULLETS);
}

/**
 * Split a text block into sentence-based bullets.
 * Splits on ". " followed by an uppercase letter or common sentence starters.
 */
function splitBySentences(text: string): string[] {
  // Split on a period + space where the next word starts with uppercase or a number
  const raw = text.split(/\.\s+(?=[A-Z0-9"'(])/);
  return raw.map((s) => s.replace(/\.$/, "").trim());
}

/**
 * Main export — parse a raw description string into bullet point items.
 *
 * @param raw - The raw description string from the CRM.
 * @returns   An array of 1–MAX_BULLETS clean bullet strings.
 */
export function parseDescriptionToBullets(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [""];

  // ── Strategy 1: Already has manual bullet markers on lines ──────
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const manualBulletLines = lines.filter((l) =>
    /^[\u2022\u25E6\u25AA\u25CF\-\*\u2013\u2014\u2018\u2019\'\"·]/.test(l)
  );

  if (manualBulletLines.length >= 1) {
    const cleaned = cleanAndCap(manualBulletLines);
    if (cleaned.length >= 1) return cleaned;
  }

  // Multiple lines without explicit bullet markers
  if (lines.length >= 2) {
    const cleaned = cleanAndCap(lines);
    if (cleaned.length >= 2) return cleaned;
  }

  // ── Strategy 2: Multiple sentences (≥ 20 chars each) ────────────────────
  const sentences = splitBySentences(text).filter((s) => s.length >= 20);

  if (sentences.length >= 2) {
    const cleaned = cleanAndCap(sentences);
    if (cleaned.length >= 2) return cleaned;
  }

  // ── Strategy 3: Single long sentence — split on sub-delimiters ───────────
  if (text.length > 120) {
    const subSplit = text
      .split(/;\s*|\s+—\s+|\s+–\s+/)
      .map((s) => s.replace(/\.$/, "").trim())
      .filter((s) => s.length >= MIN_ITEM_LENGTH);

    if (subSplit.length >= 2) {
      const cleaned = cleanAndCap(subSplit);
      if (cleaned.length >= 2) return cleaned;
    }
  }

  // ── Strategy 4: Short or unsplittable text — single plain item ───────────
  const single = stripLeadingMarkers(text.replace(/\.$/, "").trim());
  return [capitaliseFirst(single)];
}
