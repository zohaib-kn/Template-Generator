/**
 * services/import/__tests__/sopParagraphSegmenter.test.ts
 *
 * Automated unit tests for SOP paragraph text cleaning and segmentation.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { cleanDocumentText, segmentSopParagraphs } from "../normalizers/sopParagraphSegmenter";

test("SOP Segmenter: cleans page numbers, headers, and excessive whitespace", () => {
  const dirtyText = `
  To The Respected Visa Officer,
  Embassy of Italy.

  Page 1 of 2

  My name is Aafia Ameen, an Indian citizen. I am applying for a Type D visa.

  ---------------------------------

  Page 2 of 2
  Sincerely,
  Aafia Ameen
  `;

  const cleaned = cleanDocumentText(dirtyText);
  assert.ok(!cleaned.includes("Page 1 of 2"));
  assert.ok(!cleaned.includes("Page 2 of 2"));
  assert.ok(cleaned.includes("Aafia Ameen"));
});

test("SOP Segmenter: segments paragraphs cleanly into distinct blocks", () => {
  const sampleSop = `To,
The Respected Visa Officer,
Embassy of Italy, New Delhi.

Subject: Application for a Long-Term Type D Student Visa for Master in Data Science at University of Padua

My name is Aafia Ameen, an Indian citizen from Bhopal, India. I am writing to submit my application for an Italian Long-Stay Type D Student Visa to pursue full-time studies in Data Science at the University of Padua.

I completed my Bachelor of Commerce from Barkatullah University in 2023 with an aggregate score of 72%. I secured an overall IELTS score of 7.0.

Having developed a strong academic foundation, I selected Data Science because its curriculum offers advanced analytical methods.

My education in Italy will be fully sponsored by my father, Mohammed Ameen (Business Owner, Annual Income: INR 12,00,000).

Thank you for your time and consideration.

Sincerely,
Aafia Ameen
Passport: Z1234567`;

  const blocks = segmentSopParagraphs(sampleSop);

  assert.ok(blocks.length >= 7, `Expected at least 7 blocks, got ${blocks.length}`);
  assert.ok(blocks[0].text.includes("To,"));
  assert.ok(blocks[1].text.includes("Subject:"));
  assert.ok(blocks[2].text.includes("Aafia Ameen"));
  assert.ok(blocks[3].text.includes("Barkatullah University"));
  assert.ok(blocks[4].text.includes("Data Science"));
  assert.ok(blocks[5].text.includes("Mohammed Ameen"));
});

test("SOP Segmenter: handles empty and single-line inputs gracefully", () => {
  assert.deepStrictEqual(segmentSopParagraphs(""), []);
  assert.deepStrictEqual(segmentSopParagraphs("   \n\n  "), []);

  const single = segmentSopParagraphs("This is a single paragraph without double linebreaks.");
  assert.strictEqual(single.length, 1);
  assert.strictEqual(single[0].text, "This is a single paragraph without double linebreaks.");
});
