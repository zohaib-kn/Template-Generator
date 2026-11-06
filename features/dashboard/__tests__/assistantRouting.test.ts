import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDetailedBrief, processUnifiedMessage } from "../utils/unifiedAssistantEngine";
import type { HydratedDocumentData } from "../utils/documentHydrator";
import type { DocumentData } from "@/types";

const coverLetter: HydratedDocumentData = {
  id: "doc-cl-routing",
  studentId: "student-routing",
  studentName: "Sample Applicant",
  docType: "COVER_LETTER",
  title: "Italy Visa Cover Letter",
  sections: [
    { heading: "Student Introduction", content: "My name is Sample Applicant." },
    { heading: "Why This University", content: "I chose the university for its teaching." },
    { heading: "Financial Sponsorship", content: "My studies will be funded by my family." },
  ],
  targetCountry: "Italy",
  targetUniversity: "Sample University",
  targetCourse: "MSc Data Science",
  docTypeName: "Cover Letter",
  updatedAt: "Just now",
  route: "/studio",
  wordCount: 30,
  fieldValues: {},
};

const cv: DocumentData = {
  personal: { fullName: "Sample Applicant" },
  skills: [
    { id: "s1", name: "Java" },
    { id: "s2", name: "JavaScript" },
  ],
  internships: [],
  education: [],
} as unknown as DocumentData;

const cvDoc: HydratedDocumentData = {
  ...coverLetter,
  id: "doc-cv-routing",
  docType: "CV",
  title: "Europass CV",
  sections: [{ heading: "DIGITAL SKILLS", content: "Java / JavaScript" }],
};

describe("Assistant routing sends real writing requests to the AI", () => {
  it("passes a long ChatGPT-style brief to the AI unchanged, without narrowing it to one section", async () => {
    const brief =
      "Rewrite my cover letter in a warm but formal tone. Keep it under 450 words.\n" +
      "Explain why this university suits me, mention my interest in data science, and make the financial sponsorship paragraph clearer.\n" +
      "Do not use clichés. The student's phone is +91 98765 43210 for reference only.";
    assert.equal(isDetailedBrief(brief), true);
    const result = await processUnifiedMessage(brief, coverLetter, cv, null, null);
    assert.equal(result.needsAiRewrite, true);
    assert.equal(result.aiPrompt, brief);
    assert.equal(result.targetSection, undefined);
    assert.equal(result.updatedSections, undefined, "no local field update from the phone number in the brief");
  });

  it("does not treat writing requests that mention an 'issue' or 'problem' as a bug report", async () => {
    const result = await processUnifiedMessage(
      "Rewrite the financial sponsorship section to address the funding gap issue clearly",
      coverLetter,
      cv,
      null,
      null
    );
    assert.notEqual(result.actionType, "REPORT_ISSUE");
    assert.equal(result.needsAiRewrite, true);
  });

  it("still recognises a short, explicit portal problem report", async () => {
    const result = await processUnifiedMessage("the embassy website crashed while booking", coverLetter, cv, null, null);
    assert.equal(result.actionType, "REPORT_ISSUE");
  });
});

describe("Local CV edits are exact and invent nothing", () => {
  it("removing 'java' keeps 'JavaScript'", async () => {
    const result = await processUnifiedMessage("remove java from skills", cvDoc, cv, null, null);
    const names = (result.updatedCv?.skills ?? []).map((s) => s.name);
    assert.deepEqual(names, ["JavaScript"]);
  });

  it("reports when the skill to remove does not exist", async () => {
    const result = await processUnifiedMessage("remove rust from skills", cvDoc, cv, null, null);
    assert.equal(result.updatedCv, undefined);
    assert.match(result.reply, /couldn't find/i);
  });

  it("adds an internship without invented bullet points or durations", async () => {
    const result = await processUnifiedMessage("Frontend Intern at Acme Corp", cvDoc, cv, null, null, [], {
      action: "ADD_INTERNSHIP",
    } as never);
    const entry = result.updatedCv?.internships?.[0];
    assert.ok(entry, "internship added");
    assert.equal(entry.description, "");
    assert.notEqual(entry.endDate, "6 Months");
  });
});
