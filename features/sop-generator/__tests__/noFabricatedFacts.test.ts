import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { interpolate, findMissingMarkers, getNaturalFallback } from "@/features/sop-generator/lib/interpolateTemplate";
import { hydrateDocumentFromSnapshot } from "@/features/dashboard/utils/documentHydrator";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";
import type { CrmSnapshot } from "@/types/crmSnapshot";

const emptyCtx = {
  student: {}, academics: {}, tests: { ielts: {} }, destination: {}, career: {},
  sponsor: {}, finance: {}, accommodation: {}, insurance: {}, travel: {},
} as unknown as StudentDocumentContext;

describe("Missing CRM data is never replaced with invented facts", () => {
  it("renders factual placeholders as visible [MISSING: …] markers", () => {
    const out = interpolate(
      "IELTS {{tests.ielts.overall}}, sponsor {{sponsor.relationship}} {{sponsor.name}}, " +
        "insurance {{insurance.coverageAmount}}, nationality {{student.nationality}}, address {{student.address}}",
      emptyCtx
    );
    for (const invented of ["6.5", "Father", "€30,000", "Indian", "India"]) {
      assert.ok(!out.includes(invented), `must not invent "${invented}" — got: ${out}`);
    }
    assert.deepEqual(findMissingMarkers(out), [
      "tests.ielts.overall",
      "sponsor.relationship",
      "sponsor.name",
      "insurance.coverageAmount",
      "student.nationality",
      "student.address",
    ]);
  });

  it("keeps real values and only bridges purely optional text", () => {
    const ctx = { ...emptyCtx, tests: { ielts: { overall: "7.0" } } } as StudentDocumentContext;
    assert.equal(interpolate("Band {{tests.ielts.overall}}.{{tests.additionalTestsText}}", ctx), "Band 7.0.");
    assert.equal(getNaturalFallback("tests.ielts.overall"), null);
  });

  it("visa cover letter for a sparse CRM record contains no invented money, scores or logistics", () => {
    const sparse = {
      student: {
        _id: "65a000000000000000000009",
        personalDetails: { firstName: "Test", lastName: "Student" },
        academicQualifications: [],
        workExperience: [],
        tests: [],
      },
      appliedPrograms: [{ _id: "p1", university: { name: "Politecnico di Torino" }, course: { title: "MSc Data Science" }, country: { name: "Italy" } }],
      documents: [],
    } as unknown as CrmSnapshot;

    const doc = hydrateDocumentFromSnapshot("COVER_LETTER", sparse, "65a000000000000000000009");
    const all = doc.sections.map((s) => s.content).join("\n");

    for (const invented of [
      "INR 35,00,000", "INR 30,00,000", "EUR 32,000", "INR 2,00,00,000", "1 EUR = INR",
      "Professional Executive", "Senior Associate", "Mr. Student", "Pending Issuance",
      "Pending Booking Confirmation", "IELTS Academic", "7.5", "6.5", "€30,000",
      "distinguished decades", "Galileo",
    ]) {
      assert.ok(!all.includes(invented), `must not invent "${invented}"`);
    }
    assert.ok(findMissingMarkers(all).length > 0, "gaps must be visible to the counsellor");
  });

  it("LOR does not sign as an invented recommender", () => {
    const doc = hydrateDocumentFromSnapshot("LOR", { student: { personalDetails: { firstName: "A" } } } as unknown as CrmSnapshot, "x");
    const all = doc.sections.map((s) => s.content).join("\n");
    assert.ok(!all.includes("Dr. A. K. Sharma"));
    assert.ok(findMissingMarkers(all).includes("recommender.name"));
  });
});
