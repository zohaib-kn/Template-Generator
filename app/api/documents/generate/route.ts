/**
 * app/api/documents/generate/route.ts
 *
 * Unified Document Generation Webhook (Phase 2).
 * Single endpoint called by Senior's CRM to generate SOP, RESUME, or LOR documents.
 *
 * Flow:
 * 1. Authenticate via X-API-Key header.
 * 2. Validate request payload & document type.
 * 3. Idempotency check via externalReferenceId.
 * 4. Retrieve student data (Mode A inline or Mode B CRM API).
 * 5. Normalize into NormalizedStudentProfile.
 * 6. Dispatch to DocumentGenerator from registry.
 * 7. Store document in in-memory document store.
 * 8. Return structured success response with reviewUrl.
 */

import { NextRequest, NextResponse } from "next/server";
import type {
  GenerateDocumentRequest,
  GenerateDocumentSuccessResponse,
  WebhookErrorResponse,
} from "@/services/webhook/types";
import { authenticateWebhookRequest } from "@/services/webhook/authenticate";
import {
  saveDocument,
  findByExternalRef,
  generateDocumentId,
} from "@/services/webhook/documentStore";
import { resolveStudentProfile } from "@/services/webhook/normalizeRequest";
import { StudentNotFoundError } from "@/services/webhook/studentDataProvider";
import {
  getGenerator,
  normalizeDocumentType,
} from "@/services/webhook/generators/registry";

export async function POST(req: NextRequest) {
  // 1. Authentication
  if (!authenticateWebhookRequest(req)) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "UNAUTHORIZED",
        message: "Invalid or missing X-API-Key header.",
      },
      { status: 401 }
    );
  }

  // 2. Parse JSON Payload
  let body: GenerateDocumentRequest;
  try {
    body = (await req.json()) as GenerateDocumentRequest;
  } catch {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "INVALID_REQUEST",
        message: "Malformed JSON payload in request body.",
      },
      { status: 400 }
    );
  }

  // 3. Validate Required Fields
  const rawStudentId = body.studentId;
  const rawDocType = body.documentType;

  if (!rawStudentId || typeof rawStudentId !== "string" || !rawStudentId.trim()) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "INVALID_REQUEST",
        message: "studentId is required and must be a non-empty string.",
      },
      { status: 400 }
    );
  }

  if (!rawDocType || typeof rawDocType !== "string" || !rawDocType.trim()) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "INVALID_REQUEST",
        message: "documentType is required (SOP, RESUME, or LOR).",
      },
      { status: 400 }
    );
  }

  const normalizedType = normalizeDocumentType(rawDocType);
  if (!normalizedType) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "UNSUPPORTED_DOCUMENT_TYPE",
        message: `Document type "${rawDocType}" is not supported. Supported types: SOP, RESUME, LOR.`,
      },
      { status: 400 }
    );
  }

  const studentId = rawStudentId.trim();
  const externalRefId = body.externalReferenceId?.trim();

  // 4. Idempotency Check
  if (externalRefId) {
    const existing = findByExternalRef(externalRefId);
    if (existing) {
      return NextResponse.json<GenerateDocumentSuccessResponse>(
        {
          success: true,
          documentId: existing.id,
          studentId: existing.studentId,
          documentType: existing.documentType,
          status: existing.status,
          reviewUrl: existing.reviewUrl,
          templateId: existing.templateId,
          createdAt: existing.createdAt,
          externalReferenceId: existing.externalReferenceId,
        },
        { status: 200 }
      );
    }
  }

  // 5. Retrieve & Normalize Student
  let normalizedProfile;
  try {
    normalizedProfile = await resolveStudentProfile({
      ...body,
      studentId,
    });
  } catch (err: unknown) {
    if (err instanceof StudentNotFoundError) {
      return NextResponse.json<WebhookErrorResponse>(
        {
          success: false,
          code: "STUDENT_NOT_FOUND",
          message: err.message,
        },
        { status: 404 }
      );
    }
    console.error("[Webhook Error] Student normalization failed:", err);
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "INTERNAL_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Failed to resolve student profile.",
      },
      { status: 500 }
    );
  }

  // 6. Generate Document
  const generator = getGenerator(normalizedType);
  if (!generator) {
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "UNSUPPORTED_DOCUMENT_TYPE",
        message: `No generator registered for type: ${normalizedType}`,
      },
      { status: 400 }
    );
  }

  let generatedResult;
  try {
    generatedResult = await generator.generate(normalizedProfile, {
      templateId: body.templateId?.trim(),
      metadata: body.metadata,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unknown template ID")) {
      return NextResponse.json<WebhookErrorResponse>(
        {
          success: false,
          code: "TEMPLATE_NOT_FOUND",
          message: msg,
        },
        { status: 404 }
      );
    }
    console.error("[Webhook Error] Generation failed:", err);
    return NextResponse.json<WebhookErrorResponse>(
      {
        success: false,
        code: "GENERATION_FAILED",
        message: msg,
      },
      { status: 500 }
    );
  }

  // 7. Persist Document in Store
  const documentId = generateDocumentId();
  const now = new Date().toISOString();
  const studentName = normalizedProfile.personal.fullName || "Student";

  let reviewUrl = `/sop-generator/${documentId}`;
  if (normalizedType === "RESUME") {
    reviewUrl = `/resume-builder?documentId=${documentId}`;
  } else if (normalizedType === "LOR") {
    reviewUrl = `/lor-generator?documentId=${documentId}`;
  }

  const record = saveDocument({
    id: documentId,
    externalReferenceId: externalRefId || undefined,
    studentId,
    studentName,
    documentType: normalizedType,
    templateId: generatedResult.templateId,
    status: generatedResult.status,
    reviewUrl,
    createdAt: now,
    updatedAt: now,
    sectionContents: generatedResult.sectionContents,
    sectionStatuses: generatedResult.sectionStatuses,
    validationIssues: generatedResult.validationIssues,
    normalizedProfile,
    sopContext: generatedResult.sopContext,
    metadata: body.metadata,
  });

  // 8. Success Response
  return NextResponse.json<GenerateDocumentSuccessResponse>(
    {
      success: true,
      documentId: record.id,
      studentId: record.studentId,
      documentType: record.documentType,
      status: record.status,
      reviewUrl: record.reviewUrl,
      templateId: record.templateId,
      createdAt: record.createdAt,
      warnings: generatedResult.warnings,
      externalReferenceId: record.externalReferenceId,
    },
    { status: 200 }
  );
}
