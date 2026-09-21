/**
 * services/ai/__tests__/aiDocumentGeneration.test.ts
 *
 * Comprehensive Test Suite for AI Document Generation Architecture.
 *
 * Implements the 12 minimum required tests:
 * TEST 1: Cover Letter routes to Cover Letter profile.
 * TEST 2: SOP does not receive visa finance/travel instructions.
 * TEST 3: LOR is written from recommender perspective.
 * TEST 4: Locked amount remains identical (INR 39,00,000 preserved, 38,00,000 rejected).
 * TEST 5: Conflicting passport numbers produce NEEDS_REVIEW.
 * TEST 6: Repeated "I chose" sentences are detected.
 * TEST 7: AI/generic phrase validator finds configured phrases.
 * TEST 8: Long sentence validator identifies sentences > configured threshold.
 * TEST 9: Unknown document type is rejected.
 * TEST 10: Missing optional data does not cause invented facts.
 * TEST 11: LOR does not invent "top 5%" claims.
 * TEST 12: Official programme title remains unchanged.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { DOCUMENT_TYPES, isValidDocumentType } from "../config/documentTypes";
import { getDocumentProfile } from "../config/documentProfiles";
import { normalizeDocumentData } from "../documents/normalizeDocumentData";
import { routeDocumentRequest } from "../documents/documentRouter";
import { buildDocumentPlan } from "../documents/documentPlanner";
import { buildSopPrompt } from "../prompts/sopPrompt";
import { buildLorPrompt } from "../prompts/lorPrompt";
import { detectDataConflicts } from "../validators/conflictDetector";
import { extractLockedFacts } from "../validators/lockedFactExtractor";
import { validateLockedFacts } from "../validators/lockedFactValidator";
import { validateRepetition } from "../validators/repetitionValidator";
import { validateSentenceLengths } from "../validators/sentenceValidator";
import { validateGenericPhrases } from "../validators/genericPhraseValidator";

test("TEST 1: Cover Letter routes to Cover Letter profile", () => {
  const routed = routeDocumentRequest({
    documentType: DOCUMENT_TYPES.VISA_COVER_LETTER,
    applicant: { fullName: "Aafia Ameen", passportNumber: "Z9876543" },
    destination: {
      university: "University of Padua",
      course: "Bachelor's Degree in Information Engineering",
      country: "Italy",
    },
  });

  assert.equal(routed.documentType, DOCUMENT_TYPES.VISA_COVER_LETTER);
  assert.equal(routed.profile.type, DOCUMENT_TYPES.VISA_COVER_LETTER);
  assert.equal(routed.profile.perspective, "first_person_applicant");
  assert.equal(routed.profile.allowedFinances, true);
  assert.equal(routed.profile.allowedLogistics, true);
  assert.equal(routed.profile.creativity, "LOW");
});

test("TEST 2: SOP does not receive visa finance/travel instructions", () => {
  const normalized = normalizeDocumentData({
    documentType: DOCUMENT_TYPES.SOP,
    applicant: { fullName: "Aarav Mehta", country: "India" },
    destination: {
      university: "University of Bristol",
      course: "MSc Advanced Computer Science",
      country: "United Kingdom",
    },
    financials: {
      educationLoan: { amount: "INR 20,00,000", bank: "SBI" },
      bankFunds: { balance: "INR 8,50,000" },
    },
    travel: {
      flightNumber: "AI 123",
      pnr: "PNR999",
    },
    accommodation: {
      name: "Student Dormitory",
      bookingReference: "BOOK-1234",
    },
  });

  const profile = getDocumentProfile(DOCUMENT_TYPES.SOP);
  const plan = buildDocumentPlan(normalized, profile);
  const sopPrompt = buildSopPrompt(normalized, plan);

  // Assert SOP profile strictly disallows finances and logistics
  assert.equal(profile.allowedFinances, false);
  assert.equal(profile.allowedLogistics, false);

  // Assert generated SOP prompt forbids bank balances, loans, PNR, and travel
  assert.ok(sopPrompt.includes("NEVER mention bank account balances"));
  assert.ok(sopPrompt.includes("NEVER mention visa insurance policies"));
  assert.ok(sopPrompt.includes("flight tickets, PNR numbers, or accommodation"));

  // The plan must NOT contain finance or logistics paragraphs
  const planIds = plan.paragraphs.map((p) => p.id);
  assert.ok(!planIds.includes("finances"));
  assert.ok(!planIds.includes("logistics"));
});

test("TEST 3: LOR is written from recommender perspective", () => {
  const normalized = normalizeDocumentData({
    documentType: DOCUMENT_TYPES.LOR,
    applicant: { fullName: "Kunal Sharma" },
    recommender: {
      fullName: "Dr. Ramesh Iyer",
      designation: "Professor & Head of Department",
      department: "Computer Science & Engineering",
      institutionName: "Poornima Institute",
    },
    destination: {
      university: "University of Toronto",
      course: "Master of Science in Computer Science",
    },
  });

  const profile = getDocumentProfile(DOCUMENT_TYPES.LOR);
  const plan = buildDocumentPlan(normalized, profile);
  const lorPrompt = buildLorPrompt(normalized, plan);

  assert.equal(profile.perspective, "third_person_recommender");
  assert.ok(lorPrompt.includes("RECOMMENDER IDENTITY:"));
  assert.ok(lorPrompt.includes("Dr. Ramesh Iyer"));
  assert.ok(lorPrompt.includes("third-person perspective"));
  assert.ok(lorPrompt.includes("NEVER slip into the applicant's first-person voice"));
});

test("TEST 4: Locked amount remains identical (INR 39,00,000 preserved, 38,00,000 rejected)", () => {
  const normalized = normalizeDocumentData({
    documentType: DOCUMENT_TYPES.VISA_COVER_LETTER,
    applicant: { fullName: "Rohan Varma", passportNumber: "P1234567" },
    destination: { university: "Politecnico di Milano", course: "MSc Mechanical Engineering" },
    financials: {
      educationLoan: { amount: "INR 39,00,000", bank: "HDFC Bank" },
    },
  });

  const lockedFacts = extractLockedFacts(normalized);
  const loanFact = lockedFacts.find((f) => f.field === "loanAmount");
  assert.ok(loanFact, "Loan amount must be locked");
  assert.equal(loanFact.value, "INR 39,00,000");

  // Output 1: Preserves exact amount with applicant context -> PASS
  const passingOutput =
    "My name is Rohan Varma (Passport: P1234567). I am applying to Politecnico di Milano for MSc Mechanical Engineering. My father has secured an education loan of INR 39,00,000 from HDFC Bank to cover my tuition fees.";
  const passResult = validateLockedFacts(passingOutput, lockedFacts);
  assert.equal(passResult.valid, true);
  assert.ok(passResult.matchedFacts > 0);

  // Output 2: Silently alters amount to INR 38,00,000 -> FAIL
  const failingOutput =
    "My name is Rohan Varma (Passport: P1234567). I am applying to Politecnico di Milano for MSc Mechanical Engineering. My father has secured an education loan of INR 38,00,000 from HDFC Bank to cover my tuition fees.";
  const failResult = validateLockedFacts(failingOutput, lockedFacts);
  assert.equal(failResult.valid, false);
  const missingLoan = failResult.missingFacts.find((m) => m.field === "loanAmount");
  assert.ok(missingLoan, "Validator must identify altered loanAmount");
  assert.equal(missingLoan.expectedValue, "INR 39,00,000");
});

test("TEST 5: Conflicting passport numbers produce NEEDS_REVIEW", () => {
  const normalized = normalizeDocumentData({
    documentType: DOCUMENT_TYPES.VISA_COVER_LETTER,
    applicant: { fullName: "Zohaib Khan", passportNumber: "Z1234567" },
    destination: { university: "Sapienza University", course: "BSc AI" },
  });

  // Raw payload has conflicting passport number
  const rawWithConflict = {
    passportInfo: { passportNumber: "Z9876543" },
  };

  const conflictResult = detectDataConflicts(normalized, rawWithConflict);
  assert.equal(conflictResult.hasConflicts, true);
  assert.ok(conflictResult.conflicts.length > 0);
  assert.equal(conflictResult.conflicts[0].field, "passportNumber");
  assert.deepEqual(conflictResult.conflicts[0].values, ["Z1234567", "Z9876543"]);
});

test("TEST 6: Repeated 'I chose' sentences are detected", () => {
  const repetitiveText = `
    I chose the University of Padua for its curriculum.
    I chose this program because it matches my interests.
    I chose Italy for its academic heritage.
    The course structure will support my goals.
  `;

  const repetitionResult = validateRepetition(repetitiveText);
  assert.equal(repetitionResult.valid, false);
  const starterIssue = repetitionResult.issues.find(
    (i) => i.pattern === "I chose" && i.severity === "critical"
  );
  assert.ok(starterIssue, "Must detect repetitive 'I chose' sentence openings");
  assert.equal(starterIssue.count, 3);
});

test("TEST 7: AI/generic phrase validator finds configured phrases", () => {
  const clichédText = `
    I am applying to this prestigious institution because of its world-class faculty and
    exceptional academic reputation. This program perfectly aligns with my goals, offering a
    transformative journey in this ever-evolving landscape.
  `;

  const result = validateGenericPhrases(clichédText);
  assert.equal(result.valid, false, "Must flag >= 4 clichés as invalid/critical");
  assert.equal(result.overallSeverity, "critical");
  assert.ok(result.totalClichesFound >= 4);

  const foundPhrases = result.matches.map((m) => m.phrase);
  assert.ok(foundPhrases.includes("prestigious institution"));
  assert.ok(foundPhrases.includes("world-class"));
  assert.ok(foundPhrases.includes("perfectly aligns"));
  assert.ok(foundPhrases.includes("exceptional academic reputation"));
});

test("TEST 8: Long sentence validator identifies sentences > configured threshold", () => {
  // Construct a sentence with 48 words (> 45 words critical threshold)
  const longSentence =
    "Furthermore, in addition to the rigorous foundational coursework in mathematics and systems engineering that I undertook during my prior academic qualifications at Carmel Convent School in Bhopal, I am thoroughly convinced that this comprehensive undergraduate curriculum will enable me to seamlessly transition into advanced research and practical engineering roles.";

  const result = validateSentenceLengths(longSentence);
  assert.equal(result.valid, false);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].severity, "critical");
  assert.ok(result.issues[0].wordCount > 45);
});

test("TEST 9: Unknown document type is rejected", () => {
  assert.equal(isValidDocumentType("INVALID_DOC_TYPE"), false);
  assert.equal(isValidDocumentType("RESUME"), false);
  assert.equal(isValidDocumentType("VISA_COVER_LETTER"), true);
  assert.equal(isValidDocumentType("SOP"), true);
  assert.equal(isValidDocumentType("LOR"), true);

  assert.throws(
    () => {
      routeDocumentRequest({ documentType: "UNKNOWN_TYPE" });
    },
    {
      message: /Unsupported document type/,
    }
  );
});

test("TEST 10: Missing optional data does not cause invented facts", () => {
  const minimalData = normalizeDocumentData({
    documentType: DOCUMENT_TYPES.SOP,
    applicant: { fullName: "Aarav Mehta" },
    destination: {
      university: "University of Padua",
      course: "Information Engineering",
    },
  });

  // Missing fields must remain empty/empty array, never fabricated
  assert.deepEqual(minimalData.projects, []);
  assert.deepEqual(minimalData.workExperience, []);
  assert.deepEqual(minimalData.achievements, []);
  assert.equal(minimalData.applicant.passportNumber, "");
  assert.equal(minimalData.financials.educationLoan?.amount, "");
  assert.equal(minimalData.accommodation, undefined);
  assert.equal(minimalData.travel, undefined);
});

test("TEST 11: LOR does not invent 'top 5%' claims without source data", () => {
  const normalizedLor = normalizeDocumentData({
    documentType: DOCUMENT_TYPES.LOR,
    applicant: { fullName: "Kunal Tanwar" },
    recommender: {
      fullName: "Prof. Sanjay Sharma",
      title: "Associate Professor",
      department: "Computer Science",
    },
    destination: {
      university: "Graduate Admissions Committee",
      course: "MSc Computer Science",
    },
    // No class ranking or percentage standing provided
  });

  const profile = getDocumentProfile(DOCUMENT_TYPES.LOR);
  const plan = buildDocumentPlan(normalizedLor, profile);
  const prompt = buildLorPrompt(normalizedLor, plan);

  assert.ok(prompt.includes("ZERO FABRICATION"));
  assert.ok(prompt.includes("NEVER invent or assert class rankings"));
  assert.ok(prompt.includes("top 1%"));
  assert.ok(prompt.includes("top 5%"));
});

test("TEST 12: Official programme title remains unchanged", () => {
  const officialTitle = "Bachelor's Degree in Information Engineering";
  const normalized = normalizeDocumentData({
    documentType: DOCUMENT_TYPES.VISA_COVER_LETTER,
    applicant: { fullName: "Aafia Ameen" },
    destination: {
      university: "University of Padua",
      course: officialTitle,
    },
  });

  assert.equal(normalized.course.officialName, officialTitle);

  const lockedFacts = extractLockedFacts(normalized);
  const courseFact = lockedFacts.find((f) => f.field === "courseName");
  assert.ok(courseFact);
  assert.equal(courseFact.value, officialTitle);

  // Validator test with exact title -> PASS
  const validDoc = `My name is Aafia Ameen. I am applying for the ${officialTitle} at the University of Padua.`;
  assert.equal(validateLockedFacts(validDoc, lockedFacts).valid, true);

  // Validator test with altered title -> FAIL
  const alteredDoc = `My name is Aafia Ameen. I am applying for the Bachelor of Science in Computer Systems at the University of Padua.`;
  const invalidResult = validateLockedFacts(alteredDoc, lockedFacts);
  assert.equal(invalidResult.valid, false);
  assert.ok(invalidResult.missingFacts.some((m) => m.field === "courseName"));
});
