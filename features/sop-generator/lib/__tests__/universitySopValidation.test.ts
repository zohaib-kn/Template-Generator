/**
 * features/sop-generator/lib/__tests__/universitySopValidation.test.ts
 *
 * Tests for document-type aware validation:
 * - UNIVERSITY_SOP passes without visa logistics (sponsor, finance, flight, accommodation, insurance).
 * - VISA_COVER_LETTER still requires visa logistics.
 * - Missing student name, course, or university blocks both.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { validateDocumentContext, hasErrors } from "../validateDocumentContext";
import { getStudentDocumentContext } from "../applicationService";
import type { StudentDocumentContext } from "../../types/sop-generator";

test("Validation — University SOP passes without visa logistics", () => {
  const baseCtx = getStudentDocumentContext();

  // Strip all visa logistics completely
  const sopCtx: StudentDocumentContext = {
    ...baseCtx,
    sponsor: {
      name: "",
      relationship: "",
      occupation: "",
      annualIncome: "",
      incomeSource: "",
    },
    finance: {
      educationLoanAmount: "",
      loanProvider: "",
      bankName: "",
      accountHolderName: "",
      availableBalance: "",
      totalFundsAvailable: "",
      currency: "",
    },
    accommodation: {
      name: "",
      type: "",
      address: "",
      city: "",
      country: "",
      fromDate: "",
      toDate: "",
      bookingReference: "",
    },
    insurance: {
      provider: "",
      policyNumber: "",
      type: "",
      fromDate: "",
      toDate: "",
      coverageAmount: "",
    },
    travel: {
      airline: "",
      flightNumber: "",
      origin: "",
      destination: "",
      travelDate: "",
      pnr: "",
      returnDate: "",
    },
  };

  // Validating as UNIVERSITY_SOP must NOT have errors
  const sopIssues = validateDocumentContext(sopCtx, "UNIVERSITY_SOP");
  assert.equal(
    hasErrors(sopIssues),
    false,
    `Expected no blocking errors for University SOP, but found: ${JSON.stringify(sopIssues.filter((i) => i.severity === "error"))}`
  );

  // The exact same context validated as VISA_COVER_LETTER MUST have blocking errors
  const visaIssues = validateDocumentContext(sopCtx, "VISA_COVER_LETTER");
  assert.equal(
    hasErrors(visaIssues),
    true,
    "Expected blocking errors for Visa Cover Letter due to missing sponsor and funds"
  );
  assert.ok(visaIssues.some((i) => i.id === "sponsor-name-missing"));
  assert.ok(visaIssues.some((i) => i.id === "finance-total-missing"));
});

test("Validation — Missing core student or program blocks University SOP", () => {
  const baseCtx = getStudentDocumentContext();

  const missingStudentCtx: StudentDocumentContext = {
    ...baseCtx,
    student: { ...baseCtx.student, fullName: "" },
  };
  const issues1 = validateDocumentContext(missingStudentCtx, "UNIVERSITY_SOP");
  assert.equal(hasErrors(issues1), true);
  assert.ok(issues1.some((i) => i.id === "student-name-missing"));

  const missingCourseCtx: StudentDocumentContext = {
    ...baseCtx,
    destination: { ...baseCtx.destination, course: "" },
  };
  const issues2 = validateDocumentContext(missingCourseCtx, "UNIVERSITY_SOP");
  assert.equal(hasErrors(issues2), true);
  assert.ok(issues2.some((i) => i.id === "destination-course-missing"));

  const missingQualCtx: StudentDocumentContext = {
    ...baseCtx,
    academics: { ...baseCtx.academics, latestQualification: "" },
  };
  const issues3 = validateDocumentContext(missingQualCtx, "UNIVERSITY_SOP");
  assert.equal(hasErrors(issues3), true);
  assert.ok(issues3.some((i) => i.id === "academic-qualification-missing"));
});
