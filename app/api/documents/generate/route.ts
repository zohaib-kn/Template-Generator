/**
 * app/api/documents/generate/route.ts
 *
 * REST API Endpoint for AI Document Generation.
 * Supports:
 * - VISA_COVER_LETTER
 * - SOP
 * - LOR
 *
 * Enforces:
 * - Server-side GEMINI_API_KEY security (never exposed to frontend)
 * - Deterministic fact locking & conflict detection
 * - Quality scoring heuristic
 */

import { NextRequest, NextResponse } from "next/server";
import { generateDocument } from "@/services/ai/gemini/generateDocument";
import { isValidDocumentType, SUPPORTED_DOCUMENT_TYPES } from "@/services/ai/config/documentTypes";

export async function POST(req: NextRequest) {
  // 1. Verify GEMINI_API_KEY is available server-side
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        status: "ERROR",
        document: null,
        error: {
          code: "GEMINI_API_KEY_MISSING",
          message: "GEMINI_API_KEY is not configured on the server. Check your .env.local file.",
        },
      },
      { status: 500 }
    );
  }

  // 2. Parse request body
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        status: "ERROR",
        document: null,
        error: {
          code: "INVALID_JSON",
          message: "Malformed JSON payload in request body.",
        },
      },
      { status: 400 }
    );
  }

  // 3. Validate document type early
  const docType = body.documentType || body.type;
  if (!isValidDocumentType(docType)) {
    return NextResponse.json(
      {
        status: "ERROR",
        document: null,
        error: {
          code: "UNSUPPORTED_DOCUMENT_TYPE",
          message: `Document type "${String(
            docType
          )}" is not supported. Supported types are: ${SUPPORTED_DOCUMENT_TYPES.join(", ")}.`,
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await generateDocument(body);

    if (result.status === "NEEDS_REVIEW") {
      return NextResponse.json(result, { status: 422 });
    }

    if (result.status === "ERROR") {
      const statusCode = result.error.statusCode || 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal generation failure.";
    return NextResponse.json(
      {
        status: "ERROR",
        document: null,
        error: {
          code: "INTERNAL_GENERATION_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
