import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Table } from "docx";
import {
  buildEuropassDocxElements,
  buildEuropassParagraphs,
  EUROPASS_BLUE,
  resolveImageBuffer,
} from "@/lib/export/europassDocx";
import type { DocumentData } from "@/types/document";

describe("Europass DOCX Export Engine", () => {
  const sampleCvData: DocumentData = {
    personal: {
      fullName: "Riddhi Sagar Jaiswal",
      passportNumber: "AR125966",
      nationality: "Indian",
      dateOfBirth: "2006-05-31",
      placeOfBirth: "Lucknow, India",
      gender: "Female",
      phone: "(+91) 70393979",
      email: "sagarriddhi8@gmail.com",
      address: "577, Dalmandi Faizabad, Ayodhya, UP, India, 224001",
      photoUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    },
    education: [
      {
        id: "edu-1",
        qualification: "Grade 10th",
        institution: "Tiny Tots School Civil Lines Faizabad Up",
        startDate: "2020-04",
        address: "Faizabad, India",
        finalGrade: "77.60%/100",
      },
    ],
    internships: [
      {
        id: "work-1",
        role: "German Language Instructor",
        company: "Zaariz Education",
        startDate: "February 2025",
        endDate: "August 2025",
        description: "Delivered German language instruction [A1-B1] to students.",
      },
    ],
  };

  it("builds a styled Europass header card Table with photo, personal grid, and logo", async () => {
    const sections = [
      {
        title: "EDUCATION AND TRAINING",
        content:
          "Grade 10th\nTiny Tots School Civil Lines Faizabad Up [ 2020 - 04 ]\nAddress: Faizabad, India | Final grade: 77.60%/100",
      },
      {
        title: "WORK EXPERIENCE / INTERNSHIPS",
        content:
          "German Language Instructor\nZaariz Education | Location | [ February 2025 – August 2025 ]\n• Delivered German language instruction [A1-B1] to students.",
      },
      {
        title: "LANGUAGE SKILLS",
        content:
          "Mother tongue(s): Hindi\nOther language(s): German\nLISTENING C1  READING C1  WRITING C1\nSPOKEN PRODUCTION B2  SPOKEN INTERACTION C1",
      },
    ];

    const elements = await buildEuropassDocxElements(
      "Riddhi Sagar Jaiswal",
      sections,
      sampleCvData,
      "Arial"
    );

    // 1. First element MUST be the shaded Europass Header Card Table
    assert.ok(elements.length > 0, "Elements should not be empty");
    assert.ok(elements[0] instanceof Table, "First element must be the Europass header Table");

    // 2. Sections must be appended with headings
    assert.ok(elements.length >= 4, "Should contain header table, spacer, and section paragraphs");

    // 3. Document packing must succeed into valid binary buffer
    const doc = new Document({
      sections: [
        {
          children: elements,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    assert.ok(buffer.length > 500, "Packer must produce a valid DOCX binary buffer (>500 bytes)");
  });

  it("synthesizes sections directly from cvData when sections array is empty", async () => {
    const elements = await buildEuropassDocxElements(
      "Riddhi Sagar Jaiswal",
      [],
      sampleCvData,
      "Arial"
    );

    assert.ok(elements[0] instanceof Table, "Header must be a Table");
    // Verify document packages cleanly
    const doc = new Document({
      sections: [
        {
          children: elements,
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    assert.ok(buffer.length > 500, "Should generate valid DOCX when sections are synthesized from cvData");
  });

  it("handles candidate photo resolving from base64 Data URI and local fallback safely", async () => {
    const base64Uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const buf = await resolveImageBuffer(base64Uri);
    assert.ok(buf !== null, "Should decode base64 URI into Buffer");
    assert.ok(buf.length > 0, "Buffer should not be empty");

    const nullBuf = await resolveImageBuffer(undefined);
    assert.equal(nullBuf, null, "Undefined photo should resolve to null gracefully");
  });

  it("maintains backward compatibility with buildEuropassParagraphs synchronous call", () => {
    const legacyParas = buildEuropassParagraphs("Aarav Mehta", [
      { title: "SKILLS", content: "• TypeScript\n• Next.js" },
    ]);
    assert.ok(Array.isArray(legacyParas), "Should return array of paragraphs");
    assert.ok(legacyParas.length > 0, "Should have paragraphs");
  });
});

