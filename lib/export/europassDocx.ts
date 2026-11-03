/**
 * lib/export/europassDocx.ts
 *
 * Builds the Europass CV structure for DOCX export matching the on-screen
 * Europass template (shaded header banner card, circular candidate photo,
 * official Europass flag & logo, 2-column personal details grid, and styled
 * navy blue section headings with accent rules).
 */

import fs from "fs";
import path from "path";
import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} from "docx";
import type { ExportSection } from "./coverLetterLayout";
import type { DocumentData, PersonalDetails } from "@/types/document";
import { syncCvDataToSections } from "@/features/dashboard/utils/documentStudioSync";

export const EUROPASS_BLUE = "0C56A5";
const CARD_BG = "F3F6FA";
const TEXT_MUTED = "555555";
const TEXT_DARK = "222222";

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_TABLE_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

function detectImageType(buf: Buffer): "png" | "jpg" | "gif" | "bmp" {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpg";
  }
  if (buf.length > 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "gif";
  }
  if (buf.length > 2 && buf[0] === 0x42 && buf[1] === 0x4d) {
    return "bmp";
  }
  return "png";
}

export function cleanDisplayName(name: string): string {
  if (!name) return "";
  const cleaned = name.replace(/\s*[-–—]\s*$/, "").trim();
  const words = cleaned.split(/\s+/);
  const deduped: string[] = [];
  for (const w of words) {
    if (deduped.length === 0 || deduped[deduped.length - 1].toLowerCase() !== w.toLowerCase()) {
      deduped.push(w);
    }
  }
  return deduped.join(" ");
}

function formatDateDMY(iso?: string): string {
  if (!iso) return "";
  const trimmed = iso.trim();
  if (trimmed.includes("/")) return trimmed;
  const dateOnly = trimmed.split("T")[0];
  const parts = dateOnly.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

function formatPhone(phone?: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (trimmed.startsWith("(+")) return trimmed;
  if (trimmed.startsWith("+91")) {
    const rest = trimmed.slice(3).trim();
    return `(+91) ${rest}`;
  }
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)/);
  if (match) {
    return `(${match[1]}) ${match[2]}`.trim();
  }
  return trimmed;
}

function formatGender(gender?: string): string {
  if (!gender) return "";
  const trimmed = gender.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function formatAddress(address?: string): string {
  if (!address) return "";
  return address
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function textRuns(line: string, font: string, size: number, bold = false): TextRun[] {
  return line
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? new TextRun({ text: part.slice(2, -2), bold: true, font, size })
        : new TextRun({ text: part, bold, font, size })
    );
}

function formatMetaLine(line: string, font: string): TextRun[] {
  if (line.includes("|")) {
    const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
    const runs: TextRun[] = [];
    parts.forEach((p, idx) => {
      const colIdx = p.indexOf(":");
      if (colIdx !== -1) {
        const lbl = p.slice(0, colIdx + 1);
        const val = p.slice(colIdx + 1);
        runs.push(
          new TextRun({ text: `${lbl} `, bold: true, font, size: 18, color: TEXT_MUTED }),
          new TextRun({ text: `${val.trim()}${idx < parts.length - 1 ? "   |   " : ""}`, font, size: 18, color: TEXT_DARK })
        );
      } else {
        runs.push(
          new TextRun({ text: `${p}${idx < parts.length - 1 ? "   |   " : ""}`, font, size: 18, color: TEXT_DARK })
        );
      }
    });
    return runs;
  }

  const colIdx = line.indexOf(":");
  if (colIdx !== -1) {
    const lbl = line.slice(0, colIdx + 1);
    const val = line.slice(colIdx + 1);
    return [
      new TextRun({ text: `${lbl} `, bold: true, font, size: 18, color: TEXT_MUTED }),
      new TextRun({ text: val.trim(), font, size: 18, color: TEXT_DARK }),
    ];
  }

  return [new TextRun({ text: line, font, size: 18, color: TEXT_DARK })];
}

function formatCefrLine(line: string, font: string): TextRun[] {
  const words = line.split(/\s+/).filter(Boolean);
  const runs: TextRun[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isHeader = /^(LISTENING|READING|WRITING|SPOKEN|PRODUCTION|INTERACTION)$/i.test(w);
    runs.push(
      new TextRun({
        text: `${w} `,
        bold: isHeader,
        font,
        size: 16,
        color: isHeader ? EUROPASS_BLUE : TEXT_DARK,
      })
    );
  }
  return runs;
}

export async function resolveImageBuffer(urlOrPath?: string): Promise<Buffer | null> {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  // 1. Base64 Data URI
  if (trimmed.startsWith("data:image/")) {
    const base64Index = trimmed.indexOf("base64,");
    if (base64Index !== -1) {
      try {
        const rawBase64 = trimmed.slice(base64Index + 7);
        return Buffer.from(rawBase64, "base64");
      } catch {
        return null;
      }
    }
  }

  // 2. HTTP/HTTPS URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const res = await fetch(trimmed, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
    } catch {
      // Fall through to local checks
    }
  }

  // 3. Local filesystem path in public directory
  try {
    const relativeClean = trimmed.replace(/^\/+/, "");
    const inPublic = path.join(process.cwd(), "public", relativeClean);
    if (fs.existsSync(inPublic)) {
      return fs.readFileSync(inPublic);
    }
  } catch {
    // Ignore error
  }

  return null;
}

export function getEuropassLogoBuffer(): Buffer | null {
  try {
    const logoPath = path.join(process.cwd(), "public", "europass-logo.png");
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }
  } catch {
    // Ignore error
  }
  return null;
}

/**
 * Builds the authentic Europass 3-column shaded header banner card.
 */
export async function buildEuropassHeaderTable(
  studentName: string,
  personal?: PersonalDetails,
  font = "Arial"
): Promise<Table> {
  const photoBuffer = await resolveImageBuffer(personal?.photoUrl);
  const logoBuffer = getEuropassLogoBuffer();

  const cells: TableCell[] = [];

  // 1. Photo Cell (if candidate photo is resolved)
  if (photoBuffer) {
    cells.push(
      new TableCell({
        width: { size: 1650, type: WidthType.DXA },
        shading: { fill: CARD_BG, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 120, bottom: 120, left: 140, right: 100 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: photoBuffer,
                type: detectImageType(photoBuffer),
                transformation: { width: 85, height: 85 },
              }),
            ],
          }),
        ],
      })
    );
  }

  // 2. Identity & Contact Details Cell
  const identityParas: Paragraph[] = [];

  // Full Name
  const rawName = personal?.fullName || studentName || "Candidate";
  identityParas.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: cleanDisplayName(rawName),
          bold: true,
          font,
          size: 28, // 14pt
          color: EUROPASS_BLUE,
        }),
      ],
    })
  );

  // Line 1: Passport, Nationality, Date of birth
  const line1Runs: TextRun[] = [];
  if (personal?.passportNumber) {
    line1Runs.push(
      new TextRun({ text: "Passport: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: `${personal.passportNumber}   `, font, size: 16, color: TEXT_DARK })
    );
  }
  if (personal?.nationality) {
    line1Runs.push(
      new TextRun({ text: "Nationality: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: `${personal.nationality}   `, font, size: 16, color: TEXT_DARK })
    );
  }
  if (personal?.dateOfBirth) {
    line1Runs.push(
      new TextRun({ text: "Date of birth: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: formatDateDMY(personal.dateOfBirth), font, size: 16, color: TEXT_DARK })
    );
  }
  if (line1Runs.length > 0) {
    identityParas.push(
      new Paragraph({
        spacing: { after: 30, line: 240 },
        children: line1Runs,
      })
    );
  }

  // Line 2: Place of birth, Gender
  const line2Runs: TextRun[] = [];
  if (personal?.placeOfBirth) {
    line2Runs.push(
      new TextRun({ text: "Place of birth: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: `${personal.placeOfBirth}   `, font, size: 16, color: TEXT_DARK })
    );
  }
  if (personal?.gender) {
    line2Runs.push(
      new TextRun({ text: "Gender: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: formatGender(personal.gender), font, size: 16, color: TEXT_DARK })
    );
  }
  if (line2Runs.length > 0) {
    identityParas.push(
      new Paragraph({
        spacing: { after: 30, line: 240 },
        children: line2Runs,
      })
    );
  }

  // Line 3: Phone number, Email address
  const line3Runs: TextRun[] = [];
  if (personal?.phone) {
    line3Runs.push(
      new TextRun({ text: "Phone number: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: `${formatPhone(personal.phone)}   `, font, size: 16, color: TEXT_DARK })
    );
  }
  if (personal?.email) {
    line3Runs.push(
      new TextRun({ text: "Email address: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({
        text: personal.email,
        font,
        size: 16,
        color: EUROPASS_BLUE,
        underline: { type: UnderlineType.SINGLE },
      })
    );
  }
  if (line3Runs.length > 0) {
    identityParas.push(
      new Paragraph({
        spacing: { after: 30, line: 240 },
        children: line3Runs,
      })
    );
  }

  // Line 4: Home address
  if (personal?.address) {
    identityParas.push(
      new Paragraph({
        spacing: { after: 30, line: 240 },
        children: [
          new TextRun({ text: "Home: ", bold: true, font, size: 16, color: TEXT_MUTED }),
          new TextRun({ text: formatAddress(personal.address), font, size: 16, color: TEXT_DARK }),
        ],
      })
    );
  }

  // Optional: Portfolio, LinkedIn, GitHub, Driving licence
  const optionalRuns: TextRun[] = [];
  if (personal?.linkedinUrl) {
    optionalRuns.push(
      new TextRun({ text: "LinkedIn: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: `${personal.linkedinUrl}   `, font, size: 16, color: EUROPASS_BLUE })
    );
  }
  if (personal?.githubUrl) {
    optionalRuns.push(
      new TextRun({ text: "GitHub: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: `${personal.githubUrl}   `, font, size: 16, color: EUROPASS_BLUE })
    );
  }
  if (personal?.portfolioUrl) {
    optionalRuns.push(
      new TextRun({ text: "Portfolio: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: `${personal.portfolioUrl}   `, font, size: 16, color: EUROPASS_BLUE })
    );
  }
  if (personal?.drivingLicence) {
    optionalRuns.push(
      new TextRun({ text: "Driving licence: ", bold: true, font, size: 16, color: TEXT_MUTED }),
      new TextRun({ text: `${personal.drivingLicence}   `, font, size: 16, color: TEXT_DARK })
    );
  }
  if (optionalRuns.length > 0) {
    identityParas.push(
      new Paragraph({
        spacing: { after: 30, line: 240 },
        children: optionalRuns,
      })
    );
  }

  const detailsWidth = photoBuffer ? 6350 : 7800;
  cells.push(
    new TableCell({
      width: { size: detailsWidth, type: WidthType.DXA },
      shading: { fill: CARD_BG, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 120, bottom: 120, left: 140, right: 100 },
      children: identityParas,
    })
  );

  // 3. Europass Logo Cell (Right aligned)
  const logoChildren: (ImageRun | TextRun)[] = [];
  if (logoBuffer) {
    logoChildren.push(
      new ImageRun({
        data: logoBuffer,
        type: "png",
        transformation: { width: 115, height: 32 },
      })
    );
  } else {
    logoChildren.push(
      new TextRun({
        text: "europass",
        bold: true,
        font,
        size: 26,
        color: EUROPASS_BLUE,
      })
    );
  }

  const logoWidth = photoBuffer ? 2180 : 2380;
  cells.push(
    new TableCell({
      width: { size: logoWidth, type: WidthType.DXA },
      shading: { fill: CARD_BG, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 140, bottom: 120, left: 100, right: 140 },
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: logoChildren,
        }),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
        children: cells,
      }),
    ],
  });
}

/**
 * Builds the complete Europass CV elements (Header Table + Section Dividers + Entries)
 * for native Word document (.docx) export.
 */
export async function buildEuropassDocxElements(
  studentName: string,
  sections: ExportSection[],
  cvData?: DocumentData,
  font = "Arial"
): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [];

  // 1. Shaded Europass Header Table (Card banner)
  const headerTable = await buildEuropassHeaderTable(studentName, cvData?.personal, font);
  out.push(headerTable);

  // Spacer between header card and first section
  out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));

  // 2. Resolve Sections (from passed sections or synthesized from cvData)
  let activeSections = sections;
  if (
    (!activeSections || activeSections.length === 0 || activeSections.every((s) => !s.content.trim())) &&
    cvData
  ) {
    const baseSections: { heading: string; content: string }[] = [
      { heading: "ABOUT ME", content: "" },
      { heading: "EDUCATION AND TRAINING", content: "" },
      { heading: "WORK EXPERIENCE / INTERNSHIPS", content: "" },
      { heading: "LANGUAGE SKILLS", content: "" },
      { heading: "DIGITAL SKILLS", content: "" },
      { heading: "HOBBIES AND INTERESTS", content: "" },
    ];
    activeSections = syncCvDataToSections(cvData, baseSections).map((s) => ({
      title: s.heading,
      content: s.content,
    }));
  }

  for (const section of activeSections) {
    const content = (section.content || "").trim();
    if (!content) continue;

    // Styled Europass Section Heading with Navy Blue bottom underline rule
    out.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: EUROPASS_BLUE, space: 2 } },
        children: [
          new TextRun({
            text: (section.title || "").toUpperCase(),
            bold: true,
            font,
            size: 21, // 10.5pt
            color: EUROPASS_BLUE,
          }),
        ],
      })
    );

    // Entries are separated by blank lines; the first line of each entry is its title.
    for (const entry of content.split(/\n\s*\n/)) {
      const lines = entry.split("\n").map((l) => l.trim()).filter(Boolean);
      lines.forEach((line, i) => {
        const isBullet = /^[•\-*]\s+/.test(line);
        const cleanText = line.replace(/^[•\-*]\s+/, "");
        const isCefrRow = /^(LISTENING|READING|WRITING|SPOKEN PRODUCTION|SPOKEN INTERACTION)\b/i.test(line);

        if (isBullet) {
          out.push(
            new Paragraph({
              spacing: { after: 35, line: 250 },
              indent: { left: 360, hanging: 180 },
              children: [
                new TextRun({ text: "• ", font, size: 19 }),
                ...textRuns(cleanText, font, 19),
              ],
            })
          );
        } else if (isCefrRow) {
          out.push(
            new Paragraph({
              spacing: { after: 40, line: 240 },
              indent: { left: 240 },
              children: formatCefrLine(line, font),
            })
          );
        } else if (i === 0 && lines.length > 1) {
          // Entry Title (Degree or Job Role)
          out.push(
            new Paragraph({
              spacing: { before: 60, after: 20 },
              children: textRuns(line, font, 20, true),
            })
          );
        } else if (
          i === 1 &&
          lines.length > 2 &&
          (line.includes("[") || line.includes("|") || line.includes("–") || line.includes("-"))
        ) {
          // Institution / Company & Date bracket line
          out.push(
            new Paragraph({
              spacing: { after: 30, line: 240 },
              children: textRuns(line, font, 19, false),
            })
          );
        } else {
          const isMeta = /^(Address|Location|Website|Final grade|Mother tongue\(s\)|Other language\(s\)):/i.test(line);
          out.push(
            new Paragraph({
              spacing: { after: 40, line: 250 },
              children: isMeta ? formatMetaLine(line, font) : textRuns(line, font, 19),
            })
          );
        }
      });
      out.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    }
  }

  return out;
}

/**
 * Backward-compatible synchronous wrapper that builds Europass paragraphs.
 */
export function buildEuropassParagraphs(
  studentName: string,
  sections: ExportSection[],
  font = "Arial"
): Paragraph[] {
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
