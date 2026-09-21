/**
 * services/webhook/__tests__/generate.test.ts
 *
 * Test suite for Unified Document Generation Webhook (Phase 2).
 * Covers the 7 core required scenarios:
 * 1. Valid SOP request (200 + documentId + reviewUrl)
 * 2. Invalid or missing X-API-Key (401 UNAUTHORIZED)
 * 3. Missing studentId or documentType (400 INVALID_REQUEST)
 * 4. Unsupported documentType (400 UNSUPPORTED_DOCUMENT_TYPE)
 * 5. Idempotency via externalReferenceId (same document returned, no duplicate)
 * 6. SOP validation failure on missing mandatory fields (VALIDATION_FAILED)
 * 7. Student not found (404 STUDENT_NOT_FOUND)
 */

import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/documents/generate/route";
import { GET as GET_DOC } from "@/app/api/documents/[documentId]/route";
import { GET as GET_PDF, POST as POST_PDF } from "@/app/api/documents/[documentId]/pdf/route";
import { clearAllDocuments } from "@/services/webhook/documentStore";
import kaavyaSnapshot from "@/features/document-generator/utils/crmSnapshot_Kaavya.json";

const TEST_API_KEY = "test_webhook_secret_key_123";
const KNOWN_CACHED_STUDENT_ID = "6a508a96af13bb33e9fc07ce"; // Kaavya snapshot

function makeRequest(
  body: Record<string, unknown> | string,
  apiKey: string | null = TEST_API_KEY
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey !== null) {
    headers["X-API-Key"] = apiKey;
  }

  const rawBody = typeof body === "string" ? body : JSON.stringify(body);

  return new NextRequest("http://localhost:3000/api/documents/generate", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

describe("Unified Document Generation Webhook", () => {
  beforeEach(() => {
    process.env.DOCUMENT_WEBHOOK_API_KEY = TEST_API_KEY;
    clearAllDocuments();
  });

  test("Scenario 1: Valid SOP generation request returns 200, documentId, and reviewUrl", async () => {
    const req = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "SOP",
      templateId: "italy-type-d-student-visa-cover-letter",
    });

    const res = await POST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.documentId.startsWith("DOC-"));
    assert.strictEqual(body.studentId, KNOWN_CACHED_STUDENT_ID);
    assert.strictEqual(body.documentType, "SOP");
    assert.ok(body.reviewUrl.startsWith("/sop-generator/DOC-"));
    assert.ok(body.createdAt);
  });

  test("Scenario 1b: Mode A with inline studentData generates valid SOP without upstream call", async () => {
    const req = makeRequest({
      studentId: "custom-inline-student",
      documentType: "SOP",
      studentData: kaavyaSnapshot,
    });

    const res = await POST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.documentId.startsWith("DOC-"));
  });

  test("Scenario 2: Invalid or missing X-API-Key returns 401 UNAUTHORIZED", async () => {
    // Missing key
    const reqMissing = makeRequest(
      { studentId: KNOWN_CACHED_STUDENT_ID, documentType: "SOP" },
      null
    );
    const resMissing = await POST(reqMissing);
    const bodyMissing = await resMissing.json();

    assert.strictEqual(resMissing.status, 401);
    assert.strictEqual(bodyMissing.success, false);
    assert.strictEqual(bodyMissing.code, "UNAUTHORIZED");

    // Invalid key
    const reqWrong = makeRequest(
      { studentId: KNOWN_CACHED_STUDENT_ID, documentType: "SOP" },
      "wrong_key"
    );
    const resWrong = await POST(reqWrong);
    const bodyWrong = await resWrong.json();

    assert.strictEqual(resWrong.status, 401);
    assert.strictEqual(bodyWrong.success, false);
    assert.strictEqual(bodyWrong.code, "UNAUTHORIZED");
  });

  test("Scenario 3: Missing studentId or documentType returns 400 INVALID_REQUEST", async () => {
    // Missing studentId
    const reqNoStudent = makeRequest({ documentType: "SOP" });
    const resNoStudent = await POST(reqNoStudent);
    const bodyNoStudent = await resNoStudent.json();

    assert.strictEqual(resNoStudent.status, 400);
    assert.strictEqual(bodyNoStudent.success, false);
    assert.strictEqual(bodyNoStudent.code, "INVALID_REQUEST");

    // Missing documentType
    const reqNoType = makeRequest({ studentId: KNOWN_CACHED_STUDENT_ID });
    const resNoType = await POST(reqNoType);
    const bodyNoType = await resNoType.json();

    assert.strictEqual(resNoType.status, 400);
    assert.strictEqual(bodyNoType.success, false);
    assert.strictEqual(bodyNoType.code, "INVALID_REQUEST");
  });

  test("Scenario 4: Unsupported documentType returns 400 UNSUPPORTED_DOCUMENT_TYPE", async () => {
    const req = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "PASSPORT_RENEWAL",
    });

    const res = await POST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "UNSUPPORTED_DOCUMENT_TYPE");
    assert.ok(body.message.includes("not supported"));
  });

  test("Scenario 5: Duplicate externalReferenceId returns existing document (idempotency)", async () => {
    const externalRef = "CRM-APP-REF-99881";

    const req1 = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "SOP",
      externalReferenceId: externalRef,
    });
    const res1 = await POST(req1);
    const body1 = await res1.json();

    assert.strictEqual(res1.status, 200);
    const firstDocId = body1.documentId;

    // Second call with the same externalReferenceId
    const req2 = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "SOP",
      externalReferenceId: externalRef,
    });
    const res2 = await POST(req2);
    const body2 = await res2.json();

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(body2.documentId, firstDocId);
    assert.strictEqual(body2.externalReferenceId, externalRef);
  });

  test("Scenario 6: SOP with missing mandatory fields yields VALIDATION_FAILED status", async () => {
    // Pass inline snapshot with missing name and required destination
    const brokenSnapshot = {
      student: {
        _id: "broken-student-001",
        personalDetails: {
          firstName: "",
          lastName: "",
        },
      },
    };

    const req = makeRequest({
      studentId: "broken-student-001",
      documentType: "SOP",
      studentData: brokenSnapshot,
    });

    const res = await POST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, "VALIDATION_FAILED");
    assert.ok(Array.isArray(body.warnings));
    assert.ok(body.warnings.some((w: string) => w.toLowerCase().includes("name")));
  });

  test("Scenario 7: Unknown student ID with no CRM record returns 404 STUDENT_NOT_FOUND", async () => {
    const req = makeRequest({
      studentId: "nonexistent-student-99999",
      documentType: "SOP",
    });

    const res = await POST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, "STUDENT_NOT_FOUND");
  });

  test("Scenario 8: RESUME document generation (scaffolded)", async () => {
    const req = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "RESUME",
    });

    const res = await POST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.documentType, "RESUME");
    assert.ok(body.reviewUrl.includes("resume-builder"));
  });

  test("Scenario 9: LOR document generation (scaffolded)", async () => {
    const req = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "LOR",
    });

    const res = await POST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.documentType, "LOR");
    assert.ok(body.reviewUrl.includes("lor-generator"));
  });

  test("Scenario 10: GET /api/documents/[documentId] returns saved document", async () => {
    // 1. Create document
    const genReq = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "SOP",
    });
    const genRes = await POST(genReq);
    const genBody = await genRes.json();
    const docId = genBody.documentId;

    // 2. Fetch document
    const getReq = new NextRequest(`http://localhost:3000/api/documents/${docId}`);
    const getRes = await GET_DOC(getReq, { params: Promise.resolve({ documentId: docId }) });
    const getBody = await getRes.json();

    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getBody.success, true);
    assert.strictEqual(getBody.document.id, docId);
    assert.strictEqual(getBody.document.documentType, "SOP");
  });

  test("Scenario 11: GET /api/documents/[documentId]/pdf requires X-API-Key (401 UNAUTHORIZED)", async () => {
    const getReq = new NextRequest("http://localhost:3000/api/documents/DOC-any/pdf", {
      method: "GET",
    });
    const res = await GET_PDF(getReq, { params: Promise.resolve({ documentId: "DOC-any" }) });
    const body = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.code, "UNAUTHORIZED");
  });

  test("Scenario 12: GET /api/documents/[documentId]/pdf returns 409 DOCUMENT_NOT_FINALIZED before PDF upload", async () => {
    // 1. Create document
    const genReq = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "SOP",
    });
    const genRes = await POST(genReq);
    const genBody = await genRes.json();
    const docId = genBody.documentId;

    // 2. Fetch PDF before generate PDF is clicked
    const pdfReq = new NextRequest(`http://localhost:3000/api/documents/${docId}/pdf`, {
      method: "GET",
      headers: { "X-API-Key": TEST_API_KEY },
    });
    const pdfRes = await GET_PDF(pdfReq, { params: Promise.resolve({ documentId: docId }) });
    const pdfBody = await pdfRes.json();

    assert.strictEqual(pdfRes.status, 409);
    assert.strictEqual(pdfBody.success, false);
    assert.strictEqual(pdfBody.code, "DOCUMENT_NOT_FINALIZED");
    assert.ok(pdfBody.message.includes("isn't finalized yet"));
  });

  test("Scenario 13: POST /api/documents/[documentId]/pdf uploads PDF and marks document FINALIZED", async () => {
    // 1. Create document
    const genReq = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "SOP",
    });
    const genRes = await POST(genReq);
    const genBody = await genRes.json();
    const docId = genBody.documentId;

    // 2. Client uploads generated PDF
    const dummyBase64 = Buffer.from("%PDF-1.4 mock pdf content").toString("base64");
    const uploadReq = new NextRequest(`http://localhost:3000/api/documents/${docId}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdfBase64: `data:application/pdf;base64,${dummyBase64}`,
        fileName: "Kaavya_SOP_Final.pdf",
      }),
    });
    const uploadRes = await POST_PDF(uploadReq, { params: Promise.resolve({ documentId: docId }) });
    const uploadBody = await uploadRes.json();

    assert.strictEqual(uploadRes.status, 200);
    assert.strictEqual(uploadBody.success, true);
    assert.strictEqual(uploadBody.status, "FINALIZED");
    assert.strictEqual(uploadBody.fileName, "Kaavya_SOP_Final.pdf");
  });

  test("Scenario 14: GET /api/documents/[documentId]/pdf streams raw PDF binary once finalized", async () => {
    // 1. Create and finalize document
    const genReq = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "SOP",
    });
    const genRes = await POST(genReq);
    const genBody = await genRes.json();
    const docId = genBody.documentId;

    const mockContent = "%PDF-1.4 test binary stream content";
    const dummyBase64 = Buffer.from(mockContent).toString("base64");
    const uploadReq = new NextRequest(`http://localhost:3000/api/documents/${docId}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdfBase64: dummyBase64,
        fileName: "Kaavya_SOP_Final.pdf",
      }),
    });
    await POST_PDF(uploadReq, { params: Promise.resolve({ documentId: docId }) });

    // 2. GET binary PDF with API key
    const getPdfReq = new NextRequest(`http://localhost:3000/api/documents/${docId}/pdf`, {
      method: "GET",
      headers: { "X-API-Key": TEST_API_KEY },
    });
    const getPdfRes = await GET_PDF(getPdfReq, { params: Promise.resolve({ documentId: docId }) });

    assert.strictEqual(getPdfRes.status, 200);
    assert.strictEqual(getPdfRes.headers.get("content-type"), "application/pdf");
    assert.ok(getPdfRes.headers.get("content-disposition")?.includes("Kaavya_SOP_Final.pdf"));
    
    const arrayBuffer = await getPdfRes.arrayBuffer();
    const text = Buffer.from(arrayBuffer).toString();
    assert.strictEqual(text, mockContent);
  });

  test("Scenario 15: GET /api/documents/[documentId]/pdf returns JSON when requested via Accept header", async () => {
    // 1. Create and finalize
    const genReq = makeRequest({
      studentId: KNOWN_CACHED_STUDENT_ID,
      documentType: "SOP",
    });
    const genRes = await POST(genReq);
    const genBody = await genRes.json();
    const docId = genBody.documentId;

    const dummyBase64 = Buffer.from("%PDF-1.4 json response test").toString("base64");
    const uploadReq = new NextRequest(`http://localhost:3000/api/documents/${docId}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdfBase64: dummyBase64,
        fileName: "Kaavya_SOP_Final.pdf",
      }),
    });
    await POST_PDF(uploadReq, { params: Promise.resolve({ documentId: docId }) });

    // 2. GET with Accept: application/json
    const getPdfReq = new NextRequest(`http://localhost:3000/api/documents/${docId}/pdf`, {
      method: "GET",
      headers: {
        "X-API-Key": TEST_API_KEY,
        "Accept": "application/json",
      },
    });
    const getPdfRes = await GET_PDF(getPdfReq, { params: Promise.resolve({ documentId: docId }) });
    const jsonBody = await getPdfRes.json();

    assert.strictEqual(getPdfRes.status, 200);
    assert.strictEqual(jsonBody.success, true);
    assert.strictEqual(jsonBody.status, "FINALIZED");
    assert.strictEqual(jsonBody.pdfBase64, dummyBase64);
  });

  test("Scenario 16: GET /api/documents/[documentId]/pdf returns 404 for unknown document", async () => {
    const getPdfReq = new NextRequest("http://localhost:3000/api/documents/DOC-nonexistent/pdf", {
      method: "GET",
      headers: { "X-API-Key": TEST_API_KEY },
    });
    const getPdfRes = await GET_PDF(getPdfReq, { params: Promise.resolve({ documentId: "DOC-nonexistent" }) });
    const jsonBody = await getPdfRes.json();

    assert.strictEqual(getPdfRes.status, 404);
    assert.strictEqual(jsonBody.code, "DOCUMENT_NOT_FOUND");
  });
});
