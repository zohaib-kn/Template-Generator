import { NextResponse } from "next/server";
import type { DocumentData } from "@/types";
import { testStudentData } from "@/features/document-generator/utils/testStudentData";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MockWebhookResponse {
  success: true;
  source: "mock-student-webhook";
  student: DocumentData;
}

// ---------------------------------------------------------------------------
// Handler (shared by GET and POST)
// ---------------------------------------------------------------------------

/**
 * Returns static Aarav Mehta student data as JSON.
 *
 * PURPOSE: Integration testing only.
 * Proves that the Resume Builder can receive student data from a URL
 * and load it into the existing state / PDF template.
 *
 * When a real external student-data API is available later:
 *   - Replace this mock with a fetch() to the real URL.
 *   - The frontend "Load Student From Webhook" button needs zero changes.
 *
 * IMPORTANT:
 * - Static data only. No database. No authentication. No AI.
 * - testStudentData is the single source of truth — not duplicated here.
 */
function buildResponse(): NextResponse<MockWebhookResponse> {
  const payload: MockWebhookResponse = {
    success: true,
    source: "mock-student-webhook",
    student: testStudentData,
  };

  return NextResponse.json(payload);
}

// ---------------------------------------------------------------------------
// GET /api/mock-student-webhook
// ---------------------------------------------------------------------------

/**
 * Can be tested directly in the browser:
 *   http://localhost:3000/api/mock-student-webhook
 *
 * Or via curl:
 *   curl http://localhost:3000/api/mock-student-webhook
 */
export function GET() {
  return buildResponse();
}

// ---------------------------------------------------------------------------
// POST /api/mock-student-webhook
// ---------------------------------------------------------------------------

/**
 * Accepts any POST body (ignored) and returns the same static student.
 * Included so webhook-style POST callers also work.
 */
export function POST() {
  return buildResponse();
}
