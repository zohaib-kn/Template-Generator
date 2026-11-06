import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSampleAafiaAmeenSnapshot } from "@/lib/sampleStudents";
import { loadStudentProfileFacts } from "@/services/ai/studio/studentProfileFacts";
import { buildStudioPrompt, parseStudioResponse, type StudioEditRequest } from "@/services/ai/studio/studioEdit";

describe("Student CRM profile for the studio assistant", () => {
  it("includes writing-relevant facts and never contact or identity details", async () => {
    const facts = await loadStudentProfileFacts("any-id", async () => getSampleAafiaAmeenSnapshot());
    assert.ok(facts, "facts are built");
    assert.ok(facts.includes("Aafia"), "name");
    assert.ok(facts.includes("National College Bangalore"), "education");
    for (const secret of ["98765 00000", "Z9876543", "2004-02-14", "Brigade Road", "@example.com"]) {
      assert.ok(!facts.includes(secret), `must not include ${secret}`);
    }
  });

  it("returns null instead of failing when the CRM cannot be reached", async () => {
    const facts = await loadStudentProfileFacts("x", async () => {
      throw new Error("CRM down");
    });
    assert.equal(facts, null);
  });

  it("puts the profile in the prompt and accepts its numbers as verified", () => {
    const req: StudioEditRequest = {
      docType: "SOP",
      sections: [{ heading: "Academic Background", content: "I studied commerce." }],
      instruction: "Add my score",
      profileFacts: "- Education: B.Com, National College Bangalore, score 88.6%",
    };
    assert.match(buildStudioPrompt(req), /Verified student profile[\s\S]*88\.6%/);
    const r = parseStudioResponse(
      JSON.stringify({
        reply: "Added your score.",
        sections: [{ heading: "Academic Background", content: "I studied commerce and scored 88.6%." }],
      }),
      req
    );
    assert.deepEqual(r.unverifiedValues, []);
  });
});
