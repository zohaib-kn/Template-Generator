import { NextRequest, NextResponse } from "next/server";
import { aiService, getActiveAiProvider } from "@/services/ai/gemini/geminiClient";

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

// ---------------------------------------------------------------------------
// POST /api/ai/test
// ---------------------------------------------------------------------------

/**
 * Dedicated backend test route for Phase AI-1.
 * Tests server-side AI provider connectivity (OpenAI or Gemini) using dummy data only.
 *
 * Security:
 * - API key is read solely from the server environment (OPENAI_API_KEY / GEMINI_API_KEY).
 * - API key is NEVER passed to frontend or included in responses/logs.
 * - Does not accept or process real student or CRM data.
 */
export async function POST(req: NextRequest) {
  // 1. Verify an AI key (OpenAI or Gemini) is configured on the server
  if (!getActiveAiProvider()) {
    const errorBody: AiTestErrorResponse = {
      success: false,
      error: {
        code: "AI_API_KEY_MISSING",
        message: "No AI key is configured on the server. Set OPENAI_API_KEY (or GEMINI_API_KEY) in your .env file.",
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

  // 3. Generate through the shared provider-aware client (model cascade + timeouts inside)
  const result = await aiService.generate({ prompt: DUMMY_SOP_PROMPT, timeoutMs: 15_000, minOutputLength: 1 });
  if (result.success) {
    const successBody: AiTestSuccessResponse = { success: true, model: result.model, text: result.text };
    return NextResponse.json(successBody, { status: 200 });
  }

  const errorBody: AiTestErrorResponse = {
    success: false,
    error: { code: result.error.code, message: result.error.message },
  };
  return NextResponse.json(errorBody, { status: result.error.statusCode });
}
