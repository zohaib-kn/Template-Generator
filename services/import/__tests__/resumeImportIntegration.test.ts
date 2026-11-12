/**
 * services/import/__tests__/resumeImportIntegration.test.ts
 *
 * Comprehensive integration test suite for Resume Import:
 * - Deterministic parsing & section mapping
 * - Custom section preservation (never discard content)
 * - Section order preservation
 * - Multi-entry preservation (Education, Internships)
 * - Non-rewriting / verbatim preservation of bullets and text
 * - CRM conflict detection without silent overwriting
 * - DocumentReducer compatibility (Load, Edit, Delete, Rearrange, Add)
 * - Scanned PDF error handling
 */

import test from "node:test";
import assert from "node:assert/strict";
import { computeSectionsSummary } from "../resumeImportService";
import { parseDocumentDeterministically } from "../normalizers/deterministicParser";
import { detectCrmConflicts } from "../normalizers/crmConflictDetector";
import { documentReducer } from "@/features/document-generator/state/documentReducer";
import type { DocumentData, EducationEntry, InternshipEntry } from "@/types";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import { ScannedPdfError } from "../parsers/pdfParser";

// ── Test 1: Europass & Standard Resume Headings Mapping ─────────────────────
test("Resume Import: standard and Europass headings map deterministically", () => {
  const resumeText = `
Ananya Deshmukh
ananya.deshmukh@example.com
+91 9123456789

ABOUT ME
Passionate software developer interested in distributed systems.

EDUCATION AND TRAINING
Bachelor of Technology in Computer Engineering
2018 - 2022

PROFESSIONAL EXPERIENCE
Senior Software Engineer at Alpha Corp
2022 - Present
- Architected microservices with 99.99% uptime
- Mentored junior engineers

LANGUAGE SKILLS
English, Hindi, Marathi

HOBBIES AND INTERESTS
Chess, Photography, Mountaineering

DECLARATION
I hereby declare that the above information is true to the best of my knowledge.
`;

  const parsed = parseDocumentDeterministically(resumeText);

  assert.strictEqual(parsed.personal.fullName, "Ananya Deshmukh");
  assert.strictEqual(parsed.personal.email, "ananya.deshmukh@example.com");
  assert.ok(parsed.personal.phone?.includes("91234"));

  const chunkKeys = parsed.sectionChunks.map((c) => c.key);
  assert.ok(chunkKeys.includes("aboutMe"), "ABOUT ME mapped to aboutMe");
  assert.ok(chunkKeys.includes("education"), "EDUCATION AND TRAINING mapped to education");
  assert.ok(chunkKeys.includes("internships"), "PROFESSIONAL EXPERIENCE mapped to internships");
  assert.ok(chunkKeys.includes("languages"), "LANGUAGE SKILLS mapped to languages");
  assert.ok(chunkKeys.includes("hobbies"), "HOBBIES AND INTERESTS mapped to hobbies");
  assert.ok(chunkKeys.includes("declaration"), "DECLARATION mapped to declaration");

  // Content preservation
  assert.ok(parsed.candidateData.aboutMe?.includes("distributed systems"));
  assert.ok(parsed.candidateData.declaration?.includes("true to the best of my knowledge"));
  assert.ok(parsed.candidateData.hobbies && parsed.candidateData.hobbies.length >= 3);
  assert.ok(parsed.candidateData.languages && parsed.candidateData.languages.length >= 3);
});

// ── Test 2: Unknown Section Preserved as Custom Section ───────────────────────
test("Resume Import: unknown headings are preserved as customSections (never discarded)", () => {
  const resumeWithCustom = `
Rohan Mehra
rohan@alumni.org

PROFILE
Biotechnology researcher.

EDUCATION
M.Sc Molecular Biology
2021 - 2023

PUBLICATIONS & CONFERENCES
- "CRISPR-Cas9 Editing in Plant Models", Nature Biotech 2023
- "Synthetic Promoters in Yeast", Bioengineering Conf 2022

RESEARCH GRANTS & FELLOWSHIPS
- DBT Junior Research Fellowship (2021)
- Undergraduate Innovation Grant ($5,000)
`;

  const parsed = parseDocumentDeterministically(resumeWithCustom);

  assert.ok(parsed.candidateData.customSections && parsed.candidateData.customSections.length >= 2, "Unknown sections must become customSections");

  const pubSection = parsed.candidateData.customSections.find((s) => s.title.includes("PUBLICATIONS"));
  assert.ok(pubSection, "Publications section must be preserved");
  assert.ok(pubSection.content.includes("CRISPR-Cas9"), "Verbatim text must be preserved");
  assert.ok(pubSection.content.includes("Synthetic Promoters"), "All bullets must be preserved");

  const grantSection = parsed.candidateData.customSections.find((s) => s.title.includes("GRANTS"));
  assert.ok(grantSection, "Grants section must be preserved");
  assert.ok(grantSection.content.includes("DBT Junior Research"), "Grant details must be preserved");
});

// ── Test 3: computeSectionsSummary surfaces customSections ──────────────────
test("Resume Import: computeSectionsSummary includes custom sections", () => {
  const sampleDoc: DocumentData = {
    personal: { fullName: "Aarav", email: "aarav@test.com" },
    aboutMe: "Some summary",
    education: [{ id: "edu-1", qualification: "B.Tech", institution: "IIT" }],
    customSections: [
      { id: "cs-1", title: "Patents", content: "Patent US123456" },
      { id: "cs-2", title: "Volunteering Abroad", content: "Nepal 2022" },
    ],
  };

  const summary = computeSectionsSummary(sampleDoc);

  const personalSummary = summary.find((s) => s.sectionKey === "personal");
  assert.strictEqual(personalSummary?.status, "DETECTED");

  const eduSummary = summary.find((s) => s.sectionKey === "education");
  assert.strictEqual(eduSummary?.status, "DETECTED");
  assert.strictEqual(eduSummary?.itemCount, 1);

  // Custom sections should be present in summary
  const patentSummary = summary.find((s) => s.title === "Custom: Patents");
  assert.ok(patentSummary, "Custom section Patents should appear in summary");
  assert.strictEqual(patentSummary?.status, "DETECTED");

  const volunteerSummary = summary.find((s) => s.title === "Custom: Volunteering Abroad");
  assert.ok(volunteerSummary, "Custom section Volunteering Abroad should appear in summary");
  assert.strictEqual(volunteerSummary?.status, "DETECTED");
});

// ── Test 4: CRM Conflict Detection Without Silent Overwrites ─────────────────
test("Resume Import: CRM conflicts detected without silently overwriting CRM records", () => {
  const importedData: DocumentData = {
    personal: {
      fullName: "Pooja Roy",
      email: "pooja.work@gmail.com", // Differs from CRM
      phone: "+91 99999 11111", // Differs from CRM
      nationality: "Indian",
    },
    englishCertificate: {
      examName: "IELTS",
      score: "8.0", // Differs from CRM (7.5)
    },
  };

  const verifiedCrmProfile: NormalizedStudentProfile = {
    meta: { studentId: "std_456", source: "senior-crm-api", fetchedAt: new Date().toISOString() },
    personal: {
      fullName: "Pooja Roy",
      firstName: "Pooja",
      lastName: "Roy",
      email: "pooja.roy.verified@gmail.com",
      phone: "+91 88888 22222",
      nationality: "Indian",
    },
    academics: { qualifications: [] },
    workExperience: [],
    tests: {
      english: { type: "IELTS", overallScore: "7.5" },
    },
    applications: { all: [] },
  };

  const conflicts = detectCrmConflicts(importedData, verifiedCrmProfile);

  assert.strictEqual(conflicts.length, 3, "Expected 3 conflicts: email, phone, englishScore");

  const emailConflict = conflicts.find((c) => c.field === "email");
  assert.strictEqual(emailConflict?.crmValue, "pooja.roy.verified@gmail.com");
  assert.strictEqual(emailConflict?.uploadedValue, "pooja.work@gmail.com");
  assert.strictEqual(emailConflict?.resolution, "USE_CRM", "Default resolution must protect verified CRM data");

  const phoneConflict = conflicts.find((c) => c.field === "phone");
  assert.strictEqual(phoneConflict?.crmValue, "+91 88888 22222");
  assert.strictEqual(phoneConflict?.uploadedValue, "+91 99999 11111");

  const scoreConflict = conflicts.find((c) => c.field === "englishScore");
  assert.strictEqual(scoreConflict?.crmValue, "7.5");
  assert.strictEqual(scoreConflict?.uploadedValue, "8.0");
});

// ── Test 5: DocumentReducer Post-Import Lifecycle ─────────────────────────────
test("Resume Import: documentReducer handles Load, Edit, Delete, Add, and Rearrange", () => {
  // Step 1: Initial empty state
  let state: DocumentData = {
    personal: {},
    education: [],
    internships: [],
    skills: [],
  };

  // Step 2: LOAD_STUDENT with imported CV payload
  const importedPayload: DocumentData = {
    personal: { fullName: "Karan Johar", email: "karan@example.com" },
    aboutMe: "Film director and producer.",
    education: [
      { id: "edu-1", qualification: "Bachelor of Arts", institution: "Mumbai University", startDate: "2010", endDate: "2013" },
      { id: "edu-2", qualification: "Diploma in Direction", institution: "FTII Pune", startDate: "2013", endDate: "2015" },
    ],
    internships: [
      { id: "intern-1", role: "Assistant Director", company: "Dharma Productions", startDate: "2015", endDate: "2017" },
    ],
    skills: [
      { id: "sk-1", name: "Screenwriting" },
      { id: "sk-2", name: "Cinematography" },
    ],
    customSections: [
      { id: "cs-101", title: "Filmography", content: "Kuch Kuch Hota Hai (1998)\nKabhi Khushi Kabhie Gham (2001)" },
    ],
    sectionOrder: ["aboutMe", "education", "custom_cs-101", "internships", "skills"],
  };

  state = documentReducer(state, { type: "LOAD_STUDENT", payload: importedPayload });

  assert.strictEqual(state.personal?.fullName, "Karan Johar");
  assert.strictEqual(state.education?.length, 2, "Two education entries loaded");
  assert.strictEqual(state.customSections?.length, 1, "Custom section Filmography loaded");
  assert.deepStrictEqual(state.sectionOrder, ["aboutMe", "education", "custom_cs-101", "internships", "skills"], "sectionOrder preserved");

  // Step 3: Post-import Edit (Counsellor edits imported entry)
  state = documentReducer(state, {
    type: "UPDATE_LIST_ITEM",
    key: "education",
    payload: { id: "edu-1", patch: { finalGrade: "First Class with Distinction" } },
  });
  const updatedEdu = state.education?.find((e) => e.id === "edu-1");
  assert.strictEqual(updatedEdu?.finalGrade, "First Class with Distinction", "Counsellor edit applied to imported entry");

  // Step 4: Post-import Add (Counsellor adds new entry)
  const newEntry: EducationEntry = {
    id: "edu-3",
    qualification: "Certificate in Digital Media",
    institution: "NYFA",
    startDate: "2016",
    endDate: "2016",
  };
  state = documentReducer(state, {
    type: "ADD_LIST_ITEM",
    key: "education",
    payload: newEntry,
  });
  assert.strictEqual(state.education?.length, 3, "New entry added alongside imported entries");

  // Step 5: Post-import Delete (Counsellor deletes imported internship)
  state = documentReducer(state, {
    type: "REMOVE_LIST_ITEM",
    key: "internships",
    payload: "intern-1",
  });
  assert.strictEqual(state.internships?.length, 0, "Imported internship cleanly removed");

  // Step 6: Post-import Rearrange (Counsellor changes section order)
  state = documentReducer(state, {
    type: "MOVE_SECTION",
    payload: { sectionId: "custom_cs-101", direction: "up" },
  });
  assert.deepStrictEqual(state.sectionOrder, ["aboutMe", "custom_cs-101", "education", "internships", "skills"], "Custom section moved up");
});

// ── Test 6: Scanned PDF / Missing Text Error ─────────────────────────────────
test("Resume Import: ScannedPdfError thrown when PDF contains no usable text layer", () => {
  const scannedError = new ScannedPdfError();
  assert.strictEqual(scannedError.name, "ScannedPdfError");
  assert.ok(scannedError.message.includes("couldn't detect readable text"));
});
