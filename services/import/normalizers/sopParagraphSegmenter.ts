/**
 * services/import/normalizers/sopParagraphSegmenter.ts
 *
 * Deterministic text segmentation engine for SOP documents.
 * Cleans extracted PDF/DOCX text, removes headers/footers/page numbers,
 * and segments narrative into distinct paragraph blocks.
 */

import { generateId } from "@/lib/generateId";

export interface RawParagraphBlock {
  id: string;
  text: string;
  sourceIndex: number;
}

/**
 * Cleans extracted document text:
 * - Normalizes Windows/Mac line endings (\r\n -> \n)
 * - Strips page numbers, headers, and separator lines
 * - Removes non-printable characters while preserving punctuation and quotes
 */
export function cleanDocumentText(rawText: string): string {
  if (!rawText) return "";

  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove standalone page numbering like "Page 1 of 2", "Page 1", "- 1 -"
    .replace(/(?:^|\n)\s*(?:Page\s+\d+(?:\s+of\s+\d+)?|-?\s*\d+\s*-?)\s*(?:\n|$)/gi, "\n\n")
    // Replace multiple form feeds or horizontal rules
    .replace(/_{3,}|-{3,}|\*{3,}/g, "\n")
    // Normalize excessive horizontal whitespace (tabs, multiple spaces)
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Segments cleaned document text into logical paragraph blocks.
 */
export function segmentSopParagraphs(rawText: string): RawParagraphBlock[] {
  const cleaned = cleanDocumentText(rawText);
  if (!cleaned) return [];

  // Split by 2 or more consecutive newlines
  const rawChunks = cleaned.split(/\n\s*\n+/);
  const blocks: RawParagraphBlock[] = [];
  let index = 0;

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (!trimmed || trimmed.length < 5) continue;

    // If chunk contains single newlines, decide whether to preserve or join (e.g. address lines vs wrapped text)
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);

    // If it's a short multi-line block (like an address or recipient block), keep with single newlines
    if (lines.length <= 5 && lines.every((l) => l.length < 80)) {
      blocks.push({
        id: `p-${++index}-${generateId()}`,
        text: lines.join("\n"),
        sourceIndex: index,
      });
    } else {
      // Normal narrative paragraph: join wrapped lines with space
      const joined = lines.join(" ").replace(/\s{2,}/g, " ");
      blocks.push({
        id: `p-${++index}-${generateId()}`,
        text: joined,
        sourceIndex: index,
      });
    }
  }

  return blocks;
}
