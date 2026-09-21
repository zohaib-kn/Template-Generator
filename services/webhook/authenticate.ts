/**
 * services/webhook/authenticate.ts
 *
 * Authenticates incoming webhook requests using server-to-server X-API-Key header.
 *
 * Security:
 * - Reads DOCUMENT_WEBHOOK_API_KEY from server environment.
 * - Key is NEVER prefixed with NEXT_PUBLIC_ or sent to client.
 * - Rejects any request with missing, empty, or mismatched keys.
 */

import type { NextRequest } from "next/server";

export function authenticateWebhookRequest(req: Request | NextRequest): boolean {
  const configuredKey = process.env.DOCUMENT_WEBHOOK_API_KEY?.trim();
  if (!configuredKey) {
    console.error("[Webhook Auth] DOCUMENT_WEBHOOK_API_KEY is not configured on server.");
    return false;
  }

  const headerKey = req.headers.get("x-api-key")?.trim() || req.headers.get("X-API-Key")?.trim();
  if (!headerKey) {
    return false;
  }

  return headerKey === configuredKey;
}
