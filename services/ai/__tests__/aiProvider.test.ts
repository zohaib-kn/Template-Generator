import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { aiService, isAiConfigured, getOpenAiModels } from "@/services/ai/openaiClient";

const env = process.env as Record<string, string | undefined>;
const KEYS = ["OPENAI_API_KEY", "OPEN_API_KEY", "OPENAI_MODEL"];
const realFetch = globalThis.fetch;
let saved: Record<string, string | undefined> = {};

describe("AI client (OpenAI only)", () => {
  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((k) => [k, env[k]]));
    for (const k of KEYS) delete env[k];
  });
  afterEach(() => {
    for (const k of KEYS) (saved[k] === undefined ? delete env[k] : (env[k] = saved[k]));
    globalThis.fetch = realFetch;
  });

  it("is configured only by an OpenAI key (OPEN_API_KEY alias accepted)", async () => {
    assert.equal(isAiConfigured(), false);
    const res = await aiService.generate({ prompt: "x" });
    assert.equal(!res.success && res.error.code, "AI_API_KEY_MISSING");
    env.OPEN_API_KEY = "sk-test";
    assert.equal(isAiConfigured(), true);
  });

  it("tries OPENAI_MODEL first, then the defaults without duplicates", () => {
    assert.deepEqual(getOpenAiModels(), ["gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"]);
    env.OPENAI_MODEL = "gpt-4.1-mini";
    assert.deepEqual(getOpenAiModels(), ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"]);
  });

  it("calls OpenAI chat completions with system + user messages and cascades on 404", async () => {
    env.OPENAI_API_KEY = "sk-test";
    const calls: Array<{ model: string; auth: string | null; roles: string[] }> = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      calls.push({ model: body.model, auth: new Headers(init?.headers).get("authorization"), roles: body.messages.map((m: { role: string }) => m.role) });
      if (calls.length === 1) return new Response(JSON.stringify({ error: { code: "model_not_found" } }), { status: 404 });
      return new Response(JSON.stringify({ choices: [{ message: { content: "A sufficiently long generated paragraph." } }] }), { status: 200 });
    }) as typeof fetch;

    const res = await aiService.generate({ systemInstruction: "sys", prompt: "hello" });
    assert.equal(res.success, true);
    assert.deepEqual(calls.map((c) => c.model), ["gpt-4.1", "gpt-4.1-mini"]);
    assert.equal(calls[0].auth, "Bearer sk-test");
    assert.deepEqual(calls[0].roles, ["system", "user"]);
  });

  it("retries the same model without temperature when the model rejects it", async () => {
    env.OPENAI_API_KEY = "sk-test";
    const bodies: Array<Record<string, unknown>> = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      bodies.push(body);
      if ("temperature" in body) {
        return new Response(JSON.stringify({ error: { code: "unsupported_value", param: "temperature" } }), { status: 400 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: "A sufficiently long generated paragraph." } }] }), { status: 200 });
    }) as typeof fetch;

    const res = await aiService.generate({ prompt: "hello", temperature: 0.4 });
    assert.equal(res.success, true);
    assert.equal(bodies.length, 2);
    assert.equal(bodies[0].model, bodies[1].model);
    assert.equal("temperature" in bodies[1], false);
  });

  it("maps an invalid key to AI_API_KEY_INVALID without retrying", async () => {
    env.OPENAI_API_KEY = "sk-bad";
    let n = 0;
    globalThis.fetch = (async () => {
      n++;
      return new Response(JSON.stringify({ error: { code: "invalid_api_key" } }), { status: 401 });
    }) as typeof fetch;
    const res = await aiService.generate({ prompt: "x" });
    assert.equal(res.success, false);
    assert.equal(!res.success && res.error.code, "AI_API_KEY_INVALID");
    assert.equal(n, 1);
  });
});
