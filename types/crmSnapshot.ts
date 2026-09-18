/**
 * types/crmSnapshot.ts
 *
 * TypeScript interfaces that exactly match the shape of the CRM student
 * data-snapshot API response.
 *
 * Endpoint: GET /api/students/{studentId}/data-snapshot?key={apiKey}
 *
 * These types are used ONLY in the backend adapter layer
 * (app/api/mock-student-webhook/route.ts and utils/mapCrmSnapshot.ts).
 * They are NEVER used in the frontend or PDF template.
 */

// ---------------------------------------------------------------------------
// Sub-objects inside student
// ---------------------------------------------------------------------------

export interface CrmPersonalDetails {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  personalEmail?: string;
  alternateEmail?: string;
  mobile?: string;
  dob?: string;           // ISO-8601, e.g. "2018-05-24T00:00:00.000Z"
  gender?: string;
  maritalStatus?: string;
}

export interface CrmNationality {
  nationality?: string;
  citizenship?: string;
  dualCitizenship?: boolean;
  extraCitizenships?: string[];
  livingInOtherCountry?: boolean;
  livingCountry?: string;
}

export interface CrmPassportInfo {
  passportNumber?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  issueCountry?: string;
  cityOfBirth?: string;
  countryOfBirth?: string;
}

export interface CrmAddress {
  address1?: string;
  address2?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
}

export interface CrmAcademicQualification {
  _id?: string;
  levelOfStudy?: string;      // e.g. "10th", "12th", "Undergraduate", "Postgraduate"
  countryOfStudy?: string;
  stateOfStudy?: string;
  boardOrUniversity?: string;
  qualification?: string;     // e.g. "B.Com", "B.Tech"
  institution?: string;
  cityOfStudy?: string;
  gradingSystem?: string;
  score?: string;
  primaryLanguage?: string;
  backlogs?: string;
  startDate?: string;         // ISO-8601
  endDate?: string;           // ISO-8601
  duration?: string;
}

export interface CrmWorkExperience {
  _id?: string;
  /** Job title / role. CRM field: "position" */
  position?: string;
  /** Company / employer. CRM field: "organisation" */
  organisation?: string;
  location?: string;
  /** Start date. CRM field: "workingFrom" */
  workingFrom?: string;       // ISO-8601
  /** End date. CRM field: "workingUpto" */
  workingUpto?: string;       // ISO-8601
  currentlyWorking?: boolean;
  /** Job description. CRM field: "jobProfile" */
  jobProfile?: string;
  modeOfSalary?: string;
}

export interface CrmDocumentFile {
  url?: string;
  fileUrl?: string;
  status?: string;
  approvalStatus?: string;
}

export interface CrmDocument {
  name?: string;
  category?: string;
  files?: CrmDocumentFile[];
  uploadedOn?: string;
  approvalStatus?: string;
  required?: boolean;
}

export interface CrmAppliedProgram {
  _id?: string;
  course?: {
    _id?: string;
    title?: string;
  };
  university?: {
    _id?: string;
    name?: string;
  };
  country?: {
    _id?: string;
    name?: string;
  };
  referenceNo?: string;
  createdAt?: string;
}

export interface CrmTest {
  _id?: string;
  /** Overall band/score. CRM field: "overallScore" */
  overallScore?: string;
  /** Date the test was taken. CRM field: "testDate" */
  testDate?: string;          // ISO-8601
  yetToReceive?: boolean;
  yetToReceiveDate?: string;
  waiver?: boolean;
  waiver12thEnglishMarkCheck?: boolean;
  waiver12thEnglishMark?: string;
}

// ---------------------------------------------------------------------------
// Top-level student object
// ---------------------------------------------------------------------------

export interface CrmStudent {
  _id?: string;
  personalDetails?: CrmPersonalDetails;
  nationality?: CrmNationality;
  passportInfo?: CrmPassportInfo;
  mailingAddress?: CrmAddress;
  permanentAddress?: CrmAddress;
  academicQualifications?: CrmAcademicQualification[];
  workExperience?: CrmWorkExperience[];
  tests?: CrmTest[];
  documents?: CrmDocument[];
  appliedCourses?: unknown[];
  interestedPrograms?: unknown[];
  /** Background / immigration info */
  backgroundInfo?: Record<string, unknown>;
  /** Parents contact info */
  parents?: {
    father?: Record<string, string>;
    mother?: Record<string, string>;
  };
  /** Emergency contact */
  emergencyContact?: Record<string, string>;
  /** Consultancy fee details */
  consultancyFee?: Record<string, unknown>;
  /** Loan details (nested) */
  loan?: { overview?: Record<string, unknown> };
  /** Payment plan */
  paymentPlan?: Record<string, unknown>;
  /** Master info for SOP */
  masterInfo?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Full API response envelope
// ---------------------------------------------------------------------------

export interface CrmSnapshot {
  student?: CrmStudent;
  documents?: CrmDocument[];
  documentExtractions?: unknown[];
  shortlistedPrograms?: CrmAppliedProgram[];
  appliedPrograms?: CrmAppliedProgram[];
}
