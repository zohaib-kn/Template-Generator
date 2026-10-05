/**
 * services/academicAlignment/evidenceEvaluator.ts
 *
 * Dedicated Transition Evidence Evaluator for Academic Mismatch Resolutions.
 *
 * Implements weighted target-domain scoring:
 * - Each item (cert, project, skill, internship, work exp) is scored 0 to 3 based on target domain relevance.
 * - Irrelevant items (e.g. Finance certification for Mechanical Engineering) score 0.
 * - Strict threshold: totalScore >= 3 AND counsellor reason >= 30 meaningful characters.
 * - No single-item hardcoded sufficiency rules.
 */

import type {
  AcademicDomain,
  AlignmentComputeInput,
  EvidenceItem,
  EvidenceItemType,
} from "./types";
import { DOMAIN_SUBJECT_MAP } from "./domainTaxonomy";

export const REQUIRED_EVIDENCE_SCORE = 3;
export const MIN_REASON_LENGTH = 30;

export interface EvidenceEvaluationResult {
  isSufficient: boolean;
  totalScore: number;
  threshold: number;
  reasonValid: boolean;
  reasonLength: number;
  minReasonLength: number;
  matchedItems: EvidenceItem[];
  unmatchedItems: EvidenceItem[];
  missingRequirements: string[];
  blockingReason?: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function matchesKeyword(text: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
  return pattern.test(text);
}

/**
 * Evaluates the relevance of a single evidence candidate against a target academic domain.
 * Scores:
 * - 3: Strong relevance (matches 2+ domain subject keywords or discipline title)
 * - 2: Moderate relevance (matches 1 domain subject keyword)
 * - 0: Irrelevant / unaligned to target domain
 */
export function evaluateSingleItem(
  id: string,
  title: string,
  type: EvidenceItemType,
  targetDomain: AcademicDomain,
  description?: string
): EvidenceItem {
  if (!title || targetDomain === "UNKNOWN") {
    return {
      id,
      title,
      type,
      relevanceScore: 0,
      domainRelevanceExplanation: "Unclassified domain or missing title",
    };
  }

  const combinedText = `${title} ${description || ""}`;
  const keywords = DOMAIN_SUBJECT_MAP[targetDomain] || [];

  let matchCount = 0;
  const matchedKeywords: string[] = [];

  for (const kw of keywords) {
    if (matchesKeyword(combinedText, kw)) {
      matchCount++;
      matchedKeywords.push(kw);
    }
  }

  if (matchCount >= 2) {
    return {
      id,
      title,
      type,
      relevanceScore: 3,
      domainRelevanceExplanation: `Strong match for ${targetDomain} (matched: ${matchedKeywords.slice(0, 3).join(", ")})`,
    };
  }

  if (matchCount === 1) {
    return {
      id,
      title,
      type,
      relevanceScore: 2,
      domainRelevanceExplanation: `Moderate match for ${targetDomain} (matched: ${matchedKeywords[0]})`,
    };
  }

  return {
    id,
    title,
    type,
    relevanceScore: 0,
    domainRelevanceExplanation: `No relevant subject overlap with ${targetDomain}`,
  };
}

/**
 * Evaluates all available or selected evidence against the target academic domain.
 */
export function evaluateTransitionEvidence(
  input: AlignmentComputeInput,
  targetDomain: AcademicDomain
): EvidenceEvaluationResult {
  const context = input.transitionContext;
  const rawReason = context?.reason || "";
  const cleanReason = rawReason.trim();
  const reasonLength = cleanReason.length;
  const reasonValid = reasonLength >= MIN_REASON_LENGTH;

  const matchedItems: EvidenceItem[] = [];
  const unmatchedItems: EvidenceItem[] = [];
  let totalScore = 0;

  // 1. Certifications
  if (input.certifications && input.certifications.length > 0) {
    for (const cert of input.certifications) {
      const isSelected =
        !context ||
        !context.selectedCertifications ||
        context.selectedCertifications.length === 0 ||
        context.selectedCertifications.includes(cert.id) ||
        context.selectedCertifications.includes(cert.name);

      const evaluated = evaluateSingleItem(
        cert.id,
        cert.name,
        "CERTIFICATION",
        targetDomain,
        cert.issuer
      );

      if (isSelected) {
        if (evaluated.relevanceScore > 0) {
          totalScore += evaluated.relevanceScore;
          matchedItems.push(evaluated);
        } else {
          unmatchedItems.push(evaluated);
        }
      }
    }
  }

  // 2. Academic Projects
  if (input.academicProjects && input.academicProjects.length > 0) {
    for (const proj of input.academicProjects) {
      const isSelected =
        !context ||
        !context.selectedProjects ||
        context.selectedProjects.length === 0 ||
        context.selectedProjects.includes(proj.id) ||
        context.selectedProjects.includes(proj.title);

      const evaluated = evaluateSingleItem(
        proj.id,
        proj.title,
        "PROJECT",
        targetDomain,
        proj.description
      );

      if (isSelected) {
        if (evaluated.relevanceScore > 0) {
          totalScore += evaluated.relevanceScore;
          matchedItems.push(evaluated);
        } else {
          unmatchedItems.push(evaluated);
        }
      }
    }
  }

  // 3. Skills
  if (input.skills && input.skills.length > 0) {
    for (const skill of input.skills) {
      const isSelected =
        !context ||
        !context.selectedSkills ||
        context.selectedSkills.length === 0 ||
        context.selectedSkills.includes(skill.id) ||
        context.selectedSkills.includes(skill.name);

      const evaluated = evaluateSingleItem(
        skill.id,
        skill.name,
        "SKILL",
        targetDomain
      );

      if (isSelected) {
        if (evaluated.relevanceScore > 0) {
          totalScore += evaluated.relevanceScore;
          matchedItems.push(evaluated);
        } else {
          unmatchedItems.push(evaluated);
        }
      }
    }
  }

  // 4. Internships
  if (input.internships && input.internships.length > 0) {
    for (const intern of input.internships) {
      const isSelected =
        !context ||
        !context.selectedInternships ||
        context.selectedInternships.length === 0 ||
        context.selectedInternships.includes(intern.id) ||
        context.selectedInternships.includes(intern.role);

      const evaluated = evaluateSingleItem(
        intern.id,
        intern.role,
        "INTERNSHIP",
        targetDomain,
        `${intern.organization || ""} ${intern.description || ""}`
      );

      if (isSelected) {
        if (evaluated.relevanceScore > 0) {
          totalScore += evaluated.relevanceScore;
          matchedItems.push(evaluated);
        } else {
          unmatchedItems.push(evaluated);
        }
      }
    }
  }

  // 5. Work Experience (if relevant to target domain)
  if (input.workExperience && input.workExperience.length > 0) {
    for (const work of input.workExperience) {
      const title = work.position || work.jobProfile || "";
      if (title.trim().length > 0) {
        const evaluated = evaluateSingleItem(
          work.id,
          title,
          "WORK_EXPERIENCE",
          targetDomain,
          `${work.organisation || ""} ${work.jobProfile || ""}`
        );

        if (evaluated.relevanceScore > 0) {
          totalScore += evaluated.relevanceScore;
          matchedItems.push(evaluated);
        }
      }
    }
  }

  const missingRequirements: string[] = [];

  if (!reasonValid) {
    missingRequirements.push(
      reasonLength === 0
        ? "Counsellor transition justification is required"
        : `Justification too short / too brief (${reasonLength}/${MIN_REASON_LENGTH} characters minimum)`
    );
  }

  if (totalScore < REQUIRED_EVIDENCE_SCORE) {
    missingRequirements.push(
      `Evidence score for target domain is ${totalScore}/${REQUIRED_EVIDENCE_SCORE} points (below the required threshold of ${REQUIRED_EVIDENCE_SCORE})`
    );
  }

  const isSufficient = reasonValid && totalScore >= REQUIRED_EVIDENCE_SCORE;

  let blockingReason: string | undefined = undefined;
  if (!isSufficient) {
    blockingReason = `Transition requirements incomplete: ${missingRequirements.join("; ")}.`;
  }

  return {
    isSufficient,
    totalScore,
    threshold: REQUIRED_EVIDENCE_SCORE,
    reasonValid,
    reasonLength,
    minReasonLength: MIN_REASON_LENGTH,
    matchedItems,
    unmatchedItems,
    missingRequirements,
    blockingReason,
  };
}
