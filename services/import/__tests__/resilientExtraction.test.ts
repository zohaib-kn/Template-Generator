/**
 * services/import/__tests__/resilientExtraction.test.ts
 *
 * Automated tests for resilient PDF and DOCX extraction error handling and timeouts.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { parsePdfBuffer, ScannedPdfError } from "../parsers/pdfParser";
import { parseDocxBuffer, CorruptedDocxError } from "../parsers/docxParser";

import { jsPDF } from "jspdf";

test("PDF Parser: rejects empty/scanned PDF buffer with ScannedPdfError", async () => {
  const doc = new jsPDF();
  const emptyPdf = Buffer.from(doc.output("arraybuffer"));

  await assert.rejects(
    async () => {
      await parsePdfBuffer(emptyPdf);
    },
    (err: unknown) => {
      assert.ok(err instanceof ScannedPdfError || (err as Error).name === "ScannedPdfError");
      return true;
    }
  );
});

test("DOCX Parser: rejects corrupted zip buffer with CorruptedDocxError", async () => {
  const corruptZipBuffer = Buffer.from("PK\x03\x04corrupted-fake-docx-archive-bytes");

  await assert.rejects(
    async () => {
      await parseDocxBuffer(corruptZipBuffer);
    },
    (err: unknown) => {
      assert.ok(err instanceof CorruptedDocxError || (err as Error).name === "CorruptedDocxError");
      return true;
    }
  );
});

test("PDF Parser: cleanly extracts text from valid PDF buffer without DOM dependencies", async () => {
  const doc = new jsPDF();
  doc.text(
    "Candidate Name: Jane Doe. Software Engineer with expertise in React, Node.js, and TypeScript.",
    10,
    10
  );
  doc.text(
    "Education: Bachelor of Technology in Computer Science and Engineering, 2020-2024.",
    10,
    20
  );
  const validPdf = Buffer.from(doc.output("arraybuffer"));

  const res = await parsePdfBuffer(validPdf);
  assert.ok(res.text.includes("Jane Doe"));
  assert.ok(res.numPages >= 1);
});


