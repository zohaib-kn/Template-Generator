/**
 * app/api/export/pdf/route.ts
 *
 * Server-side native vector PDF generation endpoint.
 * Uses jsPDF in pure vector text mode to render crisp, selectable, embassy-compliant A4 PDFs.
 *
 * Benefits over html2canvas:
 * - 100% vector text: never pixelated, selectable, copyable, searchable.
 * - Exact millimeter typography and page-break boundary enforcement.
 * - Zero client GPU or tainted-canvas CORS drops.
 */

import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

interface ExportPdfSection {
  title: string;
  content: string;
}

interface ExportPdfPayload {
  title: string;
  studentName: string;
  documentType: string;
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
    const margin = 20;
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

    // 1. Document Title
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(title || "OFFICIAL APPLICATION DOCUMENT", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 7;

    // 2. Candidate Subheader
    doc.setFont("times", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Candidate: ${studentName || "Student"} | Document: ${documentType || "Statement of Purpose"}`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 8;

    // Divider Line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;

    // Reset text color for body
    doc.setTextColor(20, 20, 20);

    // 3. Render Sections
    for (const section of sections) {
      checkPageBreak(12);

      // Section Heading (if not empty and not matching title)
      if (section.title && section.title.toLowerCase() !== title?.toLowerCase()) {
        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.text(section.title, margin, currentY);
        currentY += 5;
      }

      // Paragraph Body Text
      const rawText = (section.content || "").replace(/\*\*/g, ""); // clean bold markers for base vector flow
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

    // 4. Output Binary Buffer
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
