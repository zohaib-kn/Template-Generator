/**
 * exportLorPdf.ts
 *
 * High-fidelity client-side PDF generator for Letters of Recommendation.
 * Captures the rendered A4 letterhead container and exports as crisp A4 PDF.
 */

import { LorDocument } from "../types/lor-generator";

const A4_W_MM = 210;
const A4_H_MM = 297;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const CAPTURE_SCALE = 2.5;

function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll<HTMLImageElement>("img"));
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

export async function exportLorPdf(
  elementId: string,
  doc: LorDocument
): Promise<void> {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    throw new Error(`Target container #${elementId} not found in DOM.`);
  }

  // Dynamically load html2canvas & jsPDF
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  // Wait for document fonts and all images inside target element
  if (typeof document !== "undefined" && document.fonts) {
    await document.fonts.ready;
  }
  await waitForImages(targetElement);

  const canvas = await html2canvas(targetElement, {
    scale: CAPTURE_SCALE,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#ffffff",
    width: A4_WIDTH_PX,
    height: A4_HEIGHT_PX,
    windowWidth: A4_WIDTH_PX,
    windowHeight: A4_HEIGHT_PX,
    onclone: (clonedDoc, clonedElement) => {
      // 1. Reset any zoom/transform scaling on parents in the cloned document
      let parent: HTMLElement | null = clonedElement.parentElement;
      while (parent && parent !== clonedDoc.body) {
        parent.style.transform = "none";
        parent.style.webkitTransform = "none";
        parent.style.margin = "0";
        parent.style.padding = "0";
        parent.style.width = "auto";
        parent.style.maxWidth = "none";
        parent.style.height = "auto";
        parent = parent.parentElement;
      }

      // 2. Lock natural unscaled A4 dimensions on the cloned element
      clonedElement.style.transform = "none";
      clonedElement.style.boxShadow = "none";
      clonedElement.style.width = `${A4_WIDTH_PX}px`;
      clonedElement.style.minWidth = `${A4_WIDTH_PX}px`;
      clonedElement.style.maxWidth = `${A4_WIDTH_PX}px`;
      clonedElement.style.height = `${A4_HEIGHT_PX}px`;
      clonedElement.style.minHeight = `${A4_HEIGHT_PX}px`;
      clonedElement.style.maxHeight = `${A4_HEIGHT_PX}px`;
      clonedElement.style.margin = "0";
      clonedElement.style.position = "relative";

      // 3. Inject reset style to eliminate any stray lab/oklch shadows
      const resetStyle = clonedDoc.createElement("style");
      resetStyle.textContent = `
        #lor-a4-preview-page, #lor-a4-preview-page * {
          box-shadow: none !important;
          text-shadow: none !important;
        }
      `;
      clonedDoc.head.appendChild(resetStyle);
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.97);
  pdf.addImage(imgData, "JPEG", 0, 0, A4_W_MM, A4_H_MM, undefined, "FAST");

  const studentPart = sanitizeName(doc.student.fullName) || "Student";
  const recommenderPart = sanitizeName(doc.recommender.fullName) || "Recommender";
  const year = new Date().getFullYear();
  const filename = `LOR_${studentPart}_${recommenderPart}_${year}.pdf`;

  pdf.save(filename);
}

/**
 * Native vector print / save-as-PDF helper using the browser print dialog.
 */
export function printLorDocument(): void {
  window.print();
}
