/**
 * app/api/documents/[documentId]/pdf/route.ts
 *
 * REST API to retrieve and persist finalized PDFs for generated documents.
 *
 * GET:
 * - Requires X-API-Key header authentication.
 * - Returns 404 if document is not found.
 * - Returns 409 DOCUMENT_NOT_FINALIZED if document hasn't been finalized yet.
 * - Returns the raw application/pdf binary stream (or JSON if Accept: application/json).
 *
 * POST:
 * - Called by the client-side editor when "Generate PDF" / "Download PDF" is clicked.
 * - Receives { pdfBase64, fileName } and marks the document as FINALIZED.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateWebhookRequest } from "@/services/webhook/authenticate";
import {
  findById,
  getPdf,
  savePdf,
  saveDocument,
  generateDocumentId,
} from "@/services/webhook/documentStore";
import type { WebhookErrorResponse } from "@/services/webhook/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Accept, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  // 1. Authenticate server-to-server request
  if (!authenticateWebhookRequest(req)) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "UNAUTHORIZED",
        message: "Invalid or missing X-API-Key header.",
      },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const { documentId } = await context.params;
  const trimmedId = documentId?.trim();

  if (!trimmedId) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "INVALID_REQUEST",
        message: "documentId is required.",
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 2. Lookup document
  const doc = findById(trimmedId);
  if (!doc) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "DOCUMENT_NOT_FOUND",
        message: `Document with ID "${trimmedId}" was not found.`,
      },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // 3. Verify finalization status & PDF availability
  if (doc.status !== "FINALIZED" || !doc.pdfBase64) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "DOCUMENT_NOT_FINALIZED",
        message:
          "Document isn't finalized yet. The counsellor has not generated the final PDF.",
        details: {
          documentId: trimmedId,
          status: doc.status,
          reviewUrl: doc.reviewUrl,
        },
      },
      { status: 409, headers: CORS_HEADERS }
    );
  }

  const pdfData = getPdf(trimmedId);
  if (!pdfData) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "DOCUMENT_NOT_FINALIZED",
        message: "Finalized PDF binary could not be loaded from storage.",
      },
      { status: 409, headers: CORS_HEADERS }
    );
  }

  // 4. Check if client explicitly asked for JSON
  const acceptHeader = req.headers.get("accept") || "";
  if (acceptHeader.includes("application/json")) {
    return NextResponse.json(
      {
        success: true,
        documentId: trimmedId,
        status: "FINALIZED",
        fileName: pdfData.fileName,
        pdfBase64: doc.pdfBase64,
        generatedAt: doc.pdfGeneratedAt,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  // 5. Stream raw PDF binary
  return new NextResponse(new Uint8Array(pdfData.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        pdfData.fileName
      )}"`,
      "Content-Length": pdfData.buffer.length.toString(),
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      ...CORS_HEADERS,
    },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await context.params;
  const trimmedId = documentId?.trim();

  if (!trimmedId) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "INVALID_REQUEST",
        message: "documentId is required.",
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  let body: { pdfBase64?: string; fileName?: string; status?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "INVALID_REQUEST",
        message: "Malformed JSON payload.",
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body.pdfBase64 || typeof body.pdfBase64 !== "string") {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "INVALID_REQUEST",
        message: "pdfBase64 string is required.",
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // If document does not exist yet (e.g. cold start across serverless containers), create a placeholder record
  let doc = findById(trimmedId);
  if (!doc) {
    const now = new Date().toISOString();
    doc = saveDocument({
      id: trimmedId,
      studentId: "unknown",
      studentName: body.fileName ? body.fileName.replace(/\.pdf$/i, "") : "Student",
      documentType: "SOP",
      templateId: "default",
      status: "FINALIZED",
      reviewUrl: `/sop-generator/${trimmedId}`,
      createdAt: now,
      updatedAt: now,
      sectionContents: {},
      sectionStatuses: {},
      validationIssues: [],
      normalizedProfile: {
        meta: { studentId: "unknown", source: "static-mock", fetchedAt: now },
        personal: { fullName: "Student", firstName: "Student", lastName: "Student" },
        academics: { qualifications: [] },
        workExperience: [],
        tests: {},
        applications: { all: [] },
      },
    });
  }

  const updated = savePdf(trimmedId, body.pdfBase64, body.fileName);

  return NextResponse.json(
    {
      success: true,
      documentId: trimmedId,
      status: "FINALIZED",
      fileName: updated?.pdfFileName,
      generatedAt: updated?.pdfGeneratedAt,
      message: "PDF persisted and document finalized successfully.",
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
