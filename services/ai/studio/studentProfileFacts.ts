/**
 * services/ai/studio/studentProfileFacts.ts
 *
 * Gives the Document Studio assistant the student's CRM profile, so it can write from the
 * same facts a counsellor would paste into ChatGPT instead of only the current document text.
 *
 * - Loaded on the server from the CRM (or the built-in fictional samples). The client cannot
 *   inject "facts"; the route has already checked the operator's access to the student.
 * - Data minimisation: only facts useful for writing admissions documents are included.
 *   Contact and identity details (phone, email, home address, passport number, date of
 *   birth, family contact details) are never sent to the AI from here.
 * - Best effort: if the CRM is unreachable the assistant works from the document alone.
 */

import type { CrmSnapshot } from "@/types/crmSnapshot";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import { getSampleSnapshotById } from "@/lib/sampleStudents";
import { mapCrmToNormalizedStudent } from "@/services/normalization";
import { CrmApiStudentDataProvider } from "@/services/webhook/studentDataProvider";

const MAX_FACTS_CHARS = 6000;

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function line(label: string, ...parts: unknown[]): string | null {
  const text = parts.map(clean).filter(Boolean).join(", ");
  return text ? `- ${label}: ${text}` : null;
}

function year(date?: string): string {
  return clean(date).slice(0, 4);
}

/** Writing-relevant facts from a normalized profile, as a compact bullet list. */
export function buildStudentProfileFacts(profile: NormalizedStudentProfile): string {
  const out: Array<string | null> = [];
  const p = profile.personal;

  out.push(line("Name", p.fullName));
  out.push(line("From", [p.city, p.state, p.country].map(clean).filter(Boolean).join(", ")));
  out.push(line("Nationality", p.nationality));
  if (p.gender) out.push(line("Gender", p.gender));

  for (const q of profile.academics?.qualifications ?? []) {
    const span = [year(q.startDate), year(q.endDate)].filter(Boolean).join("–");
    out.push(
      line(
        "Education",
        [q.qualification || q.levelOfStudy, q.fieldOfStudy && q.fieldOfStudy !== q.qualification ? `in ${q.fieldOfStudy}` : ""]
          .map(clean)
          .filter(Boolean)
          .join(" "),
        q.institution,
        q.boardOrUniversity,
        q.city,
        span,
        q.score ? `score ${clean(q.score)}` : "",
        q.subjects ? `subjects: ${clean(q.subjects)}` : ""
      )
    );
  }
  for (const a of profile.academics?.achievements ?? []) {
    out.push(line("Achievement", (a as { title?: string }).title, (a as { description?: string }).description));
  }

  for (const w of profile.workExperience ?? []) {
    const span = [year(w.workingFrom), w.currentlyWorking ? "present" : year(w.workingUpto)].filter(Boolean).join("–");
    out.push(line("Work experience", w.position, w.organisation, w.location, span, w.jobProfile));
  }

  const english = profile.tests?.english as
    | { type?: string; overallScore?: string; overall?: string; testDate?: string }
    | undefined;
  if (english) out.push(line("English test", english.type, english.overallScore || english.overall, english.testDate));

  const active = profile.applications?.activeProgram;
  if (active) out.push(line("Applying to", active.course, active.university, active.country, active.degreeLevel));
  for (const a of profile.applications?.all ?? []) {
    if (active && a.id === active.id) continue;
    out.push(line("Also applied to", a.course, a.university, a.country));
  }

  const f = profile.family;
  if (f?.father?.occupation) out.push(line("Father's occupation", f.father.occupation));
  if (f?.mother?.occupation) out.push(line("Mother's occupation", f.mother.occupation));

  const fin = profile.finance;
  if (fin) out.push(line("Funding", fin.loanStatus ? `education loan ${clean(fin.loanStatus)}` : "", fin.loanAmountSanctioned, fin.currency, fin.bankName));

  const v = profile.visaLogistics;
  if (v?.accommodation) out.push(line("Accommodation", v.accommodation.name, v.accommodation.city, v.accommodation.fromDate, v.accommodation.toDate));
  if (v?.insurance) out.push(line("Insurance", v.insurance.provider, v.insurance.coverageAmount, v.insurance.fromDate, v.insurance.toDate));
  if (v?.travel) out.push(line("Travel", v.travel.airline, v.travel.origin, v.travel.destination, v.travel.travelDate));
  if (v?.consulate) out.push(line("Consulate", v.consulate.name, v.consulate.city));

  if (profile.skills?.length) out.push(line("Skills", profile.skills.join(", ")));
  for (const c of profile.certifications ?? []) out.push(line("Certification", c.name, c.provider, year(c.date)));
  if (profile.motherTongue) out.push(line("Mother tongue", profile.motherTongue));
  for (const l of profile.languages ?? []) {
    if (!l.isMotherTongue) out.push(line("Language", l.language, l.level));
  }
  if (profile.hobbies?.length) out.push(line("Hobbies", profile.hobbies.join(", ")));

  const text = out.filter((x): x is string => Boolean(x)).join("\n");
  return text.length > MAX_FACTS_CHARS ? `${text.slice(0, MAX_FACTS_CHARS)}\n- (profile truncated)` : text;
}

/**
 * Loads the student's profile facts for the assistant, or null when the student cannot be
 * loaded. Access to `studentId` must already have been checked by the caller.
 */
export async function loadStudentProfileFacts(
  studentId: string,
  loadSnapshot: (id: string) => Promise<CrmSnapshot | null> = defaultLoadSnapshot
): Promise<string | null> {
  try {
    const snapshot = await loadSnapshot(studentId);
    if (!snapshot) return null;
    const facts = buildStudentProfileFacts(mapCrmToNormalizedStudent(snapshot, { source: "senior-crm-api" }));
    return facts || null;
  } catch {
    return null;
  }
}

async function defaultLoadSnapshot(studentId: string): Promise<CrmSnapshot | null> {
  return getSampleSnapshotById(studentId) ?? (await new CrmApiStudentDataProvider().getStudent(studentId));
}
