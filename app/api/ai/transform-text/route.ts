/**
 * app/api/ai/transform-text/route.ts
 *
 * Server-side route handler for Hinglish to Natural English transformation
 * and draft text elevation.
 *
 * Lightweight, privacy-respecting endpoint:
 * - Accepts only text to transform (no passport, DOB, CRM data).
 * - Enforces length boundaries.
 * - Invokes server-side Gemini via textTransformationService.
 */

import { NextRequest, NextResponse } from "next/server";
import { transformText, type TransformationMode } from "@/services/ai/transforms/textTransformationService";

export interface TransformTextApiRequest {
  text: string;
  mode?: TransformationMode;
  fieldName?: string;
}

export async function POST(req: NextRequest) {
  try {
    let body: TransformTextApiRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "Malformed JSON request body.",
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    const { text, mode, fieldName } = body;

    if (typeof text !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TEXT_TYPE",
            message: "Property 'text' must be a valid string.",
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    const result = await transformText({
      text,
      mode,
      fieldName,
    });

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error?.statusCode || 500,
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal text transformation error.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message,
          statusCode: 500,
        },
      },
      { status: 500 }
    );
  }
}
