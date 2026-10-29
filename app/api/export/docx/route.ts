/**
 * app/api/export/docx/route.ts
 *
 * Server-side native Word document (.docx) generation endpoint.
 * Uses the official 'docx' package to construct a clean, styled Microsoft Word document
 * matching the approved master template specifications.
 *
 * For Cover Letters (Type D Visa Cover Letter):
 * - Clean centered header: "COVER LETTER" (bold, underline)
 * - Recipient block & subject line without internal developer headings
 * - 8 cohesive master paragraphs matching the approved embassy master template
 * - Fits single-page A4 budget without artificial page bloating
 *
 * Supports live HTML export from the editor as well as structured sections.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { attachmentDisposition, InvalidJsonError, readJsonBody, RequestTooLargeError } from "@/lib/http/requestLimits";
import { buildCoverLetterLayout } from "@/lib/export/coverLetterLayout";
import { buildEuropassParagraphs } from "@/lib/export/europassDocx";
import { isAllowedExportFont, resolveExportFont } from "@/lib/export/fonts";
import { parseHtmlToDocxParagraphs } from "@/lib/export/htmlToDocx";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  Packer,
  convertInchesToTwip,
} from "docx";

interface ExportDocxSection {
  title: string;
  content: string;
}

interface ExportDocxPayload {
  title?: string;
  studentName?: string;
  documentType?: string;
  fontFamily?: string;
  html?: string;
  sections?: ExportDocxSection[];
  /** When present, the operator must have access to this student. */
  studentId?: string;
}

/**
 * Parses markdown bold (**text**) into TextRuns.
 */
function markdownToRuns(
  text: string,
  font = "Times New Roman",
  size = 22,
  overrideBold = false
): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .map((part) => {
      if (!part) return null;
      if (part.startsWith("**") && part.endsWith("**")) {
        return new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font,
          size,
        });
      }
      return new TextRun({
        text: part,
        bold: overrideBold,
        font,
        size,
      });
    })
    .filter(Boolean) as TextRun[];
}

const MAX_DOCX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_SECTIONS = 100;

export async function POST(req: NextRequest) {
  try {
    const auth0 = await requireSession(req);
    if (auth0.response) return auth0.response;

    const body = await readJsonBody<ExportDocxPayload>(req, MAX_DOCX_BODY_BYTES);
    const auth = await requireSession(req, { studentId: body?.studentId ?? null });
    if (auth.response) return auth.response;
    if (body.sections !== undefined && (!Array.isArray(body.sections) || body.sections.length > MAX_SECTIONS)) {
      return NextResponse.json({ success: false, error: `sections must be an array of at most ${MAX_SECTIONS} items.` }, { status: 400 });
    }
    const { title, studentName, documentType, fontFamily: requestedFont, html, sections } = body;
    const isCoverLetter =
      documentType === "COVER_LETTER" ||
      documentType === "VISA_COVER_LETTER" ||
      (title ? title.toLowerCase().includes("cover letter") : false) ||
      (sections &&
        sections.some(
          (s) =>
            s.title.toLowerCase().includes("recipient") ||
            s.title.toLowerCase().includes("consulate") ||
            s.title.toLowerCase().includes("subject line")
        ));

    const isCv = documentType === "CV";
    const defaultFont = resolveExportFont(requestedFont, isCv ? "Arial" : isCoverLetter ? "Calibri" : "Times New Roman");

    const docChildren: Paragraph[] = [];

    const isSop =
      documentType === "SOP" ||
      documentType === "UNIVERSITY_SOP" ||
      (title ? title.toLowerCase().includes("statement of purpose") : false);

    // CV: rebuild the Europass structure from sections (the editor HTML is a flat view)
    if (isCv && sections && Array.isArray(sections)) {
      docChildren.push(...buildEuropassParagraphs(studentName || "", sections, defaultFont));
    }

    // Option A: Use live HTML if passed and valid
    if (!isCv && html && html.trim().length > 30) {
      const parsedParas = parseHtmlToDocxParagraphs(html, { defaultFont, isCoverLetter: Boolean(isCoverLetter), isAllowedFont: isAllowedExportFont });
      if (parsedParas.length > 0) {
        docChildren.push(...parsedParas);
      }
    }

    // Option B: If HTML wasn't passed or produced empty paragraphs, construct from sections matching master template
    if (docChildren.length === 0 && sections && Array.isArray(sections)) {
      if (isCoverLetter) {
        // Master Template for Cover Letter:
        // 1. Centered Title
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: "COVER LETTER",
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                font: defaultFont,
                size: 17, // ~8.5pt
              }),
            ],
          })
        );

        const { recipient, subject, paragraphs: bodyParagraphs, signature } = buildCoverLetterLayout(sections);

        // 2. Recipient Block (No developer heading!)
        if (recipient) {
          const recLines = recipient.split("\n");
          const runs: TextRun[] = [];
          for (let i = 0; i < recLines.length; i++) {
            if (recLines[i]) {
              runs.push(...markdownToRuns(recLines[i], defaultFont, 16));
            }
            if (i < recLines.length - 1) {
              runs.push(new TextRun({ break: 1 }));
            }
          }
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 120, line: 235 },
              children: runs,
            })
          );
        }

        // 3. Subject Line (No developer heading, bolded)
        if (subject) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 120, line: 235 },
              children: markdownToRuns(subject, defaultFont, 16, true),
            })
          );
        }

        // 4. Master 8 Paragraphs (Flowing, justified, 1.15 line spacing, 8pt Calibri)
        for (const paragraph of bodyParagraphs) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(paragraph, defaultFont, 16),
            })
          );
        }

        // 5. Signature Block with blue underlined email link
        if (signature) {
          const sigLines = signature.split("\n");
          const runs: TextRun[] = [];
          for (let i = 0; i < sigLines.length; i++) {
            const line = sigLines[i];
            if (line) {
              if (line.toLowerCase().includes("email:")) {
                const parts = line.split(/(email:\s*)/i);
                runs.push(new TextRun({ text: parts[1] || "Email: ", font: defaultFont, size: 16 }));
                const emailVal = line.replace(/email:\s*/i, "").replace(/\*\*/g, "").trim();
                runs.push(
                  new TextRun({
                    text: emailVal,
                    color: "1D4ED8",
                    underline: { type: UnderlineType.SINGLE },
                    font: defaultFont,
                    size: 16,
                  })
                );
              } else {
                runs.push(...markdownToRuns(line, defaultFont, 16));
              }
            }
            if (i < sigLines.length - 1) {
              runs.push(new TextRun({ break: 1 }));
            }
          }
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 120, line: 235 },
              children: runs,
            })
          );
        }
      } else if (isSop) {
        // Master Template for SOP:
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "STATEMENT OF PURPOSE",
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                font: defaultFont,
                size: 24,
              }),
            ],
          })
        );

        for (const section of sections) {
          if (
            section.title &&
            section.title.toLowerCase() !== "statement of purpose" &&
            !section.title.toLowerCase().includes("metadata")
          ) {
            docChildren.push(
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 160, after: 80 },
              })
            );
          }

          const paragraphs = (section.content || "").split(/\n+/).filter(Boolean);
          for (const p of paragraphs) {
            docChildren.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 140, line: 260 },
                children: markdownToRuns(p, defaultFont, 21),
              })
            );
          }
        }
      } else {
        // Generic / LOR Document
        docChildren.push(
          new Paragraph({
            text: title || "Official Application Document",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
          })
        );

        for (const section of sections) {
          if (section.title) {
            docChildren.push(
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 180, after: 80 },
              })
            );
          }
          const paragraphs = (section.content || "").split(/\n+/).filter(Boolean);
          for (const p of paragraphs) {
            docChildren.push(
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 140, line: 260 },
                children: markdownToRuns(p, defaultFont, 21),
              })
            );
          }
        }
      }
    }

    // Assemble DOCX Document with calibrated standard A4 specifications
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                width: 11908, // 210mm A4 width
                height: 16833, // 297mm A4 height
              },
              margin: {
                top: isCoverLetter ? 652 : convertInchesToTwip(0.6),
                bottom: isCoverLetter ? 652 : convertInchesToTwip(0.6),
                left: isCoverLetter ? 652 : convertInchesToTwip(0.6),
                right: isCoverLetter ? 652 : convertInchesToTwip(0.6),
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": attachmentDisposition(`${studentName || "Student"}_${documentType || "Document"}`, "docx"),
      },
    });
  } catch (err: unknown) {
    if (err instanceof RequestTooLargeError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 413 });
    }
    if (err instanceof InvalidJsonError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    console.error("[export/docx] generation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "DOCX generation failed." }, { status: 500 });
  }
}
