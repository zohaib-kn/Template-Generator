/**
 * app/api/export/docx/route.ts
 *
 * Server-side native Word document (.docx) generation endpoint.
 * Uses the official 'docx' package to construct a clean, styled Microsoft Word document
 * matching the approved template skeleton and section hierarchy.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  convertInchesToTwip,
} from "docx";

interface ExportDocxSection {
  title: string;
  content: string;
}

interface ExportDocxPayload {
  title: string;
  studentName: string;
  documentType: string;
  sections: ExportDocxSection[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportDocxPayload;
    const { title, studentName, documentType, sections } = body;

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { success: false, error: "Sections array is required for DOCX export." },
        { status: 400 }
      );
    }

    const docChildren: Paragraph[] = [];

    // 1. Document Title & Header
    docChildren.push(
      new Paragraph({
        text: title || "Official Application Document",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: `Candidate: ${studentName || "Student"} | Document: ${documentType || "Statement of Purpose"}`,
            italics: true,
            color: "555555",
            size: 20, // 10pt
          }),
        ],
      })
    );

    // 2. Sections
    for (const section of sections) {
      if (section.title) {
        docChildren.push(
          new Paragraph({
            text: section.title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 80 },
          })
        );
      }

      // Split paragraphs by newline
      const paragraphs = (section.content || "").split(/\n+/).filter(Boolean);
      for (const pText of paragraphs) {
        // Strip markdown bold asterisks into clean bold TextRuns
        const parts = pText.split(/(\*\*[^*]+\*\*)/g);
        const runs = parts.map((part) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return new TextRun({
              text: part.slice(2, -2),
              bold: true,
              size: 21, // 10.5pt
              font: "Georgia",
            });
          }
          return new TextRun({
            text: part,
            size: 21, // 10.5pt
            font: "Georgia",
          });
        });

        docChildren.push(
          new Paragraph({
            children: runs,
            spacing: { after: 140, line: 276 }, // 1.15 line spacing
            alignment: AlignmentType.LEFT,
          })
        );
      }
    }

    // 3. Assemble DOCX Document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.8),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(0.8),
                right: convertInchesToTwip(0.8),
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
