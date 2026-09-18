import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiTestSuccessResponse {
  success: true;
  model: string;
  text: string;
}

interface AiTestErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

// ---------------------------------------------------------------------------
// Fictional Student Context (Phase AI-1 Dummy Data Only)
// ---------------------------------------------------------------------------

const DUMMY_SOP_PROMPT = `You are an academic writing assistant for university admissions.

Student Profile:
- Student Name: Aarav Mehta
- Previous Education: Bachelor of Business Administration
- Target Course: MSc Business Analytics
- Target Country: United Kingdom
- Skills: Microsoft Excel, Power BI, Business Research

Task:
Generate a short, professional "Why This Course" paragraph suitable for a university Statement of Purpose (SOP).

Strict Rules:
- Use only the supplied facts above.
- Do not invent university names.
- Do not invent grades or GPA.
- Do not invent internships or past employers.
- Do not invent achievements or awards.
- Do not invent financial information.
- Keep the paragraph length around 100–150 words.
- Tone should be professional, academic, and purposeful.
- Return ONLY the final paragraph. Do not include introductory notes, headers, or conversational filler.`;

// Preferred Flash model (gemini-3.8-flash) cascading to nearest responsive Flash models
const FLASH_MODELS_CASCADE = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

// ---------------------------------------------------------------------------
// POST /api/ai/test
// ---------------------------------------------------------------------------

/**
 * Dedicated backend test route for Phase AI-1.
 * Tests server-side Google Gemini API connectivity using dummy data only.
 *
 * Security:
 * - API key is read solely from process.env.GEMINI_API_KEY.
 * - API key is NEVER passed to frontend or included in responses/logs.
 * - Does not accept or process real student or CRM data.
 */
export async function POST(req: NextRequest) {
  // 1. Verify GEMINI_API_KEY is configured on the server
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    const errorBody: AiTestErrorResponse = {
      success: false,
      error: {
        code: "GEMINI_API_KEY_MISSING",
        message:
          "GEMINI_API_KEY is not configured on the server. Please check your .env.local file.",
      },
    };
    return NextResponse.json(errorBody, { status: 500 });
  }

  // 2. Validate request body (must be test request; no arbitrary student payloads permitted)
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object" && "student" in body) {
      const errorBody: AiTestErrorResponse = {
        success: false,
        error: {
          code: "CRM_DATA_NOT_PERMITTED",
          message:
            "Arbitrary or CRM student payloads are strictly forbidden in Phase AI-1 test route.",
        },
      };
      return NextResponse.json(errorBody, { status: 400 });
    }
  } catch {
    // Body parsing failure is non-fatal for { test: true } calls
  }

  // 3. Initialize GoogleGenAI SDK server-side
  let ai: GoogleGenAI;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch {
    const errorBody: AiTestErrorResponse = {
      success: false,
      error: {
        code: "GEMINI_INIT_FAILED",
        message: "Failed to initialize Gemini SDK on the server.",
      },
    };
    return NextResponse.json(errorBody, { status: 500 });
  }

  // 4. Attempt generation with preferred model, falling back to nearest Flash if unavailable
  let lastError: unknown = null;

  for (const modelName of FLASH_MODELS_CASCADE) {
    try {
      // 6-second timeout safeguard per model attempt
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 6_000)
      );

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: DUMMY_SOP_PROMPT,
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const text = response?.text?.trim();

      if (!text) {
        const errorBody: AiTestErrorResponse = {
          success: false,
          error: {
            code: "GEMINI_EMPTY_RESPONSE",
            message: "Gemini returned an empty response.",
          },
        };
        return NextResponse.json(errorBody, { status: 502 });
      }

      // Success
      const successBody: AiTestSuccessResponse = {
        success: true,
        model: modelName,
        text,
      };
      return NextResponse.json(successBody, { status: 200 });
    } catch (err: unknown) {
      lastError = err;

      const errStr = err instanceof Error ? err.message : String(err);
      const isTemporaryOrNotFound =
        errStr.includes("503") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("404") ||
        errStr.includes("not found") ||
        errStr.includes("TIMEOUT");

      // If it's a model not found / temporary high-demand error, cascade to nearest Flash model
      if (
        isTemporaryOrNotFound &&
        modelName !== FLASH_MODELS_CASCADE[FLASH_MODELS_CASCADE.length - 1]
      ) {
        continue;
      }

      // Break immediately on authorization or client errors
      break;
    }
  }

  // 5. Controlled error mapping without exposing sensitive secrets or stack traces
  const errMessage =
    lastError instanceof Error ? lastError.message : String(lastError ?? "");

  let code = "GEMINI_REQUEST_FAILED";
  let message = "Unable to generate AI response.";
  let statusCode = 502;

  if (errMessage.includes("TIMEOUT")) {
    code = "GEMINI_TIMEOUT";
    message = "Gemini API request timed out after 15 seconds.";
    statusCode = 504;
  } else if (
    errMessage.includes("API_KEY_INVALID") ||
    errMessage.includes("401") ||
    errMessage.includes("API key not valid")
  ) {
    code = "GEMINI_API_KEY_INVALID";
    message = "The configured Gemini API key is invalid or unauthorized.";
    statusCode = 401;
  } else if (
    errMessage.includes("RESOURCE_EXHAUSTED") ||
    errMessage.includes("429") ||
    errMessage.includes("quota")
  ) {
    code = "GEMINI_QUOTA_EXCEEDED";
    message = "Gemini API quota or rate limit exceeded. Please try again later.";
    statusCode = 429;
  } else if (errMessage.includes("503") || errMessage.includes("UNAVAILABLE")) {
    code = "GEMINI_UNAVAILABLE";
    message = "Gemini API service is temporarily unavailable.";
    statusCode = 503;
  }

  const errorBody: AiTestErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(errorBody, { status: statusCode });
}
