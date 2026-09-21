/**
 * services/ai/documents/canonicalDocument.ts
 *
 * Canonical Document Data Schema.
 * Every input (whether form, CRM snapshot, or existing context) is normalized
 * into this standard structure before processing or prompting Gemini.
 */

import { DocumentType } from "../config/documentTypes";

export interface CanonicalApplicant {
  name: string;
  firstName?: string;
  lastName?: string;
  nationality: string;
  city: string;
  country: string;
  passportNumber: string;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CanonicalEducation {
  qualification: string;
  institution: string;
  boardOrUniversity: string;
  year: string;
  percentage?: string;
  gpa?: string;
  subjects: string[];
}

export interface CanonicalLanguageTest {
  name: string;
  overall: string;
  components?: Record<string, string>;
  dateTaken?: string;
}

export interface CanonicalFamilyMember {
  name?: string;
  relationship?: string;
  occupation?: string;
  annualIncome?: string;
  phone?: string;
}

export interface CanonicalFamily {
  father?: CanonicalFamilyMember;
  mother?: CanonicalFamilyMember;
  siblings?: string[];
  homeTies?: string[];
}

export interface CanonicalUniversity {
  name: string;
  officialName: string;
  country: string;
  city: string;
  department?: string;
}

export interface CanonicalCourse {
  officialName: string;
  level: string;
  duration: string;
  startDate?: string;
  intakeMonth?: string;
  intakeYear?: string;
  subjectsOrAreas: string[];
}

export interface CanonicalMotivation {
  academicInterests: string[];
  courseReasons: string[];
  universityReasons: string[];
  countryReasons: string[];
}

export interface CanonicalCareer {
  higherStudyPlan?: string;
  shortTermPlan?: string;
  longTermPlan?: string;
  returnCountry?: string;
  returnReasons?: string[];
}

export interface CanonicalFinancials {
  sponsor?: {
    name?: string;
    relationship?: string;
    occupation?: string;
    annualIncome?: string;
    incomeSource?: string;
  };
  educationLoan?: {
    amount?: string;
    bank?: string;
    status?: string;
  };
  bankFunds?: {
    balance?: string;
    bank?: string;
    currency?: string;
  };
  totalFunds?: string;
  netWorth?: string;
  supportingDocuments?: string[];
}

export interface CanonicalAccommodation {
  name?: string;
  type?: string;
  address?: string;
  city?: string;
  country?: string;
  fromDate?: string;
  toDate?: string;
  bookingReference?: string;
}

export interface CanonicalInsurance {
  provider?: string;
  policyNumber?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
  coverageAmount?: string;
}

export interface CanonicalTravel {
  airline?: string;
  flightNumber?: string;
  origin?: string;
  destination?: string;
  travelDate?: string;
  pnr?: string;
  returnDate?: string;
}

export interface CanonicalRecommender {
  prefix?: string;
  name?: string;
  title?: string;
  role?: string;
  department?: string;
  institution?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  durationKnown?: string;
  coursesTaught?: string[];
  academicStandingNote?: string;
}

export interface CanonicalProject {
  title: string;
  technologies?: string;
  description?: string;
  role?: string;
  duration?: string;
}

export interface CanonicalWorkExperience {
  position: string;
  organisation: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface CanonicalDocumentData {
  documentType: DocumentType;
  studentId?: string;
  applicationId?: string;

  applicant: CanonicalApplicant;
  education: CanonicalEducation;
  languageTests: CanonicalLanguageTest[];
  otherTests: Array<{ name: string; score: string; dateTaken?: string }>;

  family: CanonicalFamily;
  university: CanonicalUniversity;
  course: CanonicalCourse;

  motivation: CanonicalMotivation;
  career: CanonicalCareer;
  financials: CanonicalFinancials;

  accommodation?: CanonicalAccommodation;
  insurance?: CanonicalInsurance;
  travel?: CanonicalTravel;

  recommender?: CanonicalRecommender;

  projects: CanonicalProject[];
  workExperience: CanonicalWorkExperience[];
  achievements: string[];
  additionalFacts: string[];
}
