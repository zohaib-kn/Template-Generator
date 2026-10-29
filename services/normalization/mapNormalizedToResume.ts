/**
 * services/normalization/mapNormalizedToResume.ts
 *
 * Resume Projection:
 * Converts a NormalizedStudentProfile into DocumentData + ApplicationTarget
 * for the Resume / CV Generator.
 */

import type {
  DocumentData,
  EducationEntry,
  InternshipEntry,
  Achievement,
  SkillEntry,
  HobbyEntry,
  Certification,
  LanguageEntry,
} from "@/types";
import type { ApplicationTarget, DestinationCountry } from "@/features/document-generator/guidance/types";
import type { NormalizedStudentProfile, NormalizedQualification, NormalizedWorkExperience } from "@/types/normalizedStudent";
import { getInstitutionWebsite } from "@/features/document-generator/utils/institutionWebsites";
import { synthesizeEuropassAboutMe } from "./synthesizeEuropassAboutMe";

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

function buildEducationDetails(q: NormalizedQualification, resolvedSubjects?: string) {
  const descParts: string[] = [];

  // 1. Address
  const address =
    q.address ||
    [q.city, q.country].filter(Boolean).join(", ") ||
    q.city;
  if (address) {
    descParts.push(`Address: ${address}`);
  }

  // 2. Website URL (clickable)
  const website = q.website || getInstitutionWebsite(q.institution);
  if (website) {
    descParts.push(`Website: ${website}`);
  }

  // 3. Final grade
  const system = q.gradingSystem ? `/${q.gradingSystem}` : "";
  const finalGrade = q.score ? `${q.score}${system}` : undefined;
  if (finalGrade) {
    descParts.push(`Final grade: ${finalGrade}`);
  }

  // 4. Subjects
  if (resolvedSubjects) {
    descParts.push(`Subjects: ${resolvedSubjects}`);
  }

  // 5. Language of instruction
  if (q.primaryLanguage) {
    descParts.push(`Language of instruction: ${q.primaryLanguage}`);
  }

  // 6. Backlogs
  if (q.backlogs) {
    descParts.push(`Backlogs: ${q.backlogs}`);
  }

  return {
    description: descParts.length > 0 ? descParts.join(" | ") : undefined,
    address,
    website,
    finalGrade,
  };
}

function mapEduEntry(q: NormalizedQualification, index: number): EducationEntry {
  const level = (q.levelOfStudy || "").toLowerCase();
  const rawQual = (q.qualification || "").trim();

  if (isSchoolLevel(level) || isSchoolLevel(rawQual) || looksLikeSubjectsList(rawQual)) {
    // School-level branch (10th / 12th)
    let cleanTitle: string;
    if (rawQual && !looksLikeSubjectsList(rawQual)) {
      if (is12thLevel(rawQual)) {
        cleanTitle = "Grade 12th";
      } else if (is10thLevel(rawQual)) {
        cleanTitle = "Grade 10th";
      } else {
        cleanTitle = rawQual;
      }
    } else if (is12thLevel(level)) {
      cleanTitle = "Grade 12th";
    } else if (is10thLevel(level)) {
      cleanTitle = "Grade 10th";
    } else if (/\b(physics|chemistry|biology|accountancy|economics|computer\s*science)\b/i.test(rawQual)) {
      cleanTitle = "Grade 12th";
    } else {
      cleanTitle = "Grade 10th";
    }

    // Resolve subjects: prefer the dedicated field, fall back to qualification
    // if it looks like a subjects list (CRM quirk where subjects are stored there)
    const resolvedSubjects =
      q.subjects ||
      (looksLikeSubjectsList(rawQual) ? rawQual : undefined);

    const details = buildEducationDetails(q, resolvedSubjects);

    return {
      id: q.id || `edu-${index}`,
      institution: q.institution,
      qualification: cleanTitle,
      // fieldOfStudy correctly holds the board name (CBSE, State Board, etc.) for school entries
      fieldOfStudy: q.boardOrUniversity || q.fieldOfStudy,
      startDate: q.startDate,
      endDate: q.endDate,
      description: details.description,
      address: details.address,
      website: details.website,
      finalGrade: details.finalGrade,
    };
  }

  // ── Degree-level branch (Undergraduate, Postgraduate, etc.) ────────────
  const details = buildEducationDetails(q);

  return {
    id: q.id || `edu-${index}`,
    institution: q.institution,
    qualification: q.qualification,
    // For degrees, prefer explicit fieldOfStudy; fall back to boardOrUniversity
    fieldOfStudy: q.fieldOfStudy || q.boardOrUniversity,
    startDate: q.startDate,
    endDate: q.endDate,
    description: details.description,
    address: details.address,
    website: details.website,
    finalGrade: details.finalGrade,
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

  const education: EducationEntry[] = (profile.academics?.qualifications ?? []).map((q, i) => mapEduEntry(q, i));
  const internships: InternshipEntry[] = (profile.workExperience ?? []).map((w, i) => mapWorkEntry(w, i));
  const achievements: Achievement[] = (profile.academics?.achievements ?? []).map((a, i) => ({
    id: a.id || `ach-${i}`,
    title: a.title,
    organisation: a.organisation,
    dateYear: a.dateYear,
    description: a.description,
  }));

  const eng = profile.tests?.english;
  const englishCertificate = (eng?.overallScore || eng?.subscores || eng?.trfNumber)
    ? {
        examName: eng.type || "IELTS",
        score: eng.overallScore,
        dateTaken: eng.testDate,
        listening: eng.subscores?.listening,
        reading: eng.subscores?.reading,
        writing: eng.subscores?.writing,
        speaking: eng.subscores?.speaking,
        trfNumber: eng.trfNumber,
      }
    : undefined;

  const activeProg = profile.applications?.activeProgram;
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

  function ieltsToCefr(scoreVal?: string | number): string {
    if (!scoreVal) return "C1";
    const num = parseFloat(String(scoreVal).replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return "C1";
    if (num >= 8.5) return "C2";
    if (num >= 7.0) return "C1";
    if (num >= 5.5) return "B2";
    if (num >= 4.0) return "B1";
    return "B2";
  }

  // Mother tongue & languages
  const motherTongue =
    profile.motherTongue ||
    profile.languages?.find((l) => l.isMotherTongue)?.language ||
    "";

  let languages: LanguageEntry[];
  if (profile.languages && profile.languages.length > 0) {
    languages = profile.languages
      .filter((l) => !l.isMotherTongue)
      .map((l, idx) => ({
        id: `lang-${idx}`,
        language: l.language,
        level: l.level || "C1",
        listening: l.listening || "C1",
        reading: l.reading || "C1",
        writing: l.writing || "C1",
        spokenProduction: l.spokenProduction || "B2",
        spokenInteraction: l.spokenInteraction || "C1",
      }));
  } else {
    const lScore = eng?.subscores?.listening ? ieltsToCefr(eng.subscores.listening) : "C1";
    const rScore = eng?.subscores?.reading ? ieltsToCefr(eng.subscores.reading) : "C1";
    const wScore = eng?.subscores?.writing ? ieltsToCefr(eng.subscores.writing) : "C1";
    const sScore = eng?.subscores?.speaking ? ieltsToCefr(eng.subscores.speaking) : "C1";
    const spProd = sScore === "C2" ? "C1" : sScore === "C1" ? "B2" : "B1";
    const spInter = sScore;

    languages = [
      {
        id: "lang-eng",
        language: "English",
        level: eng?.overallScore ? ieltsToCefr(eng.overallScore) : "C1",
        listening: lScore,
        reading: rScore,
        writing: wScore,
        spokenProduction: spProd,
        spokenInteraction: spInter,
      },
    ];
  }

  // Skills
  let skills: SkillEntry[];
  if (profile.skills && profile.skills.length > 0) {
    skills = profile.skills.map((s, idx) => ({ id: `skill-${idx}`, name: s }));
  } else {
    skills = [];
  }

  // Hobbies & Interests
  let hobbies: HobbyEntry[];
  if (profile.hobbies && profile.hobbies.length > 0) {
    hobbies = profile.hobbies.map((h, idx) => ({ id: `hobby-${idx}`, name: h }));
  } else {
    hobbies = [];
  }

  // Certifications
  let certifications: Certification[];
  if (profile.certifications && profile.certifications.length > 0) {
    certifications = profile.certifications.map((c, idx) => ({
      id: `cert-${idx}`,
      name: c.name,
      provider: c.provider,
      completionDate: c.date,
      credentialLink: c.url,
    }));
  } else if (achievements.length > 0) {
    certifications = achievements.map((a, idx) => ({
      id: `cert-${idx}`,
      name: a.title,
      provider: a.organisation,
      completionDate: a.dateYear,
    }));
  } else {
    certifications = [];
  }


  const aboutMe = synthesizeEuropassAboutMe(profile);
  const declaration =
    profile.declaration ||
    "I hereby declare that the above furnished details are true to the best of my knowledge and belief.";

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
      portfolioUrl: p.portfolioUrl,
    },
    aboutMe,
    education: education.length > 0 ? education : undefined,
    internships: internships.length > 0 ? internships : undefined,
    achievements: achievements.length > 0 ? achievements : undefined,
    englishCertificate,
    motherTongue,
    languages: languages.length > 0 ? languages : undefined,
    skills: skills.length > 0 ? skills : undefined,
    hobbies: hobbies.length > 0 ? hobbies : undefined,
    certifications: certifications.length > 0 ? certifications : undefined,
    declaration,
  };

  return { student, target };
}
