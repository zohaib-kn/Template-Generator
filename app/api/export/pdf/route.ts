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

    const margin = isCoverLetter ? 11.5 : 20;
    const printableWidth = pageWidth - margin * 2;
    let currentY = margin;
    let currentPage = 1;

    // Helper: Page boundary check. Content is never dropped or drawn off the page: if it
    // needs more than maxPages, a page is still added and the overflow is reported back.
    const checkPageBreak = (neededHeightMm: number) => {
      if (currentY + neededHeightMm > pageHeight - margin) {
        doc.addPage();
        currentPage += 1;
        currentY = margin;
      }
    };

    if (isCoverLetter) {
      // 1. Centered Header: COVER LETTER (approximately 8.5pt bold underlined)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      doc.text("COVER LETTER", pageWidth / 2, currentY, { align: "center" });

      // Draw subtle underline for COVER LETTER
      const textWidth = doc.getTextWidth("COVER LETTER");
      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.2);
      doc.line((pageWidth - textWidth) / 2, currentY + 0.9, (pageWidth + textWidth) / 2, currentY + 0.9);
      currentY += 5.5;

      const { recipient, subject, paragraphs: masterParagraphs, signature } = buildCoverLetterLayout(sections);

      // 2. Recipient Block (Left aligned, ~8pt)
      if (recipient) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.25);
        doc.setTextColor(17, 17, 17);
        const cleanRecipient = recipient.replace(/\*\*/g, "");
        const recLines = cleanRecipient
          .split(/\n+/)
          .filter(Boolean)
          .flatMap((line) => doc.splitTextToSize(line, printableWidth) as string[]);
        for (const line of recLines) {
          checkPageBreak(3.4);
          doc.text(line, margin, currentY);
          currentY += 3.4;
        }
        currentY += 2;
      }

      // 3. Subject Line (Bold, ~8.5pt)
      if (subject) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.25);
        doc.setTextColor(17, 17, 17);
        const cleanSubject = subject.replace(/\*\*/g, "");
        const subLines = doc.splitTextToSize(cleanSubject, printableWidth);
        doc.text(subLines, margin, currentY);
        currentY += subLines.length * 3.4 + 2.5;
      }

      // 4. Master Flowing 8 Paragraphs (Fully justified, 8.25pt, ~1.15 line spacing)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.25);
      doc.setTextColor(17, 17, 17);

      for (const pText of masterParagraphs) {
        const cleanP = pText.replace(/\*\*/g, "");
        const lines = doc.splitTextToSize(cleanP, printableWidth);
        const height = lines.length * 3.3;
        checkPageBreak(height + 2);
        doc.text(lines, margin, currentY, { align: "justify", maxWidth: printableWidth });
        currentY += height + 2.4;
      }

      // 5. Signature Block
      if (signature) {
        const cleanSig = signature.replace(/\*\*/g, "");
        const sigLines = cleanSig
          .split(/\n+/)
          .filter(Boolean)
          .flatMap((line) => (/^email:/i.test(line) ? [line] : (doc.splitTextToSize(line, printableWidth) as string[])));
        checkPageBreak(sigLines.length * 3.4 + 3);
        currentY += 1.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.25);
        for (const line of sigLines) {
          if (line.toLowerCase().startsWith("email:")) {
            const parts = line.split(/(email:\s*)/i);
            const prefix = parts[1] || "Email: ";
            const emailVal = line.replace(/email:\s*/i, "").trim();
            doc.setTextColor(17, 17, 17);
            doc.text(prefix, margin, currentY);
            const offset = doc.getTextWidth(prefix);
            doc.setTextColor(29, 78, 216); // blue link
            doc.text(emailVal, margin + offset, currentY);
            const emailWidth = doc.getTextWidth(emailVal);
            doc.setDrawColor(29, 78, 216);
            doc.setLineWidth(0.2);
            doc.line(margin + offset, currentY + 0.4, margin + offset + emailWidth, currentY + 0.4);
            doc.setTextColor(17, 17, 17);
          } else {
            doc.setTextColor(17, 17, 17);
            doc.text(line, margin, currentY);
          }
          currentY += 3.4;
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

        const rawText = (section.content || "").replace(/\*\*/g, "");
        const paragraphs = rawText.split(/\n+/).filter(Boolean);

        doc.setFont("times", "normal");
        doc.setFontSize(10);

        for (const p of paragraphs) {
          const lines = doc.splitTextToSize(p, printableWidth);
          const paragraphHeight = lines.length * 4.6;
          checkPageBreak(paragraphHeight + 2);
          doc.text(lines, margin, currentY);
          currentY += paragraphHeight + 3.5;
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
