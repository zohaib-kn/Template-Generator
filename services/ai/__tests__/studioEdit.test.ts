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
    assert.throws(() => parseStudioResponse(JSON.stringify({ sections: [] }), req));
    assert.throws(() => parseStudioResponse(JSON.stringify({ sections: [{ heading: 1 }] }), req));
  });

  it("treats a reply with no sections as an answer that leaves the document unchanged", () => {
    const r = parseStudioResponse(JSON.stringify({ reply: "Your IELTS score is 7.0.", sections: [] }), req);
    assert.equal(r.reply, "Your IELTS score is 7.0.");
    assert.deepEqual(r.sections, req.sections);
    assert.deepEqual(r.changedHeadings, []);
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

describe("CV data sections are protected from 'enhance' padding", () => {
  const cvReq = {
    docType: "CV",
    instruction: "please enhance",
    sections: [
      { heading: "ABOUT ME", content: "I am a student." },
      { heading: "LANGUAGE SKILLS", content: "English (C1)" },
      { heading: "ENGLISH LANGUAGE CERTIFICATE", content: "• Overall Band Score - 7.0" },
    ],
  };

  it("undoes changes to language and certificate sections unless the instruction names them", () => {
    const out = JSON.stringify({
      reply: "Enhanced.",
      sections: [
        { heading: "ABOUT ME", content: "I am a motivated student." },
        { heading: "LANGUAGE SKILLS", content: "English (C1)\nDemonstrated advanced proficiency." },
        { heading: "ENGLISH LANGUAGE CERTIFICATE", content: "• Overall Band Score - 7.0\nAchieved a strong score." },
      ],
    });
    const r = parseStudioResponse(out, cvReq);
    assert.equal(r.sections[1].content, "English (C1)");
    assert.equal(r.sections[2].content, "• Overall Band Score - 7.0");
    assert.deepEqual(r.changedHeadings.filter((h) => h !== "ABOUT ME"), []);
  });

  it("allows the change when the counsellor asks for it", () => {
    const out = JSON.stringify({ reply: "Updated.", sections: [cvReq.sections[0], { heading: "LANGUAGE SKILLS", content: "English (C2)" }, cvReq.sections[2]] });
    const r = parseStudioResponse(out, { ...cvReq, instruction: "set my English language level to C2" });
    assert.equal(r.sections[1].content, "English (C2)");
  });
});

describe("CV entries are reworded, not padded", () => {
  const entry = "Class XII\nSample School [ 2022 – 2024 ]\nFinal grade: 85%";
  const req = { docType: "CV", instruction: "please enhance", sections: [{ heading: "EDUCATION AND TRAINING", content: entry }, { heading: "DECLARATION", content: "I declare this is true." }] };

  it("undoes added lines on a general enhance and keeps the declaration", () => {
    const out = JSON.stringify({ reply: "Done.", sections: [
      { heading: "EDUCATION AND TRAINING", content: entry + "\nCompleted with strong results." },
      { heading: "DECLARATION", content: "I declare this is true. I uphold integrity." },
    ] });
    const r = parseStudioResponse(out, req);
    assert.equal(r.sections[0].content, entry);
    assert.equal(r.sections[1].content, "I declare this is true.");
    assert.deepEqual(r.changedHeadings, []);
  });

  it("allows new lines when the counsellor asks to add them", () => {
    const out = JSON.stringify({ reply: "Added.", sections: [{ heading: "EDUCATION AND TRAINING", content: entry + "\n• Class representative" }, req.sections[1]] });
    const r = parseStudioResponse(out, { ...req, instruction: "add 'class representative' to my education" });
    assert.match(r.sections[0].content, /Class representative/);
  });

  it("tells the model which sections are read-only", () => {
    assert.match(buildStudioPrompt(req), /Read-only for this request[^\n]*DECLARATION/);
  });
});

describe("Replies never claim undone edits", () => {
  it("adds a note when a claimed CV edit was undone", () => {
    const req = { docType: "CV", instruction: "please enhance", sections: [{ heading: "DECLARATION", content: "I declare this is true." }] };
    const out = JSON.stringify({ reply: "I polished the declaration.", changedHeadings: ["DECLARATION"], sections: [{ heading: "DECLARATION", content: "I solemnly declare this is true." }] });
    const r = parseStudioResponse(out, req);
    assert.match(r.reply, /kept \*\*DECLARATION\*\* exactly as it was/);
  });
});
