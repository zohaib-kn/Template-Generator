import { NextRequest, NextResponse } from "next/server";
import type { DocumentData } from "@/types";
import type { ApplicationTarget } from "@/features/document-generator/guidance/types";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { mapCrmSnapshot } from "@/features/document-generator/utils/mapCrmSnapshot";
import { testStudentData } from "@/features/document-generator/utils/testStudentData";
import kaavyaSnapshot from "@/features/document-generator/utils/crmSnapshot_Kaavya.json";
import fardeeSnapshot from "@/features/document-generator/utils/crmSnapshot_Fardee.json";

// ---------------------------------------------------------------------------
// Response type
// ---------------------------------------------------------------------------

interface StudentWebhookResponse {
  success: true;
  /** "crm-api" when fetched from senior's live API or cached CRM snapshot, "mock" when using static fixture. */
  source: "crm-api" | "mock";
  student: DocumentData;
  /** Auto-detected target for the Suggestions Panel. Null when using mock data. */
  target: Partial<ApplicationTarget> | null;
  /** Full unmodified CRM snapshot — used by RawDataPanel to display all fields. */
  rawSnapshot: CrmSnapshot | null;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

function extractStudentId(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  // Check if it's a URL with /api/students/:id
  const match = trimmed.match(/\/api\/students\/([a-zA-Z0-9_-]+)/i);
  if (match) return match[1];
  // If it doesn't look like a URL, treat it directly as an ID
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }
  return undefined;
}

async function buildResponse(customInput?: string): Promise<NextResponse<StudentWebhookResponse>> {
  const baseUrl = process.env.SENIOR_API_BASE_URL?.trim();
  const apiKey = process.env.SENIOR_API_KEY?.trim();
  const defaultStudentId = process.env.SENIOR_STUDENT_ID?.trim();

  const trimmedInput = customInput?.trim();
  let targetUrl: string | null = null;
  let effectiveStudentId: string | undefined = extractStudentId(trimmedInput) || defaultStudentId;

  if (trimmedInput && (trimmedInput.startsWith("http://") || trimmedInput.startsWith("https://"))) {
    // Direct full URL provided
    targetUrl = trimmedInput;
  } else if (baseUrl && apiKey && effectiveStudentId) {
    // Student ID provided (or default from env)
    targetUrl = `${baseUrl}/api/students/${effectiveStudentId}/data-snapshot?key=${apiKey}`;
  }

  // ── Live CRM API fetch attempt ─────────────────────────────────────────────
  if (targetUrl) {
    try {
      const upstream = await fetch(targetUrl, {
        headers: {
          // Bypass ngrok's browser-warning interstitial page
          "ngrok-skip-browser-warning": "true",
          "Accept": "application/json",
        },
        // 10-second timeout — prevents the route hanging if ngrok is down
        signal: AbortSignal.timeout(10_000),
      });

      if (!upstream.ok) {
        console.warn(
          `[mock-student-webhook] CRM API responded with HTTP ${upstream.status} — checking cached snapshots for ${effectiveStudentId}.`
        );
        return cachedOrFallbackResponse(effectiveStudentId);
      }

      const snapshot = (await upstream.json()) as CrmSnapshot;
      const { student, target } = mapCrmSnapshot(snapshot);

      return NextResponse.json({
        success: true,
        source: "crm-api",
        student,
        target,
        rawSnapshot: snapshot,
      });
    } catch (err) {
      console.warn("[mock-student-webhook] Failed to reach CRM API:", err);
      return cachedOrFallbackResponse(effectiveStudentId);
    }
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return cachedOrFallbackResponse(effectiveStudentId);
}

function cachedOrFallbackResponse(studentId?: string): NextResponse<StudentWebhookResponse> {
  if (studentId === "6a508a96af13bb33e9fc07ce") {
    const snapshot = kaavyaSnapshot as unknown as CrmSnapshot;
    const { student, target } = mapCrmSnapshot(snapshot);
    return NextResponse.json({
      success: true,
      source: "crm-api",
      student,
      target,
      rawSnapshot: snapshot,
    });
  }

  if (studentId === "69e600e750f7c6e4051f547e") {
    const snapshot = fardeeSnapshot as unknown as CrmSnapshot;
    const { student, target } = mapCrmSnapshot(snapshot);
    return NextResponse.json({
      success: true,
      source: "crm-api",
      student,
      target,
      rawSnapshot: snapshot,
    });
  }

  return NextResponse.json({
    success: true,
    source: "mock",
    student: testStudentData,
    target: null,
    rawSnapshot: null,
  });
}

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const input =
    searchParams.get("input") ||
    searchParams.get("url") ||
    searchParams.get("studentId") ||
    undefined;
  return buildResponse(input);
}

export async function POST(req: NextRequest) {
  let input: string | undefined;
  try {
    const body = await req.json();
    input = body?.input || body?.url || body?.studentId || undefined;
  } catch {
    // Ignore JSON parse error and fallback to default
  }
  return buildResponse(input);
}
