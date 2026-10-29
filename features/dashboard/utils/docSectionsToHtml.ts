/**
 * features/dashboard/utils/docSectionsToHtml.ts
 *
 * Renders hydrated document sections into the editor HTML shown in the Studio and sent to
 * the DOCX exporter. Cover letters use the same section layout as the PDF/DOCX routes.
 */

import { buildCoverLetterLayout } from "@/lib/export/coverLetterLayout";

export function docSectionsToHtml(
  sections: { heading?: string; content: string }[],
  docType?: "SOP" | "CV" | "LOR" | "COVER_LETTER" | "BLANK",
  title?: string
): string {
  const isCoverLetter =
    docType === "COVER_LETTER" ||
    (title ? title.toLowerCase().includes("cover letter") : false) ||
    sections.some(
      (s) =>
        s.heading === "Recipient / Consulate" ||
        s.heading === "Subject Line" ||
        s.heading === "Student Contact & Signature"
    );

  const fmt = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  if (isCoverLetter) {
    // Shared with the PDF/DOCX exporters: each section lands in exactly one slot
    const { recipient, subject, paragraphs, signature } = buildCoverLetterLayout(
      sections.map((s) => ({ title: s.heading || "", content: s.content }))
    );

    const headerHtml = `<div style="text-align: center; margin-bottom: 12px;"><span style="font-size: 8.5pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.05em;">COVER LETTER</span></div>`;

    const recipientHtml = recipient
      ? `<div style="text-align: left; margin-bottom: 11px; line-height: 1.25; white-space: pre-line;">${fmt(recipient)}</div>`
      : "";
    const subjectHtml = subject
      ? `<div style="text-align: left; margin-bottom: 11px; font-weight: bold; line-height: 1.25;">${fmt(subject)}</div>`
      : "";

    // Master 8 paragraphs (intro+academics, course, university, country, plans+return,
    // finance, logistics, closing), justified like the official letter
    const bodyHtml = paragraphs
      .map(
        (text, i) =>
          `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: ${
            i === paragraphs.length - 1 ? 11 : 7
          }px; line-height: 1.16;">${fmt(text)}</p>`
      )
      .join("");

    // Signature block with blue underlined email link
    let sigFormatted = signature ? fmt(signature) : "";
    sigFormatted = sigFormatted.replace(
      /(Email:\s*)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      `$1<a href="mailto:$2" style="color: #1d4ed8; text-decoration: underline;">$2</a>`
    );
    const sigHtml = sigFormatted
      ? `<div style="text-align: left; margin-top: 11px; line-height: 1.25; white-space: pre-line;">${sigFormatted}</div>`
      : "";

    return `<div style="font-family: Calibri, Carlito, Aptos, 'Segoe UI', sans-serif; font-size: 8.25pt; line-height: 1.16; color: #111111;">${headerHtml}${recipientHtml}${subjectHtml}${bodyHtml}${sigHtml}</div>`;
  }

  const isSop =
    docType === "SOP" || (title ? title.toLowerCase().includes("statement of purpose") : false);

  if (isSop) {
    const headerHtml = `<div style="text-align: center; margin-bottom: 18px;"><span style="font-size: 15px; font-weight: bold; text-decoration: underline; letter-spacing: 0.08em;">STATEMENT OF PURPOSE</span></div>`;
    const bodyHtml = sections
      .map((s) => {
        const bodyContent = s.content
          .split("\n\n")
          .map((para) => `<p style="text-align: justify; margin-bottom: 14px; line-height: 1.35;">${fmt(para).replace(/\n/g, "<br/>")}</p>`)
          .join("");
        return bodyContent;
      })
      .join("");
    return `<div style="font-family: 'Times New Roman', Times, Georgia, serif; font-size: 14px; line-height: 1.35; color: #111827;">${headerHtml}${bodyHtml}</div>`;
  }

  return sections
    .map((s) => {
      const headingHtml = s.heading ? `<h2>${s.heading}</h2>` : "";
      const bodyHtml = s.content
        .split("\n\n")
        .map((para) => {
          const boldFormatted = para.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
          return `<p>${boldFormatted.replace(/\n/g, "<br/>")}</p>`;
        })
        .join("");
      return headingHtml + bodyHtml;
    })
    .join("");
}
