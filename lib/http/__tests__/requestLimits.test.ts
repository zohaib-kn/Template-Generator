import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { attachmentDisposition, readJsonBody, RequestTooLargeError, safeFilenamePart } from "@/lib/http/requestLimits";
import { POST as exportDocx } from "@/app/api/export/docx/route";
import { POST as exportPdf } from "@/app/api/export/pdf/route";
import { POST as generate } from "@/app/api/sop/generate/route";
import { GET as getTemplates } from "@/app/api/templates/route";
import { TemplateModel } from "@/models/Template";
import { testSessionCookie } from "@/lib/auth/__tests__/testSession";

function jsonReq(url: string, body: string, extraHeaders: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testSessionCookie(), ...extraHeaders },
    body,
  });
}

describe("Request limits, safe filenames and side-effect-free GETs", () => {
  it("readJsonBody enforces the limit even without a Content-Length header", async () => {
    const big = JSON.stringify({ html: "x".repeat(2000) });
    const streamed = new Request("http://localhost/x", {
      method: "POST",
      body: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(big));
          c.close();
        },
      }),
      // @ts-expect-error Node fetch requires duplex for stream bodies
      duplex: "half",
    });
    await assert.rejects(readJsonBody(streamed, 1000), RequestTooLargeError);
    assert.deepEqual(await readJsonBody(new Request("http://localhost/x", { method: "POST", body: "{\"a\":1}" }), 1000), { a: 1 });
  });

  it("export and generate routes reject oversized bodies with 413", async () => {
    const huge = JSON.stringify({ documentType: "SOP", html: "x".repeat(3 * 1024 * 1024), sections: [] });
    assert.equal((await exportDocx(jsonReq("http://localhost/api/export/docx", huge))).status, 413);
    assert.equal((await exportPdf(jsonReq("http://localhost/api/export/pdf", huge))).status, 413);
    assert.equal((await generate(jsonReq("http://localhost/api/sop/generate", huge))).status, 413);

    const longInstruction = JSON.stringify({ sectionId: "s", context: {}, instruction: "x".repeat(1001) });
    assert.equal((await generate(jsonReq("http://localhost/api/sop/generate", longInstruction))).status, 400);
  });

  it("download filenames cannot inject headers", async () => {
    assert.equal(safeFilenamePart('a"b\r\nSet-Cookie: x=1', "f"), "a_b_Set-Cookie_x_1");
    assert.equal(attachmentDisposition("../../etc/passwd", "pdf"), 'attachment; filename="etc_passwd.pdf"');

    const res = await exportPdf(
      jsonReq(
        "http://localhost/api/export/pdf",
        JSON.stringify({ studentName: "Ann \"O'Neil\"", documentType: "SOP\r\nX-Injected: 1", sections: [{ title: "Body", content: "Hi" }] })
      )
    );
    assert.equal(res.status, 200);
    const cd = res.headers.get("content-disposition") || "";
    assert.match(cd, /^attachment; filename="[\w-]+\.pdf"$/);
    assert.equal(res.headers.get("x-injected"), null);
  });

  it("GET /api/templates never writes to the database", async () => {
    const original = TemplateModel.insertMany;
    let writes = 0;
    (TemplateModel as unknown as { insertMany: () => Promise<never[]> }).insertMany = async () => {
      writes += 1;
      return [];
    };
    try {
      const res = await getTemplates(new NextRequest("http://localhost/api/templates", { headers: { Cookie: testSessionCookie() } }));
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.templates) && json.templates.length > 0);
      assert.equal(json.warning, undefined, "internal error text must not be returned");
      assert.equal(writes, 0);
    } finally {
      TemplateModel.insertMany = original;
    }
  });
});
