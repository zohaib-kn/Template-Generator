/**
 * services/ai/validators/lockedFactExtractor.ts
 *
 * Deterministically extracts the list of immutable facts that must be preserved
 * character-for-character in the generated document.
 */

import { DOCUMENT_TYPES } from "../config/documentTypes";
import { CanonicalDocumentData } from "../documents/canonicalDocument";
import { normalizeDocumentData } from "../documents/normalizeDocumentData";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";

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

/**
 * Deterministically extracts section-relevant locked facts from either
 * CanonicalDocumentData or StudentDocumentContext.
 */
export function extractSectionLockedFacts(
  data: CanonicalDocumentData | StudentDocumentContext | Record<string, unknown>,
  options: {
    sectionId: string;
    documentType?: string;
    generatedText?: string;
  }
): LockedFact[] {
  // If data is already CanonicalDocumentData (has applicant property)
  const isCanonical =
    Boolean(data) &&
    typeof data === "object" &&
    "applicant" in data &&
    typeof (data as CanonicalDocumentData).applicant === "object";

  const canonical: CanonicalDocumentData = isCanonical
    ? (data as CanonicalDocumentData)
    : normalizeDocumentData({
        ...(data as Record<string, unknown>),
        documentType:
          options.documentType ||
          (data as { documentType?: string }).documentType ||
          DOCUMENT_TYPES.VISA_COVER_LETTER,
      });

  const allFacts = extractLockedFacts(canonical);
  const normSec = options.sectionId.toLowerCase().replace(/[\s_]+/g, "-");
  const docLower = options.generatedText ? options.generatedText.toLowerCase() : "";

  // Identify functional section category
  const isIntro = normSec.includes("intro");
  const isCourse = normSec.includes("course") || normSec === "academic-interests";
  const isUni = normSec.includes("university") || normSec.includes("institution");
  const isAcademic =
    normSec.includes("academic") ||
    normSec.includes("education") ||
    normSec.includes("journey") ||
    normSec.includes("progression");
  const isFinance =
    normSec.includes("financ") ||
    normSec.includes("fund") ||
    normSec.includes("sponsor");
  const isAccom = normSec.includes("accommodat");
  const isInsurance = normSec.includes("insur");
  const isTravel = normSec.includes("travel") || normSec.includes("flight");

  return allFacts.map((fact) => {
    let required = false;

    if (isIntro) {
      if (fact.field === "applicantName" || fact.field === "courseName" || fact.field === "universityName") {
        required = true;
      }
    } else if (isCourse) {
      if (fact.field === "courseName") required = true;
    } else if (isUni) {
      if (fact.field === "universityName") required = true;
    } else if (isAcademic) {
      if (fact.field === "previousQualification" || fact.field === "academicPercentage") {
        required = true;
      }
    } else if (isFinance) {
      if (fact.field === "sponsorName" || fact.field === "loanAmount" || fact.field === "bankBalance") {
        required = true;
      }
    } else if (isAccom && fact.field === "accommodationBookingRef") {
      required = true;
    } else if (isInsurance && fact.field === "insurancePolicyNumber") {
      required = true;
    } else if (isTravel && (fact.field === "flightNumber" || fact.field === "pnr")) {
      required = true;
    }

    // Dynamic topic detection: if generatedText touches this specific topic,
    // the fact MUST be preserved accurately rather than altered.
    if (!required && docLower) {
      if (
        fact.field.startsWith("testScore_") &&
        (docLower.includes("ielts") || docLower.includes("band") || docLower.includes("toefl"))
      ) {
        required = true;
      } else if (
        fact.field === "academicPercentage" &&
        (docLower.includes("%") || docLower.includes("percent") || docLower.includes("marks"))
      ) {
        required = true;
      } else if (
        fact.field === "passportNumber" &&
        (docLower.includes("passport") || docLower.includes("travel document"))
      ) {
        required = true;
      } else if (
        fact.field === "loanAmount" &&
        (docLower.includes("loan") || docLower.includes("sanction"))
      ) {
        required = true;
      } else if (
        fact.field === "insurancePolicyNumber" &&
        (docLower.includes("policy") || docLower.includes("insurance"))
      ) {
        required = true;
      } else if (
        fact.field === "accommodationBookingRef" &&
        (docLower.includes("booking") || docLower.includes("reservation"))
      ) {
        required = true;
      } else if (
        (fact.field === "flightNumber" || fact.field === "pnr") &&
        (docLower.includes("flight") || docLower.includes("pnr") || docLower.includes("ticket"))
      ) {
        required = true;
      }
    }

    return {
      ...fact,
      required,
    };
  });
}

