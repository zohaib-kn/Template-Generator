/**
 * Document domain types.
 *
 * These interfaces describe the shape of document data as understood by
 * the frontend. They are intentionally minimal and extensible — new fields
 * should be added when the corresponding UI section is implemented.
 *
 * The backend will validate and persist a compatible structure. These types
 * are NOT database schemas — do not add persistence concerns here.
 */

// ---------------------------------------------------------------------------
// Primitive identifiers
// ---------------------------------------------------------------------------

/** Unique identifier for a persisted document. Opaque string (e.g. UUID). */
export type DocumentId = string;

/** Status of a document within its lifecycle. */
export type DocumentStatus = "draft" | "complete" | "archived";

// ---------------------------------------------------------------------------
// Personal details
// ---------------------------------------------------------------------------

/**
 * The personal / contact information block that appears at the top of the
 * first page. All fields are optional so the form can be partially saved.
 */
export interface PersonalDetails {
  /** Full name of the document subject. */
  fullName?: string;
  /** Passport number or national ID reference. */
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string; // ISO-8601 date string, e.g. "1998-05-12"
  placeOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  /**
   * Relative or absolute URL / data-URI for the profile photograph.
   * Asset upload is handled separately by the Assets domain.
   */
  photoUrl?: string;
}

// ---------------------------------------------------------------------------
// Repeatable section entries
// ---------------------------------------------------------------------------

export interface EducationEntry {
  id: string; // client-generated stable key for list reconciliation
  institution?: string;
  qualification?: string;
  fieldOfStudy?: string;
  startDate?: string; // ISO-8601 date string
  endDate?: string; // ISO-8601 date string, or empty if ongoing
  description?: string;
}

export interface RecommendationEntry {
  id: string;
  recommenderName?: string;
  recommenderTitle?: string;
  organization?: string;
  text?: string;
}

export interface LanguageEntry {
  id: string;
  language?: string;
  /** Self-assessed level, e.g. "Native", "B2", "Intermediate". */
  level?: string;
}

export interface SkillEntry {
  id: string;
  name?: string;
  /** Optional proficiency descriptor. */
  proficiency?: string;
}

export interface HobbyEntry {
  id: string;
  name?: string;
  /** Optional one-sentence context, e.g. "Creates short films and enjoys visual storytelling." */
  description?: string;
}

// ---------------------------------------------------------------------------
// University-admissions sections
// ---------------------------------------------------------------------------

export interface AcademicInterest {
  id: string;
  /** The subject or field, e.g. "International Relations", "Molecular Biology". */
  name?: string;
}

export interface AcademicProject {
  id: string;
  title?: string;
  description?: string;
  /** e.g. "Lead researcher", "Team member". */
  role?: string;
  /** Year or date range, e.g. "2024" or "Jan 2024". */
  dateYear?: string;
  /** Technologies / skills / learning outcomes. */
  skills?: string;
  /** Optional URL to project, report, or repository. */
  link?: string;
}

export interface Achievement {
  id: string;
  title?: string;
  /** Awarding body or institution. */
  organisation?: string;
  /** Year or date, e.g. "2023". */
  dateYear?: string;
  description?: string;
}

export interface LeadershipActivity {
  id: string;
  /** Role or activity title, e.g. "Debate Club President". */
  activity?: string;
  /** Club, school, or organisation name. */
  organisation?: string;
  /** Duration or date range, e.g. "2022–2024". */
  duration?: string;
  description?: string;
  /** Key responsibility or measurable impact (optional). */
  impact?: string;
}

export interface Certification {
  id: string;
  /** Certificate or course name. */
  name?: string;
  /** Issuing body, e.g. "Coursera", "Google", "edX". */
  provider?: string;
  /** Month/year of completion, e.g. "March 2024". */
  completionDate?: string;
  /** URL to credential or verification link. */
  credentialLink?: string;
  description?: string;
}

export interface VolunteeringEntry {
  id: string;
  organization?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface InternshipEntry {
  id: string;
  role?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Singleton section blocks
// ---------------------------------------------------------------------------

export interface EnglishCertificate {
  examName?: string; // e.g. "IELTS", "TOEFL"
  score?: string;
  dateTaken?: string; // ISO-8601 date string
  issuingBody?: string;
}

// ---------------------------------------------------------------------------
// Top-level document data
// ---------------------------------------------------------------------------

/**
 * The complete structured content of one document.
 *
 * This maps to the `data` field of the persisted Document entity.
 * It is intentionally kept flat at the top level so sections can be
 * conditionally included or excluded by the renderer.
 */
export interface DocumentData {
  personal?: PersonalDetails;
  aboutMe?: string;
  education?: EducationEntry[];
  internships?: InternshipEntry[];
  recommendations?: RecommendationEntry[];
  languages?: LanguageEntry[];
  englishCertificate?: EnglishCertificate;
  skills?: SkillEntry[];
  hobbies?: HobbyEntry[];
  volunteering?: VolunteeringEntry[];
  declaration?: string;
  // University-admissions sections (all optional)
  academicInterests?: AcademicInterest[];
  academicProjects?: AcademicProject[];
  achievements?: Achievement[];
  leadershipActivities?: LeadershipActivity[];
  certifications?: Certification[];
}


// ---------------------------------------------------------------------------
// Document envelope (for use before persistence layer is wired up)
// ---------------------------------------------------------------------------

/**
 * A complete document record as the frontend understands it.
 * Once the backend exists, this will be derived from the API response shape.
 */
export interface Document {
  id: DocumentId;
  templateId: string;
  templateVersion: string;
  status: DocumentStatus;
  data: DocumentData;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
