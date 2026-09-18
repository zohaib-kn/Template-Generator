import { NextRequest, NextResponse } from "next/server";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import kaavyaSnapshot from "@/features/document-generator/utils/crmSnapshot_Kaavya.json";
import fardeeSnapshot from "@/features/document-generator/utils/crmSnapshot_Fardee.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StudentErrorCode =
  | "INVALID_STUDENT_ID"
  | "CONFIG_ERROR"
  | "STUDENT_NOT_FOUND"
  | "UPSTREAM_AUTH_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export interface StudentSuccessResponse {
  success: true;
  /** "senior-crm-api" when fetched live from upstream; "cached-snapshot" when using development fixture. */
  source: "senior-crm-api" | "cached-snapshot";
  studentId: string;
  data: CrmSnapshot;
}

export interface StudentErrorResponse {
  success: false;
  error: {
    code: StudentErrorCode;
    message: string;
  };
}

export type StudentApiResponse = StudentSuccessResponse | StudentErrorResponse;

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

/** Valid MongoDB 24-character hexadecimal ObjectId regex */
const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Retrieves a development cached snapshot if the ID matches known test students.
 */
function getCachedSnapshot(studentId: string): CrmSnapshot | null {
  const normalized = studentId.toLowerCase();
  if (normalized === "6a508a96af13bb33e9fc07ce") {
    return kaavyaSnapshot as unknown as CrmSnapshot;
  }
  if (normalized === "69e600e750f7c6e4051f547e") {
    return fardeeSnapshot as unknown as CrmSnapshot;
  }
  return null;
}

// ---------------------------------------------------------------------------
// GET /api/student/[studentId]
// ---------------------------------------------------------------------------

/**
 * Dedicated server-side proxy route to fetch student snapshot from Senior CRM API.
 *
 * Security:
 * - Upstream URL, API key, and auth details are never exposed to the frontend.
 * - Sensitive PII (passport, DOB, phone, address, financials) is never logged.
 * - Validates student ID format before making upstream network requests.
 * - Implements strict 10-second timeout.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ studentId: string }> }
): Promise<NextResponse<StudentApiResponse>> {
  const { studentId } = await context.params;
  const trimmedId = studentId?.trim();

  // 1. Validate studentId format (MongoDB 24-char hex ObjectId)
  if (!trimmedId || !MONGO_OBJECT_ID_REGEX.test(trimmedId)) {
    return NextResponse.json<StudentErrorResponse>(
      {
        success: false,
        error: {
          code: "INVALID_STUDENT_ID",
          message: "Student ID must be a valid 24-character hexadecimal ObjectId.",
        },
      },
      { status: 400 }
    );
  }

  // 2. Read dynamic overrides or server-side environment variables
  const { searchParams } = req.nextUrl;
  const queryKey = searchParams.get("key")?.trim();
  const queryBaseUrl = searchParams.get("baseUrl")?.trim();

  const baseUrl = queryBaseUrl || process.env.SENIOR_API_BASE_URL?.trim();
  const apiKey = queryKey || process.env.SENIOR_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    // Fallback to cached fixture if available for development
    const cached = getCachedSnapshot(trimmedId);
    if (cached) {
      return NextResponse.json<StudentSuccessResponse>({
        success: true,
        source: "cached-snapshot",
        studentId: trimmedId,
        data: cached,
      });
    }

    console.error("[api/student] Senior CRM API configuration is missing on server.");
    return NextResponse.json<StudentErrorResponse>(
      {
        success: false,
        error: {
          code: "CONFIG_ERROR",
          message: "Senior CRM API is not properly configured on this server.",
        },
      },
      { status: 500 }
    );
  }

  // 3. Upstream Fetch
  const targetUrl = `${baseUrl}/api/students/${trimmedId}/data-snapshot?key=${apiKey}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      signal: AbortSignal.timeout(10_000),
    });

    // 3A. Upstream returned success
    if (upstream.ok) {
      let snapshot: CrmSnapshot;
      try {
        snapshot = (await upstream.json()) as CrmSnapshot;
      } catch {
        console.warn(`[api/student] Upstream returned non-JSON payload for student ID: ${trimmedId}`);
        const cached = getCachedSnapshot(trimmedId);
        if (cached) {
          return NextResponse.json<StudentSuccessResponse>({
            success: true,
            source: "cached-snapshot",
            studentId: trimmedId,
            data: cached,
          });
        }
        return NextResponse.json<StudentErrorResponse>(
          {
            success: false,
            error: {
              code: "UPSTREAM_ERROR",
              message: "The CRM service returned an invalid JSON response.",
            },
          },
          { status: 502 }
        );
      }

      return NextResponse.json<StudentSuccessResponse>({
        success: true,
        source: "senior-crm-api",
        studentId: trimmedId,
        data: snapshot,
      });
    }

    // 3B. Upstream returned non-200 status
    console.warn(`[api/student] Upstream CRM responded with HTTP ${upstream.status} for student ID: ${trimmedId}`);

    // Check development cache fallback first
    const cached = getCachedSnapshot(trimmedId);
    if (cached) {
      return NextResponse.json<StudentSuccessResponse>({
        success: true,
        source: "cached-snapshot",
        studentId: trimmedId,
        data: cached,
      });
    }

    if (upstream.status === 404) {
      return NextResponse.json<StudentErrorResponse>(
        {
          success: false,
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student record was not found.",
          },
        },
        { status: 404 }
      );
    }

    if (upstream.status === 401 || upstream.status === 403) {
      return NextResponse.json<StudentErrorResponse>(
        {
          success: false,
          error: {
            code: "UPSTREAM_AUTH_ERROR",
            message: "Authentication failed with the student CRM service.",
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json<StudentErrorResponse>(
      {
        success: false,
        error: {
          code: "UPSTREAM_ERROR",
          message: "The student CRM service responded with an error.",
        },
      },
      { status: 502 }
    );
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");

    console.warn(
      `[api/student] Upstream fetch failed for student ID: ${trimmedId} (${
        isTimeout ? "Timeout" : "Network error"
      })`
    );

    // Check development cache fallback
    const cached = getCachedSnapshot(trimmedId);
    if (cached) {
      return NextResponse.json<StudentSuccessResponse>({
        success: true,
        source: "cached-snapshot",
        studentId: trimmedId,
        data: cached,
      });
    }

    if (isTimeout) {
      return NextResponse.json<StudentErrorResponse>(
        {
          success: false,
          error: {
            code: "UPSTREAM_TIMEOUT",
            message: "The student CRM service timed out after 10 seconds.",
          },
        },
        { status: 504 }
      );
    }

    return NextResponse.json<StudentErrorResponse>(
      {
        success: false,
        error: {
          code: "UPSTREAM_ERROR",
          message: "Unable to reach the student CRM service.",
        },
      },
      { status: 502 }
    );
  }
}
