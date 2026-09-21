/**
 * services/ai/validators/conflictDetector.ts
 *
 * Deterministically scans input data for factual contradictions BEFORE calling Gemini.
 * If conflicts exist, returns NEEDS_REVIEW with the conflicting fields and values.
 * Gemini must NEVER guess which conflicting value is correct.
 */

import { CanonicalDocumentData } from "../documents/canonicalDocument";

export interface ConflictItem {
  field: string;
  values: string[];
  message: string;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictItem[];
}

function asRecord(val: unknown): Record<string, unknown> {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : {};
}

function asString(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined;
}

export function detectDataConflicts(
  data: CanonicalDocumentData,
  rawPayloadInput?: Record<string, unknown>
): ConflictDetectionResult {
  const conflicts: ConflictItem[] = [];
  const rawPayload = asRecord(rawPayloadInput);
  const rawPassportInfo = asRecord(rawPayload.passportInfo);
  const rawStudent = asRecord(rawPayload.student);
  const rawDestination = asRecord(rawPayload.destination);
  const rawFinance = asRecord(rawPayload.finance);

  // Helper to test if two non-empty strings conflict
  const checkContradiction = (
    field: string,
    val1?: string | null,
    val2?: string | null,
    label = field
  ) => {
    if (!val1 || !val2) return;
    const clean1 = val1.trim();
    const clean2 = val2.trim();
    if (clean1 && clean2 && clean1.toLowerCase() !== clean2.toLowerCase()) {
      conflicts.push({
        field,
        values: [clean1, clean2],
        message: `Conflicting values found for ${label}: "${clean1}" vs "${clean2}".`,
      });
    }
  };

  // 1. Passport Number Conflict
  const passport1 = data.applicant.passportNumber;
  const passport2 = asString(rawPassportInfo.passportNumber || rawStudent.passportNumber);
  if (passport1 && passport2 && passport1.trim().toLowerCase() !== passport2.trim().toLowerCase()) {
    conflicts.push({
      field: "passportNumber",
      values: [passport1.trim(), passport2.trim()],
      message: `Passport number conflict: "${passport1.trim()}" vs "${passport2.trim()}".`,
    });
  }

  // Also check if multiple passport numbers appear in additional facts or strings
  const allPassportMatches = JSON.stringify(rawPayloadInput || {})
    .match(/[A-Z][0-9]{7,8}/g);
  if (allPassportMatches) {
    const uniquePassports = Array.from(new Set(allPassportMatches));
    if (uniquePassports.length > 1) {
      conflicts.push({
        field: "passportNumber",
        values: uniquePassports,
        message: `Multiple differing passport numbers detected in input payload: ${uniquePassports.join(", ")}.`,
      });
    }
  }

  // 2. University Name Conflict
  const targetUni = data.university.officialName;
  const rawUni = asString(rawPayload.targetUniversity || rawDestination.university);
  if (typeof rawUni === "string") {
    checkContradiction("universityName", targetUni, rawUni, "target university");
  }

  // 3. Course / Program Conflict
  const targetCourse = data.course.officialName;
  const rawCourse = asString(rawPayload.targetProgram || rawDestination.course);
  if (typeof rawCourse === "string") {
    checkContradiction("courseName", targetCourse, rawCourse, "target course");
  }

  // 4. Destination Country Conflict
  const targetCountry = data.university.country;
  const rawCountry = asString(rawPayload.targetCountry || rawDestination.country);
  if (typeof rawCountry === "string") {
    checkContradiction("destinationCountry", targetCountry, rawCountry, "destination country");
  }

  // 5. Sponsor Name Conflict
  const sponsorName = data.financials.sponsor?.name;
  const fatherName = data.family.father?.name;
  if (
    data.financials.sponsor?.relationship === "Father" &&
    sponsorName &&
    fatherName &&
    sponsorName.toLowerCase() !== fatherName.toLowerCase()
  ) {
    conflicts.push({
      field: "sponsorName",
      values: [sponsorName, fatherName],
      message: `Sponsor specified as Father has name "${sponsorName}", but family father name is "${fatherName}".`,
    });
  }

  // 6. Conflicting Loan Amounts if provided under differing keys
  const loan1 = data.financials.educationLoan?.amount;
  const loan2 = asString(rawFinance.educationLoanAmount);
  if (loan1 && loan2 && loan1.trim() !== loan2.trim()) {
    checkContradiction("educationLoanAmount", loan1, loan2, "education loan amount");
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}
