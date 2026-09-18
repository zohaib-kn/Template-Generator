/**
 * generateSopPdf.ts
 *
 * Client-side PDF generation utility for SOP and Visa Cover Letters.
 *
 * Strategy:
 *  1. Target the rendered A4 letter element.
 *  2. Sanitize modern Tailwind v4 colors (lab/oklch) in onclone to prevent html2canvas crashes.
 *  3. Capture using html2canvas at 2.5× DPI for sharp, print-grade typography.
 *  4. Format cleanly as a single-page A4 PDF (210mm × 297mm) with zero overflow.
 *  5. Trigger browser download with an embassy-compliant filename.
 */

export interface SopPdfNamingOptions {
  studentName?: string;
  country?: string;
  documentType?: string;
  year?: number | string;
}

/**
 * Sanitise a string segment for safe use in an underscore-delimited filename.
 */
export function safeFilenamePart(part: string): string {
  return part
    .trim()
    .replace(/[^a-zA-Z0-9\u0080-\uFFFF]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Derive an official filename:
 * [Student_Name]_[DocumentType]_[Country]_[Year].pdf
 *
 * Example:
 * Aafia_Ameen_Visa_Cover_Letter_Italy_2026.pdf
 */
export function buildSopFilename(options?: SopPdfNamingOptions): string {
  const rawName = options?.studentName?.trim() || "Student";
  const namePart = safeFilenamePart(rawName);

  const docTypePart = safeFilenamePart(options?.documentType || "Visa_Cover_Letter");
  const countryPart = safeFilenamePart(options?.country || "Italy");
  const yearPart =
    options?.year?.toString().trim() || new Date().getFullYear().toString();

  const parts = [namePart, docTypePart, countryPart, yearPart].filter(Boolean);
  return `${parts.join("_")}.pdf`;
}

/**
 * Generate and download an embassy-standard A4 PDF from a DOM element.
 *
 * @param targetElement - The HTML element containing the rendered letter.
 * @param options - Naming options (studentName, country, documentType, year).
 */
export async function generateSopPdf(
  targetElement: HTMLElement,
  options?: SopPdfNamingOptions
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Ensure fonts are fully loaded
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // A4 dimensions in mm
  const A4_W_MM = 210;
  const A4_H_MM = 297;
  const CAPTURE_SCALE = 2.5;

  // Render canvas with onclone color sanitization for Tailwind v4 compatibility
  const canvas = await html2canvas(targetElement, {
    scale: CAPTURE_SCALE,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (clonedDoc, clonedElement) => {
      // 1. Strip all box-shadows (which often contain lab() in Tailwind v4)
      clonedElement.style.boxShadow = "none";

      const allNodes = [
        clonedElement,
        ...Array.from(clonedElement.querySelectorAll<HTMLElement>("*")),
      ];

      for (const node of allNodes) {
        // Strip class names inside printable letter so Tailwind modern color rules don't match
        node.className = "";
        node.style.boxShadow = "none";
        node.style.textShadow = "none";
        if (!node.style.color) {
          node.style.color = "#111827";
        }
      }

      // 2. Sanitize any modern CSS color functions (lab, oklch) in cloned style tags
      const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
      styleElements.forEach((styleTag) => {
        if (
          styleTag.textContent &&
          (styleTag.textContent.includes("lab(") ||
            styleTag.textContent.includes("oklch("))
        ) {
          styleTag.textContent = styleTag.textContent
            .replace(/lab\([^)]+\)/g, "rgba(17, 24, 39, 0.95)")
            .replace(/oklch\([^)]+\)/g, "rgba(17, 24, 39, 0.95)");
        }
      });
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Calculate A4 page height in canvas pixel units (ratio 297 / 210)
  const pageHeightPx = Math.floor(canvas.width * (A4_H_MM / A4_W_MM));

  // If the document fits inside 1 A4 page, output exactly 1 page
  if (canvas.height <= pageHeightPx + 30) {
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM);
    const filename = buildSopFilename(options);
    pdf.save(filename);
    return;
  }

  // Multi-page slicing for longer documents if ever needed
  let remainingHeightPx = canvas.height;
  let currentTopPx = 0;
  let pageIndex = 0;

  while (remainingHeightPx > 0) {
    if (pageIndex > 0) {
      pdf.addPage("a4", "portrait");
    }

    const sliceHeightPx = Math.min(pageHeightPx, remainingHeightPx);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = pageHeightPx;
    const ctx = sliceCanvas.getContext("2d");

    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        currentTopPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );
    }

    const imgData = sliceCanvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM);

    currentTopPx += sliceHeightPx;
    remainingHeightPx -= sliceHeightPx;
    pageIndex++;
  }

  const filename = buildSopFilename(options);
  pdf.save(filename);
}
