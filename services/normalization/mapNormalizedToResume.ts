/**
 * services/normalization/mapNormalizedToResume.ts
 *
 * Resume Projection:
 * Converts a NormalizedStudentProfile into DocumentData + ApplicationTarget
 * for the Resume / CV Generator.
 */

import type { DocumentData, EducationEntry, InternshipEntry } from "@/types";
import type { ApplicationTarget, DestinationCountry } from "@/features/document-generator/guidance/types";
import type { NormalizedStudentProfile, NormalizedQualification, NormalizedWorkExperience } from "@/types/normalizedStudent";

const KNOWN_DESTINATIONS: DestinationCountry[] = [
  "United Kingdom",
  "Canada",
  "Australia",
  "Italy",
  "France",
  "Poland",
  "Georgia",
  "Kazakhstan",
];

/**
 * Known degree keywords — used to distinguish a real qualification title
 * from a subjects list that the CRM stored in the qualification field.
 * Note: generic academic stream words like 'science', 'arts', 'commerce' are omitted
 * because high school subject lists contain those words.
 */
export const DEGREE_KEYWORDS = /\b(b\.?tech|b\.?e|b\.?sc|b\.?com|b\.?a|bba|bca|llb|m\.?tech|m\.?sc|m\.?com|m\.?a|mba|mca|llm|ph\.?d|bachelor|master|doctorate|diploma|associate|postgraduate|undergraduate|degree)\b/i;

/**
 * Detects if a string looks like a subjects list rather than a degree title.
 * Heuristic: 3+ comma-separated parts with no recognized degree keyword.
 */
export function looksLikeSubjectsList(value?: string | null): boolean {
  if (!value) return false;
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 3 && !DEGREE_KEYWORDS.test(value);
}

/**
 * Detects if levelOfStudy indicates 12th grade / senior secondary.
 */
export function is12thLevel(level?: string | null): boolean {
  if (!level) return false;
  return /\b(12th|grade\s*12(?:th)?|class\s*12(?:th)?|senior\s*secondary|higher\s*secondary|intermediate|hsc|plus\s*two|\+2)\b/i.test(level) ||
    /\b12\b/.test(level);
}

/**
 * Detects if levelOfStudy indicates 10th grade / secondary education.
 */
export function is10thLevel(level?: string | null): boolean {
  if (!level) return false;
  return /\b(10th|grade\s*10(?:th)?|class\s*10(?:th)?|secondary|matriculation|ssc|high\s*school)\b/i.test(level) ||
    /\b10\b/.test(level);
}

/**
 * Detects if levelOfStudy or qualification indicates school-level education.
 */
export function isSchoolLevel(level?: string | null, rawQual?: string | null): boolean {
  return is12thLevel(level) || is10thLevel(level) || looksLikeSubjectsList(rawQual);
}

function mapEduEntry(q: NormalizedQualification, index: number): EducationEntry {
  const level = q.levelOfStudy?.toLowerCase().trim() ?? "";
  const rawQual = q.qualification?.trim() ?? "";
  const isSchool = isSchoolLevel(level, rawQual);

  // ── School-level branch (10th / 12th) ──────────────────────────────────
  if (isSchool) {
    let cleanTitle: string;
    if (is12thLevel(level)) {
      cleanTitle = "Higher Secondary Education (12th)";
    } else if (is10thLevel(level)) {
      cleanTitle = "Secondary Education (10th)";
    } else if (/\b(physics|chemistry|biology|accountancy|economics|computer\s*science)\b/i.test(rawQual)) {
      cleanTitle = "Higher Secondary Education (12th)";
    } else {
      cleanTitle = "Secondary Education (10th)";
    }

    // Resolve subjects: prefer the dedicated field, fall back to qualification
    // if it looks like a subjects list (CRM quirk where subjects are stored there)
    const resolvedSubjects =
      q.subjects ||
      (looksLikeSubjectsList(rawQual) ? rawQual : undefined);

    const descParts: string[] = [];
    if (q.score) {
      const system = q.gradingSystem ? `/${q.gradingSystem}` : "";
      descParts.push(`Score: ${q.score}${system}`);
    }
    if (resolvedSubjects) descParts.push(`Subjects: ${resolvedSubjects}`);
    if (q.primaryLanguage) descParts.push(`Language of instruction: ${q.primaryLanguage}`);
    if (q.backlogs) descParts.push(`Backlogs: ${q.backlogs}`);
    if (q.city) descParts.push(`City: ${q.city}`);

    return {
      id: q.id || `edu-${index}`,
      institution: q.institution,
      qualification: cleanTitle,
      // fieldOfStudy correctly holds the board name (CBSE, State Board, etc.) for school entries
      fieldOfStudy: q.boardOrUniversity || q.fieldOfStudy,
      startDate: q.startDate,
      endDate: q.endDate,
      description: descParts.length > 0 ? descParts.join(" | ") : undefined,
    };
  }

  // ── Degree-level branch (Undergraduate, Postgraduate, etc.) ────────────
  const descParts: string[] = [];
  if (q.score) {
    const system = q.gradingSystem ? `/${q.gradingSystem}` : "";
    descParts.push(`Score: ${q.score}${system}`);
  }
  if (q.primaryLanguage) descParts.push(`Language of instruction: ${q.primaryLanguage}`);
  if (q.backlogs) descParts.push(`Backlogs: ${q.backlogs}`);
  if (q.city) descParts.push(`City: ${q.city}`);

  return {
    id: q.id || `edu-${index}`,
    institution: q.institution,
    qualification: q.qualification,
    // For degrees, prefer explicit fieldOfStudy; fall back to boardOrUniversity
    fieldOfStudy: q.fieldOfStudy || q.boardOrUniversity,
    startDate: q.startDate,
    endDate: q.endDate,
    description: descParts.length > 0 ? descParts.join(" | ") : undefined,
  };
}

function mapWorkEntry(w: NormalizedWorkExperience, index: number): InternshipEntry {
  return {
    id: w.id || `work-${index}`,
    role: w.position,
    company: w.organisation,
    location: w.location,
    startDate: w.workingFrom,
    endDate: w.workingUpto,
    description: w.jobProfile,
  };
}

export interface ResumeProjectionResult {
  student: DocumentData;
  target: Partial<ApplicationTarget>;
}

export function mapNormalizedToResume(profile: NormalizedStudentProfile): ResumeProjectionResult {
  const p = profile.personal;

  const education: EducationEntry[] = profile.academics.qualifications.map((q, i) => mapEduEntry(q, i));
  const internships: InternshipEntry[] = profile.workExperience.map((w, i) => mapWorkEntry(w, i));

  const eng = profile.tests.english;
  const englishCertificate = eng?.overallScore
    ? {
        examName: eng.type || "English Proficiency Test",
        score: eng.overallScore,
        dateTaken: eng.testDate,
        listening: eng.subscores?.listening,
        reading: eng.subscores?.reading,
        writing: eng.subscores?.writing,
        speaking: eng.subscores?.speaking,
      }
    : undefined;

  const activeProg = profile.applications.activeProgram;
  const matchedCountry = KNOWN_DESTINATIONS.find(
    (c) => c.toLowerCase() === (activeProg?.country || "").toLowerCase()
  );

  const target: Partial<ApplicationTarget> = activeProg
    ? {
        destinationCountry: matchedCountry || (activeProg.country as DestinationCountry) || undefined,
        degreeLevel: (activeProg.degreeLevel as ApplicationTarget["degreeLevel"]) || undefined,
        courseCategory: (activeProg.courseCategory as ApplicationTarget["courseCategory"]) || undefined,
        intendedCourse: activeProg.course || undefined,
        universityName: activeProg.university || undefined,
      }
    : {};

  const student: DocumentData = {
    personal: {
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      nationality: p.nationality,
      passportNumber: p.passportNumber,
      placeOfBirth: p.placeOfBirth,
      address: p.address,
      photoUrl: p.photoUrl,
    },
    education: education.length > 0 ? education : undefined,
    internships: internships.length > 0 ? internships : undefined,
    englishCertificate,
  };

  return { student, target };
}
