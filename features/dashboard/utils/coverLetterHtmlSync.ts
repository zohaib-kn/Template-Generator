/**
 * features/dashboard/utils/coverLetterHtmlSync.ts
 *
 * Synchronizes live Tiptap editor HTML with the structured Cover Letter section model,
 * and performs in-place updates on live HTML so that user repositioning, custom indentation,
 * text alignments, and canvas formatting are permanently preserved across AI assistant updates.
 */

import { buildCoverLetterLayout } from "@/lib/export/coverLetterLayout";
import { docSectionsToHtml } from "./docSectionsToHtml";

const fmt = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

/**
 * Classifies blocks into structural cover-letter slots (header, recipient, subject, signature, or body).
 */
export function classifyCoverLetterBlock(
  text: string
): "header" | "recipient" | "subject" | "signature" | "body" {
  const clean = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (clean === "COVER LETTER" || /^cover\s+letter$/i.test(clean)) return "header";
  if (
    /^To,/i.test(clean) ||
    /Respected\s+Visa\s+Officer/i.test(clean) ||
    /Consulate\s+General/i.test(clean) ||
    /Embassy\s+of/i.test(clean)
  ) {
    return "recipient";
  }
  if (/^Subject:/i.test(clean)) return "subject";
  if (
    /^Sincerely/i.test(clean) ||
    /^Best\s+regards/i.test(clean) ||
    /\bEmail:\s*[\w.-]+@/i.test(clean)
  ) {
    return "signature";
  }
  return "body";
}

/**
 * Extracts blocks from live Tiptap HTML and updates the underlying Cover Letter sections array.
 * Preserves user edits, indentation, custom spacing, and removal of boilerplate (e.g. "To,").
 */
export function syncCoverLetterHtmlToSections(
  html: string,
  sections: { heading: string; content: string }[]
): { heading: string; content: string }[] {
  if (!html || !sections || sections.length === 0) return sections;

  // Strip the "COVER LETTER" header block if present
  let cleanHtml = html.replace(/<div[^>]*>[\s\S]*?COVER LETTER[\s\S]*?<\/div>/i, "");
  cleanHtml = cleanHtml.replace(/<p[^>]*>[\s\S]*?COVER LETTER[\s\S]*?<\/p>/i, "");

  const blockRegex = /<(?:p|div)(?:\s+[^>]*)?>([\s\S]*?)<\/(?:p|div)>/gi;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(cleanHtml)) !== null) {
    const rawInner = match[1];
    const withNewlines = rawInner.replace(/<br\s*\/?>/gi, "\n");
    const textOnly = withNewlines.replace(/<[^>]+>/g, "").replace(/^\n+|\n+$/g, "").trim();
    if (textOnly && textOnly !== "COVER LETTER") {
      blocks.push(textOnly);
    }
  }

  if (blocks.length === 0) return sections;

  const updated = sections.map((s) => ({ ...s }));

  const setContent = (headingKeyword: string, content: string) => {
    const sec = updated.find((s) => s.heading.toLowerCase().includes(headingKeyword.toLowerCase()));
    if (sec && content) {
      sec.content = content;
    }
  };

  // Classify blocks semantically so structural order is always respected
  const recipBlock = blocks.find((b) => classifyCoverLetterBlock(b) === "recipient");
  const subjBlock = blocks.find((b) => classifyCoverLetterBlock(b) === "subject");
  const sigBlock = blocks.find((b) => classifyCoverLetterBlock(b) === "signature");
  const bodyBlocks = blocks.filter((b) => classifyCoverLetterBlock(b) === "body");

  if (recipBlock) setContent("recipient", recipBlock);
  if (subjBlock) setContent("subject", subjBlock);
  if (sigBlock) setContent("signature", sigBlock);

  // Sync body blocks to their corresponding sections
  const bodySectionKeys = [
    "academic background",
    "why this course",
    "why this university",
    "why italy",
    "future academic plan",
    "financial sponsorship",
    "accommodation",
    "closing statement",
  ];

  bodyBlocks.forEach((blockText, idx) => {
    const key = bodySectionKeys[idx];
    if (key) {
      setContent(key, blockText);
    }
  });

  return updated;
}

/**
 * Wraps matching phrases in live HTML with a styled underline for visual editor feedback.
 */
function applyUnderlineToHtml(html: string, phrases: string[]): string {
  let result = html;
  for (const phrase of phrases) {
    if (!phrase || phrase.trim().length === 0) continue;
    const clean = phrase.trim();
    if (clean.length < 2) continue;

    // Avoid double-wrapping
    if (result.includes(`class="ai-filled-detail"`)) continue;

    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exactRegex = new RegExp(`(${escaped})`, "i");

    if (exactRegex.test(result)) {
      result = result.replace(
        exactRegex,
        `<u class="ai-filled-detail" style="text-decoration: underline; text-decoration-color: #4f46e5; text-decoration-thickness: 1.5px; text-underline-offset: 3px;">$1</u>`
      );
      continue;
    }

    // Try matching prefix for longer conversational inputs
    if (clean.length > 25) {
      const snippet = clean.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const snippetRegex = new RegExp(`(${snippet}[^.?!<>]*)`, "i");
      if (snippetRegex.test(result)) {
        result = result.replace(
          snippetRegex,
          `<u class="ai-filled-detail" style="text-decoration: underline; text-decoration-color: #4f46e5; text-decoration-thickness: 1.5px; text-underline-offset: 3px;">$1</u>`
        );
      }
    }
  }
  return result;
}

/**
 * Updates live editor HTML in-place when AI modifies specific sections or fields.
 * Retains all surrounding user repositioning, custom indentation, paragraph alignments,
 * and canvas modifications without replacing the whole editor with hardcoded defaults.
 *
 * When highlightPhrases are provided, wraps the newly modified phrases in an editor-only
 * <u> tag so that the operator can immediately see what changed.
 */
export function updateLiveCoverLetterHtml(
  currentHtml: string,
  oldSections: { heading: string; content: string }[],
  newSections: { heading: string; content: string }[],
  highlightPhrases?: string | string[]
): string {
  const phrases = highlightPhrases
    ? (Array.isArray(highlightPhrases) ? highlightPhrases : [highlightPhrases])
        .map((p) => (p || "").trim())
        .filter((p) => p.length > 0)
    : [];

  if (!currentHtml) {
    const rawHtml = docSectionsToHtml(newSections, "COVER_LETTER");
    return phrases.length > 0 ? applyUnderlineToHtml(rawHtml, phrases) : rawHtml;
  }

  // Remove existing ai-filled-detail tags so only the latest update is underlined
  let updatedHtml = currentHtml.replace(/<u\s+class="ai-filled-detail"[^>]*>([\s\S]*?)<\/u>/gi, "$1");

  // Determine what changed between oldSections and newSections
  const oldLayout = buildCoverLetterLayout(oldSections.map((s) => ({ title: s.heading, content: s.content })));
  const newLayout = buildCoverLetterLayout(newSections.map((s) => ({ title: s.heading, content: s.content })));

  // 1. In-place recipient update (only if recipient was specifically targeted by AI)
  if (oldLayout.recipient !== newLayout.recipient && oldLayout.recipient) {
    const oldRecipFormatted = fmt(oldLayout.recipient).replace(/\n/g, "<br>");
    let newRecipFormatted = fmt(newLayout.recipient).replace(/\n/g, "<br>");
    if (phrases.length > 0) newRecipFormatted = applyUnderlineToHtml(newRecipFormatted, phrases);

    if (updatedHtml.includes(oldRecipFormatted)) {
      updatedHtml = updatedHtml.replace(oldRecipFormatted, newRecipFormatted);
    } else if (updatedHtml.includes(oldLayout.recipient)) {
      updatedHtml = updatedHtml.replace(oldLayout.recipient, newRecipFormatted);
    }
  }

  // 2. In-place subject line update
  if (oldLayout.subject !== newLayout.subject && oldLayout.subject) {
    const oldSubjFormatted = fmt(oldLayout.subject);
    let newSubjFormatted = fmt(newLayout.subject);
    if (phrases.length > 0) newSubjFormatted = applyUnderlineToHtml(newSubjFormatted, phrases);

    if (updatedHtml.includes(oldSubjFormatted)) {
      updatedHtml = updatedHtml.replace(oldSubjFormatted, newSubjFormatted);
    } else if (updatedHtml.includes(oldLayout.subject)) {
      updatedHtml = updatedHtml.replace(oldLayout.subject, newSubjFormatted);
    }
  }

  // Healing check: If a body paragraph was mistakenly injected before recipient, heal the structure
  const recipMatch = updatedHtml.match(/(?:\bTo,\s*(?:<br\s*\/?>|\r?\n|\s)*)?The\s+Respected\s+Visa\s+Officer/i);
  if (recipMatch && recipMatch.index !== undefined && recipMatch.index > 0) {
    const beforeRecip = updatedHtml.slice(0, recipMatch.index);
    const textBefore = beforeRecip.replace(/<[^>]+>/g, "").replace(/COVER\s*LETTER/gi, "").trim();
    if (textBefore.length > 25) {
      // Structural corruption detected: regenerate clean standard layout from newSections
      const freshHtml = docSectionsToHtml(newSections, "COVER_LETTER");
      return phrases.length > 0 ? applyUnderlineToHtml(freshHtml, phrases) : freshHtml;
    }
  }

  // 3. In-place body paragraph updates
  const pRegex = /<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi;
  const allParagraphs: { full: string; inner: string; attrs: string; type: ReturnType<typeof classifyCoverLetterBlock> }[] = [];
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(updatedHtml)) !== null) {
    const full = pMatch[0];
    const attrs = full.match(/^<p(\s+[^>]*)?>/i)?.[1] || ' style="text-align: justify; text-justify: inter-word; margin-top: 0; line-height: 1.16;"';
    const type = classifyCoverLetterBlock(full);
    allParagraphs.push({ full, inner: pMatch[1], attrs, type });
  }

  // Strictly target ONLY true body paragraphs (never structural header, recipient, or subject)
  const bodyParagraphs = allParagraphs.filter((p) => p.type === "body");

  for (let i = 0; i < Math.max(oldLayout.paragraphs.length, newLayout.paragraphs.length); i++) {
    const oldP = oldLayout.paragraphs[i] || "";
    const newP = newLayout.paragraphs[i] || "";
    if (oldP !== newP && newP) {
      const oldPFormatted = fmt(oldP);
      let newPFormatted = fmt(newP);
      if (phrases.length > 0) {
        newPFormatted = applyUnderlineToHtml(newPFormatted, phrases);
      }

      // 1. Exact formatted match
      if (updatedHtml.includes(oldPFormatted)) {
        updatedHtml = updatedHtml.replace(oldPFormatted, newPFormatted);
        continue;
      }

      // 2. Semantic matching against bodyParagraphs
      let replaced = false;
      const oldClean = oldP.replace(/\*\*/g, "").slice(0, 30).toLowerCase();
      if (oldClean.length > 15) {
        for (const targetP of bodyParagraphs) {
          const innerClean = targetP.inner.replace(/<[^>]+>/g, "").toLowerCase();
          if (innerClean.includes(oldClean)) {
            const replacementP = `<p${targetP.attrs}>${newPFormatted}</p>`;
            updatedHtml = updatedHtml.replace(targetP.full, replacementP);
            replaced = true;
            break;
          }
        }
      }

      // 3. Positional fallback strictly scoped to bodyParagraphs (never targets header or recipient)
      if (!replaced && bodyParagraphs[i]) {
        const targetP = bodyParagraphs[i];
        const replacementP = `<p${targetP.attrs}>${newPFormatted}</p>`;
        updatedHtml = updatedHtml.replace(targetP.full, replacementP);
      }
    }
  }

  // 4. In-place signature update
  if (oldLayout.signature !== newLayout.signature && oldLayout.signature) {
    const oldSigFormatted = fmt(oldLayout.signature).replace(/\n/g, "<br>");
    let newSigFormatted = fmt(newLayout.signature).replace(/\n/g, "<br>");
    if (phrases.length > 0) newSigFormatted = applyUnderlineToHtml(newSigFormatted, phrases);

    if (updatedHtml.includes(oldSigFormatted)) {
      updatedHtml = updatedHtml.replace(oldSigFormatted, newSigFormatted);
    }
  }

  // Fallback: If phrases weren't applied inside paragraph replace, apply to updatedHtml
  if (phrases.length > 0 && !updatedHtml.includes('class="ai-filled-detail"')) {
    updatedHtml = applyUnderlineToHtml(updatedHtml, phrases);
  }

  return updatedHtml;
}

