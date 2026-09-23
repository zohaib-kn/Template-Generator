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

function mapEduEntry(q: NormalizedQualification, index: number): EducationEntry {
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
    fieldOfStudy: q.boardOrUniversity,
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
