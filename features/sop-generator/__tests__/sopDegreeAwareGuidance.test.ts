/**
 * features/sop-generator/__tests__/sopDegreeAwareGuidance.test.ts
 *
 * Automated test suite for SOP Degree-Aware Guidance and Transition Bridge Engine:
 * 1. Pre-formulated counsellor transition rationale templates
 * 2. Discipline-specific and transition bridge talking points for SOP sections
 * 3. AI Prompt generation augmentation with transition bridge evidence
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getTransitionRationaleTemplate,
  getSectionTalkingPoints,
} from "../guidance/sopAcademicCatalog";
import { MIN_REASON_LENGTH } from "@/services/academicAlignment/evidenceEvaluator";
import { buildSopPrompt } from "@/services/ai/prompts/sopPrompt";
import type { CanonicalDocumentData } from "@/services/ai/documents/canonicalDocument";
import type { DocumentPlan } from "@/services/ai/documents/documentPlanner";

describe("SOP Degree-Aware Guidance & Transition Bridge Engine", () => {
  // ── Test 1: Pre-formulated Rationale Template Generation ──────────────────
  it("should generate a transition rationale >= 30 chars with academic framing", () => {
    const template = getTransitionRationaleTemplate(
      "SOCIAL_HUMANITIES",
      "BUSINESS",
      "Bachelor of Arts in History",
      "Master in Management"
    );

    assert.ok(template.length >= MIN_REASON_LENGTH, `Rationale should be >= ${MIN_REASON_LENGTH} chars`);
    assert.match(template, /Bachelor of Arts in History/i);
    assert.match(template, /Master in Management/i);
    assert.match(template, /Social Sciences & Humanities/i);
    assert.match(template, /analytical/i);
  });

  it("should integrate verified evidence highlights into the rationale template", () => {
    const evidenceHighlights = "Economic Research Intern at Digiwire and Google Data Analytics Certificate";
    const template = getTransitionRationaleTemplate(
      "SOCIAL_HUMANITIES",
      "COMPUTING",
      "BA in History",
      "Master in Data Science",
      evidenceHighlights
    );

    assert.ok(template.length >= MIN_REASON_LENGTH);
    assert.match(template, /Economic Research Intern at Digiwire/);
    assert.match(template, /Google Data Analytics Certificate/);
    assert.match(template, /intentional cross-disciplinary progression/i);
  });

  // ── Test 2: Section Talking Points Generation ─────────────────────────────
  it("should generate academic foundation talking points for BA History", () => {
    const points = getSectionTalkingPoints(
      "academic-background",
      "SOCIAL_HUMANITIES",
      "SOCIAL_HUMANITIES",
      false,
      "Bachelor of Arts in History",
      "Master in Modern History"
    );

    assert.ok(points.length >= 3, "Should return at least 3 talking points");
    const labels = points.map((p) => p.label);
    assert.ok(labels.some((l) => l.includes("Primary Source") || l.includes("Archival") || l.includes("Analysis")));
    assert.ok(points.every((p) => p.textToInsert.length > 20));
  });

  it("should generate bridge motivation points when transitioning disciplines", () => {
    const points = getSectionTalkingPoints(
      "why-course",
      "SOCIAL_HUMANITIES",
      "LAW",
      true, // transition active
      "Bachelor of Arts in History",
      "Master in International Law & Governance"
    );

    assert.ok(points.length >= 2, "Should return bridge talking points");
    const bridgePoints = points.filter((p) => p.type === "bridge" || p.type === "transferable");
    assert.ok(bridgePoints.length >= 2, "Should contain bridge and transferable points");

    const labels = points.map((p) => p.label);
    assert.ok(labels.includes("Interdisciplinary Motivation"));
    assert.ok(labels.includes("Practical Bridge Experience"));
  });

  it("should generate realistic career trajectory points aligned with target domain", () => {
    const points = getSectionTalkingPoints(
      "career-goals",
      "SOCIAL_HUMANITIES",
      "BUSINESS",
      true,
      "BA in History",
      "Master in Business Administration"
    );

    assert.ok(points.length >= 2);
    assert.ok(points.some((p) => p.type === "career"));
    assert.ok(points.some((p) => p.label === "Home Country Contribution"));
  });

  // ── Test 3: AI Prompt Augmentation with Confirmed Bridge Evidence ──────────
  it("should inject transition directives into buildSopPrompt when academicTransition is present", () => {
    const sampleData: CanonicalDocumentData = {
      documentType: "SOP",
      applicant: {
        name: "Samiyah Ali",
        nationality: "Indian",
        city: "Bhopal",
        country: "India",
        passportNumber: "Z1234567",
      },
      education: {
        qualification: "Bachelor of Arts in History",
        institution: "Institute for Excellence in Higher Education",
        boardOrUniversity: "Barkatullah University",
        year: "2026",
        subjects: ["History", "Political Science"],
      },
      languageTests: [],
      otherTests: [],
      family: {},
      university: {
        name: "University of Bologna",
        officialName: "University of Bologna",
        country: "Italy",
        city: "Bologna",
      },
      course: {
        officialName: "Master in Law, Economics and Governance",
        level: "Master's",
        duration: "2 Years",
        subjectsOrAreas: ["Law", "Economics"],
      },
      motivation: {
        academicInterests: ["Economic Governance"],
        courseReasons: ["Interdisciplinary curriculum"],
        universityReasons: ["Historic faculty"],
        countryReasons: ["Academic excellence"],
      },
      career: {},
      financials: {},
      projects: [],
      workExperience: [],
      achievements: [],
      additionalFacts: [],
      academicTransition: {
        isTransition: true,
        sourceDomain: "Social Sciences & Humanities",
        targetDomain: "Law & Governance",
        reason: "Candidate prepared for this transition through economic research internship and legal coursework.",
        bridgeEvidence: ["Economic Research Intern at Digiwire", "Corporate Law Certification"],
      },
    };

    const samplePlan: DocumentPlan = {
      documentType: "SOP",
      targetDegree: "Master in Law, Economics and Governance",
      targetUniversity: "University of Bologna",
      paragraphs: [
        {
          id: "intro",
          title: "Introduction",
          purpose: "Introduce applicant and target program",
          availableFacts: {},
          maxWords: 100,
        },
      ],
    };

    const prompt = buildSopPrompt(sampleData, samplePlan);

    assert.match(prompt, /ACADEMIC TRANSITION & BRIDGE EVIDENCE DIRECTIVES/);
    assert.match(prompt, /Bachelor of Arts in History/);
    assert.match(prompt, /Master in Law, Economics and Governance/);
    assert.match(prompt, /Economic Research Intern at Digiwire/);
    assert.match(prompt, /Corporate Law Certification/);
  });
});
