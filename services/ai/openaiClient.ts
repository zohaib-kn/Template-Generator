/**
 * services/ai/openaiClient.ts
 *
 * Server-side text-generation client shared by every AI feature. OpenAI only.
 *
 * - Key: OPENAI_API_KEY (OPEN_API_KEY accepted as an alias), server environment only.
 * - Models: OPENAI_MODEL first when set, then the defaults below. A model the account
 *   cannot use (404 / model_not_found), a timeout, 429 or 5xx moves on to the next model;
 *   an auth error stops immediately.
 * - Some newer models only accept their default temperature; when a model rejects the
 *   temperature parameter the same model is retried once without it.
 * - The key is never logged or returned.
 */

export const OPENAI_DEFAULT_MODELS = ["gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"] as const;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export interface GenerateAiOptions {
  systemInstruction?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  minOutputLength?: number;
  /** Ask the model for a single JSON object (response_format: json_object). */
  jsonMode?: boolean;
}

export interface AiSuccessResponse {
  success: true;
  model: string;
  text: string;
}

export interface AiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export type AiResult = AiSuccessResponse | AiErrorResponse;

/** The configured OpenAI key, or undefined when none is set. */
export function getOpenAiKey(): string | undefined {
  return (process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY)?.trim() || undefined;
}

export function isAiConfigured(): boolean {
  return Boolean(getOpenAiKey());
}

export function getOpenAiModels(): string[] {
  const configured = process.env.OPENAI_MODEL?.trim();
  const defaults: string[] = [...OPENAI_DEFAULT_MODELS];
  return configured ? [configured, ...defaults.filter((m) => m !== configured)] : defaults;
}

function isTransient(errStr: string): boolean {
  return /TIMEOUT|\b429\b|\b5\d\d\b|quota|rate limit|\b404\b|not found|model_not_found|overloaded/i.test(errStr);
}

class OpenAiError extends Error {
  constructor(public status: number, public code: string, public param: string) {
    super(`HTTP ${status} ${code}`.trim());
  }
}

type ResolvedOptions = Required<Omit<GenerateAiOptions, "systemInstruction">> & { systemInstruction?: string };

export class AiService {
  private async callOpenAi(model: string, apiKey: string, options: ResolvedOptions, sendTemperature: boolean): Promise<string> {
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
          ...(sendTemperature ? { temperature: options.temperature } : {}),
          max_completion_tokens: options.maxOutputTokens,
          ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; type?: string; param?: string } };
        throw new OpenAiError(res.status, body.error?.code || body.error?.type || "", body.error?.param || "");
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

  async generate(options: GenerateAiOptions): Promise<AiResult> {
    const apiKey = getOpenAiKey();
    if (!apiKey) {
      return {
        success: false,
        error: {
          code: "AI_API_KEY_MISSING",
          message: "No AI key is configured on the server (set OPENAI_API_KEY).",
          statusCode: 500,
        },
      };
    }

    const resolved: ResolvedOptions = {
      systemInstruction: options.systemInstruction,
      prompt: options.prompt,
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      timeoutMs: options.timeoutMs ?? 25000,
      minOutputLength: options.minOutputLength ?? 20,
      jsonMode: options.jsonMode ?? false,
    };

    const models = getOpenAiModels();
    let lastError: unknown = null;

    for (const model of models) {
      try {
        let text: string;
        try {
          text = await this.callOpenAi(model, apiKey, resolved, true);
        } catch (err) {
          const rejectsTemperature = err instanceof OpenAiError && err.status === 400 && err.param === "temperature";
          if (!rejectsTemperature) throw err;
          text = await this.callOpenAi(model, apiKey, resolved, false);
        }
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

    if (errMessage.includes("TIMEOUT")) {
      return { success: false, error: { code: "AI_TIMEOUT", message: "OpenAI request timed out.", statusCode: 504 } };
    }
    if (/\b401\b|\b403\b|invalid_api_key/i.test(errMessage)) {
      return {
        success: false,
        error: { code: "AI_API_KEY_INVALID", message: "Configured OpenAI API key is invalid or unauthorized.", statusCode: 401 },
      };
    }
    if (/\b429\b|quota|rate limit|insufficient_quota/i.test(errMessage)) {
      return {
        success: false,
        error: { code: "AI_QUOTA_EXCEEDED", message: "OpenAI quota or rate limit exceeded. Please retry momentarily.", statusCode: 429 },
      };
    }
    if (/\b5\d\d\b|overloaded/i.test(errMessage)) {
      return {
        success: false,
        error: { code: "AI_UNAVAILABLE", message: "OpenAI is temporarily unavailable. Please try again shortly.", statusCode: 503 },
      };
    }
    return { success: false, error: { code: "AI_REQUEST_FAILED", message: "Unable to generate AI content.", statusCode: 502 } };
  }
}

/** Shared OpenAI client used by every AI feature. */
export const aiService = new AiService();
