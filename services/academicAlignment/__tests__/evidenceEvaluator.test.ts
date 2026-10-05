/**
 * services/academicAlignment/__tests__/evidenceEvaluator.test.ts
 *
 * Test suite for Transition Evidence Evaluator (Phase 3).
 *
 * Tests:
 * 1. Single item scoring: strong match (3), moderate match (2), irrelevant (0)
 * 2. Test 5: Irrelevant evidence (Finance cert for Mechanical Engg) scores 0 and is insufficient
 * 3. Test 6: Short reason (< 30 chars) fails even with high evidence score
 * 4. Test 7: Multi-item additive scoring passes when score >= 3 and reason >= 30 chars
 * 5. Test 20: Explicit scenario:
 *    qualification="B.Com", course="MSc Mechanical Engineering",
 *    resolution=INTENTIONAL_CONFIRMED,
 *    evidence=["Finance Certificate"], reason="I want to study engineering"
 *    -> Finance Certificate score=0, totalScore=0 < 3, isSufficient=false, generationAllowed=false
 * 6. Selection scoping: only counsellor-selected items contribute to score
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateSingleItem,
  evaluateTransitionEvidence,
  computeAcademicAlignment,
  REQUIRED_EVIDENCE_SCORE,
  MIN_REASON_LENGTH,
} from "../index";
import type {
  NormalizedQualification,
  NormalizedAppliedProgram,
} from "@/types/normalizedStudent";

describe("Transition Evidence Evaluator (Phase 3)", () => {
  // -------------------------------------------------------------------------
  // 1. Single Item Scoring
  // -------------------------------------------------------------------------
  test("1. evaluateSingleItem scores strong (3), moderate (2), and irrelevant (0) accurately", () => {
    // Computing domain: Python + machine learning matches 2 keywords -> 3 (strong)
    const strong = evaluateSingleItem(
      "c1",
      "Python and Machine Learning Bootcamp",
      "CERTIFICATION",
      "COMPUTING"
    );
    assert.equal(strong.relevanceScore, 3);
    assert.ok(strong.domainRelevanceExplanation?.includes("Strong match"));

    // Computing domain: SQL matches 1 keyword -> 2 (moderate)
    const moderate = evaluateSingleItem(
      "c2",
      "SQL Fundamentals",
      "SKILL",
      "COMPUTING"
    );
    assert.equal(moderate.relevanceScore, 2);
    assert.ok(moderate.domainRelevanceExplanation?.includes("Moderate match"));

    // Engineering domain: Financial Accounting is completely irrelevant -> 0
    const irrelevant = evaluateSingleItem(
      "c3",
      "Financial Accounting & Taxation",
      "CERTIFICATION",
      "ENGINEERING"
    );
    assert.equal(irrelevant.relevanceScore, 0);
    assert.ok(irrelevant.domainRelevanceExplanation?.includes("No relevant subject overlap"));
  });

  // -------------------------------------------------------------------------
  // 2. Test 5: Irrelevant evidence
  // -------------------------------------------------------------------------
  test("2. Test 5: Irrelevant evidence fails sufficiency even with a long explanation", () => {
    const result = evaluateTransitionEvidence(
      {
        qualifications: [],
        targetProgram: {
          id: "p1",
          country: "UK",
          university: "Bath",
          course: "MSc Automotive Engineering",
          degreeLevel: "Master's",
          courseCategory: "Engineering",
        },
        transitionContext: {
          reason:
            "Student has extensive background in commercial banking and wants to pivot to automobile manufacturing.",
          selectedCertifications: ["cert-fin"],
        },
        certifications: [
          { id: "cert-fin", name: "Corporate Financial Analysis and Valuation", issuer: "CFI" },
        ],
      },
      "ENGINEERING"
    );

    assert.equal(result.totalScore, 0);
    assert.equal(result.isSufficient, false);
    assert.equal(result.reasonValid, true);
    assert.ok(result.blockingReason?.includes("Evidence score"));
  });

  // -------------------------------------------------------------------------
  // 3. Test 6: Short reason (< 30 chars)
  // -------------------------------------------------------------------------
  test("3. Test 6: Justification shorter than 30 characters fails sufficiency", () => {
    const result = evaluateTransitionEvidence(
      {
        qualifications: [],
        targetProgram: {
          id: "p1",
          country: "Germany",
          university: "RWTH",
          course: "MSc Computer Science",
          degreeLevel: "Master's",
          courseCategory: "Computer Science / IT",
        },
        transitionContext: {
          reason: "Wants to switch to IT field.", // 28 chars
          selectedCertifications: ["cert-cs"],
        },
        certifications: [
          { id: "cert-cs", name: "Full Stack Python and Algorithms Specialization", issuer: "Coursera" },
        ],
      },
      "COMPUTING"
    );

    assert.equal(result.totalScore >= 3, true);
    assert.equal(result.reasonValid, false);
    assert.equal(result.isSufficient, false);
    assert.ok(result.blockingReason?.includes("Justification too short"));
  });

  // -------------------------------------------------------------------------
  // 4. Test 7: Multi-item additive scoring
  // -------------------------------------------------------------------------
  test("4. Test 7: Multi-item additive evidence satisfies threshold (>= 3 points + valid reason)", () => {
    const result = evaluateTransitionEvidence(
      {
        qualifications: [],
        targetProgram: {
          id: "p1",
          country: "Australia",
          university: "Melbourne",
          course: "Master of Information Technology",
          degreeLevel: "Master's",
          courseCategory: "Computer Science / IT",
        },
        transitionContext: {
          reason:
            "Student developed web applications and completed database certifications during undergraduate years.",
          selectedProjects: ["proj-1"],
          selectedSkills: ["skill-1"],
        },
        academicProjects: [
          { id: "proj-1", title: "React Web Application", description: "Built front-end UI" }, // score: 2
        ],
        skills: [
          { id: "skill-1", name: "Python Programming" }, // score: 2
        ],
      },
      "COMPUTING"
    );

    assert.equal(result.totalScore >= REQUIRED_EVIDENCE_SCORE, true);
    assert.equal(result.reasonValid, true);
    assert.equal(result.isSufficient, true);
    assert.equal(result.matchedItems.length, 2);
  });

  // -------------------------------------------------------------------------
  // 5. Test 20: Explicit B.Com -> MSc Mechanical Engineering scenario
  // -------------------------------------------------------------------------
  test("5. Test 20: B.Com -> MSc Mechanical Engg with Finance Cert and brief reason fails", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "q-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Commerce (B.Com)",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "p-eng",
      country: "Germany",
      university: "Technical University of Munich",
      course: "MSc Mechanical Engineering",
      degreeLevel: "Master's",
      courseCategory: "Engineering",
    };

    // Transition context with unrelated Finance Certificate and brief reason (< 30 chars)
    const transitionContext = {
      reason: "I want to study engineering", // 27 chars
      selectedCertifications: ["cert-fin-1"],
    };

    const certifications = [
      { id: "cert-fin-1", name: "Finance Certificate", issuer: "Finance Academy" },
    ];

    // 1. Direct evidence evaluator check
    const evalResult = evaluateTransitionEvidence(
      {
        qualifications,
        targetProgram,
        transitionContext,
        certifications,
      },
      "ENGINEERING"
    );

    // Finance Certificate relevance score = 0 (not mechanical-related)
    assert.equal(evalResult.totalScore, 0);
    assert.equal(evalResult.isSufficient, false);

    // 2. Engine-level check
    const engineResult = computeAcademicAlignment({
      qualifications,
      targetProgram,
      transitionContext,
      certifications,
    });

    assert.equal(engineResult.status, "ACADEMIC_MISMATCH");
    assert.equal(engineResult.evidenceSufficient, false);
    assert.equal(engineResult.generationAllowed, false);
    assert.ok(engineResult.blockingReason);
  });

  // -------------------------------------------------------------------------
  // 6. Selection Scoping
  // -------------------------------------------------------------------------
  test("6. Only counsellor-selected items contribute to the score", () => {
    const result = evaluateTransitionEvidence(
      {
        qualifications: [],
        targetProgram: {
          id: "p1",
          country: "Canada",
          university: "Waterloo",
          course: "MSc Computer Science",
          degreeLevel: "Master's",
          courseCategory: "Computer Science / IT",
        },
        transitionContext: {
          reason:
            "Student only relies on the verified Python certification and does not claim other unverified items.",
          selectedCertifications: ["cert-python"], // ONLY python cert selected
        },
        certifications: [
          { id: "cert-python", name: "Python Programming", issuer: "Coursera" }, // score: 2
          { id: "cert-other", name: "Cloud Computing and Docker", issuer: "Linux Foundation" }, // score: 3, NOT selected
        ],
      },
      "COMPUTING"
    );

    // Only cert-python should be counted
    assert.equal(result.matchedItems.length, 1);
    assert.equal(result.matchedItems[0].id, "cert-python");
    assert.equal(result.totalScore, 2);
    // Score of 2 is less than 3, so insufficient
    assert.equal(result.isSufficient, false);
  });
});
