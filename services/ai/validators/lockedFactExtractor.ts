/**
 * services/ai/validators/lockedFactExtractor.ts
 *
 * Deterministically extracts the list of immutable facts that must be preserved
 * character-for-character in the generated document.
 */

import { DOCUMENT_TYPES } from "../config/documentTypes";
import { CanonicalDocumentData } from "../documents/canonicalDocument";

export interface LockedFact {
  field: string;
  value: string;
  category: "identity" | "academic" | "financial" | "logistics" | "recommender";
  required: boolean;
}

export function extractLockedFacts(data: CanonicalDocumentData): LockedFact[] {
  const locked: LockedFact[] = [];

  const add = (
    field: string,
    value: string | undefined | null,
    category: LockedFact["category"],
    required = true
  ) => {
    if (!value) return;
    const trimmed = String(value).trim();
    if (trimmed.length === 0) return;
    // Don't add duplicate field/value pairs
    if (locked.some((l) => l.field === field && l.value === trimmed)) return;

    locked.push({
      field,
      value: trimmed,
      category,
      required,
    });
  };

  // 1. Identity Facts (All documents)
  add("applicantName", data.applicant.name, "identity");

  // Passport & DOB are critical for Cover Letters
  if (data.documentType === DOCUMENT_TYPES.VISA_COVER_LETTER) {
    add("passportNumber", data.applicant.passportNumber, "identity");
    add("dateOfBirth", data.applicant.dateOfBirth, "identity", false);
  }

  // 2. Academic Facts
  add("universityName", data.university.officialName, "academic");
  add("courseName", data.course.officialName, "academic");
  add("previousQualification", data.education.qualification, "academic", false);
  add("previousInstitution", data.education.institution, "academic", false);
  add("academicPercentage", data.education.percentage, "academic", false);

  // English Tests
  for (const test of data.languageTests) {
    if (test.overall) {
      add(`testScore_${test.name}`, test.overall, "academic", false);
    }
  }

  // 3. Financial Facts (Visa Cover Letter only)
  if (data.documentType === DOCUMENT_TYPES.VISA_COVER_LETTER) {
    if (data.financials.sponsor?.name) {
      add("sponsorName", data.financials.sponsor.name, "financial");
    }
    if (data.financials.sponsor?.annualIncome) {
      add("sponsorIncome", data.financials.sponsor.annualIncome, "financial", false);
    }
    if (data.financials.educationLoan?.amount) {
      add("loanAmount", data.financials.educationLoan.amount, "financial");
    }
    if (data.financials.educationLoan?.bank) {
      add("loanBank", data.financials.educationLoan.bank, "financial", false);
    }
    if (data.financials.bankFunds?.balance) {
      add("bankBalance", data.financials.bankFunds.balance, "financial");
    }
    if (data.financials.totalFunds) {
      add("totalFunds", data.financials.totalFunds, "financial");
    }
  }

  // 4. Logistics Facts (Visa Cover Letter only)
  if (data.documentType === DOCUMENT_TYPES.VISA_COVER_LETTER) {
    if (data.accommodation?.bookingReference) {
      add("accommodationBookingRef", data.accommodation.bookingReference, "logistics");
    }
    if (data.insurance?.policyNumber) {
      add("insurancePolicyNumber", data.insurance.policyNumber, "logistics");
    }
    if (data.insurance?.coverageAmount) {
      add("insuranceCoverageAmount", data.insurance.coverageAmount, "logistics");
    }
    if (data.travel?.flightNumber) {
      add("flightNumber", data.travel.flightNumber, "logistics");
    }
    if (data.travel?.pnr) {
      add("pnr", data.travel.pnr, "logistics");
    }
  }

  // 5. Recommender Facts (LOR only)
  if (data.documentType === DOCUMENT_TYPES.LOR && data.recommender) {
    if (data.recommender.name) {
      add("recommenderName", data.recommender.name, "recommender");
    }
    if (data.recommender.title) {
      add("recommenderTitle", data.recommender.title, "recommender");
    }
  }

  return locked;
}
