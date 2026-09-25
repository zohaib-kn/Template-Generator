import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { StudentDocumentContext, SopDocumentType } from "@/features/sop-generator/types/sop-generator";
import {
  buildNaturalStudentPrompt,
  STUDENT_VOICE_GUIDELINES,
} from "@/services/ai/prompts/studentVoiceGuidelines";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateSectionRequest {
  sectionId: string;
  sectionTitle: string;
  context: StudentDocumentContext;
  currentContent?: string;
  mode?: "generate" | "rewrite-natural";
  documentType?: SopDocumentType;
}

// Fast, verified Gemini Flash models cascading across available endpoints
const FAST_FLASH_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// POST /api/sop/generate
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_KEY_MISSING",
          message: "GEMINI_API_KEY is not configured on the server.",
        },
      },
      { status: 500 }
    );
  }

  let body: GenerateSectionRequest;
  try {
    body = (await req.json()) as GenerateSectionRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON request body.",
        },
      },
      { status: 400 }
    );
  }

  const {
    sectionId,
    sectionTitle,
    context,
    currentContent,
    mode = "generate",
    documentType = "VISA_COVER_LETTER",
  } = body;

  if (!sectionId || !context) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELDS",
          message: "Missing required fields: sectionId and context.",
        },
      },
      { status: 400 }
    );
  }

  // Initialize Gemini SDK
  let ai: GoogleGenAI;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GEMINI_INIT_FAILED",
          message: "Failed to initialize Gemini SDK.",
        },
      },
      { status: 500 }
    );
  }

  // Build centralized natural student voice prompt
  const prompt = buildNaturalStudentPrompt({
    sectionId,
    sectionTitle,
    context,
    currentContent,
    mode,
    documentType,
  });

  // Try fast Flash models in sequence with a 15s timeout safeguard
  let lastError: unknown = null;

  for (const modelName of FAST_FLASH_MODELS) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 15_000)
      );

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const text = response?.text?.trim();

      if (text && text.length > 20) {
        return NextResponse.json(
          {
            success: true,
            sectionId,
            mode,
            model: modelName,
            text,
          },
          { status: 200 }
        );
      }
    } catch (err: unknown) {
      lastError = err;
      const errStr = err instanceof Error ? err.message : String(err);

      // On temporary unavailable (503), timeout, not found (404), or quota limit (429), try next Flash model in cascade
      if (
        errStr.includes("503") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("high demand") ||
        errStr.includes("TIMEOUT") ||
        errStr.includes("404") ||
        errStr.includes("429") ||
        errStr.includes("quota") ||
        errStr.includes("RESOURCE_EXHAUSTED")
      ) {
        await delay(800);
        continue;
      }
      break;
    }
  }

  const errMessage =
    lastError instanceof Error ? lastError.message : String(lastError ?? "");

  let code = "GENERATION_FAILED";
  let message = "Unable to generate narrative with Gemini.";
  let status = 502;

  if (
    errMessage.includes("503") ||
    errMessage.includes("UNAVAILABLE") ||
    errMessage.includes("high demand")
  ) {
    code = "MODEL_OVERLOADED";
    message = "Google AI is currently experiencing high demand. Please try again in a few seconds.";
    status = 503;
  } else if (errMessage.includes("429") || errMessage.includes("quota")) {
    code = "QUOTA_EXCEEDED";
    message = "Gemini API rate limit or quota exceeded. Please try again in a moment.";
    status = 429;
  } else if (errMessage.includes("401") || errMessage.includes("API key not valid")) {
    code = "INVALID_API_KEY";
    message = "Configured Gemini API key is invalid.";
    status = 401;
  } else if (errMessage.includes("TIMEOUT")) {
    code = "TIMEOUT";
    message = "AI generation timed out. Please try again.";
    status = 504;
  }

  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}
