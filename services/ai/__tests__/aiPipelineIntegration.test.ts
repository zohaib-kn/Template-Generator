/**
 * services/ai/__tests__/aiPipelineIntegration.test.ts
 *
 * End-to-end and Integration tests for:
 * 1. Full writing quality report calculation.
 * 2. Second-pass repair prompt formulation.
 * 3. Seed approved examples retrieval with priority scoring.
 * 4. Counsellor revision learning loop (saveAIDraft -> saveApprovedFinal -> retrieval).
 * 5. Mocked full pipeline generation.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { DOCUMENT_TYPES } from "../config/documentTypes";
import { normalizeDocumentData } from "../documents/normalizeDocumentData";
import { extractLockedFacts } from "../validators/lockedFactExtractor";
import { validateLockedFacts } from "../validators/lockedFactValidator";
import { validateRepetition } from "../validators/repetitionValidator";
import { validateSentenceLengths } from "../validators/sentenceValidator";
import { validateGenericPhrases } from "../validators/genericPhraseValidator";
import { computeWritingQualityReport } from "../validators/qualityScorer";
import { buildAuditorPrompt } from "../prompts/auditorPrompt";
import { exampleRepository } from "../examples/exampleRepository";
import { retrieveRelevantExamples } from "../examples/exampleRetriever";

test("INTEGRATION 1: Quality Report generates multi-dimensional metrics without fake AI percentages", () => {
  const sampleDoc = `To the Visa Officer, Consulate General of Italy.
Subject: Application for Type D Student Visa for Bachelor's Degree in Information Engineering at the University of Padua.

My name is Aafia Ameen (Passport: Z9876543), an Indian citizen residing in Bhopal. I completed my higher secondary education with 88.6% in Physics, Chemistry, and Mathematics, and secured an IELTS band of 7.5.

I chose this programme at the University of Padua because its curriculum integrates computing and electronics. Studying in Italy offers a recognized degree structure. After completing my degree, I plan to return to India to work in the software engineering sector.

My education is supported by my father, Mohammed Ameen (Annual Income: INR 14,00,000), who secured an education loan of INR 20,00,000 from State Bank of India with personal savings of INR 8,50,000, totaling INR 28,50,000. Accommodation is confirmed at ESU Casa dello Studente (Booking Ref: ESU-PADUV-2026-4471), and travel is scheduled on Air India flight AI 0131 (PNR: AIINDBHO2026881).`;

  const canonical = normalizeDocumentData({
    documentType: DOCUMENT_TYPES.VISA_COVER_LETTER,
    applicant: { fullName: "Aafia Ameen", passportNumber: "Z9876543" },
    destination: {
      university: "University of Padua",
      course: "Bachelor's Degree in Information Engineering",
      country: "Italy",
    },
    financials: {
      sponsor: { name: "Mohammed Ameen", annualIncome: "INR 14,00,000" },
      educationLoan: { amount: "INR 20,00,000", bank: "State Bank of India" },
      bankFunds: { balance: "INR 8,50,000" },
      totalFunds: "INR 28,50,000",
    },
    accommodation: {
      name: "ESU Casa dello Studente",
      bookingReference: "ESU-PADUV-2026-4471",
    },
    travel: {
      flightNumber: "AI 0131",
      pnr: "AIINDBHO2026881",
    },
  });

  const lockedFacts = extractLockedFacts(canonical);
  const lockedResult = validateLockedFacts(sampleDoc, lockedFacts);
  const repetitionResult = validateRepetition(sampleDoc, {
    universityName: "University of Padua",
    courseName: "Bachelor's Degree in Information Engineering",
  });
  const sentenceResult = validateSentenceLengths(sampleDoc);
  const clicheResult = validateGenericPhrases(sampleDoc);

  const qualityReport = computeWritingQualityReport({
    text: sampleDoc,
    lockedResult,
    repetitionResult,
    sentenceResult,
    clicheResult,
    paragraphCount: 4,
    expectedParagraphCount: 9,
  });

  assert.ok(qualityReport.overallScore > 70);
  assert.ok(["EXCELLENT", "GOOD"].includes(qualityReport.rating));
  assert.equal(typeof qualityReport.metrics.factualConsistency, "number");
  assert.equal(typeof qualityReport.metrics.specificity, "number");
  assert.equal(typeof qualityReport.metrics.repetitionControl, "number");
  assert.equal(typeof qualityReport.metrics.sentenceVariation, "number");
  assert.equal(typeof qualityReport.metrics.plainLanguage, "number");
  assert.equal(typeof qualityReport.metrics.genericPhraseControl, "number");
  assert.equal(typeof qualityReport.metrics.documentStructure, "number");

  // Ensure no "AI percentage" or "human percentage" exists
  const reportKeys = Object.keys(qualityReport);
  assert.ok(!reportKeys.includes("humanPercentage"));
  assert.ok(!reportKeys.includes("aiPercentage"));
});

test("INTEGRATION 2: Second-pass auditor prompt passes exact validator failures without destroying passing sections", () => {
  const prompt = buildAuditorPrompt({
    documentType: "VISA_COVER_LETTER",
    originalDraft: "My name is Aafia. I want to study at Padua. I want to return home.",
    issues: [
      {
        type: "LOCKED_FACT_MISSING",
        description: "Loan amount was omitted from financial paragraph.",
        expected: "INR 20,00,000",
      },
      {
        type: "AI_CLICHE_DETECTED",
        description: "Detected generic marketing phrase.",
        found: 2,
      },
    ],
    lockedFacts: [
      {
        field: "loanAmount",
        value: "INR 20,00,000",
        category: "financial",
        required: true,
      },
    ],
  });

  assert.ok(prompt.includes("VALIDATION ISSUES REQUIRING REPAIR:"));
  assert.ok(prompt.includes("Loan amount was omitted"));
  assert.ok(prompt.includes("Required exact value: \"INR 20,00,000\""));
  assert.ok(prompt.includes("LOCKED FACT INVENTORY (MUST REMAIN EXACT):"));
  assert.ok(prompt.includes("- [loanAmount]: \"INR 20,00,000\""));
  assert.ok(prompt.includes("Do NOT unnecessarily rewrite sections that already pass validation"));
});

test("INTEGRATION 3: Example retriever selects senior-approved Aafia example for Italy Cover Letter", async () => {
  const retrieved = await retrieveRelevantExamples({
    documentType: DOCUMENT_TYPES.VISA_COVER_LETTER,
    destinationCountry: "Italy",
    studyArea: "Information Engineering",
    limit: 2,
  });

  assert.ok(retrieved.length > 0);
  assert.equal(retrieved[0].documentType, DOCUMENT_TYPES.VISA_COVER_LETTER);
  assert.equal(retrieved[0].id, "approved-cover-letter-aafia-italy");
  assert.equal(retrieved[0].destinationCountry, "Italy");
  assert.ok(retrieved[0].approvedFinal.includes("Aafia Ameen"));
});

test("INTEGRATION 4: Learning loop saves counsellor edits and retrieves them for future requests", async () => {
  const customId = `approved-test-sop-${Date.now()}`;

  // Save approved final after senior edit
  await exampleRepository.saveApprovedFinal({
    id: customId,
    documentType: DOCUMENT_TYPES.SOP,
    destinationCountry: "Germany",
    studyArea: "Robotics & Automation",
    title: "Senior Approved SOP — Robotics TUM",
    approvedFinal: "My focus on control systems and kinematic modeling led me to apply...",
    reviewerNotes: ["Emphasized ROS2 and kinematics coursework."],
  });

  const retrieved = await retrieveRelevantExamples({
    documentType: DOCUMENT_TYPES.SOP,
    destinationCountry: "Germany",
    studyArea: "Robotics",
    limit: 2,
  });

  assert.ok(retrieved.length > 0);
  assert.equal(retrieved[0].id, customId);
  assert.ok(retrieved[0].reviewerNotes.includes("Emphasized ROS2 and kinematics coursework."));
});
