import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  canAccessStudent,
  decodeSession,
  encodeSession,
  getSession,
  requireSession,
  safeNextPath,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { clearCrmTokenCache, verifyCrmToken } from "@/lib/auth/crmTokenVerifier";
import { GET as LAUNCH } from "@/app/api/auth/launch/route";
import { GET as GET_STUDENT } from "@/app/api/student/[studentId]/route";
import { GET as GET_TEMPLATES } from "@/app/api/templates/route";
import { proxy } from "@/proxy";
import { TEST_SESSION_SECRET, testSessionCookie } from "./testSession";

const realFetch = globalThis.fetch;
const env = process.env as Record<string, string | undefined>;

function mockCrmVerify(response: { status: number; body?: unknown }) {
  const calls: Array<{ url: string; auth: string | null }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), auth: new Headers(init?.headers).get("authorization") });
    return new Response(JSON.stringify(response.body ?? {}), { status: response.status });
  }) as typeof fetch;
  return calls;
}

describe("Operator session (CRM token passthrough)", () => {
  beforeEach(() => {
    env.SESSION_SECRET = TEST_SESSION_SECRET;
    env.CRM_AUTH_VERIFY_URL = "https://crm.example.test/api/auth/verify";
    delete env.AUTH_DEV_BYPASS;
    clearCrmTokenCache();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("round-trips a signed session and rejects tampering, expiry and weak secrets", () => {
    const now = Math.floor(Date.now() / 1000);
    const cookie = encodeSession({ sub: "op-1", students: ["s1"], exp: now + 60 })!;
    assert.equal(decodeSession(cookie)?.sub, "op-1");

    const [payload, sig] = cookie.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "op-1", students: "*", exp: now + 60 })).toString("base64url");
    assert.equal(decodeSession(`${forged}.${sig}`), null, "re-signed payload must be rejected");
    assert.equal(decodeSession(`${payload}.${sig}x`), null);

    const expired = encodeSession({ sub: "op-1", students: "*", exp: now - 1 })!;
    assert.equal(decodeSession(expired), null);

    env.SESSION_SECRET = "too-short";
    assert.equal(decodeSession(cookie), null, "weak secret disables sessions (fail closed)");
  });

  it("returns no session without credentials and ignores dev bypass in production", async () => {
    const req = new NextRequest("http://localhost/api/templates");
    assert.equal(await getSession(req), null);

    env.AUTH_DEV_BYPASS = "true";
    assert.ok(await getSession(req), "bypass works outside production");
    const prevNodeEnv = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      assert.equal(await getSession(req), null, "bypass must be ignored in production");
    } finally {
      env.NODE_ENV = prevNodeEnv;
    }
  });

  it("verifies CRM bearer tokens and fails closed on any CRM error", async () => {
    const calls = mockCrmVerify({
      status: 200,
      body: { valid: true, user: { id: "op-7", name: "Op" }, allowedStudentIds: ["65a000000000000000000001"] },
    });
    const session = await verifyCrmToken("tok-good");
    assert.equal(session?.sub, "op-7");
    assert.deepEqual(session?.students, ["65a000000000000000000001"]);
    assert.equal(calls[0].auth, "Bearer tok-good");

    clearCrmTokenCache();
    mockCrmVerify({ status: 200, body: { valid: false } });
    assert.equal(await verifyCrmToken("tok-bad"), null);

    mockCrmVerify({ status: 401 });
    assert.equal(await verifyCrmToken("tok-401"), null);

    delete env.CRM_AUTH_VERIFY_URL;
    assert.equal(await verifyCrmToken("tok-good-2"), null, "no verify endpoint = nobody authenticated");
  });

  it("enforces student-level access, allowing fictional samples to any operator", () => {
    const session = { sub: "op", students: ["65a000000000000000000001"], exp: 0 };
    assert.equal(canAccessStudent(session, "65a000000000000000000001"), true);
    assert.equal(canAccessStudent(session, "65a000000000000000000002"), false);
    assert.equal(canAccessStudent(session, "sample-aafia-ameen"), true);
    assert.equal(canAccessStudent({ ...session, students: "*" }, "anything"), true);
    assert.equal(canAccessStudent(session, ""), false);
  });

  it("requireSession returns 401 without a session and 403 for another operator's student", async () => {
    const anon = await requireSession(new NextRequest("http://localhost/x"));
    assert.equal(anon.response?.status, 401);

    const req = new NextRequest("http://localhost/x", {
      headers: { Cookie: testSessionCookie(["65a000000000000000000001"]) },
    });
    assert.equal((await requireSession(req, { studentId: "65a000000000000000000002" })).response?.status, 403);
    assert.ok((await requireSession(req, { studentId: "65a000000000000000000001" })).session);
  });

  it("only allows same-origin relative redirect targets", () => {
    assert.equal(safeNextPath("/sop-generator?student=1"), "/sop-generator?student=1");
    assert.equal(safeNextPath("//evil.example"), "/");
    assert.equal(safeNextPath("/\\evil.example"), "/");
    assert.equal(safeNextPath("https://evil.example"), "/");
    assert.equal(safeNextPath(null), "/");
  });

  it("/api/auth/launch exchanges a valid CRM token for an HttpOnly session cookie", async () => {
    mockCrmVerify({ status: 200, body: { valid: true, user: { id: "op-9" }, allowedStudentIds: "*" } });
    const res = await LAUNCH(new NextRequest("http://localhost/api/auth/launch?token=abc&next=//evil.example"));
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get("location")!).pathname, "/");
    const setCookie = res.headers.get("set-cookie") || "";
    assert.ok(setCookie.startsWith(`${SESSION_COOKIE_NAME}=`));
    assert.match(setCookie, /HttpOnly/i);

    mockCrmVerify({ status: 403 });
    clearCrmTokenCache();
    const denied = await LAUNCH(new NextRequest("http://localhost/api/auth/launch?token=nope"));
    assert.match(denied.headers.get("location") || "", /\/auth\/required\?reason=invalid_token/);
  });

  it("protected routes reject anonymous callers and out-of-scope students before touching the CRM", async () => {
    const calls = mockCrmVerify({ status: 500 });

    const anonTemplates = await GET_TEMPLATES(new NextRequest("http://localhost/api/templates"));
    assert.equal(anonTemplates.status, 401);

    const forbidden = await GET_STUDENT(
      new NextRequest("http://localhost/api/student/65a000000000000000000002", {
        headers: { Cookie: testSessionCookie(["65a000000000000000000001"]) },
      }),
      { params: Promise.resolve({ studentId: "65a000000000000000000002" }) }
    );
    assert.equal(forbidden.status, 403);
    assert.equal(calls.length, 0, "no CRM call for a forbidden student");
  });

  it("proxy blocks anonymous API/page access but lets the sign-in flow and webhook keys through", async () => {
    const api = await proxy(new NextRequest("http://localhost/api/export/docx", { method: "POST" }));
    assert.equal(api.status, 401);

    const page = await proxy(new NextRequest("http://localhost/sop-generator?student=1"));
    assert.equal(page.status, 307);
    assert.match(page.headers.get("location") || "", /\/auth\/required\?next=%2Fsop-generator/);

    const launch = await proxy(new NextRequest("http://localhost/api/auth/launch?token=x"));
    assert.equal(launch.headers.get("x-middleware-next"), "1");

    env.DOCUMENT_WEBHOOK_API_KEY = "webhook-key-123";
    const webhook = await proxy(
      new NextRequest("http://localhost/api/documents/generate", { method: "POST", headers: { "X-API-Key": "webhook-key-123" } })
    );
    assert.equal(webhook.headers.get("x-middleware-next"), "1");

    const wrongKey = await proxy(
      new NextRequest("http://localhost/api/export/docx", { method: "POST", headers: { "X-API-Key": "webhook-key-123" } })
    );
    assert.equal(wrongKey.status, 401, "webhook key must not unlock non-webhook routes");

    const authed = await proxy(new NextRequest("http://localhost/api/templates", { headers: { Cookie: testSessionCookie() } }));
    assert.equal(authed.headers.get("x-middleware-next"), "1");
  });
});
