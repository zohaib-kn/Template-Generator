/**
 * services/import/__tests__/pdfImageExtractor.test.ts
 *
 * Automated tests for Page-1 profile photo extraction and PNG encoding.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import {
  rawPixelsToPng,
  extractPdfProfilePhoto,
} from "../parsers/pdfImageExtractor";

test("PNG Encoder: converts raw RGB pixel array into valid PNG buffer", () => {
  const width = 10;
  const height = 10;
  const channels = 3; // RGB
  const raw = new Uint8ClampedArray(width * height * channels).fill(200);

  const png = rawPixelsToPng(raw, width, height, channels);
  assert.ok(png instanceof Buffer);
  // Verify PNG 8-byte signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  assert.strictEqual(png[0], 0x89);
  assert.strictEqual(png[1], 0x50);
  assert.strictEqual(png[2], 0x4e);
  assert.strictEqual(png[3], 0x47);
  assert.strictEqual(png[4], 0x0d);
  assert.strictEqual(png[5], 0x0a);
  assert.strictEqual(png[6], 0x1a);
  assert.strictEqual(png[7], 0x0a);

  // Contains IHDR, IDAT, and IEND chunks
  const str = png.toString("binary");
  assert.ok(str.includes("IHDR"));
  assert.ok(str.includes("IDAT"));
  assert.ok(str.includes("IEND"));
});

test("PNG Encoder: converts raw RGBA pixel array into valid PNG buffer", () => {
  const width = 16;
  const height = 16;
  const channels = 4; // RGBA
  const raw = new Uint8ClampedArray(width * height * channels).fill(255);

  const png = rawPixelsToPng(raw, width, height, channels);
  assert.strictEqual(png[0], 0x89);
  assert.strictEqual(png[1], 0x50);
  assert.strictEqual(png[2], 0x4e);
  assert.strictEqual(png[3], 0x47);
});

test("PDF Image Extractor: returns null for text-only PDF without images", async () => {
  const doc = new jsPDF();
  doc.text("Candidate: Jane Doe, Software Developer", 10, 10);
  const pdfBuf = Buffer.from(doc.output("arraybuffer"));

  const photo = await extractPdfProfilePhoto(pdfBuf);
  assert.strictEqual(photo, null);
});

test("PDF Image Extractor: extracts candidate photo embedded in PDF", async () => {
  const doc = new jsPDF();
  doc.text("Candidate: John Smith", 10, 10);

  // Generate a 120x150 candidate portrait photo (aspect ratio 0.8)
  const width = 120;
  const height = 150;
  const raw = new Uint8ClampedArray(width * height * 3);
  for (let i = 0; i < raw.length; i += 3) {
    raw[i] = 180; // R
    raw[i + 1] = 120; // G
    raw[i + 2] = 90; // B
  }

  const png = rawPixelsToPng(raw, width, height, 3);
  const dataUri = `data:image/png;base64,${png.toString("base64")}`;

  doc.addImage(dataUri, "PNG", 15, 20, 30, 37.5);
  const pdfBuf = Buffer.from(doc.output("arraybuffer"));

  const extracted = await extractPdfProfilePhoto(pdfBuf);
  assert.ok(extracted !== null, "Expected extracted photo to not be null");
  assert.ok(extracted.startsWith("data:image/png;base64,"));
  assert.ok(extracted.length > 100);
});
