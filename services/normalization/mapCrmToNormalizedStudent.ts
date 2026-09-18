/**
 * services/normalization/mapCrmToNormalizedStudent.ts
 *
 * Core Adapter: converts raw Senior CRM API response (CrmSnapshot)
 * into the Unified NormalizedStudentProfile.
 *
 * Rules:
 * 1. Safe parsing — zero undefined crashes.
 * 2. No data fabrication — missing fields remain undefined / empty.
 * 3. All applied programs are preserved in `applications.all[]`.
 */

import type {
  CrmSnapshot,
  CrmAcademicQualification,
  CrmWorkExperience,
  CrmAppliedProgram,
  CrmDocument,
  CrmTest,
} from "@/types/crmSnapshot";
import type {
  NormalizedStudentProfile,
  NormalizedQualification,
  NormalizedWorkExperience,
  NormalizedAppliedProgram,
  NormalizedEnglishTest,
} from "@/types/normalizedStudent";
import type { CourseCategory } from "@/features/document-generator/guidance/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts ISO-8601 string to "YYYY-MM-DD" */
export function toDateOnly(iso?: string | null): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? "";
}

/** Joins non-empty string parts with a delimiter */
export function joinParts(parts: (string | undefined | null)[], sep = " "): string {
  return parts
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p && p.length > 0))
    .join(sep);
}

/** Standard ISO-2 country code to full name mapping */
const COUNTRY_MAP: Record<string, { country: string; nationality: string }> = {
  IN: { country: "India", nationality: "Indian" },
  BT: { country: "Bhutan", nationality: "Bhutanese" },
  IT: { country: "Italy", nationality: "Italian" },
  GB: { country: "United Kingdom", nationality: "British" },
  UK: { country: "United Kingdom", nationality: "British" },
  US: { country: "United States", nationality: "American" },
  CA: { country: "Canada", nationality: "Canadian" },
  FR: { country: "France", nationality: "French" },
  DE: { country: "Germany", nationality: "German" },
  IE: { country: "Ireland", nationality: "Irish" },
  AU: { country: "Australia", nationality: "Australian" },
  PL: { country: "Poland", nationality: "Polish" },
  GE: { country: "Georgia", nationality: "Georgian" },
  KZ: { country: "Kazakhstan", nationality: "Kazakhstani" },
};

export function resolveCountryAndNationality(raw?: string): { country?: string; nationality?: string } {
  if (!raw) return {};
  const upper = raw.trim().toUpperCase();
  if (COUNTRY_MAP[upper]) {
    return COUNTRY_MAP[upper];
  }
  // If already a full name like "India" or "Italy"
  return { country: raw.trim(), nationality: raw.trim() };
}

/** Finds S3 document URL from documents array by title */
export function findDocumentUrl(docs: CrmDocument[] | undefined, docName: string): string | undefined {
  if (!docs) return undefined;
  const target = docName.toLowerCase();
  const found = docs.find((d) => d.name?.toLowerCase() === target);
  return found?.files?.[0]?.url;
}

/** Derives Degree Level from Course Title */
export function deriveDegreeLevel(courseTitle?: string): string {
  if (!courseTitle) return "Master's";
  if (/\bphd\b|doctorate/i.test(courseTitle)) return "PhD";
  if (/\bbachelor|\bba\b|\bbsc\b|\bb\.tech\b|\blaur(?:ea)? triennale\b/i.test(courseTitle)) {
    return "Bachelor's";
  }
  return "Master's";
}

/** Derives Course Category for admissions guidance */
export function deriveCourseCategory(courseTitle?: string): CourseCategory {
  if (!courseTitle) return "Other";
  if (/business|management|analytics|finance|economics|mba/i.test(courseTitle)) {
    return "Business / Management";
  }
  if (/computer|software|data science|machine learning|artificial intelligence|ai\b/i.test(courseTitle)) {
    return "Computer Science / IT";
  }
  if (/engineering/i.test(courseTitle)) {
    return "Engineering";
  }
  if (/law|legal|llb|llm/i.test(courseTitle)) {
    return "Law";
  }
  if (/humanities|arts|media|design/i.test(courseTitle)) {
    return "Arts / Media / Design";
  }
  if (/political|international relations/i.test(courseTitle)) {
    return "Political Science / International Relations";
  }
  return "Other";
}

// ---------------------------------------------------------------------------
// Section Mappers
// ---------------------------------------------------------------------------

function mapQualification(q: CrmAcademicQualification, idx: number): NormalizedQualification {
  const qualTitle = q.qualification?.trim() || q.levelOfStudy?.trim() || `Qualification ${idx + 1}`;
  const endDate = toDateOnly(q.endDate);
  const completionYear = endDate ? endDate.split("-")[0] : undefined;

  return {
    id: q._id ?? `norm-qual-${idx}`,
    levelOfStudy: q.levelOfStudy?.trim(),
    qualification: qualTitle,
    institution: q.institution?.trim(),
    boardOrUniversity: q.boardOrUniversity?.trim(),
    city: q.cityOfStudy?.trim(),
    country: resolveCountryAndNationality(q.countryOfStudy).country,
    score: q.score?.trim(),
    gradingSystem: q.gradingSystem?.trim(),
    startDate: toDateOnly(q.startDate),
    endDate: endDate,
    completionYear,
    primaryLanguage: q.primaryLanguage?.trim(),
    backlogs: q.backlogs?.trim(),
  };
}

function mapWorkEntry(w: CrmWorkExperience, idx: number): NormalizedWorkExperience {
  return {
    id: w._id ?? `norm-work-${idx}`,
    position: w.position?.trim(),
    organisation: w.organisation?.trim(),
    location: w.location?.trim(),
    workingFrom: toDateOnly(w.workingFrom),
    workingUpto: toDateOnly(w.workingUpto),
    currentlyWorking: Boolean(w.currentlyWorking),
    jobProfile: w.jobProfile?.trim(),
    modeOfSalary: w.modeOfSalary?.trim(),
  };
}

function mapEnglishTest(tests: CrmTest[] | undefined): NormalizedEnglishTest | undefined {
  if (!tests || tests.length === 0) return undefined;
  const first = tests[0];
  if (!first) return undefined;

  return {
    type: (first as { type?: string }).type || "IELTS",
    overallScore: first.overallScore?.trim() || undefined,
    testDate: toDateOnly(first.testDate),
    waiver: first.waiver,
    waiver12thEnglishMark: first.waiver12thEnglishMark?.trim(),
  };
}

function mapAppliedProgram(p: CrmAppliedProgram, idx: number): NormalizedAppliedProgram {
  const courseTitle = p.course?.title?.trim() || "";
  const countryName = p.country?.name?.trim() || "";
  const uniName = p.university?.name?.trim() || "";

  return {
    id: p._id ?? `app-prog-${idx}`,
    country: countryName,
    university: uniName,
    course: courseTitle,
    degreeLevel: deriveDegreeLevel(courseTitle),
    courseCategory: deriveCourseCategory(courseTitle),
    referenceNo: p.referenceNo?.trim(),
    createdAt: p.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Main Adapter: CrmSnapshot → NormalizedStudentProfile
// ---------------------------------------------------------------------------

export interface MapCrmOptions {
  source?: "senior-crm-api" | "cached-snapshot" | "static-mock";
  activeProgramId?: string;
}

export function mapCrmToNormalizedStudent(
  snapshot: CrmSnapshot,
  options: MapCrmOptions = {}
): NormalizedStudentProfile {
  const s = snapshot.student ?? {};
  const pd = s.personalDetails ?? {};
  const nat = s.nationality ?? {};
  const passport = s.passportInfo ?? {};
  const mailing = s.mailingAddress ?? {};
  const permanent = s.permanentAddress ?? {};
  const effectiveAddr = mailing.address1 ? mailing : permanent;

  // 1. Personal Names
  const firstName = pd.firstName?.trim() || "";
  const middleName = pd.middleName?.trim() || undefined;
  const lastName = pd.lastName?.trim() || "";
  const fullName = joinParts([firstName, middleName, lastName]) || "Student";

  // 2. Personal Nationality & Countries
  const natInfo = resolveCountryAndNationality(nat.nationality);
  const passportCountryInfo = resolveCountryAndNationality(passport.countryOfBirth);
  const addressCountryInfo = resolveCountryAndNationality(effectiveAddr.country);

  // 3. Residential Address
  const fullAddress = joinParts(
    [
      effectiveAddr.address1,
      effectiveAddr.address2,
      effectiveAddr.city,
      effectiveAddr.state,
      addressCountryInfo.country || effectiveAddr.country,
      effectiveAddr.pincode,
    ],
    ", "
  );

  // 4. Place of birth
  const placeOfBirth = joinParts(
    [passport.cityOfBirth, passportCountryInfo.country || passport.countryOfBirth],
    ", "
  );

  // 5. Photo URL
  const photoUrl =
    findDocumentUrl(s.documents, "Passport Size Photo") ??
    findDocumentUrl(snapshot.documents, "Passport Size Photo") ??
    findDocumentUrl(s.documents, "passport size photo") ??
    findDocumentUrl(snapshot.documents, "passport size photo") ??
    undefined;

  // 6. Academics
  const qualifications = (s.academicQualifications ?? []).map((q, i) => mapQualification(q, i));
  const latestQual = qualifications[0];
  const latest = latestQual
    ? {
        qualification: latestQual.qualification || "",
        institution: latestQual.institution || "",
        board: latestQual.boardOrUniversity || "",
        completionYear: latestQual.completionYear || "",
        score: latestQual.score,
        subjects: undefined,
      }
    : undefined;

  // 7. Work experience
  const workExperience = (s.workExperience ?? []).map((w, i) => mapWorkEntry(w, i));

  // 8. Standardized tests
  const englishTest = mapEnglishTest(s.tests);

  // 9. Applied programs (preserving all)
  const allPrograms = (snapshot.appliedPrograms ?? []).map((p, i) => mapAppliedProgram(p, i));

  // Active program selection:
  // Use options.activeProgramId if passed, else first program with country specified, else first program
  let activeProgram = options.activeProgramId
    ? allPrograms.find((p) => p.id === options.activeProgramId)
    : undefined;

  if (!activeProgram) {
    activeProgram = allPrograms.find((p) => Boolean(p.country && p.country.length > 0)) ?? allPrograms[0];
  }

  // 10. Family & Parents
  const parents = s.parents;
  const fatherName = parents?.father?.name?.trim();
  const motherName = parents?.mother?.name?.trim();
  const family =
    fatherName || motherName
      ? {
          father: fatherName
            ? {
                name: fatherName,
                phone: parents?.father?.phone?.trim() || undefined,
                email: parents?.father?.email?.trim() || undefined,
              }
            : undefined,
          mother: motherName
            ? {
                name: motherName,
                phone: parents?.mother?.phone?.trim() || undefined,
                email: parents?.mother?.email?.trim() || undefined,
              }
            : undefined,
        }
      : undefined;

  // 11. Finance & Loan
  const loanOverview = s.loan?.overview as Record<string, unknown> | undefined;
  const bankName = typeof loanOverview?.bankName === "string" ? loanOverview.bankName.trim() : undefined;
  const loanStatus = typeof loanOverview?.status === "string" ? loanOverview.status.trim() : undefined;
  const loanAmountSanctioned =
    typeof loanOverview?.amountSanctioned === "string" ? loanOverview.amountSanctioned.trim() : undefined;

  const finance = bankName
    ? {
        bankName,
        loanStatus,
        loanAmountSanctioned: loanAmountSanctioned || undefined,
      }
    : undefined;

  // Assemble Normalized Profile
  return {
    meta: {
      studentId: s._id || "",
      source: options.source ?? "senior-crm-api",
      fetchedAt: new Date().toISOString(),
      rawSnapshot: snapshot,
    },
    personal: {
      fullName,
      firstName,
      middleName,
      lastName,
      dateOfBirth: toDateOnly(pd.dob) || undefined,
      gender: pd.gender?.trim() || undefined,
      email: pd.email?.trim() || pd.personalEmail?.trim() || undefined,
      phone: pd.mobile?.trim() || undefined,
      address: fullAddress || undefined,
      city: effectiveAddr.city?.trim() || undefined,
      state: effectiveAddr.state?.trim() || undefined,
      country: addressCountryInfo.country || effectiveAddr.country?.trim() || undefined,
      pincode: effectiveAddr.pincode?.trim() || undefined,
      nationality: natInfo.nationality || nat.nationality?.trim() || undefined,
      passportNumber: passport.passportNumber?.trim() || undefined,
      passportIssueDate: toDateOnly(passport.issueDate) || undefined,
      passportExpiryDate: toDateOnly(passport.expiryDate) || undefined,
      placeOfBirth: placeOfBirth || undefined,
      photoUrl,
    },
    academics: {
      qualifications,
      latest,
    },
    workExperience,
    tests: {
      english: englishTest,
    },
    applications: {
      all: allPrograms,
      activeProgramId: activeProgram?.id,
      activeProgram,
    },
    family,
    finance,
    visaLogistics: undefined, // Unpopulated; populated via manual overrides or SOP workspace in later phases
  };
}
