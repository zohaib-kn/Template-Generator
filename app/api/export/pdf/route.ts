/**
 * app/api/export/pdf/route.ts
 *
 * Server-side native vector PDF generation endpoint.
 * Uses jsPDF in pure vector text mode to render crisp, selectable, embassy-compliant A4 PDFs.
 *
 * For Cover Letters (Type D Visa Cover Letter):
 * - Follows the approved Master Template:
 *   - Centered document header: "COVER LETTER"
 *   - Clean recipient and subject lines (without developer section headings)
 *   - Flowing 8 master paragraphs matching embassy guidelines
 *   - Single-page A4 capacity budget
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { attachmentDisposition, InvalidJsonError, readJsonBody, RequestTooLargeError } from "@/lib/http/requestLimits";
import { buildCoverLetterLayout } from "@/lib/export/coverLetterLayout";
import { jsPDF } from "jspdf";

interface ExportPdfSection {
  title: string;
  content: string;
}

interface ExportPdfPayload {
  title?: string;
  studentName?: string;
  documentType?: string;
  sections: ExportPdfSection[];
  maxPages?: number;
  /** When present, the operator must have access to this student. */
  studentId?: string;
}

const MAX_PDF_BODY_BYTES = 1024 * 1024;
const MAX_SECTIONS = 100;

function cleanTextForPdf(raw: string): string {
  if (!raw) return "";
  return raw
    // Currency symbols
    .replace(/₹\s*/g, "INR ")
    .replace(/\u20B9\s*/g, "INR ")
    // Dashes & Quotes
    .replace(/–|—/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "-")
    // HTML tags to markdown
    .replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**")
    .replace(/<[^>]+>/g, "")
    // Grammar & Article smoothing
    .replace(/\bFather,\s*N\.?A\.?\.*(?:\s*,\s*)?/gi, "Father. ")
    .replace(/\bMother,\s*N\.?A\.?\.*(?:\s*,\s*)?/gi, "Mother. ")
    .replace(/\bemployed with Teacher\b/gi, "employed as a Teacher")
    .replace(/\ban Businessman\b/gi, "a Businessman")
    .replace(/\ba International\b/gi, "an International")
    .replace(/\.{2,}/g, ".")
    .replace(/[ \t]+/g, " ")
    .trim();
}

interface TextToken {
  text: string;
  isBold: boolean;
  isSpace: boolean;
  width: number;
}

function enrichCoverLetterBolding(text: string, studentName?: string): string {
  if (!text) return "";
  let enriched = text;

  // Student Name
  if (studentName && studentName.trim().length > 2) {
    const sName = studentName.trim();
    const regex = new RegExp(`(?<!\\*\\*)\\b${sName}\\b(?!\\*\\*)`, "gi");
    enriched = enriched.replace(regex, `**${sName}**`);
  }

  // Currency amounts: INR xx,xx,xxx and EUR xx,xxx
  enriched = enriched.replace(/(?<!\*\*)\b(INR\s+[\d,]+(?:\s*\([^)]+\))?)(?!\*\*)/g, "**$1**");
  enriched = enriched.replace(/(?<!\*\*)\b(EUR\s+[\d,]+|€[\d,]+)(?!\*\*)/g, "**$1**");
  enriched = enriched.replace(/(?<!\*\*)\b(USD\s+[\d,]+|\$[\d,]+)(?!\*\*)/g, "**$1**");
  enriched = enriched.replace(/(?<!\*\*)\b(1\s+EUR\s+=\s+INR\s+[\d.]+)(?!\*\*)/g, "**$1**");

  // IELTS Scores
  enriched = enriched.replace(
    /(?<!\*\*)\b(IELTS\s*(?:Academic\s*)?(?:overall\s*)?band score of\s*[\d.]+(?:,\s*with\s*[\d.]+\s*in\s*\w+)?)(?!\*\*)/gi,
    "**$1**"
  );

  // Degrees
  enriched = enriched.replace(
    /(?<!\*\*)\b(Bachelor(?:'s)? Degree in [A-Za-z\s,]+(?=\s+at|\s+for|\s+from))(?!\*\*)/gi,
    "**$1**"
  );
  enriched = enriched.replace(
    /(?<!\*\*)\b(Master(?:'s)? (?:Degree|Specialization) in [A-Za-z\s,]+(?=\s+at|\s+for|\s+from|\s+depending|\s+to))(?!\*\*)/gi,
    "**$1**"
  );

  // University names
  enriched = enriched.replace(
    /(?<!\*\*)\b(University of [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|Università degli Studi di [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?!\*\*)/g,
    "**$1**"
  );

  // Return to India
  enriched = enriched.replace(/(?<!\*\*)\b(return to India and [^,.]*|return to India)(?!\*\*)/gi, "**$1**");

  // Insurance and Certificate
  enriched = enriched.replace(
    /(?<!\*\*)\b(International Student Medical Insurance[^,.]*|travel medical insurance[^,.]*)(?!\*\*)/gi,
    "**$1**"
  );

  // Accommodation
  enriched = enriched.replace(
    /(?<!\*\*)\b(Student Residence[^,.]*|Hotel[^,.]*Spa[^,.]*)(?!\*\*)/gi,
    "**$1**"
  );

  // Flight & PNR
  enriched = enriched.replace(
    /(?<!\*\*)\b(ITA Airways flight[^,.]*|flight from [A-Z][a-z]+ to [A-Z][a-z]+[^,.]*|PNR:\s*[A-Z0-9]+)(?!\*\*)/gi,
    "**$1**"
  );

  return enriched;
}

function tokenizeRichText(doc: jsPDF, raw: string, baseFontSize: number): TextToken[] {
  const parts = raw.split(/(\**[^*]+\**)/g);
  const tokens: TextToken[] = [];

  for (const part of parts) {
    if (!part) continue;
    const isBold = part.startsWith("**") && part.endsWith("**");
    const inner = isBold ? part.slice(2, -2) : part;
    const chunks = inner.split(/(\s+)/);
    for (const chunk of chunks) {
      if (!chunk) continue;
      const isSpace = /^\s+$/.test(chunk);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(baseFontSize);
      const width = doc.getTextWidth(chunk);
      tokens.push({ text: chunk, isBold, isSpace, width });
    }
  }

  return tokens;
}

function countRichParagraphLines(doc: jsPDF, raw: string, printableWidth: number, baseFontSize: number): number {
  const tokens = tokenizeRichText(doc, raw, baseFontSize);
  let count = 0;
  let currentLineWidth = 0;
  let lineHasWord = false;

  for (const token of tokens) {
    if (token.isSpace && !lineHasWord) continue;
    if (currentLineWidth + token.width <= printableWidth) {
      currentLineWidth += token.width;
      if (!token.isSpace) lineHasWord = true;
    } else {
      count++;
      if (token.isSpace) {
        currentLineWidth = 0;
        lineHasWord = false;
      } else {
        currentLineWidth = token.width;
        lineHasWord = true;
      }
    }
  }
  if (lineHasWord) count++;
  return count;
}

function renderJustifiedRichParagraph(
  doc: jsPDF,
  rawParagraph: string,
  margin: number,
  startY: number,
  printableWidth: number,
  bodyFontSize: number,
  bodyLineHeight: number
): { finalY: number; lineCount: number } {
  const tokens = tokenizeRichText(doc, rawParagraph, bodyFontSize);
  const lines: TextToken[][] = [];
  let currentLine: TextToken[] = [];
  let currentLineWidth = 0;

  for (const token of tokens) {
    if (token.isSpace && currentLine.length === 0) continue;

    if (currentLineWidth + token.width <= printableWidth) {
      currentLine.push(token);
      currentLineWidth += token.width;
    } else {
      while (currentLine.length > 0 && currentLine[currentLine.length - 1].isSpace) {
        currentLineWidth -= currentLine.pop()!.width;
      }
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      if (token.isSpace) {
        currentLine = [];
        currentLineWidth = 0;
      } else {
        currentLine = [token];
        currentLineWidth = token.width;
      }
    }
  }

  while (currentLine.length > 0 && currentLine[currentLine.length - 1].isSpace) {
    currentLine.pop();
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  let y = startY;
  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const isLastLine = lIdx === lines.length - 1;
    const words = line.filter((t) => !t.isSpace);
    const spaceCount = words.length - 1;

    let spaceWidth = 0;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(bodyFontSize);
    const normalSpaceWidth = doc.getTextWidth(" ");

    if (!isLastLine && spaceCount > 0) {
      const totalWordWidth = words.reduce((acc, w) => {
        doc.setFont("helvetica", w.isBold ? "bold" : "normal");
        return acc + doc.getTextWidth(w.text);
      }, 0);
      spaceWidth = (printableWidth - totalWordWidth) / spaceCount;
      if (spaceWidth > normalSpaceWidth * 2.8) {
        spaceWidth = normalSpaceWidth;
      }
    } else {
      spaceWidth = normalSpaceWidth;
    }

    let x = margin;
    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const word = words[wIdx];
      doc.setFont("helvetica", word.isBold ? "bold" : "normal");
      doc.setFontSize(bodyFontSize);
      doc.setTextColor(24, 24, 27);
      doc.text(word.text, x, y);
      x += doc.getTextWidth(word.text) + (wIdx < spaceCount ? spaceWidth : 0);
    }

    y += bodyLineHeight;
  }

  return { finalY: y, lineCount: lines.length };
}


export async function POST(req: NextRequest) {
  try {
    const auth0 = await requireSession(req);
    if (auth0.response) return auth0.response;

    const body = await readJsonBody<ExportPdfPayload>(req, MAX_PDF_BODY_BYTES);
    const auth = await requireSession(req, { studentId: body?.studentId ?? null });
    if (auth.response) return auth.response;
    const { title, studentName, documentType, sections } = body;
    const maxPages = Math.min(Math.max(Math.trunc(Number(body.maxPages) || 2), 1), 10);

    if (!sections || !Array.isArray(sections) || sections.length > MAX_SECTIONS) {
      return NextResponse.json(
        { success: false, error: `Sections array (at most ${MAX_SECTIONS} items) is required for PDF export.` },
        { status: 400 }
      );
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const isCoverLetter =
      documentType === "COVER_LETTER" ||
      documentType === "VISA_COVER_LETTER" ||
      (title ? title.toLowerCase().includes("cover letter") : false) ||
      sections.some(
        (s) =>
          s.title.toLowerCase().includes("recipient") ||
          s.title.toLowerCase().includes("consulate") ||
          s.title.toLowerCase().includes("subject line")
      );

    const isSop =
      documentType === "SOP" ||
      documentType === "UNIVERSITY_SOP" ||
      (title ? title.toLowerCase().includes("statement of purpose") : false);

    const margin = isCoverLetter ? 18.0 : 20.0;
    const topMargin = isCoverLetter ? 16.0 : 20.0;
    const printableWidth = pageWidth - margin * 2;
    let currentY = topMargin;
    let currentPage = 1;

    // Helper: Page boundary check. For Cover Letters, single-page budgeting ensures all content
    // fits on page 1 without spilling orphan signatures.
    const checkPageBreak = (neededHeightMm: number) => {
      if (!isCoverLetter && currentY + neededHeightMm > pageHeight - margin - 5) {
        doc.addPage();
        currentPage += 1;
        currentY = margin;
      }
    };

    if (isCoverLetter) {
      // 1. Centered Header: COVER LETTER (10pt bold underlined, matching reference)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.0);
      doc.setTextColor(17, 17, 17);
      doc.text("COVER LETTER", pageWidth / 2, currentY, { align: "center" });

      // Draw subtle underline for COVER LETTER
      const textWidth = doc.getTextWidth("COVER LETTER");
      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.25);
      doc.line((pageWidth - textWidth) / 2, currentY + 1.0, (pageWidth + textWidth) / 2, currentY + 1.0);
      currentY += 6.5;

      const { recipient, subject, paragraphs: masterParagraphs, signature } = buildCoverLetterLayout(sections);

      // 2. Measure & dynamically budget typography (Standard 9.25pt font, 3.85mm line height)
      let bodyFontSize = 9.25;
      let bodyLineHeight = 3.85;
      let paraGap = 2.8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(bodyFontSize);

      const cleanRec = recipient ? cleanTextForPdf(recipient) : "";
      const recLines = cleanRec
        ? cleanRec.split(/\n+/).filter(Boolean).flatMap((line) => doc.splitTextToSize(line, printableWidth) as string[])
        : [];

      const cleanSub = subject ? cleanTextForPdf(subject) : "";
      const subLines = cleanSub ? (doc.splitTextToSize(cleanSub, printableWidth) as string[]) : [];

      const enrichedParas = masterParagraphs
        .map((p) => cleanTextForPdf(p))
        .filter(Boolean)
        .map((p) => enrichCoverLetterBolding(p, studentName));

      const totalBodyLines = enrichedParas.reduce(
        (acc, p) => acc + countRichParagraphLines(doc, p, printableWidth, bodyFontSize),
        0
      );
      const totalEstimatedLines = recLines.length + subLines.length + totalBodyLines + (signature ? 5 : 0);

      // Proportional dynamic auto-scale if letter is exceptionally long
      if (totalEstimatedLines > 56) {
        bodyFontSize = 8.85;
        bodyLineHeight = 3.6;
        paraGap = 2.2;
      }
      if (totalEstimatedLines > 68) {
        bodyFontSize = 8.35;
        bodyLineHeight = 3.3;
        paraGap = 1.6;
      }

      // 3. Recipient Block (Clean 9.25pt normal)
      if (recLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(bodyFontSize);
        doc.setTextColor(24, 24, 27);
        for (const line of recLines) {
          doc.text(line, margin, currentY);
          currentY += bodyLineHeight;
        }
        currentY += 3.0;
      }

      // 4. Subject Line (Bold, ~9.25pt)
      if (subLines.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(bodyFontSize);
        doc.setTextColor(17, 17, 17);
        for (const line of subLines) {
          doc.text(line, margin, currentY);
          currentY += bodyLineHeight + 0.2;
        }
        currentY += 3.2;
      }

      // 5. Master Flowing Paragraphs (Fully Justified with inline bold highlighting)
      for (const pText of enrichedParas) {
        const res = renderJustifiedRichParagraph(
          doc,
          pText,
          margin,
          currentY,
          printableWidth,
          bodyFontSize,
          bodyLineHeight
        );
        currentY = res.finalY + paraGap;
      }

      // 6. Signature Block (Guaranteed on Page 1 with natural breathing space)
      if (signature) {
        const cleanSig = cleanTextForPdf(signature);
        const sigLines = cleanSig
          .split(/\n+/)
          .filter(Boolean)
          .flatMap((line) => (/^email:/i.test(line) ? [line] : (doc.splitTextToSize(line, printableWidth) as string[])));
        currentY += 0.8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(bodyFontSize);
        for (const line of sigLines) {
          if (line.toLowerCase().startsWith("email:")) {
            const parts = line.split(/(email:\s*)/i);
            const prefix = parts[1] || "Email: ";
            const emailVal = line.replace(/email:\s*/i, "").trim();
            doc.setTextColor(24, 24, 27);
            doc.text(prefix, margin, currentY);
            const offset = doc.getTextWidth(prefix);
            doc.setTextColor(29, 78, 216); // blue link
            doc.text(emailVal, margin + offset, currentY);
            const emailWidth = doc.getTextWidth(emailVal);
            doc.setDrawColor(29, 78, 216);
            doc.setLineWidth(0.2);
            doc.line(margin + offset, currentY + 0.4, margin + offset + emailWidth, currentY + 0.4);
            doc.setTextColor(24, 24, 27);
          } else {
            doc.setTextColor(24, 24, 27);
            doc.text(line, margin, currentY);
          }
          currentY += bodyLineHeight;
        }
      }
    } else {
      // Standard SOP / Other Document
      const headerTitle = isSop ? "STATEMENT OF PURPOSE" : title || "OFFICIAL APPLICATION DOCUMENT";
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      doc.text(headerTitle, pageWidth / 2, currentY, { align: "center" });

      if (isSop) {
        const textWidth = doc.getTextWidth(headerTitle);
        doc.setDrawColor(17, 24, 39);
        doc.setLineWidth(0.3);
        doc.line((pageWidth - textWidth) / 2, currentY + 1.2, (pageWidth + textWidth) / 2, currentY + 1.2);
      }
      currentY += 8;

      for (const section of sections) {
        checkPageBreak(12);

        if (
          section.title &&
          section.title.toLowerCase() !== headerTitle.toLowerCase() &&
          !section.title.toLowerCase().includes("statement of purpose")
        ) {
          doc.setFont("times", "bold");
          doc.setFontSize(11);
          doc.text(section.title, margin, currentY);
          currentY += 5;
        }

        const rawText = cleanTextForPdf(section.content || "");
        const paragraphs = rawText.split(/\n+/).filter(Boolean);

        doc.setFont("times", "normal");
        doc.setFontSize(10);

        const sopLineHeight = 4.6;
        const sopLineHeightFactor = (sopLineHeight * (72 / 25.4)) / 10;

        for (const p of paragraphs) {
          const lines = doc.splitTextToSize(p, printableWidth) as string[];
          const paragraphHeight = lines.length * sopLineHeight;
          checkPageBreak(paragraphHeight + 2);
          doc.text(lines, margin, currentY, {
            align: "justify",
            maxWidth: printableWidth,
            lineHeightFactor: sopLineHeightFactor,
          });
          currentY += lines.length * sopLineHeight + 3.5;
        }

        currentY += 2;
      }
    }

    // Output Binary Buffer
    const arrayBuffer = doc.output("arraybuffer");

    return new NextResponse(new Uint8Array(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachmentDisposition(`${studentName || "Student"}_${documentType || "Document"}_Vector`, "pdf"),
        "X-Page-Count": String(currentPage),
        "X-Exceeds-Page-Limit": currentPage > maxPages ? "true" : "false",
      },
    });
  } catch (err: unknown) {
    if (err instanceof RequestTooLargeError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 413 });
    }
    if (err instanceof InvalidJsonError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    console.error("[export/pdf] generation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "PDF export failed." }, { status: 500 });
  }
}
