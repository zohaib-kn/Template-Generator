/**
 * services/academicAlignment/academicAlignmentEngine.ts
 *
 * Core Pure Engine for Academic Mismatch Detection & Branch-Aware Content Generation.
 *
 * Provides:
 * 1. computeAcademicAlignment(input): Deterministic, pure calculation of alignment status,
 *    evidence sufficiency, and AI generation permissions.
 * 2. isGenerationAllowed(result): Simple guard check for AI pipelines.
 * 3. isSensitiveSection(sectionId, documentType): Document-type aware classification
 *    of academically sensitive sections.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure functions only — NO side effects, NO database calls, NO network requests.
 * - UNKNOWN domain status MUST block sensitive generation (never defaults to ALIGNED).
 * - No single-item hardcoded evidence rule. Evidence requires target-domain relevance (score >= 3)
 *   AND counsellor justification (> 30 chars).
 */

import type {
  AlignmentComputeInput,
  AcademicAlignmentResult,
  SafeEvidencePacket,
} from "./types";
import { classifySourceDomain, classifyTargetDomain } from "./domainClassifier";
import {
  getDomainRelationship,
  getSubDomainRelationship,
} from "./domainTaxonomy";
import { evaluateTransitionEvidence } from "./evidenceEvaluator";

// ---------------------------------------------------------------------------
// Main Pure Computation Function
// ---------------------------------------------------------------------------

/**
 * Computes academic alignment between a student's prior qualifications and their target program.
 */
export function computeAcademicAlignment(
  input: AlignmentComputeInput
): AcademicAlignmentResult {
  const sourceField = classifySourceDomain(input.qualifications);
  const targetField = classifyTargetDomain(input.targetProgram);

  // 1. UNKNOWN handling: Indeterminate domain MUST block sensitive AI generation
  if (sourceField.domain === "UNKNOWN" || targetField.domain === "UNKNOWN") {
    return {
      status: "UNKNOWN",
      resolution: "UNRESOLVED",
      sourceField,
      targetField,
      evidenceSufficient: false,
      generationAllowed: false,
      blockingReason:
        "Academic alignment could not be determined from the available data. Please review previous education or target course details.",
      confidence: "LOW",
      explanation:
        "Source academic background or target course discipline could not be identified with sufficient certainty.",
    };
  }

  // 2. Base domain relationship
  const baseDomainRel = getDomainRelationship(sourceField.domain, targetField.domain);

  // 3. Sub-domain relationship override check (e.g. Mechanical -> Civil)
  const subDomainRel = getSubDomainRelationship(
    sourceField.subDomain,
    targetField.subDomain
  );

  const effectiveStatus = subDomainRel ?? baseDomainRel;

  // 4. Handle ALIGNED
  if (effectiveStatus === "ALIGNED") {
    return {
      status: "ALIGNED",
      resolution: "UNRESOLVED",
      sourceField,
      targetField,
      evidenceSufficient: true,
      generationAllowed: true,
      confidence:
        sourceField.confidence === "HIGH" && targetField.confidence === "HIGH"
          ? "HIGH"
          : "MEDIUM",
      explanation: "Great match! The student's past degree directly matches the university course they are applying for.",
    };
  }

  // 5. Handle RELATED_TRANSITION
  if (effectiveStatus === "RELATED_TRANSITION") {
    return {
      status: "RELATED_TRANSITION",
      resolution: "UNRESOLVED",
      sourceField,
      targetField,
      evidenceSufficient: true,
      generationAllowed: true,
      confidence: "HIGH",
      explanation:
        "The student studied a related field. Their background provides a natural stepping stone to this new course.",
    };
  }

  // 6. Handle ACADEMIC_MISMATCH
  const evidenceCheck = evaluateTransitionEvidence(input, targetField.domain);

  if (evidenceCheck.isSufficient) {
    const safeEvidencePacket: SafeEvidencePacket = {
      justification: input.transitionContext!.reason.trim(),
      bridgeItems: evidenceCheck.matchedItems,
      totalRelevanceScore: evidenceCheck.totalScore,
      verifiedDomains: [sourceField.domain, targetField.domain],
    };

    return {
      status: "CONFIRMED_TRANSITION",
      resolution: "INTENTIONAL_CONFIRMED",
      sourceField,
      targetField,
      evidenceSufficient: true,
      generationAllowed: true,
      safeEvidencePacket,
      confidence: "HIGH",
      explanation:
        "Field change confirmed! You have provided sufficient proof and justification for the student's new path.",
    };
  }

  return {
    status: "ACADEMIC_MISMATCH",
    resolution: "UNRESOLVED",
    sourceField,
    targetField,
    evidenceSufficient: false,
    generationAllowed: false,
    blockingReason:
      evidenceCheck.blockingReason ||
      "The student is switching to a different field. Please select supporting projects, certificates, or work experience below to back up this application.",
    confidence: "HIGH",
    explanation:
      "The student is switching to a different field. Please select supporting projects, certificates, or work experience below to back up this application.",
  };
}

// ---------------------------------------------------------------------------
// Guard & Section Sensitivity Helpers
// ---------------------------------------------------------------------------

/**
 * Returns whether AI generation is permitted for this alignment state.
 */
export function isGenerationAllowed(result: AcademicAlignmentResult): boolean {
  return result.generationAllowed;
}

/**
 * Returns whether a given document section is academically sensitive.
 * Sensitive sections require ALIGNED, RELATED_TRANSITION, or CONFIRMED_TRANSITION status.
 */
export function isSensitiveSection(
  sectionId: string,
  documentType: string
): boolean {
  const normId = sectionId.toLowerCase().replace(/[\s_]+/g, "-");
  const docTypeUpper = documentType.toUpperCase();

  // Visa Cover Letter sensitive sections
  if (docTypeUpper === "VISA_COVER_LETTER" || docTypeUpper.includes("VISA")) {
    const visaSensitive = new Set([
      "why-course",
      "future-academic-plan",
      "career-plan",
      "academic-background",
      "academic-progression",
    ]);
    return visaSensitive.has(normId);
  }

  // University SOP sensitive sections
  if (docTypeUpper === "UNIVERSITY_SOP" || docTypeUpper.includes("SOP")) {
    const sopSensitive = new Set([
      "academic-background",
      "academic-journey",
      "academic-interests",
      "academic-preparation",
      "why-course",
      "why-this-course",
      "course-interest",
      "why-university",
      "career-goals",
      "future-academic-plan",
      "projects-research",
    ]);
    return sopSensitive.has(normId);
  }

  // Resume Builder sections (e.g. About Me / Summary)
  if (docTypeUpper === "RESUME") {
    const resumeSensitive = new Set(["about-me", "summary", "academic-projects"]);
    return resumeSensitive.has(normId);
  }

  return false;
}
