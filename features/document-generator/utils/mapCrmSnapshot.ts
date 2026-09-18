/**
 * utils/mapCrmSnapshot.ts
 *
 * Adapter / mapper function that converts the senior's CRM student snapshot
 * format into our internal DocumentData + ApplicationTarget format.
 *
 * This is the single place where CRM field names are translated.
 * All other code in the project uses only our clean DocumentData type.
 *
 * INPUT:  CrmSnapshot  (senior's MongoDB / CRM API response)
 * OUTPUT: { student: DocumentData, target: Partial<ApplicationTarget> }
 */

import type { DocumentData, EducationEntry, InternshipEntry } from "@/types";
import type { ApplicationTarget } from "../guidance/types";
import type {
  CrmSnapshot,
  CrmAcademicQualification,
  CrmWorkExperience,
  CrmAppliedProgram,
  CrmDocument,
  CrmTest,
} from "@/types/crmSnapshot";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a CRM ISO-8601 datetime string like "2018-05-24T00:00:00.000Z"
 * into a plain date string "2018-05-24".
 */
function toDateOnly(iso?: string | null): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? "";
}

/**
 * Joins non-empty string parts with a separator.
 */
function joinParts(parts: (string | undefined | null)[], sep = " "): string {
  return parts.filter(Boolean).join(sep);
}

/**
 * Finds the photo URL from the CRM documents array by matching the document name.
 */
function findDocumentUrl(
  docs: CrmDocument[] | undefined,
  name: string
): string | undefined {
  if (!docs) return undefined;
  const doc = docs.find(
    (d: CrmDocument) => d.name?.toLowerCase() === name.toLowerCase()
  );
  return doc?.files?.[0]?.url;
}

/**
 * Maps a CRM academic qualification to our EducationEntry.
 * levelOfStudy is used as the qualification label when the qualification field is empty.
 */
function mapQualification(
  q: CrmAcademicQualification,
  index: number
): EducationEntry {
  // Build a human-readable qualification label
  const qualLabel =
    q.qualification?.trim() ||
    q.levelOfStudy?.trim() ||
    `Education ${index + 1}`;

  // Build a short description from available score / grading info
  const descParts: string[] = [];
  if (q.score) {
    const system = q.gradingSystem ? `/${q.gradingSystem}` : "";
    descParts.push(`Score: ${q.score}${system}`);
  }
  if (q.primaryLanguage) descParts.push(`Language of instruction: ${q.primaryLanguage}`);
  if (q.backlogs) descParts.push(`Backlogs: ${q.backlogs}`);
  if (q.cityOfStudy) descParts.push(`City: ${q.cityOfStudy}`);

  return {
    id: q._id ?? `edu-crm-${index}`,
    institution: q.institution?.trim(),
    qualification: qualLabel,
    fieldOfStudy: q.boardOrUniversity?.trim(),
    startDate: toDateOnly(q.startDate),
    endDate: toDateOnly(q.endDate),
    description: descParts.length > 0 ? descParts.join(" | ") : undefined,
  };
}

/**
 * Maps a CRM work experience entry to our InternshipEntry.
 * NOTE: CRM uses `position`, `organisation`, `workingFrom`, `workingUpto`, `jobProfile`
 * (NOT `jobTitle`, `company`, `startDate`, `endDate`, `description`).
 */
function mapWorkExperience(
  w: CrmWorkExperience,
  index: number
): InternshipEntry {
  return {
    id: w._id ?? `work-crm-${index}`,
    role: w.position?.trim(),
    company: w.organisation?.trim(),
    location: w.location?.trim(),
    startDate: toDateOnly(w.workingFrom),
    endDate: toDateOnly(w.workingUpto),
    description: w.jobProfile?.trim(),
  };
}

/**
 * Maps CRM test entries to our EnglishCertificate.
 * Takes the first test entry (most recent / only one).
 * CRM field: overallScore → score, testDate → dateTaken.
 */
function mapFirstTest(
  tests: CrmTest[] | undefined
): DocumentData["englishCertificate"] | undefined {
  const first = tests?.[0];
  if (!first) return undefined;
  return {
    examName: "English Proficiency Test",
    score: first.overallScore?.trim() || undefined,
    dateTaken: toDateOnly(first.testDate),
    issuingBody: undefined,
  };
}

/**
 * Derives an ApplicationTarget from the student's applied programs.
 * Uses the first program that has a country, falling back to any program.
 */
function mapApplicationTarget(
  programs: CrmAppliedProgram[] | undefined
): Partial<ApplicationTarget> {
  if (!programs || programs.length === 0) return {};

  // Prefer a program that has a country specified
  const withCountry = programs.find((p) => p.country?.name);
  const best = withCountry ?? programs[0];

  // Map country name to our DestinationCountry union
  const rawCountry = best?.country?.name?.trim() ?? "";
  const knownCountries = [
    "United Kingdom",
    "Canada",
    "Australia",
    "Italy",
    "France",
    "Poland",
    "Georgia",
    "Kazakhstan",
  ] as const;
  type DC = (typeof knownCountries)[number];
  const destinationCountry = knownCountries.find(
    (c) => c.toLowerCase() === rawCountry.toLowerCase()
  ) as DC | undefined;

  // Derive degree level from course title (heuristic)
  const courseTitle = best?.course?.title?.trim() ?? "";
  let degreeLevel: ApplicationTarget["degreeLevel"] = "Master's";
  if (/\bphd\b|doctorate/i.test(courseTitle)) degreeLevel = "PhD";
  else if (/\bbachelor|\bba\b|\bbsc\b|\bb\.tech/i.test(courseTitle)) degreeLevel = "Bachelor's";

  // Derive course category from course title (heuristic)
  let courseCategory: ApplicationTarget["courseCategory"] = "Other";
  if (/business|management|analytics|finance|economics|mba/i.test(courseTitle)) {
    courseCategory = "Business / Management";
  } else if (/computer|software|data science|machine learning|artificial intelligence|ai\b/i.test(courseTitle)) {
    courseCategory = "Computer Science / IT";
  } else if (/engineering/i.test(courseTitle)) {
    courseCategory = "Engineering";
  } else if (/law|legal/i.test(courseTitle)) {
    courseCategory = "Law";
  } else if (/humanities|arts|media|design/i.test(courseTitle)) {
    courseCategory = "Arts / Media / Design";
  } else if (/political|international relations/i.test(courseTitle)) {
    courseCategory = "Political Science / International Relations";
  }

  return {
    destinationCountry: destinationCountry ?? "Other",
    degreeLevel,
    courseCategory,
    intendedCourse: courseTitle || undefined,
    universityName: best?.university?.name?.trim() || undefined,
  };
}

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

export interface CrmMapResult {
  /** Fully mapped DocumentData ready to load into Resume Builder state. */
  student: DocumentData;
  /** Derived ApplicationTarget for auto-populating the Suggestions panel. */
  target: Partial<ApplicationTarget>;
}

/**
 * Main adapter function.
 *
 * @param snapshot  The raw JSON returned by the CRM data-snapshot API.
 * @returns         { student: DocumentData, target: Partial<ApplicationTarget> }
 */
export function mapCrmSnapshot(snapshot: CrmSnapshot): CrmMapResult {
  const s = snapshot.student ?? {};
  const pd = s.personalDetails ?? {};
  const nat = s.nationality ?? {};
  const passport = s.passportInfo ?? {};
  const mailing = s.mailingAddress ?? {};
  const permanent = s.permanentAddress ?? {};

  // ── Full name ─────────────────────────────────────────────────────────────
  const fullName = joinParts(
    [pd.firstName, pd.middleName, pd.lastName],
    " "
  ).trim();

  // ── Date of birth (strip time component) ──────────────────────────────────
  const dateOfBirth = toDateOnly(pd.dob);

  // ── Address (prefer mailing, fall back to permanent) ──────────────────────
  const addr = mailing.address1 ? mailing : permanent;
  const addressParts = [
    addr.address1,
    addr.address2,
    addr.city,
    addr.state,
    addr.country,
    addr.pincode,
  ];
  const address = joinParts(addressParts, ", ");

  // ── Photo URL (from "Passport Size Photo" document) ───────────────────────
  const photoUrl =
    findDocumentUrl(s.documents, "Passport Size Photo") ??
    findDocumentUrl(s.documents, "passport size photo") ??
    undefined;

  // ── Place of birth ────────────────────────────────────────────────────────
  const placeOfBirth = joinParts([
    passport.cityOfBirth,
    passport.countryOfBirth,
  ], ", ");

  // ── Education ─────────────────────────────────────────────────────────────
  const education: EducationEntry[] = (s.academicQualifications ?? [])
    .map((q, i) => mapQualification(q, i));

  // ── Internships / Work Experience ─────────────────────────────────────────
  const internships: InternshipEntry[] = (s.workExperience ?? [])
    .map((w, i) => mapWorkExperience(w, i));

  // ── Tests / English Certificate ───────────────────────────────────────────
  const englishCertificate = mapFirstTest(s.tests);

  // ── Application Target ────────────────────────────────────────────────────
  const target = mapApplicationTarget(snapshot.appliedPrograms);

  // ── Assemble DocumentData ─────────────────────────────────────────────────
  const student: DocumentData = {
    personal: {
      fullName: fullName || undefined,
      email: pd.email?.trim() || pd.personalEmail?.trim() || undefined,
      phone: pd.mobile?.trim() || undefined,
      gender: pd.gender?.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      nationality: nat.nationality?.trim() || undefined,
      passportNumber: passport.passportNumber?.trim() || undefined,
      placeOfBirth: placeOfBirth || undefined,
      address: address || undefined,
      photoUrl: photoUrl || undefined,
    },
    education: education.length > 0 ? education : undefined,
    internships: internships.length > 0 ? internships : undefined,
    englishCertificate: englishCertificate || undefined,
    // All other sections (skills, hobbies, languages, etc.) start empty.
    // The user fills them in manually or via the Profile Suggestions Panel.
  };

  return { student, target };
}
