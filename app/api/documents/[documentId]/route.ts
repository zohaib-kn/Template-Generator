/**
 * app/api/documents/[documentId]/route.ts
 *
 * REST API to retrieve generated document details by documentId.
 */

import { NextRequest, NextResponse } from "next/server";
import { findById } from "@/services/webhook/documentStore";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await context.params;
  const trimmedId = documentId?.trim();

  if (!trimmedId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_DOCUMENT_ID",
          message: "documentId is required.",
        },
      },
      { status: 400 }
    );
  }

  const document = await findById(trimmedId);
  if (!document) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: `Document with ID "${trimmedId}" was not found.`,
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      document,
    },
    { status: 200 }
  );
}
