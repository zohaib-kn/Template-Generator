/**
 * generateDocumentPdf.ts
 *
 * Client-side PDF generation utility.
 *
 * Strategy:
 *  1. Find every rendered A4 page element by the selector [data-pdf-page="true"].
 *  2. Temporarily strip box-shadow (screen-only style) so pages look clean in PDF.
 *  3. Capture each page with html2canvas at 2× DPI for sharp output.
 *  4. Insert each canvas image into its own A4 jsPDF page (210mm × 297mm).
 *  5. Trigger browser download.
 *
 * This function NEVER re-renders the template — it captures the existing DOM
 * nodes that power the live preview, so the PDF always reflects the current
 * DocumentData state.
 */

import type { DocumentData } from "@/types";

/** A4 dimensions in millimetres. */
const A4_W_MM = 210;
const A4_H_MM = 297;

/** Capture scale — 2× gives ~150 DPI equivalent inside the PDF. */
const CAPTURE_SCALE = 2.5;

/**
 * Sanitise a string so it can be used safely in a filename.
 * Replaces spaces and most punctuation with hyphens, collapses runs.
 */
function safeFilename(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9\u0080-\uFFFF]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Derive a human-readable PDF filename from DocumentData.
 * Falls back to "CV.pdf" when no name is available.
 */
export function buildFilename(data: DocumentData): string {
  const raw = data.personal?.fullName ?? "";
  const cleaned = safeFilename(raw);
  return cleaned.length > 0 ? `${cleaned}-CV.pdf` : "CV.pdf";
}

/**
 * Wait for all <img> elements inside a root element to finish loading.
 */
async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }
        })
    )
  );
}

/**
 * Generate and immediately download a PDF from the currently-rendered A4
 * document pages on the page.
 *
 * @param data - Current DocumentData, used only to derive the filename.
 * @throws   If no document pages are found or capture fails.
 */
export async function generateDocumentPdf(data: DocumentData): Promise<void> {
  // Dynamically import heavy libs only when the user actually clicks the button
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // --- 1. Locate page elements -------------------------------------------------
  const pageElements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-pdf-page="true"]')
  );

  if (pageElements.length === 0) {
    throw new Error(
      "No document pages found. Make sure EuropassPage renders with data-pdf-page=\"true\"."
    );
  }

  // --- 2. Wait for fonts & images ---------------------------------------------
  await document.fonts.ready;
  for (const page of pageElements) {
    await waitForImages(page);
  }

  // --- 3. Create PDF ----------------------------------------------------------
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // --- 4. Capture each page ---------------------------------------------------
  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i];

    // Temporarily remove box-shadow (screen-only decoration)
    const originalBoxShadow = pageEl.style.boxShadow;
    pageEl.style.boxShadow = "none";

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(pageEl, {
        scale: CAPTURE_SCALE,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        // Capture the full element even if clipped by overflow:hidden
        width: pageEl.offsetWidth,
        height: pageEl.offsetHeight,
        windowWidth: pageEl.offsetWidth,
        windowHeight: pageEl.offsetHeight,
        x: 0,
        y: 0,
      });
    } finally {
      // Always restore the box-shadow
      pageEl.style.boxShadow = originalBoxShadow;
    }

    const imgData = canvas.toDataURL("image/jpeg", 0.97);

    // Add a new PDF page for every page after the first
    if (i > 0) {
      pdf.addPage("a4", "portrait");
    }

    // Fill the entire A4 PDF page with the captured image (no added margins —
    // the A4 page component already contains its own internal margins)
    pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM, "", "FAST");
  }

  // --- 5. Download ------------------------------------------------------------
  const filename = buildFilename(data);
  pdf.save(filename);
}
