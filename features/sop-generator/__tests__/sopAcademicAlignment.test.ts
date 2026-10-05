import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateDocumentContext, hasErrors } from "../lib/validateDocumentContext";
import type { StudentDocumentContext, SopDocumentType } from "../types/sop-generator";
import {
  computeAcademicAlignment,
  isSensitiveSection,
  isGenerationAllowed,
} from "@/services/academicAlignment/academicAlignmentEngine";
import type {
  AcademicAlignmentResult,
  AlignmentComputeInput,
} from "@/services/academicAlignment/types";

// Helper to create a valid base StudentDocumentContext
function createValidContext(): StudentDocumentContext {
  return {
    student: {
      fullName: "Jane Doe",
      dateOfBirth: "2000-01-01",
      passportNumber: "Z1234567",
      city: "Mumbai",
      country: "India",
      address: "123 Marine Drive",
      nationality: "Indian",
    },
    destination: {
      country: "Italy",
      university: "Politecnico di Milano",
      course: "Master in Mechanical Engineering",
      city: "Milan",
      degreeLevel: "Master's",
      duration: "2 Years",
      intakeMonth: "September",
      intakeYear: "2026",
      consulate: "Consulate General of Italy",
      consulateAddress: "Mumbai, India",
    },
    academics: {
      latestQualification: "Bachelor of Commerce",
      institution: "Mumbai University",
      board: "State Board",
      percentage: "75%",
      completionYear: "2023",
      subjects: "Financial Accounting, Business Law",
    },
    tests: {
      ielts: {
        overall: "7.5",
        listening: "8.0",
        reading: "7.5",
        writing: "7.0",
        speaking: "7.5",
      },
    },
    sponsor: {
      name: "John Doe",
      relationship: "Father",
    },
    finance: {
      totalFundsAvailable: "€25,000",
      availableBalance: "€25,000",
      bankName: "State Bank of India",
    },
    accommodation: {
      name: "Milan Student Residence",
      fromDate: "2026-09-01",
      toDate: "2027-08-31",
      bookingReference: "BK-9912",
    },
    insurance: {
      provider: "Allianz Global",
      policyNumber: "POL-778899",
    },
    travel: {
      airline: "Air India",
      flightNumber: "AI-137",
      travelDate: "2026-08-25",
      pnr: "PNR9988",
    },
  } as unknown as StudentDocumentContext;
}

describe("Phase 4: SOP Workspace Academic Alignment Integration", () => {
  // -------------------------------------------------------------------------
  // Test 10: Sensitive section generation blocked on mismatch
  // -------------------------------------------------------------------------
  it("Test 10: blocks sensitive section generation during academic mismatch", () => {
    // Student with Commerce background applying for Mechanical Engineering
    const input: AlignmentComputeInput = {
      qualifications: [
        {
          id: "q1",
          qualification: "B.Com",
          fieldOfStudy: "Commerce",
        },
      ],
      targetProgram: {
        id: "p1",
        university: "Politecnico di Milano",
        course: "MSc Mechanical Engineering",
        country: "Italy",
        degreeLevel: "Master's",
        courseCategory: "Engineering",
      },
    };

    const alignment = computeAcademicAlignment(input);
    assert.strictEqual(alignment.status, "ACADEMIC_MISMATCH");
    assert.strictEqual(alignment.generationAllowed, false);
    assert.strictEqual(isGenerationAllowed(alignment), false);

    // Verify sensitive sections in University SOP are identified as sensitive
    const sensitiveSectionsSop = [
      "academic-background",
      "why-course",
      "why-university",
      "career-goals",
      "future-academic-plan",
      "projects-research",
    ];

    for (const sec of sensitiveSectionsSop) {
      assert.strictEqual(
        isSensitiveSection(sec, "UNIVERSITY_SOP"),
        true,
        `Expected ${sec} to be sensitive in UNIVERSITY_SOP`
      );
    }
  });

  // -------------------------------------------------------------------------
  // Test 11: Non-sensitive section generation permitted during mismatch
  // -------------------------------------------------------------------------
  it("Test 11: permits non-sensitive section generation during academic mismatch", () => {
    const input: AlignmentComputeInput = {
      qualifications: [
        {
          id: "q1",
          qualification: "B.Com",
          fieldOfStudy: "Commerce",
        },
      ],
      targetProgram: {
        id: "p1",
        university: "Politecnico di Milano",
        course: "MSc Mechanical Engineering",
        country: "Italy",
        degreeLevel: "Master's",
        courseCategory: "Engineering",
      },
    };

    const alignment = computeAcademicAlignment(input);
    assert.strictEqual(alignment.status, "ACADEMIC_MISMATCH");

    // Non-sensitive sections in Visa Cover Letter
    const nonSensitiveVisa = [
      "recipient",
      "subject",
      "student-introduction",
      "why-italy",
      "return-intent",
      "accommodation",
      "insurance",
      "travel",
      "closing-statement",
      "signature",
    ];

    for (const sec of nonSensitiveVisa) {
      assert.strictEqual(
        isSensitiveSection(sec, "VISA_COVER_LETTER"),
        false,
        `Expected ${sec} to be non-sensitive in VISA_COVER_LETTER`
      );
    }

    // Non-sensitive sections in University SOP
    const nonSensitiveSop = ["student-introduction", "closing", "closing-statement"];

    for (const sec of nonSensitiveSop) {
      assert.strictEqual(
        isSensitiveSection(sec, "UNIVERSITY_SOP"),
        false,
        `Expected ${sec} to be non-sensitive in UNIVERSITY_SOP`
      );
    }
  });

  // -------------------------------------------------------------------------
  // Test 23: Visa Cover Letter sensitive sections guarded
  // -------------------------------------------------------------------------
  it("Test 23: guards Visa Cover Letter sensitive sections against mismatch", () => {
    const visaSensitive = [
      "why-course",
      "future-academic-plan",
      "career-plan",
      "academic-background",
      "academic-progression",
    ];

    for (const sec of visaSensitive) {
      assert.strictEqual(
        isSensitiveSection(sec, "VISA_COVER_LETTER"),
        true,
        `Expected Visa section ${sec} to be classified as sensitive`
      );
    }

    // Normalized variants should also match
    assert.strictEqual(isSensitiveSection("WHY_COURSE", "visa_cover_letter"), true);
    assert.strictEqual(isSensitiveSection("Future Academic Plan", "VISA"), true);
  });

  // -------------------------------------------------------------------------
  // Test 24: Document approval gated on unresolved mismatch
  // -------------------------------------------------------------------------
  it("Test 24: gates document approval on unresolved mismatch in validateDocumentContext", () => {
    const ctx = createValidContext();

    // 1. Unresolved mismatch: validateDocumentContext generates blocking error
    const mismatchResult: AcademicAlignmentResult = {
      status: "ACADEMIC_MISMATCH",
      resolution: "UNRESOLVED",
      sourceField: {
        domain: "BUSINESS",
        confidence: "HIGH",
        classifiedFrom: "degree",
      },
      targetField: {
        domain: "ENGINEERING",
        confidence: "HIGH",
        classifiedFrom: "course",
      },
      evidenceSufficient: false,
      generationAllowed: false,
      blockingReason: "Academic mismatch: Commerce to Mechanical Engineering requires justification.",
      confidence: "HIGH",
      explanation: "Significant academic mismatch detected.",
    };

    const issuesWithMismatch = validateDocumentContext(ctx, "VISA_COVER_LETTER", {
      alignmentResult: mismatchResult,
    });

    const mismatchIssue = issuesWithMismatch.find(
      (i) => i.id === "academic-mismatch-unresolved"
    );
    assert.ok(mismatchIssue, "Expected academic-mismatch-unresolved issue");
    assert.strictEqual(mismatchIssue?.severity, "error");
    assert.strictEqual(hasErrors(issuesWithMismatch), true);

    // 2. Confirmed intentional transition with sufficient evidence: unlocks approval
    const confirmedResult: AcademicAlignmentResult = {
      ...mismatchResult,
      status: "CONFIRMED_TRANSITION",
      resolution: "INTENTIONAL_CONFIRMED",
      evidenceSufficient: true,
      generationAllowed: true,
      blockingReason: undefined,
    };

    const issuesConfirmed = validateDocumentContext(ctx, "VISA_COVER_LETTER", {
      alignmentResult: confirmedResult,
    });

    const confirmedMismatchIssue = issuesConfirmed.find(
      (i) => i.id === "academic-mismatch-unresolved"
    );
    assert.strictEqual(confirmedMismatchIssue, undefined);
    assert.strictEqual(hasErrors(issuesConfirmed), false);
  });

  // -------------------------------------------------------------------------
  // UNKNOWN alignment behavior in validateDocumentContext
  // -------------------------------------------------------------------------
  it("gates document approval and generates error issue when domain is UNKNOWN", () => {
    const ctx = createValidContext();

    const unknownResult: AcademicAlignmentResult = {
      status: "UNKNOWN",
      resolution: "UNRESOLVED",
      sourceField: {
        domain: "UNKNOWN",
        confidence: "LOW",
        classifiedFrom: "none",
      },
      targetField: {
        domain: "ENGINEERING",
        confidence: "HIGH",
        classifiedFrom: "course",
      },
      evidenceSufficient: false,
      generationAllowed: false,
      blockingReason: "Academic alignment could not be determined from the available data.",
      confidence: "LOW",
      explanation: "Could not identify discipline.",
    };

    const issues = validateDocumentContext(ctx, "UNIVERSITY_SOP", {
      alignmentResult: unknownResult,
    });

    const unknownIssue = issues.find((i) => i.id === "academic-alignment-unknown");
    assert.ok(unknownIssue, "Expected academic-alignment-unknown issue");
    assert.strictEqual(unknownIssue?.severity, "error");
    assert.strictEqual(hasErrors(issues), true);
  });

  // -------------------------------------------------------------------------
  // Stale resolution warning in validateDocumentContext
  // -------------------------------------------------------------------------
  it("generates warning issue when alignment resolution is stale", () => {
    const ctx = createValidContext();

    const staleResult: AcademicAlignmentResult = {
      status: "CONFIRMED_TRANSITION",
      resolution: "INTENTIONAL_CONFIRMED",
      sourceField: {
        domain: "BUSINESS",
        confidence: "HIGH",
        classifiedFrom: "degree",
      },
      targetField: {
        domain: "ENGINEERING",
        confidence: "HIGH",
        classifiedFrom: "course",
      },
      evidenceSufficient: true,
      generationAllowed: true,
      confidence: "HIGH",
      explanation: "Transition confirmed.",
      isStale: true,
      staleReason: "Target course changed from Civil to Mechanical Engineering.",
    };

    const issues = validateDocumentContext(ctx, "VISA_COVER_LETTER", {
      alignmentResult: staleResult,
    });

    const staleIssue = issues.find((i) => i.id === "academic-alignment-stale");
    assert.ok(staleIssue, "Expected academic-alignment-stale issue");
    assert.strictEqual(staleIssue?.severity, "warning");
    assert.strictEqual(staleIssue?.message, "Target course changed from Civil to Mechanical Engineering.");
  });
});
