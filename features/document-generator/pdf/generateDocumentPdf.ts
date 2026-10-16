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
 * Converts an external image URL to a Base64 data URI using our local proxy.
 * If already a data URI or blob, returns it as is.
 */
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  if (!url || url.startsWith("data:")) return url;

  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      console.warn(`[generateDocumentPdf] Image proxy returned HTTP ${res.status} for ${url}`);
      return null;
    }

    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert image to data URI"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[generateDocumentPdf] Failed to convert image to Data URI:", err);
    return null;
  }
}

/**
 * Finds all <img> elements with external http/https src, converts them to Base64 Data URIs,
 * and swaps their src temporarily. Returns a cleanup function that restores original src.
 */
async function inlineExternalImages(elements: HTMLElement[]): Promise<() => void> {
  const imageReplacements: Array<{ img: HTMLImageElement; originalSrc: string }> = [];

  const allImgs: HTMLImageElement[] = [];
  for (const el of elements) {
    allImgs.push(...Array.from(el.querySelectorAll<HTMLImageElement>("img")));
  }

  await Promise.all(
    allImgs.map(async (img) => {
      const src = img.currentSrc || img.src;
      // Only proxy external http/https URLs (e.g. S3 buckets)
      if (src && /^https?:\/\//i.test(src) && !src.includes(window.location.origin)) {
        const dataUri = await fetchImageAsDataUri(src);
        if (dataUri) {
          imageReplacements.push({ img, originalSrc: img.src });
          img.src = dataUri;
        }
      }
    })
  );

  return () => {
    // Restore original URLs so live DOM preview is unmodified
    for (const { img, originalSrc } of imageReplacements) {
      img.src = originalSrc;
    }
  };
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
 * Sanitizes CSS text by replacing modern CSS Color Level 4 functions (oklab, oklch, lab, lch, color-mix)
 * with legacy-compatible rgba/rgb fallback values.
 *
 * html2canvas 1.4.1 throws an unhandled exception when parsing stylesheets or computed styles
 * that contain oklab/oklch functions generated by Tailwind CSS v4.
 */
function sanitizeModernColorFunctions(cssText: string): string {
  if (!cssText || !/(?:color-mix|oklab|oklch|lab|lch)\s*\(/.test(cssText)) {
    return cssText;
  }

  let result = cssText;

  // 1. Replace balanced color-mix calls (which often contain nested functions like var() or oklch())
  const colorMixRegex = /\bcolor-mix\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = colorMixRegex.exec(result)) !== null) {
    const start = match.index;
    let depth = 1;
    let end = -1;
    for (let i = start + match[0].length; i < result.length; i++) {
      if (result[i] === "(") {
        depth++;
      } else if (result[i] === ")") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end !== -1) {
      const replacement = "rgba(0, 0, 0, 0.05)";
      result = result.substring(0, start) + replacement + result.substring(end + 1);
      colorMixRegex.lastIndex = start + replacement.length;
    } else {
      break;
    }
  }

  // 2. Replace oklab, oklch, lab, lch
  for (const fn of ["oklab", "oklch", "lab", "lch"]) {
    const fnRegex = new RegExp(`\\b${fn}\\s*\\(`, "g");
    while ((match = fnRegex.exec(result)) !== null) {
      const start = match.index;
      let depth = 1;
      let end = -1;
      for (let i = start + match[0].length; i < result.length; i++) {
        if (result[i] === "(") {
          depth++;
        } else if (result[i] === ")") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }

      if (end !== -1) {
        const replacement = "rgba(17, 24, 39, 0.95)";
        result = result.substring(0, start) + replacement + result.substring(end + 1);
        fnRegex.lastIndex = start + replacement.length;
      } else {
        break;
      }
    }
  }

  // 3. Fallback regex sweep for any remaining single-level instances
  result = result
    .replace(/color-mix\([^;}]*\)/g, "rgba(0, 0, 0, 0.05)")
    .replace(/oklab\([^;}]*\)/g, "rgba(17, 24, 39, 0.95)")
    .replace(/oklch\([^;}]*\)/g, "rgba(17, 24, 39, 0.95)")
    .replace(/lab\([^;}]*\)/g, "rgba(17, 24, 39, 0.95)")
    .replace(/lch\([^;}]*\)/g, "rgba(17, 24, 39, 0.95)");

  return result;
}

/**
 * Cleanly extracts printable text from an A4 page element by cloning it and
 * stripping all editor UI toolbars, action buttons, and ignore elements.
 */
function extractSanitizedPageText(pageEl: HTMLElement): string {
  if (!pageEl) return "";
  const clone = pageEl.cloneNode(true) as HTMLElement;
  const elementsToStrip = clone.querySelectorAll(
    '[data-html2canvas-ignore="true"], [data-no-print="true"], [data-pdf-ignore="true"], button'
  );
  elementsToStrip.forEach((el) => el.remove());
  return clone.innerText || "";
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

  // --- 2. Inline external images to Base64 to bypass canvas CORS restrictions --
  const restoreImages = await inlineExternalImages(pageElements);

  try {
    // --- 3. Wait for fonts & images ---------------------------------------------
    await document.fonts.ready;
    await Promise.all(pageElements.map((page) => waitForImages(page)));

    // --- 4. Create PDF ----------------------------------------------------------
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
            // 1. Explicitly remove any screen-only elements marked for exclusion
            clonedDoc
              .querySelectorAll('[data-html2canvas-ignore="true"], [data-no-print="true"]')
              .forEach((el) => el.remove());

            // 2. Strip interactive section wrapper styles (drop rings, hover tints, borders)
            clonedElement
              .querySelectorAll<HTMLElement>('[data-section-id]')
              .forEach((node) => {
                node.style.boxShadow = "none";
                node.style.outline = "none";
                node.style.backgroundColor = "transparent";
                node.className = "relative";
              });

            // 3. Strip preview scaling transforms from ancestor elements so the
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

            // 4. Lock body and root margins
            clonedDoc.documentElement.style.margin = "0";
            clonedDoc.documentElement.style.padding = "0";
            clonedDoc.body.style.margin = "0";
            clonedDoc.body.style.padding = "0";

            // 5. Force clonedElement to natural 1:1 A4 pixel dimensions (794px × 1123px)
            // and eliminate any box-shadow or margins
            clonedElement.style.boxShadow = "none";
            clonedElement.style.textShadow = "none";
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

            // 6. Strip box-shadows & text-shadows on all cloned nodes
            const allNodes = Array.from(clonedElement.querySelectorAll<HTMLElement>("*"));
            for (const node of allNodes) {
              if (node.style) {
                if (node.style.boxShadow) node.style.boxShadow = "none";
                if (node.style.textShadow) node.style.textShadow = "none";
              }
            }

            // 7. Sanitize all modern CSS color functions in cloned style tags (Tailwind v4 compatibility)
            const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
            styleElements.forEach((styleTag) => {
              if (styleTag.textContent) {
                styleTag.textContent = sanitizeModernColorFunctions(styleTag.textContent);
              }
            });

            // 8. Transfer CSS variables from document root
            const rootStyle = window.getComputedStyle(document.documentElement);
            const fontVar = rootStyle.getPropertyValue("--font-open-sans");
            if (fontVar) {
              clonedDoc.documentElement.style.setProperty(
                "--font-open-sans",
                fontVar
              );
            }

            // 9. Transfer loaded font faces to cloned document
            document.fonts.forEach((font) => {
              try {
                clonedDoc.fonts.add(font);
              } catch {
                // Ignore if font already added
              }
            });

            // 10. Strip any interactive toolbars or editor buttons from cloned element
            clonedElement
              .querySelectorAll(
                '[data-html2canvas-ignore="true"], [data-no-print="true"], [data-pdf-ignore="true"], button'
              )
              .forEach((btn) => btn.remove());

            // 11. Enforce font rendering stability and strip modern shadows via high-priority style tag
            const style = clonedDoc.createElement("style");
            style.textContent = `
              *, *::before, *::after {
                font-variant-ligatures: none !important;
                font-feature-settings: "liga" 0 !important;
                box-shadow: none !important;
                text-shadow: none !important;
              }
              body, article, div, p, span, h1, h2, h3, h4, li, a {
                letter-spacing: 0.02px !important;
                word-spacing: normal !important;
              }
              a {
                color: #0c56a5 !important;
                text-decoration: underline !important;
                text-decoration-color: #0c56a5 !important;
                text-underline-offset: 2.2px !important;
                text-decoration-thickness: 0.55pt !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          },
        });
      } finally {
        // Always restore the box-shadow
        pageEl.style.boxShadow = originalBoxShadow;
      }

      return canvas.toDataURL("image/jpeg", 0.98);
    })
  );

  // --- 5. Assemble the PDF pages in order --------------------------------------
  imageDatas.forEach((imgData, i) => {
    // Add a new PDF page for every page after the first
    if (i > 0) {
      pdf.addPage("a4", "portrait");
    }

    const pageEl = pageElements[i];

    // 5a. Embed sanitized, selectable text layer positioned across the page for ATS & copy-paste
    const pageText = extractSanitizedPageText(pageEl);
    if (pageText.trim()) {
      pdf.setFontSize(9.5);
      pdf.setTextColor(255, 255, 255);
      const lines = pdf.splitTextToSize(pageText, A4_W_MM - 18.1);
      const lineHeightMm = 4.2;
      let curY = 12;
      for (const line of lines) {
        if (curY > A4_H_MM - 12) break;
        pdf.text(line, 9.2, curY);
        curY += lineHeightMm;
      }
    }

    // 5b. Fill the entire A4 PDF page with the captured image (bicubic interpolation)
    pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM, "", "SLOW");

    // 5c. Attach real, clickable PDF hyperlinks on top of the image
    const aTags = Array.from(pageEl.querySelectorAll<HTMLAnchorElement>("a[href]"));
    const pageRect = pageEl.getBoundingClientRect();
    if (pageRect.width > 0 && pageRect.height > 0) {
      aTags.forEach((a) => {
        const href = a.getAttribute("href");
        if (!href || href === "#" || href.startsWith("javascript:")) return;
        const rect = a.getBoundingClientRect();
        const relX = (rect.left - pageRect.left) * (A4_W_MM / pageRect.width);
        const relY = (rect.top - pageRect.top) * (A4_H_MM / pageRect.height);
        const relW = rect.width * (A4_W_MM / pageRect.width);
        const relH = rect.height * (A4_H_MM / pageRect.height);
        if (relW > 0 && relH > 0) {
          pdf.link(relX, relY, relW, relH, { url: href });
        }
      });
    }
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
  } finally {
    restoreImages();
  }
}
