import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSampleAafiaAmeenSnapshot, getSampleAaravMehtaSnapshot, getSampleRohanIyerSnapshot } from "@/lib/sampleStudents";
import { hydrateDocumentFromSnapshot } from "@/features/dashboard/utils/documentHydrator";
import type { CrmSnapshot } from "@/types/crmSnapshot";

describe("Visa Cover Letter & Multi-Student Verification", () => {
  it("Aafia Ameen (fictional sample) cover letter is built only from her own snapshot", () => {
    const snapshot = getSampleAafiaAmeenSnapshot();
    const doc = hydrateDocumentFromSnapshot("COVER_LETTER", snapshot, "sample-aafia-ameen");

    assert.equal(doc.docType, "COVER_LETTER");
    assert.equal(doc.studentName, "Aafia Ameen");
    assert.equal(doc.targetUniversity, "Politecnico di Torino");
    assert.equal(doc.targetCourse, "Bachelor's Degree in Information Engineering");
    assert.equal(doc.sections.length, 16);

    const getSection = (title: string) =>
      doc.sections.find((s) => s.heading.toLowerCase().includes(title.toLowerCase()))?.content || "";

    const recipient = getSection("Recipient");
    assert.ok(recipient.includes("Consulate General of Italy"));
    assert.ok(recipient.includes("Mumbai, India"));

    const academics = getSection("Academic Background");
    assert.ok(academics.includes("Class XII"));
    assert.ok(academics.includes("National College Bangalore"));
    assert.ok(academics.includes("7.0"), "IELTS overall comes from the snapshot");

    const finance = getSection("Financial Sponsorship");
    assert.ok(finance.includes("Mr. Mohammed Ameen"));
    assert.ok(finance.includes("INR 30,00,000 (Indian Rupees Thirty Lakh Only)"));
    assert.ok(finance.includes("Sample Education Finance Ltd"));

    const accommodation = getSection("Accommodation");
    assert.ok(accommodation.includes("Sample Student Residence, Turin, Italy"));

    const signature = getSection("Student Contact & Signature");
    assert.ok(signature.includes("Aafia Ameen"));
    assert.ok(signature.includes("aafia.ameen.test@example.com"));
  });

  it("a real CRM student whose name contains a sample name never receives sample data", () => {
    const crmStudent: CrmSnapshot = {
      student: {
        _id: "65a000000000000000000001",
        personalDetails: { firstName: "Mohammed", lastName: "Ameen", email: "m.ameen@example.org" },
        academicQualifications: [],
        workExperience: [],
        tests: [],
      },
      appliedPrograms: [],
      documents: [],
    } as unknown as CrmSnapshot;

    const doc = hydrateDocumentFromSnapshot("COVER_LETTER", crmStudent, "65a000000000000000000001");
    const all = doc.sections.map((s) => s.content).join("\n");

    assert.equal(doc.studentName, "Mohammed Ameen");
    for (const foreign of ["Z9876543", "aafia.ameen.test@example.com", "Sample Education Finance", "SAMPLE-POLICY-0001", "SAMPL1"]) {
      assert.ok(!all.includes(foreign), `Must not leak sample value ${foreign}`);
    }
  });

  it("Aarav Mehta cover letter generates with no uninterpolated placeholders", () => {
    const snapshot = getSampleAaravMehtaSnapshot();
    const doc = hydrateDocumentFromSnapshot("COVER_LETTER", snapshot, "sample-aarav-mehta", "italy-type-d-student-visa-cover-letter");

    assert.equal(doc.studentName, "Aarav Mehta");
    assert.equal(doc.sections.length, 16);

    doc.sections.forEach((sec) => {
      assert.ok(!sec.content.includes("{{"), `Uninterpolated placeholder in section ${sec.heading}`);
      assert.ok(sec.content.trim().length > 10, `Section ${sec.heading} has insufficient content`);
    });
  });

  it("Rohan Iyer CV generates with complete Europass section structure", () => {
    const snapshot = getSampleRohanIyerSnapshot();
    const doc = hydrateDocumentFromSnapshot("CV", snapshot, "sample-rohan-iyer");

    assert.equal(doc.docType, "CV");
    assert.equal(doc.studentName, "Rohan Iyer");
    const headings = doc.sections.map((s) => s.heading);
    assert.ok(headings.includes("ABOUT ME"));
    assert.ok(headings.includes("EDUCATION AND TRAINING"));
    assert.ok(headings.includes("LANGUAGE SKILLS"));
    assert.ok(headings.includes("DECLARATION"));
  });
});
