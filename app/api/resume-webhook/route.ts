import { NextRequest, NextResponse } from "next/server";
import type { DocumentData } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookRequestBody {
  student: DocumentData;
}

interface WebhookPayload {
  event: "resume.test";
  source: "resume-builder";
  timestamp: string;
  student: DocumentData;
}

// ---------------------------------------------------------------------------
// POST /api/resume-webhook
// ---------------------------------------------------------------------------

/**
 * Backend proxy route for Phase 1 webhook integration.
 *
 * Flow:
 *   Frontend → POST /api/resume-webhook  { student: DocumentData }
 *   Backend  → reads RESUME_WEBHOOK_URL from environment
 *   Backend  → constructs structured payload
 *   Backend  → POST to webhook URL
 *   Backend  → returns normalised success/error response
 *
 * IMPORTANT:
 * - The webhook URL is NEVER exposed to the frontend.
 * - This route does NOT modify DocumentData or the Resume Builder state.
 * - No database. No authentication. No AI.
 */
export async function POST(req: NextRequest) {
  // 1. Check webhook URL is configured
  const webhookUrl = process.env.RESUME_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message:
          "RESUME_WEBHOOK_URL is not configured. Add it to your .env.local file and restart the dev server.",
      },
      { status: 500 }
    );
  }

  // 2. Validate the URL is parseable before attempting to fetch
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message:
          "RESUME_WEBHOOK_URL is not a valid URL. It must start with https:// or http://",
      },
      { status: 500 }
    );
  }
  void parsedUrl; // used only for validation

  // 3. Parse request body
  let body: WebhookRequestBody;
  try {
    body = (await req.json()) as WebhookRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, status: 400, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // 4. Validate student data is present and non-empty
  if (!body.student || typeof body.student !== "object") {
    return NextResponse.json(
      {
        success: false,
        status: 400,
        message: "Request body must include a non-empty `student` object.",
      },
      { status: 400 }
    );
  }

  // 5. Build structured webhook payload
  const payload: WebhookPayload = {
    event: "resume.test",
    source: "resume-builder",
    timestamp: new Date().toISOString(),
    student: body.student,
  };

  // 6. Forward to webhook
  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // 10-second timeout — practical for webhook.site
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          status: upstream.status,
          message: `Webhook endpoint responded with HTTP ${upstream.status}.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      status: upstream.status,
      message: "Webhook sent successfully.",
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && err.name === "TimeoutError";
    const message = isTimeout
      ? "Webhook request timed out after 10 seconds."
      : err instanceof Error
      ? err.message
      : "Unknown network error while calling the webhook.";

    return NextResponse.json(
      { success: false, status: 502, message },
      { status: 502 }
    );
  }
}
