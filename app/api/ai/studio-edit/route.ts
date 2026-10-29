/**
 * app/api/ai/studio-edit/route.ts
 *
 * POST — Document Studio assistant. Applies a counsellor's instruction to the current
 * document with the configured AI provider and returns the edited sections.
 * See services/ai/studio/studioEdit.ts for the guardrails.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { InvalidJsonError, readJsonBody, RequestTooLargeError } from "@/lib/http/requestLimits";
import { aiService } from "@/services/ai/gemini/geminiClient";
import {
  buildStudioPrompt,
  parseStudioResponse,
  STUDIO_SYSTEM_INSTRUCTION,
  type StudioEditRequest,
} from "@/services/ai/studio/studioEdit";

const MAX_BODY_BYTES = 512 * 1024;
const MAX_INSTRUCTION_CHARS = 2000;
const MAX_SECTIONS = 60;

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  const auth0 = await requireSession(req);
  if (auth0.response) return auth0.response;

  let body: StudioEditRequest;
  try {
    body = await readJsonBody<StudioEditRequest>(req, MAX_BODY_BYTES);
  } catch (err) {
    if (err instanceof RequestTooLargeError) return fail(413, "PAYLOAD_TOO_LARGE", err.message);
    if (err instanceof InvalidJsonError) return fail(400, "INVALID_REQUEST", err.message);
    throw err;
  }

  const auth = await requireSession(req, { studentId: body?.studentId ?? null });
  if (auth.response) return auth.response;

  if (typeof body.instruction !== "string" || !body.instruction.trim() || body.instruction.length > MAX_INSTRUCTION_CHARS) {
    return fail(400, "INVALID_REQUEST", `instruction must be 1–${MAX_INSTRUCTION_CHARS} characters.`);
  }
  if (
    !Array.isArray(body.sections) ||
    body.sections.length > MAX_SECTIONS ||
    body.sections.some((s) => typeof s?.heading !== "string" || typeof s?.content !== "string")
  ) {
    return fail(400, "INVALID_REQUEST", `sections must be an array of up to ${MAX_SECTIONS} {heading, content} items.`);
  }

  const request: StudioEditRequest = {
    studentId: body.studentId,
    docType: String(body.docType || "DOCUMENT").slice(0, 40),
    title: typeof body.title === "string" ? body.title.slice(0, 200) : undefined,
    sections: body.sections,
    instruction: body.instruction.trim(),
    history: Array.isArray(body.history)
      ? body.history
          .filter((t) => (t?.sender === "user" || t?.sender === "assistant") && typeof t.text === "string")
          .slice(-6)
          .map((t) => ({ sender: t.sender, text: t.text.slice(0, 1000) }))
      : [],
  };

  const result = await aiService.generate({
    systemInstruction: STUDIO_SYSTEM_INSTRUCTION,
    prompt: buildStudioPrompt(request),
    temperature: 0.3,
    maxOutputTokens: 8000,
    timeoutMs: 60_000,
    minOutputLength: 10,
    jsonMode: true,
  });
  if (!result.success) return fail(result.error.statusCode, result.error.code, result.error.message);

  try {
    const edit = parseStudioResponse(result.text, request);
    return NextResponse.json({ success: true, model: result.model, ...edit });
  } catch {
    return fail(502, "AI_BAD_RESPONSE", "The AI returned an answer that couldn't be applied. Please try again or rephrase.");
  }
}
