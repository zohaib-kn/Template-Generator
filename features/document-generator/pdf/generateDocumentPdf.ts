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
import { encodeEmbeddedData, type EmbeddedPdfPayload } from "@/services/pdf/pdfMetadata";

/** A4 dimensions in millimetres. */
const A4_W_MM = 210;
const A4_H_MM = 297;

/** Capture scale — 2× gives ~150 DPI equivalent inside the PDF. */
const CAPTURE_SCALE = 2.5;

/**
 * Options for configuring the generated PDF filename.
 */
export interface PdfNamingOptions {
  /** Target destination country (e.g. "Italy", "United Kingdom"). */
  country?: string;
  /** Year of application or intake (defaults to current year e.g. 2026). */
  year?: number | string;
  /** Document type label (defaults to "Resume"). */
  documentType?: string;
}

/**
 * Sanitise a string segment so it can be safely used in an underscore-delimited filename.
 * Replaces spaces, slashes, and non-alphanumeric punctuation with underscores,
 * collapses multiple underscores, and strips leading/trailing underscores.
 */
export function safeFilenamePart(part: string): string {
  return part
    .trim()
    .replace(/[^a-zA-Z0-9\u0080-\uFFFF]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Derive a human-readable PDF filename following the format:
 *   [Name]_[DocumentType]_[Country]_[Year].pdf
 *
 * Example:
 *   Zohaib_Resume_Italy_2026.pdf
 */
export function buildFilename(
  data: DocumentData,
  options?: PdfNamingOptions
): string {
  const rawName = data.personal?.fullName?.trim() || "";
  const namePart = safeFilenamePart(rawName) || "Candidate";

  const docTypePart = safeFilenamePart(options?.documentType || "Resume");

  const rawCountry =
    options?.country?.trim() || data.personal?.nationality?.trim() || "";
  const countryPart = safeFilenamePart(rawCountry);

  const yearPart =
    options?.year?.toString().trim() || new Date().getFullYear().toString();

  const parts = [namePart, docTypePart, countryPart, yearPart].filter(Boolean);
  return `${parts.join("_")}.pdf`;
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
 * @param data - Current DocumentData, used to derive candidate name and fallback info.
 * @param options - Optional naming options (country, year, documentType).
 * @throws   If no document pages are found or capture fails.
 */
export async function generateDocumentPdf(
  data: DocumentData,
  options?: PdfNamingOptions
): Promise<{ filename: string; pdfBase64: string }> {
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
  await Promise.all(pageElements.map((page) => waitForImages(page)));

  // --- 3. Create PDF ----------------------------------------------------------
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // --- 4. Capture each page (in parallel — captures are independent DOM
  // reads/canvas draws per element, only the jsPDF page insertion below
  // needs to stay in order) ------------------------------------------------
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

  const imageDatas = await Promise.all(
    pageElements.map(async (pageEl) => {
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
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
          windowWidth: A4_WIDTH_PX,
          windowHeight: A4_HEIGHT_PX,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc, clonedElement) => {
            // 1. Strip preview scaling transforms from ancestor elements so the
            // page renders at true 1:1 unscaled dimensions (not shrunken by PreviewScaler)
            let parent: HTMLElement | null = clonedElement.parentElement;
            while (parent && parent !== clonedDoc.body) {
              parent.style.transform = "none";
              parent.style.webkitTransform = "none";
              parent.style.margin = "0";
              parent.style.padding = "0";
              parent.style.position = "static";
              parent.style.width = "auto";
              parent.style.maxWidth = "none";
              parent.style.height = "auto";
              parent = parent.parentElement;
            }

            // Also reset any other scaled containers in cloned document
            clonedDoc
              .querySelectorAll<HTMLElement>('[style*="transform"]')
              .forEach((el) => {
                el.style.transform = "none";
                el.style.webkitTransform = "none";
              });

            // 2. Lock body and root margins
            clonedDoc.documentElement.style.margin = "0";
            clonedDoc.documentElement.style.padding = "0";
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";

            // 3. Force clonedElement to natural 1:1 A4 pixel dimensions (794px × 1123px)
            // and eliminate any box-shadow or margins
            clonedElement.style.boxShadow = "none";
            clonedElement.style.transform = "none";
            clonedElement.style.margin = "0";
            clonedElement.style.position = "relative";
            clonedElement.style.width = `${A4_WIDTH_PX}px`;
            clonedElement.style.minWidth = `${A4_WIDTH_PX}px`;
            clonedElement.style.maxWidth = `${A4_WIDTH_PX}px`;
            clonedElement.style.height = `${A4_HEIGHT_PX}px`;
            clonedElement.style.minHeight = `${A4_HEIGHT_PX}px`;
            clonedElement.style.maxHeight = `${A4_HEIGHT_PX}px`;
            clonedElement.style.boxSizing = "border-box";
            clonedElement.style.overflow = "hidden";

            // Transfer CSS variables from document root
            const rootStyle = window.getComputedStyle(document.documentElement);
            const fontVar = rootStyle.getPropertyValue("--font-open-sans");
            if (fontVar) {
              clonedDoc.documentElement.style.setProperty(
                "--font-open-sans",
                fontVar
              );
            }

            // Transfer loaded font faces to cloned document
            document.fonts.forEach((font) => {
              try {
                clonedDoc.fonts.add(font);
              } catch {
                // Ignore if font already added
              }
            });

            // Enforce font rendering stability styles on cloned DOM
            const style = clonedDoc.createElement("style");
            style.textContent = `
              * {
                font-variant-ligatures: none !important;
                font-feature-settings: "liga" 0 !important;
              }
              body, article, div, p, span, h1, h2, h3, h4, li, a {
                letter-spacing: 0.02px !important;
                word-spacing: normal !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          },
        });
      } finally {
        // Always restore the box-shadow
        pageEl.style.boxShadow = originalBoxShadow;
      }

      return canvas.toDataURL("image/jpeg", 0.97);
    })
  );

  // --- 5. Assemble the PDF pages in order --------------------------------------
  imageDatas.forEach((imgData, i) => {
    // Add a new PDF page for every page after the first
    if (i > 0) {
      pdf.addPage("a4", "portrait");
    }

    // Embed invisible text layer behind the image for searchability and text extraction
    const pageEl = pageElements[i];
    const pageText = pageEl?.innerText || "";
    if (pageText.trim()) {
      pdf.setFontSize(2);
      pdf.setTextColor(255, 255, 255);
      const lines = pdf.splitTextToSize(pageText, A4_W_MM - 20);
      pdf.text(lines, 10, 10);
    }

    // Fill the entire A4 PDF page with the captured image (no added margins —
    // the A4 page component already contains its own internal margins)
    pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM, "", "FAST");
  });

  // --- 6. Set Metadata & Download ---------------------------------------------
  const filename = buildFilename(data, options);
  const embeddedPayload: EmbeddedPdfPayload<DocumentData> = {
    generator: "templete-generator",
    version: 1,
    type: options?.documentType || "Resume",
    timestamp: new Date().toISOString(),
    data,
  };

  pdf.setProperties({
    title: filename,
    subject: encodeEmbeddedData(embeddedPayload),
    author: data.personal?.fullName?.trim() || "Candidate",
    keywords: "templete-generator,resume,v1",
    creator: "TempleteGenerator",
  });

  const pdfBase64 = pdf.output("datauristring");
  pdf.save(filename);
  return { filename, pdfBase64 };
}
