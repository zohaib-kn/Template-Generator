/**
 * services/normalization/synthesizeEuropassAboutMe.ts
 *
 * Deterministic synthesis engine for the Europass "ABOUT ME" profile summary.
 *
 * Builds a short, factual summary from CRM data only:
 * 1. Name.
 * 2. Degree, specialization, institution & city.
 * 3. Exact academic metric (CGPA / percentage) when the CRM has one.
 * 4. Target programme (or the study domain it belongs to).
 *
 * No invented personal history, superlatives ("remarkable", "prestigious") or
 * keyword-guessed fields — counsellors can extend the text with real details.
 */

import type { NormalizedStudentProfile, NormalizedQualification } from "@/types/normalizedStudent";
import { isSchoolLevel } from "./mapNormalizedToResume";

function getSalutation(gender?: string): string {
  if (!gender) return "";
  const g = gender.trim().toLowerCase();
  if (g === "male" || g === "m") return "Mr. ";
  if (g === "female" || g === "f") return "Ms. ";
  return "";
}

function cleanInstitution(inst?: string): string {
  if (!inst) return "my institution";
  return inst.replace(/\s*,\s*india$/i, "").trim();
}

/** Whole-word / phrase match, so "it" does not match "hospitality" and "ai" not "maintenance". */
function hasTerm(text: string, ...terms: string[]): boolean {
  return terms.some((t) => new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(text));
}

export function deriveDomain(course?: string, degree?: string, fieldOfStudy?: string): string {
  const combined = `${course || ""} ${fieldOfStudy || ""} ${degree || ""}`.toLowerCase();
  if (hasTerm(combined, "artificial intelligence", "machine learning", "aiml", "ai", "ai/ml")) {
    return "artificial intelligence and machine learning";
  }
  if (hasTerm(combined, "data science", "analytics", "data analytics")) {
    return "data science and analytics";
  }
  if (hasTerm(combined, "computer science", "computer engineering", "software", "information technology", "it", "information engineering")) {
    return "computer science and software engineering";
  }
  if (hasTerm(combined, "law", "legal", "llm", "llb")) {
    return "law";
  }
  if (hasTerm(combined, "finance", "accounting", "banking")) {
    return "finance and accounting";
  }
  if (hasTerm(combined, "business", "management", "mba", "commerce")) {
    return "business and management";
  }
  if (hasTerm(combined, "mechanical", "robotics", "mechatronics")) {
    return "mechanical engineering and robotics";
  }
  return course?.trim() || fieldOfStudy?.trim() || "";
}

export function synthesizeEuropassAboutMe(profile: NormalizedStudentProfile): string {
  const p = profile.personal;
  const fullName = p?.fullName?.trim() || "Candidate";
  const salutation = getSalutation(p?.gender);

  // 1. Identify primary degree qualification
  const degreeQuals = (profile.academics?.qualifications ?? []).filter(
    (q) => !isSchoolLevel(q.levelOfStudy, q.qualification)
  );

  const primaryQual: NormalizedQualification | undefined =
    degreeQuals.find((q) => (q.levelOfStudy || "").toLowerCase().includes("undergraduate")) ||
    degreeQuals.find((q) => (q.levelOfStudy || "").toLowerCase().includes("postgraduate")) ||
    degreeQuals[0] ||
    profile.academics?.qualifications?.[0];

  if (!primaryQual || (!primaryQual.qualification && !primaryQual.institution)) {
    return "";
  }

  const degreeName = primaryQual.qualification?.trim() || "Bachelor's Degree";

  const institution = cleanInstitution(primaryQual?.institution);
  const city = primaryQual?.city ? `, ${primaryQual.city.trim()}` : "";
  const field = primaryQual?.fieldOfStudy?.trim();
  const specialization = field && !degreeName.toLowerCase().includes(field.toLowerCase())
    ? `, with a specialization in ${field}`
    : "";

  // 2. Academic score metric (stated as recorded, without superlatives)
  let gradePhrase = "";
  const score = primaryQual?.score?.trim();
  const system = primaryQual?.gradingSystem?.trim();

  if (score) {
    if (score.includes("%")) {
      gradePhrase = `I graduated with a score of ${score}.`;
    } else if ((system && (system === "10" || system === "7" || system === "4" || system.toLowerCase().includes("cgpa"))) || (!isNaN(Number(score)) && Number(score) <= 10)) {
      gradePhrase = `I graduated with a CGPA of ${score}${system && /^\d+$/.test(system) ? `/${system}` : ""}.`;
    } else {
      gradePhrase = `I graduated with a final grade of ${score}.`;
    }
  }

  // 3. Target programme / domain
  const activeProg = profile.applications?.activeProgram;
  const targetCourse = activeProg?.course?.trim();
  const targetUniversity = activeProg?.university?.trim();
  const targetDomain = deriveDomain(activeProg?.course, degreeName, field);

  const intro = `I am ${salutation}${fullName}.`;
  const academic = `I completed my ${degreeName}${specialization} at ${institution}${city}.`;
  const goal = targetCourse
    ? `I am applying to pursue ${targetCourse}${targetUniversity ? ` at ${targetUniversity}` : ""} to build my expertise in ${targetDomain || "this field"}.`
    : targetDomain
    ? `I aim to build my career in ${targetDomain}.`
    : "";

  return [intro, academic, gradePhrase, goal].filter(Boolean).join(" ");
}
