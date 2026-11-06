/**
 * app/api/documents/[documentId]/route.ts
 *
 * REST API to retrieve generated document details by documentId.
 */

import { NextRequest, NextResponse } from "next/server";
import { findById } from "@/services/webhook/documentStore";
import { canAccessStudent, getSession } from "@/lib/auth/session";
import { authenticateWebhookRequest } from "@/services/webhook/authenticate";

export async function GET(
  req: NextRequest,
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

  // Server-to-server callers (X-API-Key) may read any document; operators only those of
  // students they can access. Inaccessible documents look the same as missing ones.
  const isWebhookCaller = authenticateWebhookRequest(req);
  const session = isWebhookCaller ? null : await getSession(req);
  if (!isWebhookCaller && !session) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in through the CRM to use this service." } },
      { status: 401 }
    );
  }

  const found = await findById(trimmedId);
  const document = found && (isWebhookCaller || (session && canAccessStudent(session, found.studentId))) ? found : null;
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
