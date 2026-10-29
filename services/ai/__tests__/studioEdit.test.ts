import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildStudioPrompt, findUnverifiedValues, parseStudioResponse, type StudioEditRequest } from "@/services/ai/studio/studioEdit";

const req: StudioEditRequest = {
  docType: "COVER_LETTER",
  sections: [
    { heading: "Academic Background", content: "I scored [MISSING: tests.ielts.overall] in IELTS." },
    { heading: "Closing Statement", content: "Thank you." },
  ],
  instruction: "My IELTS overall is 7.0, please add it",
};

describe("Studio AI edit guardrails", () => {
  it("puts the document, instruction and recent chat into the prompt", () => {
    const p = buildStudioPrompt({ ...req, history: [{ sender: "user", text: "earlier ask" }] });
    assert.ok(p.includes("### Academic Background"));
    assert.ok(p.includes("My IELTS overall is 7.0"));
    assert.ok(p.includes("Counsellor: earlier ask"));
  });

  it("accepts values from the operator, flags values from nowhere", () => {
    const out = JSON.stringify({
      reply: "Added your IELTS score.",
      sections: [
        { heading: "Academic Background", content: "I scored 7.0 in IELTS, with listening 8.5." },
        { heading: "Closing Statement", content: "Thank you." },
      ],
      changedHeadings: ["Academic Background"],
    });
    const r = parseStudioResponse(out, req);
    assert.equal(r.sections[0].content.includes("7.0"), true);
    assert.deepEqual(r.unverifiedValues, ["8.5"], "8.5 was invented by the model");
  });

  it("rejects unusable model output", () => {
    assert.throws(() => parseStudioResponse("not json", req));
    assert.throws(() => parseStudioResponse(JSON.stringify({ reply: "x", sections: [] }), req));
    assert.throws(() => parseStudioResponse(JSON.stringify({ sections: [{ heading: 1 }] }), req));
  });

  it("finds invented emails and multi-digit numbers only", () => {
    assert.deepEqual(findUnverifiedValues("Call me at a@b.com on 2026 or 3", ["year 2026"]), ["a@b.com"]);
  });

  it("restores original headings when the model echoes 'Section N:' prefixes", () => {
    const out = JSON.stringify({
      reply: "ok",
      sections: [
        { heading: "Section 1: Section 1: Academic Background", content: "Changed." },
        { heading: "### Closing Statement", content: "Thank you." },
      ],
      changedHeadings: ["Section 1: Academic Background"],
    });
    const r = parseStudioResponse(out, req);
    assert.deepEqual(r.sections.map((s) => s.heading), ["Academic Background", "Closing Statement"]);
    assert.deepEqual(r.changedHeadings, ["Academic Background"]);
  });
});
