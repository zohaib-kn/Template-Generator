/**
 * services/ai/gemini/geminiClient.ts
 *
 * Server-side text-generation client shared by every AI feature.
 *
 * Provider selection (server environment only):
 * - OpenAI when OPENAI_API_KEY (or OPEN_API_KEY) is set — Chat Completions over fetch,
 *   cascading OPENAI_MODEL (default gpt-4.1-mini) → gpt-4o-mini.
 * - Otherwise Google Gemini when GEMINI_API_KEY is set — @google/genai, cascading Flash models.
 * - AI_PROVIDER=openai|gemini forces one when both keys are present.
 *
 * Security & Reliability:
 * - API keys are read only from the server environment and never logged or returned.
 * - Each model attempt has a timeout; transient failures (timeouts, 429, 5xx, unknown
 *   model) cascade to the next model, auth errors stop immediately.
 */

import { GoogleGenAI } from "@google/genai";

export const FLASH_MODELS_CASCADE = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
] as const;

const OPENAI_DEFAULT_MODELS = ["gpt-4.1-mini", "gpt-4o-mini"];
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export type AiProvider = "openai" | "gemini";

export interface GenerateGeminiOptions {
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  minOutputLength?: number;
  /** Ask the model for a single JSON object (OpenAI response_format / Gemini responseMimeType). */
  jsonMode?: boolean;
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

function openAiKey(): string | undefined {
  return (process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY)?.trim() || undefined;
}

function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

/** The provider that will serve requests, or null when no AI key is configured. */
export function getActiveAiProvider(): AiProvider | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (forced === "openai" && openAiKey()) return "openai";
  if (forced === "gemini" && geminiKey()) return "gemini";
  if (openAiKey()) return "openai";
  if (geminiKey()) return "gemini";
  return null;
}

/** The configured key for the active provider (used only to detect test/mock setups). */
export function getActiveAiKey(): string | undefined {
  const provider = getActiveAiProvider();
  return provider === "openai" ? openAiKey() : provider === "gemini" ? geminiKey() : undefined;
}

function openAiModels(): string[] {
  const configured = process.env.OPENAI_MODEL?.trim();
  return configured ? [configured, ...OPENAI_DEFAULT_MODELS.filter((m) => m !== configured)] : OPENAI_DEFAULT_MODELS;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)),
  ]);
}

function isTransient(errStr: string): boolean {
  return /TIMEOUT|\b429\b|\b5\d\d\b|UNAVAILABLE|RESOURCE_EXHAUSTED|quota|rate limit|\b404\b|not found|model_not_found|overloaded/i.test(
    errStr
  );
}

export class GeminiService {
  private geminiClient: GoogleGenAI | null = null;

  private getGeminiClient(apiKey: string): GoogleGenAI {
    if (!this.geminiClient) this.geminiClient = new GoogleGenAI({ apiKey });
    return this.geminiClient;
  }

  private async callOpenAi(model: string, apiKey: string, options: Required<Omit<GenerateGeminiOptions, "systemInstruction">> & { systemInstruction?: string }): Promise<string> {
    const messages = [
      ...(options.systemInstruction ? [{ role: "system", content: options.systemInstruction }] : []),
      { role: "user", content: options.prompt },
    ];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const res = await fetch(OPENAI_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature,
          max_completion_tokens: options.maxOutputTokens,
          ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; type?: string } };
        throw new Error(`HTTP ${res.status} ${body.error?.code || body.error?.type || ""}`.trim());
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw new Error("TIMEOUT");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async callGemini(model: string, apiKey: string, options: GenerateGeminiOptions & { temperature: number; maxOutputTokens: number; timeoutMs: number; jsonMode: boolean }): Promise<string> {
    const config: Record<string, unknown> = {
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
    };
    if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
    if (options.jsonMode) config.responseMimeType = "application/json";
    const response = await withTimeout(
      this.getGeminiClient(apiKey).models.generateContent({ model, contents: options.prompt, config }),
      options.timeoutMs
    );
    return response?.text?.trim() || "";
  }

  async generate(options: GenerateGeminiOptions): Promise<GeminiResult> {
    const provider = getActiveAiProvider();
    const apiKey = getActiveAiKey();
    if (!provider || !apiKey) {
      return {
        success: false,
        error: {
          code: "AI_API_KEY_MISSING",
          message: "No AI key is configured on the server (set OPENAI_API_KEY or GEMINI_API_KEY).",
          statusCode: 500,
        },
      };
    }

    const resolved = {
      systemInstruction: options.systemInstruction,
      prompt: options.prompt,
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      timeoutMs: options.timeoutMs ?? 25000,
      minOutputLength: options.minOutputLength ?? 20,
      jsonMode: options.jsonMode ?? false,
    };

    const models: string[] = provider === "openai" ? openAiModels() : [...FLASH_MODELS_CASCADE];
    let lastError: unknown = null;

    for (const model of models) {
      try {
        const text =
          provider === "openai"
            ? await this.callOpenAi(model, apiKey, resolved)
            : await this.callGemini(model, apiKey, resolved);
        if (text && text.length >= resolved.minOutputLength) {
          return { success: true, model, text };
        }
        lastError = new Error("EMPTY_RESPONSE");
      } catch (err: unknown) {
        lastError = err;
        const errStr = err instanceof Error ? err.message : String(err);
        if (isTransient(errStr) && model !== models[models.length - 1]) continue;
        break;
      }
    }

    const errMessage = lastError instanceof Error ? lastError.message : String(lastError ?? "");
    const label = provider === "openai" ? "OpenAI" : "Gemini";

    if (errMessage.includes("TIMEOUT")) {
      return { success: false, error: { code: "AI_TIMEOUT", message: `${label} request timed out.`, statusCode: 504 } };
    }
    if (/\b401\b|\b403\b|API_KEY_INVALID|API key not valid|invalid_api_key/i.test(errMessage)) {
      return {
        success: false,
        error: { code: "AI_API_KEY_INVALID", message: `Configured ${label} API key is invalid or unauthorized.`, statusCode: 401 },
      };
    }
    if (/\b429\b|RESOURCE_EXHAUSTED|quota|rate limit|insufficient_quota/i.test(errMessage)) {
      return {
        success: false,
        error: { code: "AI_QUOTA_EXCEEDED", message: `${label} quota or rate limit exceeded. Please retry momentarily.`, statusCode: 429 },
      };
    }
    if (/\b5\d\d\b|UNAVAILABLE|overloaded/i.test(errMessage)) {
      return {
        success: false,
        error: { code: "AI_UNAVAILABLE", message: `${label} is temporarily unavailable. Please try again shortly.`, statusCode: 503 },
      };
    }
    return { success: false, error: { code: "AI_REQUEST_FAILED", message: "Unable to generate AI content.", statusCode: 502 } };
  }
}

/** Shared provider-aware client (historical name kept so existing imports keep working). */
export const geminiService = new GeminiService();
export const aiService = geminiService;
