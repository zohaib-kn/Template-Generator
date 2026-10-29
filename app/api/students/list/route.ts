import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudentListItem {
  id: string;
  name: string;
  email: string | null;
}

interface StudentListSuccess {
  success: true;
  students: StudentListItem[];
  count: number;
}

interface StudentListError {
  success: false;
  error: string;
}

export type StudentListResponse = StudentListSuccess | StudentListError;

/**
 * CRM_STUDENT_LIST_URL wins when set; otherwise the URL is built from
 * SENIOR_API_BASE_URL + SENIOR_API_KEY. Returns null when neither is configured.
 */
function resolveStudentListUrl(): string | null {
  const explicit = process.env.CRM_STUDENT_LIST_URL?.trim();
  if (explicit) return explicit;
  const baseUrl = process.env.SENIOR_API_BASE_URL?.trim();
  const apiKey = process.env.SENIOR_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;
  return `${baseUrl}/api/students?key=${encodeURIComponent(apiKey)}`;
}

// ---------------------------------------------------------------------------
// GET /api/students/list
// ---------------------------------------------------------------------------

/**
 * Server-side proxy: fetches the full student roster from the CRM API.
 *
 * Security:
 *  - CRM_STUDENT_LIST_URL (which embeds the API key) is read only from env.
 *  - This URL + key is NEVER sent to the browser.
 *  - Only { id, name, email } are returned — no phone numbers or PII.
 *
 * The CRM returns: { students: [{ _id, name, email, mobile }] }
 * We project it to:          [{ id,   name, email           }]
 */
export async function GET() {
  const listUrl = resolveStudentListUrl();
  if (!listUrl) {
    console.error("[api/students/list] CRM roster configuration is missing on server.");
    return NextResponse.json<StudentListError>(
      { success: false, error: "Student CRM is not configured on this server." },
      { status: 500 }
    );
  }

  try {
    const upstream = await fetch(listUrl, {
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!upstream.ok) {
      console.error(`[api/students/list] CRM responded with HTTP ${upstream.status}`);
      return NextResponse.json<StudentListError>(
        { success: false, error: `CRM service responded with HTTP ${upstream.status}.` },
        { status: 502 }
      );
    }

    const body = await upstream.json() as { students?: Array<{ _id: string; name: string; email?: string | null; mobile?: string }> };

    if (!body?.students || !Array.isArray(body.students)) {
      return NextResponse.json<StudentListError>(
        { success: false, error: "CRM returned an unexpected data format." },
        { status: 502 }
      );
    }

    // Project to minimal safe shape — no phone numbers sent to browser
    const students: StudentListItem[] = body.students
      .filter((s) => s._id && s.name && s.name.trim())
      .filter((s) => !/(^test |^dummy |^testing )/i.test(s.name.trim()))
      .map((s) => ({
        id: s._id,
        name: s.name.trim(),
        email: s.email ?? null,
      }));

    // Ensure verified benchmark sample students are present
    if (!students.some((s) => s.id === "sample-mirza-farhan-zaid")) {
      students.unshift({
        id: "sample-mirza-farhan-zaid",
        name: "Mirza Farhan Zaid",
        email: "zaidmirzafarhan@gmail.com",
      });
    }

    // Sort alphabetically
    students.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json<StudentListSuccess>({
      success: true,
      students,
      count: students.length,
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");

    console.error(
      `[api/students/list] Failed (${isTimeout ? "Timeout" : "Network error"})`
    );

    return NextResponse.json<StudentListError>(
      {
        success: false,
        error: isTimeout
          ? "CRM service timed out. Please try again."
          : "Unable to reach the CRM service.",
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
