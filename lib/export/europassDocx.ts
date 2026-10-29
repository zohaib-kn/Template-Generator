/**
 * lib/export/europassDocx.ts
 *
 * Builds the Europass CV structure for DOCX export from the CV's sections, so the
 * downloaded Word file follows the on-screen Europass template (name banner, blue
 * uppercase section headings with rules, entry titles, bullet lists) instead of a
 * flat dump of the editor HTML.
 */

import { AlignmentType, BorderStyle, Paragraph, TextRun } from "docx";
import type { ExportSection } from "./coverLetterLayout";

const EUROPASS_BLUE = "0C56A5";

function textRuns(line: string, font: string, size: number, bold = false): TextRun[] {
  return line
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? new TextRun({ text: part.slice(2, -2), bold: true, font, size })
        : new TextRun({ text: part, bold, font, size })
    );
}

export function buildEuropassParagraphs(studentName: string, sections: ExportSection[], font = "Arial"): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [new TextRun({ text: (studentName || "").toUpperCase(), bold: true, font, size: 32, color: EUROPASS_BLUE })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: EUROPASS_BLUE, space: 1 } },
      children: [],
    }),
  ];

  for (const section of sections) {
    const content = (section.content || "").trim();
    if (!content) continue;

    out.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: EUROPASS_BLUE, space: 1 } },
        children: [new TextRun({ text: (section.title || "").toUpperCase(), bold: true, font, size: 22, color: EUROPASS_BLUE })],
      })
    );

    // Entries are separated by blank lines; the first line of each entry is its title.
    for (const entry of content.split(/\n\s*\n/)) {
      const lines = entry.split("\n").map((l) => l.trim()).filter(Boolean);
      lines.forEach((line, i) => {
        const isBullet = /^[•\-*]\s+/.test(line);
        out.push(
          new Paragraph({
            spacing: { after: 40, line: 260 },
            indent: isBullet ? { left: 360, hanging: 180 } : undefined,
            children: isBullet
              ? [new TextRun({ text: "• ", font, size: 19 }), ...textRuns(line.replace(/^[•\-*]\s+/, ""), font, 19)]
              : textRuns(line, font, i === 0 && lines.length > 1 ? 20 : 19, i === 0 && lines.length > 1),
          })
        );
      });
      out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    }
  }

  return out;
}
