/**
 * validateDocumentContext
 *
 * Validates the StudentDocumentContext for completeness and consistency.
 *
 * Returns a list of ValidationIssues. The severity levels are:
 *   error   — must be resolved before the document can be approved
 *   warning — counsellor should review but not necessarily blocking
 *   info    — informational note
 *
 * Phase 1 validates:
 *   - Required factual fields present
 *   - University-country consistency (cross-check against verified database)
 *   - Accommodation dates present
 *   - Travel information completeness
 */

import type {
  StudentDocumentContext,
  ValidationIssue,
} from "../types/sop-generator";
import { lookupUniversity } from "../data/mock-verified-destination";

/**
 * Validate a StudentDocumentContext.
 * Returns an array of issues (empty array means all checks passed).
 */
export function validateDocumentContext(
  ctx: StudentDocumentContext
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // ── Student ──────────────────────────────────────────────────────────────
  if (!ctx.student.fullName?.trim()) {
    issues.push({
      id: "student-name-missing",
      field: "student.fullName",
      severity: "error",
      message: "Student full name is missing.",
    });
  }

  if (!ctx.student.dateOfBirth?.trim()) {
    issues.push({
      id: "student-dob-missing",
      field: "student.dateOfBirth",
      severity: "warning",
      message: "Student date of birth is missing.",
    });
  }

  if (!ctx.student.passportNumber?.trim()) {
    issues.push({
      id: "student-passport-missing",
      field: "student.passportNumber",
      severity: "warning",
      message: "Passport number is missing.",
    });
  }

  // ── Destination ──────────────────────────────────────────────────────────
  if (!ctx.destination.country?.trim()) {
    issues.push({
      id: "destination-country-missing",
      field: "destination.country",
      severity: "error",
      message: "Destination country is missing.",
    });
  }

  if (!ctx.destination.university?.trim()) {
    issues.push({
      id: "destination-university-missing",
      field: "destination.university",
      severity: "error",
      message: "Destination university is missing.",
    });
  }

  if (!ctx.destination.course?.trim()) {
    issues.push({
      id: "destination-course-missing",
      field: "destination.course",
      severity: "error",
      message: "Intended course is missing.",
    });
  }

  // ── University-country cross-check ───────────────────────────────────────
  if (ctx.destination.university?.trim() && ctx.destination.country?.trim()) {
    const verified = lookupUniversity(ctx.destination.university);

    if (verified) {
      const countryMatches =
        verified.country.toLowerCase() ===
        ctx.destination.country.toLowerCase();

      if (!countryMatches) {
        issues.push({
          id: "university-country-mismatch",
          field: "destination.university",
          severity: "error",
          message: `University-country mismatch: "${ctx.destination.university}" is in ${verified.country}, but destination country is set to "${ctx.destination.country}".`,
        });
      } else {
        issues.push({
          id: "university-country-verified",
          field: "destination.university",
          severity: "info",
          message: `University verified: ${verified.canonicalName} is in ${verified.country}. ✓`,
        });
      }
    } else {
      issues.push({
        id: "university-not-in-verified-db",
        field: "destination.university",
        severity: "warning",
        message: `"${ctx.destination.university}" was not found in the verified university database. Please manually confirm the country.`,
      });
    }
  }

  // ── Sponsor ──────────────────────────────────────────────────────────────
  if (!ctx.sponsor.name?.trim()) {
    issues.push({
      id: "sponsor-name-missing",
      field: "sponsor.name",
      severity: "error",
      message: "Sponsor name is missing.",
    });
  }

  // ── Finance ──────────────────────────────────────────────────────────────
  if (!ctx.finance.totalFundsAvailable?.trim()) {
    issues.push({
      id: "finance-total-missing",
      field: "finance.totalFundsAvailable",
      severity: "error",
      message: "Total available funds amount is missing.",
    });
  }

  if (!ctx.finance.bankName?.trim()) {
    issues.push({
      id: "finance-bank-missing",
      field: "finance.bankName",
      severity: "warning",
      message: "Bank name for financial statement is missing.",
    });
  }

  // ── Accommodation ────────────────────────────────────────────────────────
  if (!ctx.accommodation.name?.trim()) {
    issues.push({
      id: "accommodation-name-missing",
      field: "accommodation.name",
      severity: "warning",
      message: "Accommodation name requires confirmation.",
    });
  }

  if (!ctx.accommodation.fromDate?.trim() || !ctx.accommodation.toDate?.trim()) {
    issues.push({
      id: "accommodation-dates-missing",
      field: "accommodation.fromDate",
      severity: "warning",
      message: "Accommodation booking dates are incomplete.",
    });
  }

  // ── Insurance ────────────────────────────────────────────────────────────
  if (!ctx.insurance.provider?.trim()) {
    issues.push({
      id: "insurance-provider-missing",
      field: "insurance.provider",
      severity: "warning",
      message: "Travel insurance provider is missing.",
    });
  }

  if (!ctx.insurance.policyNumber?.trim()) {
    issues.push({
      id: "insurance-policy-missing",
      field: "insurance.policyNumber",
      severity: "warning",
      message: "Insurance policy number is missing.",
    });
  }

  // ── Travel ───────────────────────────────────────────────────────────────
  const travelIncomplete =
    !ctx.travel.airline?.trim() ||
    !ctx.travel.travelDate?.trim() ||
    !ctx.travel.pnr?.trim();

  if (travelIncomplete) {
    issues.push({
      id: "travel-incomplete",
      field: "travel.pnr",
      severity: "warning",
      message:
        "Travel information is incomplete. Airline, travel date, or PNR reference is missing.",
    });
  }

  return issues;
}

/** Returns true if the context has any blocking errors. */
export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
