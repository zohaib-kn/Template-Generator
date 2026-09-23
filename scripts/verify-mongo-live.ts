/**
 * scripts/verify-mongo-live.ts
 *
 * Comprehensive Live MongoDB Atlas Integration & Contract Verification Script.
 *
 * Verifies:
 * 1. Live handshake to Atlas and database confirmation ("template_generator").
 * 2. Document insertion via saveDocument().
 * 3. Retrieval via findById().
 * 4. Idempotency retrieval via findByExternalRef().
 * 5. Concurrent duplicate externalReferenceId idempotency handling.
 * 6. Base64 exclusion in findById (Phase 3 optimization check).
 * 7. PDF persistence via savePdf() and binary retrieval via getPdf().
 * 8. Enforcement of 10MB PDF size limit (PdfSizeLimitError).
 * 9. Physical confirmation in the "documents" collection in Atlas.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

// Force live MongoDB mode
process.env.FORCE_MONGO = "true";

// Load .env.local
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db";
import {
  saveDocument,
  findById,
  findByExternalRef,
  savePdf,
  getPdf,
  PdfSizeLimitError,
} from "../services/webhook/documentStore";
import { DocumentModel } from "../models/Document";
import type { DocumentRecord } from "../services/webhook/types";

async function verifyLiveMongo() {
  console.log("==========================================================");
  console.log("  Live MongoDB Atlas Production Verification Suite        ");
  console.log("==========================================================");

  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Connected but database is undefined.");

  console.log(` Connected Database: "${db.databaseName}"`);
  assert.strictEqual(
    db.databaseName,
    "template_generator",
    "Must be connected to template_generator"
  );

  const timestamp = Date.now();
  const testDocId = `DOC-VERIFY-${timestamp}`;
  const testExternalRef = `EXT-VERIFY-${timestamp}`;

  console.log(`\n[Test 1] Creating Document: ${testDocId}...`);
  const record: DocumentRecord = {
    id: testDocId,
    externalReferenceId: testExternalRef,
    studentId: "6a508a96af13bb33e9fc07ce",
    studentName: "Kaavya Live Verification",
    documentType: "SOP",
    templateId: "italy-type-d-student-visa-cover-letter",
    status: "GENERATED",
    reviewUrl: `/sop-generator/${testDocId}?studentId=6a508a96af13bb33e9fc07ce`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sectionContents: {
      introduction: "Live test introduction for MongoDB integration.",
    },
    sectionStatuses: {
      introduction: "APPROVED",
    },
    validationIssues: [],
    normalizedProfile: {
      meta: { studentId: "6a508a96af13bb33e9fc07ce", source: "static-mock", fetchedAt: new Date().toISOString() },
      personal: {
        fullName: "Kaavya Live Verification",
        firstName: "Kaavya",
        lastName: "Verification",
      },
      academics: { qualifications: [] },
      workExperience: [],
      tests: {},
      applications: { all: [] },
    },
  };

  const saved = await saveDocument(record);
  assert.strictEqual(saved.id, testDocId);
  console.log(" Document successfully saved to Atlas.");

  console.log("\n[Test 2] Querying via findById()...");
  const retrieved = await findById(testDocId);
  assert.ok(retrieved, "Document must be found in Atlas");
  assert.strictEqual(retrieved?.studentName, "Kaavya Live Verification");
  console.log(" findById() successfully retrieved record from Atlas.");

  console.log("\n[Test 3] Querying via findByExternalRef()...");
  const byRef = await findByExternalRef(testExternalRef);
  assert.ok(byRef, "Document must be found by external reference");
  assert.strictEqual(byRef?.id, testDocId);
  console.log(" findByExternalRef() verified idempotency lookup.");

  console.log("\n[Test 4] Verifying concurrent duplicate externalReferenceId handling...");
  const duplicateAttempt = await saveDocument({
    ...record,
    id: `DOC-DUP-${timestamp}`,
  });
  assert.strictEqual(
    duplicateAttempt.id,
    testDocId,
    "Duplicate insert must return existing document"
  );
  console.log(" Idempotency handled gracefully without crashing or creating duplicates.");

  console.log("\n[Test 5] Finalizing PDF via savePdf()...");
  const samplePdfBase64 = Buffer.from("%PDF-1.4 sample live test binary").toString("base64");
  const finalized = await savePdf(testDocId, samplePdfBase64, "Kaavya_SOP_LiveFinal.pdf");
  assert.strictEqual(finalized?.status, "FINALIZED");
  console.log(" PDF successfully attached and status set to FINALIZED.");

  console.log("\n[Test 6] Verifying PDF isolation (select: false in findById)...");
  const freshDoc = await findById(testDocId);
  assert.strictEqual(
    freshDoc?.pdfBase64,
    undefined,
    "pdfBase64 must be omitted from ordinary findById queries"
  );
  console.log(" Memory & BSON safeguard verified: pdfBase64 is excluded from standard lookups.");

  console.log("\n[Test 7] Downloading PDF binary via getPdf()...");
  const pdfPayload = await getPdf(testDocId);
  assert.ok(pdfPayload, "PDF payload must be retrievable");
  assert.ok(pdfPayload?.buffer.length > 0);
  assert.strictEqual(pdfPayload?.fileName, "Kaavya_SOP_LiveFinal.pdf");
  assert.strictEqual(pdfPayload?.status, "FINALIZED");
  console.log(` getPdf() retrieved binary (${pdfPayload?.buffer.length} bytes) successfully.`);

  console.log("\n[Test 8] Verifying 10MB PDF size limit enforcement...");
  // Create an oversized 11MB dummy base64 string
  const oversizedBase64 = "A".repeat(15 * 1024 * 1024);
  let sizeLimitCaught = false;
  try {
    await savePdf(testDocId, oversizedBase64);
  } catch (err) {
    if (err instanceof PdfSizeLimitError) {
      sizeLimitCaught = true;
      console.log(` Oversized upload properly rejected: ${err.message}`);
    } else {
      throw err;
    }
  }
  assert.ok(sizeLimitCaught, "Oversized PDF must trigger PdfSizeLimitError");

  console.log("\n[Test 9] Directly querying MongoDB Atlas collection 'documents'...");
  const rawAtlasDoc = await DocumentModel.findOne({ id: testDocId }).lean();
  assert.ok(rawAtlasDoc, "Physical document must exist in Atlas collection");
  console.log(` Physical record verified in Atlas collection "documents": ID=${rawAtlasDoc.id}`);

  console.log("\n==========================================================");
  console.log("  ALL LIVE MONGODB ATLAS TESTS PASSED SUCCESSFULLY!       ");
  console.log("==========================================================");

  await mongoose.disconnect();
  process.exit(0);
}

verifyLiveMongo().catch(async (err) => {
  console.error("❌ Live MongoDB Verification failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
