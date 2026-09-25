/**
 * services/import/__tests__/importedStudentContext.test.ts
 *
 * Unit tests verifying that imported SOP student contexts are cleanly constructed
 * and strictly purged of any fallback sample/mock data (e.g. Aafia Ameen).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { buildImportedStudentContext } from "@/features/sop-generator/lib/buildImportedStudentContext";
import { buildStudentDocumentContext } from "@/features/sop-generator/lib/buildStudentDocumentContext";

test("Imported Student Context — Isolation & Mock Data Purge", async (t) => {
  await t.test("1. Builds clean student context with zero mock data (Aafia Ameen / CBSE 88.6%)", () => {
    const extractedFacts = {
      fullName: "Syed Musaib Hasan",
      institution: "Lakshmi Narain College of Technology, Bhopal",
      percentage: "7.62 CGPA",
      qualification: "Bachelor of Technology in Electrical and Electronics Engineering",
      targetUniversity: "University of Padova",
      targetCourse: "Master's in Electronic Engineering",
      targetCountry: "Italy",
    };

    const ctx = buildImportedStudentContext(extractedFacts);

    // Verify candidate identity matches imported document
    assert.equal(ctx.student.fullName, "Syed Musaib Hasan");
    assert.equal(ctx.academics.latestQualification, "Bachelor of Technology in Electrical and Electronics Engineering");
    assert.equal(ctx.academics.institution, "Lakshmi Narain College of Technology, Bhopal");
    assert.equal(ctx.academics.percentage, "7.62 CGPA");
    assert.equal(ctx.destination.university, "University of Padova");
    assert.equal(ctx.destination.course, "Master's in Electronic Engineering");
    assert.equal(ctx.destination.country, "Italy");

    // Strict invariant: verify ZERO traces of Aafia Ameen mock data exist
    const jsonStr = JSON.stringify(ctx);
    assert.ok(!jsonStr.includes("Aafia"), "Must not contain 'Aafia'");
    assert.ok(!jsonStr.includes("Ameen"), "Must not contain 'Ameen'");
    assert.ok(!jsonStr.includes("CBSE"), "Must not contain mock 'CBSE' board");
    assert.ok(!jsonStr.includes("88.6%"), "Must not contain mock '88.6%' score");
    assert.ok(!jsonStr.includes("Z9876543"), "Must not contain mock passport number");

    // Fields not present in the SOP should be empty, not populated with dummy test scores
    assert.equal(ctx.tests.ielts.overall, "");
    assert.equal(ctx.student.passportNumber, "");
  });

  await t.test("2. When IELTS or passport is present in extracted facts, it is populated correctly", () => {
    const extractedFacts = {
      fullName: "Rahul Verma",
      passportNumber: "T1234567",
      ieltsScore: "7.0",
      ieltsListening: "7.5",
      ieltsReading: "7.0",
      ieltsWriting: "6.5",
      ieltsSpeaking: "7.0",
      targetUniversity: "Politecnico di Milano",
      targetCourse: "M.Sc. in Computer Science",
    };

    const ctx = buildImportedStudentContext(extractedFacts);

    assert.equal(ctx.student.fullName, "Rahul Verma");
    assert.equal(ctx.student.passportNumber, "T1234567");
    assert.equal(ctx.tests.ielts.overall, "7.0");
    assert.equal(ctx.tests.ielts.listening, "7.5");
    assert.equal(ctx.destination.university, "Politecnico di Milano");
  });

  await t.test("3. When baseContext exists from a CRM profile, verified fields are preserved", () => {
    const mockCrmContext = buildStudentDocumentContext(); // Aafia base from CRM
    mockCrmContext.student.fullName = "Verified CRM Student";
    mockCrmContext.student.passportNumber = "CRM998877";

    const extractedFromSop = {
      targetUniversity: "University of Bologna",
      targetCourse: "Master in AI",
    };

    const mergedCtx = buildImportedStudentContext(extractedFromSop, mockCrmContext);

    // Verified CRM identity retained
    assert.equal(mergedCtx.student.fullName, "Verified CRM Student");
    assert.equal(mergedCtx.student.passportNumber, "CRM998877");
    // Target destination updated from uploaded SOP
    assert.equal(mergedCtx.destination.university, "University of Bologna");
    assert.equal(mergedCtx.destination.course, "Master in AI");
  });
});
