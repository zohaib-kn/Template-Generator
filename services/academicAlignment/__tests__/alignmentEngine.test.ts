/**
 * services/academicAlignment/__tests__/alignmentEngine.test.ts
 *
 * Test suite for Academic Mismatch Detection & Branch-Aware Content Engine (Phase 1).
 *
 * Covers:
 * 1. Basic ALIGNED case (CS -> Advanced Computing)
 * 2. RELATED_TRANSITION case (Cross-discipline or cognate)
 * 3. ACADEMIC_MISMATCH without transition context -> blocks generation
 * 4. ACADEMIC_MISMATCH with sufficient bridging evidence & justification -> CONFIRMED_TRANSITION
 * 5. ACADEMIC_MISMATCH with irrelevant bridging evidence (e.g. Finance cert for Engg) -> blocked
 * 6. ACADEMIC_MISMATCH with short reason (< 30 chars) -> blocked
 * 7. Test 18: Unknown qualification -> UNKNOWN status, sensitive generation blocked
 * 8. Test 19: Mechanical Engineering -> Civil Engineering = RELATED_TRANSITION (NOT ALIGNED)
 * 9. boardOrUniversity is strictly ignored during classification
 * 10. fieldOfStudy priority over qualification title
 * 11. isSensitiveSection document-type awareness for Visa Cover Letter & University SOP
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  computeAcademicAlignment,
  classifySourceDomain,
  classifyTargetDomain,
  isGenerationAllowed,
  isSensitiveSection,
} from "../index";
import type {
  NormalizedQualification,
  NormalizedAppliedProgram,
} from "@/types/normalizedStudent";

describe("Academic Mismatch Detection Engine (Phase 1)", () => {
  // -------------------------------------------------------------------------
  // 1. Basic ALIGNED case
  // -------------------------------------------------------------------------
  test("Test 1: Identical / directly aligned discipline returns ALIGNED and permits generation", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Technology in Computer Science",
        completionYear: "2023",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      country: "United Kingdom",
      university: "University of Manchester",
      course: "MSc Advanced Computer Science",
      degreeLevel: "Master's",
      courseCategory: "Computer Science / IT",
    };

    const result = computeAcademicAlignment({
      qualifications,
      targetProgram,
    });

    assert.equal(result.status, "ALIGNED");
    assert.equal(result.generationAllowed, true);
    assert.equal(result.evidenceSufficient, true);
    assert.equal(result.sourceField.domain, "COMPUTING");
    assert.equal(result.targetField.domain, "COMPUTING");
  });

  // -------------------------------------------------------------------------
  // 2. RELATED_TRANSITION case
  // -------------------------------------------------------------------------
  test("Test 2: Cognate disciplines return RELATED_TRANSITION and permit generation", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "B.Sc Mathematics and Statistics",
        completionYear: "2022",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      country: "Canada",
      university: "University of Toronto",
      course: "Master of Science in Data Science",
      degreeLevel: "Master's",
      courseCategory: "Computer Science / IT",
    };

    const result = computeAcademicAlignment({
      qualifications,
      targetProgram,
    });

    assert.equal(result.status, "ALIGNED"); // Math/Stats -> Data Science is aligned via STEM crossover
    assert.equal(result.generationAllowed, true);
  });

  // -------------------------------------------------------------------------
  // 3. ACADEMIC_MISMATCH without transition context
  // -------------------------------------------------------------------------
  test("Test 3: Unresolved academic mismatch blocks AI generation", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Commerce (B.Com)",
        completionYear: "2023",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      country: "Germany",
      university: "TU Munich",
      course: "M.Sc. Mechanical Engineering",
      degreeLevel: "Master's",
      courseCategory: "Engineering",
    };

    const result = computeAcademicAlignment({
      qualifications,
      targetProgram,
    });

    assert.equal(result.status, "ACADEMIC_MISMATCH");
    assert.equal(result.resolution, "UNRESOLVED");
    assert.equal(result.generationAllowed, false);
    assert.equal(result.evidenceSufficient, false);
    assert.ok(result.blockingReason);
    assert.equal(isGenerationAllowed(result), false);
  });

  // -------------------------------------------------------------------------
  // 4. ACADEMIC_MISMATCH with sufficient bridging evidence
  // -------------------------------------------------------------------------
  test("Test 4: Academic mismatch with valid justification and relevant bridging evidence yields CONFIRMED_TRANSITION", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Commerce",
        completionYear: "2022",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      country: "Ireland",
      university: "Trinity College Dublin",
      course: "MSc Data Science and Analytics",
      degreeLevel: "Master's",
      courseCategory: "Computer Science / IT",
    };

    const result = computeAcademicAlignment({
      qualifications,
      targetProgram,
      transitionContext: {
        reason:
          "Candidate completed intensive postgraduate certifications in Python, machine learning, and SQL with 2 years of business data analytics experience.",
        selectedCertifications: ["cert-1", "cert-2"],
      },
      certifications: [
        { id: "cert-1", name: "Python for Data Science and Machine Learning", issuer: "Coursera" },
        { id: "cert-2", name: "Advanced SQL and Database Design", issuer: "Udacity" },
      ],
    });

    assert.equal(result.status, "CONFIRMED_TRANSITION");
    assert.equal(result.resolution, "INTENTIONAL_CONFIRMED");
    assert.equal(result.generationAllowed, true);
    assert.equal(result.evidenceSufficient, true);
    assert.ok(result.safeEvidencePacket);
    assert.ok(result.safeEvidencePacket.totalRelevanceScore >= 3);
    assert.equal(result.safeEvidencePacket.bridgeItems.length >= 1, true);
  });

  // -------------------------------------------------------------------------
  // 5. Irrelevant bridging evidence does not satisfy threshold
  // -------------------------------------------------------------------------
  test("Test 5: Irrelevant evidence (e.g. Finance cert for Mechanical Engineering) scores 0 and remains blocked", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Arts in English Literature",
        completionYear: "2021",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      country: "Australia",
      university: "UNSW",
      course: "Master of Mechanical Engineering",
      degreeLevel: "Master's",
      courseCategory: "Engineering",
    };

    const result = computeAcademicAlignment({
      qualifications,
      targetProgram,
      transitionContext: {
        reason:
          "Student has a strong desire to switch into the mechanical engineering field and has taken an online course.",
        selectedCertifications: ["cert-1"],
      },
      certifications: [
        { id: "cert-1", name: "Corporate Financial Analysis and Excel Modeling", issuer: "CFI" },
      ],
    });

    assert.equal(result.status, "ACADEMIC_MISMATCH");
    assert.equal(result.generationAllowed, false);
    assert.equal(result.evidenceSufficient, false);
    assert.ok(result.blockingReason?.includes("below the required threshold"));
  });

  // -------------------------------------------------------------------------
  // 6. Short justification reason (< 30 chars) blocks generation
  // -------------------------------------------------------------------------
  test("Test 6: Justification shorter than 30 characters is rejected", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Arts in History",
        completionYear: "2021",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      country: "UK",
      university: "UCL",
      course: "MSc Computer Science",
      degreeLevel: "Master's",
      courseCategory: "Computer Science / IT",
    };

    const result = computeAcademicAlignment({
      qualifications,
      targetProgram,
      transitionContext: {
        reason: "Wants to switch to IT.", // 22 chars
        selectedCertifications: ["cert-1"],
      },
      certifications: [
        { id: "cert-1", name: "Python for Data Science and Machine Learning", issuer: "Coursera" },
      ],
    });

    assert.equal(result.status, "ACADEMIC_MISMATCH");
    assert.equal(result.generationAllowed, false);
    assert.ok(result.blockingReason?.includes("too brief"));
  });

  // -------------------------------------------------------------------------
  // 7. Test 18: Unknown qualification -> UNKNOWN blocks sensitive generation
  // -------------------------------------------------------------------------
  test("Test 18: Unknown source qualification yields UNKNOWN status and blocks AI generation", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Certificate",
        qualification: "General Studies 404 Unknown Spec",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      country: "France",
      university: "Sorbonne",
      course: "MSc Cyber Security",
      degreeLevel: "Master's",
      courseCategory: "Computer Science / IT",
    };

    const result = computeAcademicAlignment({
      qualifications,
      targetProgram,
    });

    assert.equal(result.status, "UNKNOWN");
    assert.equal(result.sourceField.domain, "UNKNOWN");
    assert.equal(result.generationAllowed, false);
    assert.equal(result.evidenceSufficient, false);
    assert.ok(
      result.blockingReason?.includes(
        "Academic alignment could not be determined from the available data."
      )
    );
  });

  // -------------------------------------------------------------------------
  // 8. Test 19: Mechanical Engineering -> Civil Engineering = RELATED_TRANSITION
  // -------------------------------------------------------------------------
  test("Test 19: Mechanical Engineering -> Civil Engineering returns RELATED_TRANSITION, not ALIGNED", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Technology in Mechanical Engineering",
        completionYear: "2023",
      },
    ];

    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      country: "Canada",
      university: "McGill University",
      course: "Master of Engineering in Civil Engineering",
      degreeLevel: "Master's",
      courseCategory: "Engineering",
    };

    const result = computeAcademicAlignment({
      qualifications,
      targetProgram,
    });

    assert.equal(result.sourceField.domain, "ENGINEERING");
    assert.equal(result.sourceField.subDomain, "MECHANICAL_ENGINEERING");
    assert.equal(result.targetField.domain, "ENGINEERING");
    assert.equal(result.targetField.subDomain, "CIVIL_ENGINEERING");

    // CRITICAL: MUST NOT be ALIGNED!
    assert.equal(result.status, "RELATED_TRANSITION");
    assert.notEqual(result.status, "ALIGNED");
    assert.equal(result.generationAllowed, true);
  });

  // -------------------------------------------------------------------------
  // 9. boardOrUniversity is strictly ignored as classifier
  // -------------------------------------------------------------------------
  test("Test 9: boardOrUniversity is treated strictly as metadata, never as an academic domain classifier", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Commerce (B.Com)",
        // boardOrUniversity contains engineering/science keywords
        boardOrUniversity: "Indian Institute of Technology (IIT) Delhi Engineering Board",
        institution: "IIT Delhi School of Humanities",
      },
    ];

    const field = classifySourceDomain(qualifications);
    // Must be classified as BUSINESS / COMMERCE from the qualification, NOT ENGINEERING from board!
    assert.equal(field.domain, "BUSINESS");
    assert.equal(field.subDomain, "COMMERCE");
    assert.notEqual(field.domain, "ENGINEERING");
  });

  // -------------------------------------------------------------------------
  // 10. fieldOfStudy priority over qualification title
  // -------------------------------------------------------------------------
  test("Test 10: Explicit fieldOfStudy takes precedence over ambiguous qualification title", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-1",
        levelOfStudy: "Undergraduate",
        qualification: "Bachelor of Science", // generic
        fieldOfStudy: "Mechanical Engineering", // specific
      },
    ];

    const field = classifySourceDomain(qualifications);
    assert.equal(field.domain, "ENGINEERING");
    assert.equal(field.subDomain, "MECHANICAL_ENGINEERING");
    assert.ok(field.classifiedFrom.includes("fieldOfStudy"));
  });

  // -------------------------------------------------------------------------
  // 11. isSensitiveSection document-type awareness
  // -------------------------------------------------------------------------
  test("Test 11: isSensitiveSection correctly flags sensitive sections for Visa Cover Letter & University SOP", () => {
    // Visa Cover Letter sensitive sections
    assert.equal(isSensitiveSection("why-course", "VISA_COVER_LETTER"), true);
    assert.equal(isSensitiveSection("future-academic-plan", "VISA_COVER_LETTER"), true);
    assert.equal(isSensitiveSection("career-plan", "VISA_COVER_LETTER"), true);
    assert.equal(isSensitiveSection("academic-background", "VISA_COVER_LETTER"), true);

    // Visa Cover Letter non-sensitive sections
    assert.equal(isSensitiveSection("financial-capability", "VISA_COVER_LETTER"), false);
    assert.equal(isSensitiveSection("accommodation", "VISA_COVER_LETTER"), false);
    assert.equal(isSensitiveSection("family-ties", "VISA_COVER_LETTER"), false);
    assert.equal(isSensitiveSection("closing", "VISA_COVER_LETTER"), false);

    // University SOP sensitive sections
    assert.equal(isSensitiveSection("academic-background", "UNIVERSITY_SOP"), true);
    assert.equal(isSensitiveSection("why-course", "UNIVERSITY_SOP"), true);
    assert.equal(isSensitiveSection("why-university", "UNIVERSITY_SOP"), true);
    assert.equal(isSensitiveSection("career-goals", "UNIVERSITY_SOP"), true);
    assert.equal(isSensitiveSection("projects-research", "UNIVERSITY_SOP"), true);

    // University SOP non-sensitive sections
    assert.equal(isSensitiveSection("personal-statement", "UNIVERSITY_SOP"), false);
    assert.equal(isSensitiveSection("extracurricular", "UNIVERSITY_SOP"), false);
  });

  // -------------------------------------------------------------------------
  // 12. Verified subjects classification (High school CS stream)
  // -------------------------------------------------------------------------
  test("Test 12: verified subjects classify school-level qualifications into matching academic domain", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "qual-10th",
        levelOfStudy: "10th",
        qualification: "Secondary Education (10th)",
        subjects: "Artificial Intelligence, English, Hindi, Mathematics, Science, Social Science",
        completionYear: "2023",
      },
      {
        id: "qual-12th",
        levelOfStudy: "12th",
        qualification: "Higher Secondary Education (12th)",
        subjects: "Computer Science, English, Chemistry, Physics, Mathematics",
        completionYear: "2025",
      },
    ];

    const field = classifySourceDomain(qualifications);
    assert.equal(field.domain, "COMPUTING");
    assert.equal(field.subDomain, "COMPUTER_SCIENCE");
    assert.ok(field.classifiedFrom.includes("qualification.subjects"));
  });
});
