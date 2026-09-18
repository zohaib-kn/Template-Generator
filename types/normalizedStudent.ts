/**
 * types/normalizedStudent.ts
 *
 * Unified Normalized Student Profile.
 *
 * Serves as the single common student-data layer between raw Senior CRM API payloads
 * and domain-specific generators (Resume Generator & SOP Generator).
 *
 * ARCHITECTURE:
 *   Senior API (CrmSnapshot)
 *         ↓
 *   NormalizedStudentProfile
 *        ↙                ↘
 *   Resume Mapper       SOP Mapper
 *        ↓                   ↓
 *   DocumentData       StudentDocumentContext
 */

import type { CrmSnapshot } from "./crmSnapshot";

// ---------------------------------------------------------------------------
// Academic qualification entry
// ---------------------------------------------------------------------------

export interface NormalizedQualification {
  id: string;
  levelOfStudy?: string;      // e.g. "10th", "12th", "Undergraduate", "Postgraduate"
  qualification?: string;     // e.g. "B.Com", "B.Tech", "Computer Science"
  institution?: string;       // school or university name
  boardOrUniversity?: string; // board or awarding body
  city?: string;
  country?: string;
  score?: string;             // e.g. "88.6%" or "6"
  gradingSystem?: string;     // e.g. "7" or "10" or "percentage"
  startDate?: string;         // YYYY-MM-DD
  endDate?: string;           // YYYY-MM-DD
  completionYear?: string;    // YYYY
  primaryLanguage?: string;
  backlogs?: string;
}

// ---------------------------------------------------------------------------
// Work experience entry
// ---------------------------------------------------------------------------

export interface NormalizedWorkExperience {
  id: string;
  position?: string;
  organisation?: string;
  location?: string;
  workingFrom?: string;       // YYYY-MM-DD
  workingUpto?: string;       // YYYY-MM-DD
  currentlyWorking?: boolean;
  jobProfile?: string;
  modeOfSalary?: string;
}

// ---------------------------------------------------------------------------
// Standardized test details
// ---------------------------------------------------------------------------

export interface NormalizedEnglishTest {
  type?: string;              // "IELTS", "TOEFL", "PTE", etc.
  overallScore?: string;
  testDate?: string;          // YYYY-MM-DD
  subscores?: {
    listening?: string;
    reading?: string;
    writing?: string;
    speaking?: string;
  };
  waiver?: boolean;
  waiver12thEnglishMark?: string;
}

// ---------------------------------------------------------------------------
// Applied program entry
// ---------------------------------------------------------------------------

export interface NormalizedAppliedProgram {
  id: string;
  country: string;
  university: string;
  course: string;
  degreeLevel: string;
  courseCategory: string;
  referenceNo?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Main Unified Profile
// ---------------------------------------------------------------------------

export interface NormalizedStudentProfile {
  /** Metadata regarding data source and fetch timestamp */
  meta: {
    studentId: string;
    source: "senior-crm-api" | "cached-snapshot" | "static-mock";
    fetchedAt: string;
    rawSnapshot?: CrmSnapshot | null;
  };

  /** Core Personal & Contact facts */
  personal: {
    fullName: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth?: string;     // YYYY-MM-DD
    gender?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    nationality?: string;
    passportNumber?: string;
    passportIssueDate?: string;
    passportExpiryDate?: string;
    placeOfBirth?: string;
    photoUrl?: string;
  };

  /** Academic background */
  academics: {
    qualifications: NormalizedQualification[];
    /** Fast pointer to highest / most recent qualification */
    latest?: {
      qualification: string;
      institution: string;
      board: string;
      completionYear: string;
      score?: string;
      subjects?: string;
    };
  };

  /** Professional / work history (Resume primary) */
  workExperience: NormalizedWorkExperience[];

  /** Standardized tests */
  tests: {
    english?: NormalizedEnglishTest;
  };

  /** Program applications preserved in full */
  applications: {
    all: NormalizedAppliedProgram[];
    activeProgramId?: string;
    activeProgram?: NormalizedAppliedProgram;
  };

  /** Family & emergency contacts (SOP primary) */
  family?: {
    father?: { name?: string; phone?: string; email?: string; occupation?: string };
    mother?: { name?: string; phone?: string; email?: string; occupation?: string };
  };

  /** Loan & basic financial facts from CRM (SOP primary) */
  finance?: {
    bankName?: string;
    loanStatus?: string;
    loanAmountSanctioned?: string;
    currency?: string;
  };

  /** Visa logistics (SOP specific — unpopulated fields remain undefined) */
  visaLogistics?: {
    accommodation?: {
      name?: string;
      type?: string;
      address?: string;
      city?: string;
      country?: string;
      fromDate?: string;
      toDate?: string;
      bookingReference?: string;
    };
    insurance?: {
      provider?: string;
      policyNumber?: string;
      coverageAmount?: string;
      fromDate?: string;
      toDate?: string;
    };
    travel?: {
      airline?: string;
      flightNumber?: string;
      origin?: string;
      destination?: string;
      travelDate?: string;
      pnr?: string;
      returnDate?: string;
    };
    consulate?: {
      name?: string;
      city?: string;
      address?: string;
    };
  };
}
