/**
 * features/sop-generator/lib/wordCount.ts
 *
 * Word counting utilities for the SOP / Visa Cover Letter generator.
 *
 * Implements standard word-processor counting rules:
 * - Strips Markdown syntax (bolding, headings, etc.)
 * - Interpolates dynamic student/destination placeholders
 * - Splits tokens by whitespace
 * - Excludes isolated punctuation/symbols (em-dashes, en-dashes, pipes, bullets)
 */

import type { TemplateSection, StudentDocumentContext } from "../types/sop-generator";
import { interpolate } from "./interpolateTemplate";

/**
 * Counts words in a raw text string according to standard document rules.
 */
export function countWords(text: string): number {
  if (!text) return 0;

  // Strip markdown formatting symbols
  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\[MISSING:[^\]]+\]/g, "")
    .trim();

  if (!cleaned) return 0;

  // Split on whitespace
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  // Filter out standalone punctuation and symbol tokens (e.g., "–", "—", "|", "•")
  const wordTokens = tokens.filter((t) => !/^[\p{P}\p{S}]+$/u.test(t));

  return wordTokens.length;
}

/**
 * Calculates the total word count for an entire rendered letter,
 * including the standard document title ("COVER LETTER") and all sections.
 */
export function calculateDocumentWordCount(
  sections: TemplateSection[],
  sectionContents: Record<string, string>,
  ctx: StudentDocumentContext,
  headerTitle: string = "COVER LETTER"
): number {
  let total = countWords(headerTitle);

  const sorted = [...sections].sort((a, b) => a.order - b.order);
  for (const section of sorted) {
    const raw = sectionContents[section.id] ?? section.content;
    const rendered = interpolate(raw, ctx);
    total += countWords(rendered);
  }

  return total;
}

/**
 * Calculates the word count of an individual section after placeholder interpolation.
 */
export function calculateSectionWordCount(
  rawContent: string,
  ctx: StudentDocumentContext
): number {
  const rendered = interpolate(rawContent, ctx);
  return countWords(rendered);
}
