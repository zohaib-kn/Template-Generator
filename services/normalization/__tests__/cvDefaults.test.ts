import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapCrmToNormalizedStudent, mapNormalizedToResume } from "@/services/normalization";
import { synthesizeEuropassAboutMe } from "@/services/normalization/synthesizeEuropassAboutMe";
import type { CrmSnapshot } from "@/types/crmSnapshot";

function snapshot(tests: unknown[], program = { course: "MSc Hospitality Management", university: "Sample University" }, name = ["Sample", "Student"]) {
  return {
    student: {
      _id: "65a000000000000000000010",
      personalDetails: { firstName: name[0], lastName: name[1], gender: "female" },
      academicQualifications: [
        { _id: "q1", levelOfStudy: "Undergraduate", qualification: "Bachelor of Hotel Management", institution: "Sample Institute", score: "72%" },
      ],
      workExperience: [],
      tests,
    },
    appliedPrograms: [{ _id: "p1", university: { name: program.university }, course: { title: program.course }, country: { name: "Italy" } }],
    documents: [],
  } as unknown as CrmSnapshot;
}

const resumeOf = (snap: CrmSnapshot) => mapNormalizedToResume(mapCrmToNormalizedStudent(snap)).student!;

describe("CV defaults, language mapping and About Me", () => {
  it("does not invent English C1 or a mother tongue when the CRM has no language data", () => {
    const cv = resumeOf(snapshot([]));
    assert.equal(cv.languages, undefined, "no English proficiency is assumed");
    assert.equal(cv.motherTongue, "");
  });

  it("maps IELTS bands to CEFR monotonically, including low scores", () => {
    const cv = resumeOf(
      snapshot([{ _id: "t", type: "IELTS", overallScore: "4.5", subscores: { listening: "3.5", reading: "2.5", writing: "5.5", speaking: "8.5" } }])
    );
    const en = cv.languages![0];
    assert.equal(en.level, "B1");
    assert.equal(en.listening, "A2", "3.5 must not map above 4.0-5.0 (B1)");
    assert.equal(en.reading, "A1");
    assert.equal(en.writing, "B2");
    assert.equal(en.spokenProduction, "C2");
    assert.equal(en.spokenInteraction, "C2");
  });

  it("leaves unknown sub-skills empty instead of defaulting to C1", () => {
    const en = resumeOf(snapshot([{ _id: "t", type: "IELTS", overallScore: "6.5" }])).languages![0];
    assert.equal(en.level, "B2");
    assert.equal(en.listening, "");
    assert.equal(en.spokenProduction, "");
  });

  it("About Me states CRM facts only: no superlatives, no keyword-guessed domain", () => {
    const text = synthesizeEuropassAboutMe(mapCrmToNormalizedStudent(snapshot([])));
    assert.ok(text.includes("Bachelor of Hotel Management"));
    assert.ok(text.includes("72%"));
    assert.ok(text.includes("MSc Hospitality Management"));
    for (const invented of ["remarkable", "prestigious", "close-knit", "computer science", "technical prowess"]) {
      assert.ok(!text.includes(invented), `must not contain "${invented}": ${text}`);
    }
  });
});
