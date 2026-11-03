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
    const textOnly = withNewlines.replace(/<[^>]+>/g, "").replace(/^\n+|\n+$/g, "");
    if (textOnly && textOnly.trim() !== "COVER LETTER") {
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

  if (blocks.length >= 2) {
    setContent("recipient", blocks[0]);
    setContent("subject", blocks[1]);
  }

  if (blocks.length >= 3) {
    setContent("academic background", blocks[2]);
  }

  if (blocks.length >= 4) {
    setContent("why this course", blocks[3]);
  }

  if (blocks.length >= 5) {
    setContent("why this university", blocks[4]);
  }

  if (blocks.length >= 6) {
    setContent("why italy", blocks[5]);
  }

  if (blocks.length >= 7) {
    setContent("future academic plan", blocks[6]);
  }

  if (blocks.length >= 8) {
    setContent("financial sponsorship", blocks[7]);
  }

  if (blocks.length >= 9) {
    setContent("accommodation", blocks[8]);
  }

  if (blocks.length >= 10) {
    setContent("closing statement", blocks[9]);
  }

  if (blocks.length >= 11) {
    setContent("signature", blocks[10]);
  }

  return updated;
}

/**
 * Updates live editor HTML in-place when AI modifies specific sections or fields.
 * Retains all surrounding user repositioning, custom indentation, paragraph alignments,
 * and canvas modifications without replacing the whole editor with hardcoded defaults.
 */
export function updateLiveCoverLetterHtml(
  currentHtml: string,
  oldSections: { heading: string; content: string }[],
  newSections: { heading: string; content: string }[]
): string {
  if (!currentHtml) return docSectionsToHtml(newSections, "COVER_LETTER");

  // Determine what changed between oldSections and newSections
  const oldLayout = buildCoverLetterLayout(oldSections.map((s) => ({ title: s.heading, content: s.content })));
  const newLayout = buildCoverLetterLayout(newSections.map((s) => ({ title: s.heading, content: s.content })));

  let updatedHtml = currentHtml;

  // 1. In-place recipient update (only if recipient was specifically targeted by AI)
  if (oldLayout.recipient !== newLayout.recipient && oldLayout.recipient) {
    const oldRecipFormatted = fmt(oldLayout.recipient).replace(/\n/g, "<br>");
    const newRecipFormatted = fmt(newLayout.recipient).replace(/\n/g, "<br>");
    if (updatedHtml.includes(oldRecipFormatted)) {
      updatedHtml = updatedHtml.replace(oldRecipFormatted, newRecipFormatted);
    } else if (updatedHtml.includes(oldLayout.recipient)) {
      updatedHtml = updatedHtml.replace(oldLayout.recipient, newLayout.recipient);
    }
  }

  // 2. In-place subject line update
  if (oldLayout.subject !== newLayout.subject && oldLayout.subject) {
    const oldSubjFormatted = fmt(oldLayout.subject);
    const newSubjFormatted = fmt(newLayout.subject);
    if (updatedHtml.includes(oldSubjFormatted)) {
      updatedHtml = updatedHtml.replace(oldSubjFormatted, newSubjFormatted);
    } else if (updatedHtml.includes(oldLayout.subject)) {
      updatedHtml = updatedHtml.replace(oldLayout.subject, newLayout.subject);
    }
  }

  // 3. In-place body paragraph updates
  for (let i = 0; i < Math.max(oldLayout.paragraphs.length, newLayout.paragraphs.length); i++) {
    const oldP = oldLayout.paragraphs[i] || "";
    const newP = newLayout.paragraphs[i] || "";
    if (oldP !== newP && oldP) {
      const oldPFormatted = fmt(oldP);
      const newPFormatted = fmt(newP);

      if (updatedHtml.includes(oldPFormatted)) {
        updatedHtml = updatedHtml.replace(oldPFormatted, newPFormatted);
      } else {
        // Locate paragraph by searching for significant matching token prefix
        const pRegex = /<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gi;
        let pMatch: RegExpExecArray | null;

        const oldClean = oldP.replace(/\*\*/g, "").slice(0, 40).toLowerCase();
        while ((pMatch = pRegex.exec(updatedHtml)) !== null) {
          const innerClean = pMatch[1].replace(/<[^>]+>/g, "").toLowerCase();
          if (
            innerClean.includes(oldClean) ||
            (oldClean.length > 20 && innerClean.slice(0, 30) === oldClean.slice(0, 30))
          ) {
            const matchedFullP = pMatch[0];
            const pAttributes =
              matchedFullP.match(/^<p(\s+[^>]*)?>/i)?.[1] ||
              ' style="text-align: justify; text-justify: inter-word; margin-top: 0; line-height: 1.16;"';
            const replacementP = `<p${pAttributes}>${newPFormatted}</p>`;
            updatedHtml = updatedHtml.replace(matchedFullP, replacementP);
            break;
          }
        }
      }
    }
  }

  // 4. In-place signature update
  if (oldLayout.signature !== newLayout.signature && oldLayout.signature) {
    const oldSigFormatted = fmt(oldLayout.signature).replace(/\n/g, "<br>");
    const newSigFormatted = fmt(newLayout.signature).replace(/\n/g, "<br>");
    if (updatedHtml.includes(oldSigFormatted)) {
      updatedHtml = updatedHtml.replace(oldSigFormatted, newSigFormatted);
    }
  }

  return updatedHtml;
}

