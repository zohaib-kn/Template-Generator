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
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportPdfPayload;
    const { title, studentName, documentType, sections, maxPages = 2 } = body;

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { success: false, error: "Sections array is required for PDF export." },
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

    // Helper: Page boundary check
    const checkPageBreak = (neededHeightMm: number) => {
      if (currentY + neededHeightMm > pageHeight - margin) {
        if (currentPage < maxPages) {
          doc.addPage();
          currentPage += 1;
          currentY = margin;
        }
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

      const getSec = (match: string) =>
        sections.find((s) => s.title?.toLowerCase().includes(match.toLowerCase()))?.content || "";

      const recipient = getSec("recipient") || getSec("consulate");
      const subject = getSec("subject");
      const intro = getSec("student introduction");
      const academics = getSec("academic background");
      const whyCourse = getSec("why this course") || getSec("why course");
      const whyUniv = getSec("why this university") || getSec("why university");
      const whyItaly = getSec("why italy") || getSec("why this country");
      const futurePlan = getSec("future academic plan");
      const careerPlan = getSec("career plan");
      const returnIntent = getSec("return") || getSec("home country");
      const finance = getSec("financial") || getSec("sponsorship");
      const accommodation = getSec("accommodation");
      const insurance = getSec("insurance");
      const travel = getSec("travel");
      const closing = getSec("closing");
      const signature = getSec("signature") || getSec("contact");

      // 2. Recipient Block (Left aligned, ~8pt)
      if (recipient) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.25);
        doc.setTextColor(17, 17, 17);
        const cleanRecipient = recipient.replace(/\*\*/g, "");
        const recLines = cleanRecipient.split(/\n+/).filter(Boolean);
        for (const line of recLines) {
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
      const masterParagraphs = [
        [intro, academics].filter(Boolean).join(" "),
        whyCourse,
        whyUniv,
        whyItaly,
        [futurePlan, careerPlan, returnIntent].filter(Boolean).join(" "),
        finance,
        [accommodation, insurance, travel].filter(Boolean).join(" "),
        closing,
      ].filter(Boolean);

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
        const sigLines = cleanSig.split(/\n+/).filter(Boolean);
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
    const safeStudentName = (studentName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeStudentName}_${documentType || "Document"}_Vector.pdf`;

    return new NextResponse(new Uint8Array(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF export failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
