/**
 * services/ai/gemini/geminiClient.ts
 *
 * Server-side Gemini API client using the installed @google/genai SDK.
 *
 * Security & Reliability:
 * - Reads GEMINI_API_KEY only from server environment.
 * - Never leaks API key in logs, responses, or client payloads.
 * - Cascades through Flash models with configurable timeout safeguards.
 * - Supports native systemInstruction in generation config.
 */

import { GoogleGenAI } from "@google/genai";

export const FLASH_MODELS_CASCADE = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
] as const;

export interface GenerateGeminiOptions {
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface GeminiSuccessResponse {
  success: true;
  model: string;
  text: string;
}

export interface GeminiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export type GeminiResult = GeminiSuccessResponse | GeminiErrorResponse;

export class GeminiService {
  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (this.aiClient) return this.aiClient;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    this.aiClient = new GoogleGenAI({ apiKey });
    return this.aiClient;
  }

  async generate(options: GenerateGeminiOptions): Promise<GeminiResult> {
    let ai: GoogleGenAI;
    try {
      ai = this.getClient();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gemini API key missing on server.";
      return {
        success: false,
        error: {
          code: "GEMINI_API_KEY_MISSING",
          message,
          statusCode: 500,
        },
      };
    }

    const {
      systemInstruction,
      prompt,
      temperature = 0.3,
      maxOutputTokens = 2048,
      timeoutMs = 25000,
    } = options;

    let lastError: unknown = null;

    for (const modelName of FLASH_MODELS_CASCADE) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
        );

        const config: Record<string, unknown> = {
          temperature,
          maxOutputTokens,
        };

        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config,
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        const text = response?.text?.trim();

        if (text && text.length > 20) {
          return {
            success: true,
            model: modelName,
            text,
          };
        }
      } catch (err: unknown) {
        lastError = err;
        const errStr = err instanceof Error ? err.message : String(err);

        // Cascade on temporary unavailable, 404, 429 quota, or timeout
        const isTransient =
          errStr.includes("503") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("404") ||
          errStr.includes("not found") ||
          errStr.includes("TIMEOUT") ||
          errStr.includes("429") ||
          errStr.includes("quota") ||
          errStr.includes("RESOURCE_EXHAUSTED");

        if (isTransient && modelName !== FLASH_MODELS_CASCADE[FLASH_MODELS_CASCADE.length - 1]) {
          continue;
        }

        // Break on authorization or invalid key errors
        break;
      }
    }

    const errMessage = lastError instanceof Error ? lastError.message : String(lastError ?? "");

    let code = "GEMINI_REQUEST_FAILED";
    let message = "Unable to generate AI content.";
    let statusCode = 502;

    if (errMessage.includes("TIMEOUT")) {
      code = "GEMINI_TIMEOUT";
      message = "Gemini API request timed out.";
      statusCode = 504;
    } else if (
      errMessage.includes("API_KEY_INVALID") ||
      errMessage.includes("401") ||
      errMessage.includes("API key not valid")
    ) {
      code = "GEMINI_API_KEY_INVALID";
      message = "Configured Gemini API key is invalid or unauthorized.";
      statusCode = 401;
    } else if (
      errMessage.includes("RESOURCE_EXHAUSTED") ||
      errMessage.includes("429") ||
      errMessage.includes("quota")
    ) {
      code = "GEMINI_QUOTA_EXCEEDED";
      message = "Gemini API quota or rate limit exceeded. Please retry momentarily.";
      statusCode = 429;
    }

    return {
      success: false,
      error: { code, message, statusCode },
    };
  }
}

export const geminiService = new GeminiService();
