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

/**
 * Parses an HTML fragment (e.g. from Tiptap or template renderer) into docx TextRuns.
 */
function htmlFragmentToRuns(
  htmlFragment: string,
  defaultFont = "Calibri",
  defaultSize = 16
): TextRun[] {
  const s = htmlFragment.replace(/<br\s*\/?>/gi, "\n");
  const tagRegex = /(<\/?(?:strong|b|em|i|u|s|span|a)[^>]*>)/gi;
  const tokens = s.split(tagRegex);

  const runs: TextRun[] = [];
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrike = false;
  let isLink = false;
  let currentFont = defaultFont;

  for (const token of tokens) {
    if (!token) continue;
    const lower = token.toLowerCase();

    if (lower === "<strong>" || lower === "<b>") {
      isBold = true;
    } else if (lower === "</strong>" || lower === "</b>") {
      isBold = false;
    } else if (lower === "<em>" || lower === "<i>") {
      isItalic = true;
    } else if (lower === "</em>" || lower === "</i>") {
      isItalic = false;
    } else if (lower === "<u>") {
      isUnderline = true;
    } else if (lower === "</u>") {
      isUnderline = false;
    } else if (lower === "<s>" || lower === "<strike>") {
      isStrike = true;
    } else if (lower === "</s>" || lower === "</strike>") {
      isStrike = false;
    } else if (lower.startsWith("<a")) {
      isLink = true;
      isUnderline = true;
    } else if (lower === "</a>") {
      isLink = false;
      isUnderline = false;
    } else if (lower.startsWith("<span")) {
      if (lower.includes("font-weight: bold") || lower.includes("font-weight:bold") || lower.includes("700")) {
        isBold = true;
      }
      if (lower.includes("text-decoration: underline") || lower.includes("text-decoration:underline")) {
        isUnderline = true;
      }
      if (lower.includes("font-style: italic") || lower.includes("font-style:italic")) {
        isItalic = true;
      }
      const fontMatch = token.match(/font-family:\s*([^;"]+)/i);
      if (fontMatch) {
        const raw = fontMatch[1].trim().replace(/['"]/g, "").split(",")[0].trim();
        if (raw) currentFont = raw;
      }
    } else if (lower === "</span>") {
      isBold = false;
      isUnderline = false;
      isItalic = false;
      currentFont = defaultFont;
    } else if (token.startsWith("<") && token.endsWith(">")) {
      // Ignore unknown tags
    } else {
      const decoded = token
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");

      if (decoded) {
        const lines = decoded.split("\n");
        for (let li = 0; li < lines.length; li++) {
          if (lines[li]) {
            runs.push(
              new TextRun({
                text: lines[li],
                bold: isBold,
                italics: isItalic,
                underline: isUnderline || isLink ? { type: UnderlineType.SINGLE } : undefined,
                color: isLink ? "1D4ED8" : undefined,
                strike: isStrike,
                font: currentFont,
                size: defaultSize,
              })
            );
          }
          if (li < lines.length - 1) {
            runs.push(new TextRun({ break: 1 }));
          }
        }
      }
    }
  }

  return runs;
}

/**
 * Converts rich HTML from Tiptap or doc renderer into docx Paragraphs.
 */
function parseHtmlToDocxParagraphs(
  html: string,
  defaultFont = "Calibri",
  isCoverLetter = false
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const blockRegex = /<(p|div|h1|h2|h3|li)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    const inner = match[3];

    // Determine alignment
    let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
    if (attrs.includes("text-align: center") || attrs.includes("text-align:center")) {
      alignment = AlignmentType.CENTER;
    } else if (attrs.includes("text-align: right") || attrs.includes("text-align:right")) {
      alignment = AlignmentType.RIGHT;
    } else if (attrs.includes("text-align: justify") || attrs.includes("text-align:justify")) {
      alignment = AlignmentType.JUSTIFIED;
    }

    let size = isCoverLetter ? 16.5 : 22; // 8.25pt for master cover letter, 11pt default
    let spacing: { before?: number; after?: number; line?: number } = isCoverLetter
      ? { after: 110, line: 235 }
      : { after: 140, line: 260 };

    if (tag === "h1") {
      size = isCoverLetter ? 18 : 28;
      spacing = isCoverLetter ? { before: 140, after: 100 } : { before: 200, after: 120 };
    } else if (tag === "h2") {
      size = isCoverLetter ? 17 : 24;
      spacing = isCoverLetter ? { before: 120, after: 80 } : { before: 180, after: 100 };
    } else if (tag === "h3") {
      size = isCoverLetter ? 16.5 : 22;
      spacing = isCoverLetter ? { before: 100, after: 60 } : { before: 140, after: 80 };
    } else if (
      (inner.includes("COVER LETTER") || inner.includes("STATEMENT OF PURPOSE")) &&
      alignment === AlignmentType.CENTER
    ) {
      size = isCoverLetter ? 17 : 24;
      spacing = isCoverLetter ? { after: 140 } : { after: 200 };
    }

    // Check if inner contains nested blocks (like <div><div>...</div></div>)
    if (/<(p|div|h1|h2|h3)[\s>]/i.test(inner)) {
      const innerParas = parseHtmlToDocxParagraphs(inner, defaultFont, isCoverLetter);
      paragraphs.push(...innerParas);
      continue;
    }

    const runs = htmlFragmentToRuns(inner, defaultFont, size);
    if (runs.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: runs,
          alignment,
          spacing,
        })
      );
    }
  }

  return paragraphs;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportDocxPayload;
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

    const defaultFont = requestedFont
      ? requestedFont.replace(/['"]/g, "").split(",")[0].trim()
      : isCoverLetter
      ? "Calibri"
      : "Times New Roman";

    const docChildren: Paragraph[] = [];

    const isSop =
      documentType === "SOP" ||
      documentType === "UNIVERSITY_SOP" ||
      (title ? title.toLowerCase().includes("statement of purpose") : false);

    // Option A: Use live HTML if passed and valid
    if (html && html.trim().length > 30) {
      const parsedParas = parseHtmlToDocxParagraphs(html, defaultFont, isCoverLetter);
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

        const getSec = (match: string) =>
          sections.find((s) => s.title?.toLowerCase().includes(match.toLowerCase()))?.content || "";

        const recipient = getSec("recipient") || getSec("consulate");
        const subject = getSec("subject");
        const intro = getSec("student introduction");
        const academics = getSec("academic background");
        const whyCourse = getSec("why this course") || getSec("why course");
        const whyUniv = getSec("why this university") || getSec("why university");
        const whyItaly = getSec("why italy") || getSec("why this country");
        const futurePlan = getSec("future academic plan");
        const careerPlan = getSec("career plan");
        const returnIntent = getSec("return") || getSec("home country");
        const finance = getSec("financial") || getSec("sponsorship");
        const accommodation = getSec("accommodation");
        const insurance = getSec("insurance");
        const travel = getSec("travel");
        const closing = getSec("closing");
        const signature = getSec("signature") || getSec("contact");

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
        const p1 = [intro, academics].filter(Boolean).join(" ");
        if (p1) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(p1, defaultFont, 16),
            })
          );
        }

        if (whyCourse) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(whyCourse, defaultFont, 16),
            })
          );
        }

        if (whyUniv) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(whyUniv, defaultFont, 16),
            })
          );
        }

        if (whyItaly) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(whyItaly, defaultFont, 16),
            })
          );
        }

        const p5 = [futurePlan, careerPlan, returnIntent].filter(Boolean).join(" ");
        if (p5) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(p5, defaultFont, 16),
            })
          );
        }

        if (finance) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(finance, defaultFont, 16),
            })
          );
        }

        const p7 = [accommodation, insurance, travel].filter(Boolean).join(" ");
        if (p7) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(p7, defaultFont, 16),
            })
          );
        }

        if (closing) {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 110, line: 235 },
              children: markdownToRuns(closing, defaultFont, 16),
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
    const safeStudentName = (studentName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeStudentName}_${documentType || "Document"}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "DOCX generation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
