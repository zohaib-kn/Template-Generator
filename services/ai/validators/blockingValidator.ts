/**
 * services/ai/validators/blockingValidator.ts
 *
 * Enforces REQUIRED FIELD and placeholder blocking validation before final document/PDF generation.
 *
 * Blocks final generation if:
 * 1. Bracketed placeholders exist (e.g. [Passport Number], [Name], [Email], [Address]).
 * 2. Unresolved placeholder tokens exist (e.g. TBD, PLACEHOLDER, undefined, null).
 * 3. Dummy / test email domains exist (e.g. example.com, test.com).
 * 4. Critical locked facts fail character-for-character matching.
 */

import { BLOCKING_PATTERNS } from "../config/writingRules";
import { LockedFact } from "./lockedFactExtractor";
import { LockedFactValidationResult } from "./lockedFactValidator";


export interface BlockingValidationIssue {
  type: "BRACKETED_PLACEHOLDER" | "LITERAL_PLACEHOLDER" | "PLACEHOLDER_EMAIL_DOMAIN" | "MISSING_LOCKED_FACT" | "EMPTY_REQUIRED_FIELD";
  field?: string;
  matchedText: string;
  message: string;
}

export interface BlockingValidationResult {
  isBlocked: boolean;
  issues: BlockingValidationIssue[];
  summary: string;
}

export function validateBlockingPlaceholders(
  text: string,
  lockedResult?: LockedFactValidationResult,
  requiredFacts?: LockedFact[]
): BlockingValidationResult {
  const issues: BlockingValidationIssue[] = [];

  // 1. Bracketed Placeholders (e.g. [Passport Number], [Candidate Name], [Address])
  const bracketMatches = text.match(/\[[A-Za-z0-9\s_-]{2,40}\]/g);
  if (bracketMatches) {
    for (const match of bracketMatches) {
      // Allow markdown link anchors or standard markdown footnotes if any, but block typical template placeholders
      if (
        /\[\s*(?:passport|name|full\s*name|email|address|date|city|country|phone|tbd|placeholder|recommender|signature|institution|university|qualification|score|degree|gpa|cgpa)\s*\]/i.test(
          match
        ) ||
        BLOCKING_PATTERNS.bracketedPlaceholders.test(match)
      ) {
        issues.push({
          type: "BRACKETED_PLACEHOLDER",
          matchedText: match,
          message: `Unresolved template placeholder "${match}" detected. All bracketed fields must be resolved before final document export.`,
        });
      }
    }
  }

  // 2. Literal Placeholder Keywords (TBD, PLACEHOLDER, undefined, null)
  const lines = text.split("\n");
  lines.forEach((line) => {
    const literalMatch = line.match(/\b(?:TBD|PLACEHOLDER|undefined|null)\b/i);
    if (literalMatch) {
      // Don't flag "null" if part of a real name or legitimate word (e.g. Annulment)
      issues.push({
        type: "LITERAL_PLACEHOLDER",
        matchedText: literalMatch[0],
        message: `Unresolved placeholder token "${literalMatch[0]}" found in draft text.`,
      });
    }
  });

  // 3. Placeholder Email Domains (example.com, test.com, placeholder.com)
  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@(?:example\.(?:com|org|net)|test\.(?:com|org)|placeholder\.(?:com|org))\b/gi);
  if (emailMatch) {
    for (const em of emailMatch) {
      issues.push({
        type: "PLACEHOLDER_EMAIL_DOMAIN",
        matchedText: em,
        message: `Placeholder email address "${em}" detected. A valid, real applicant email domain is required for final export.`,
      });
    }
  }

  // 4. Missing or Unresolved Locked Facts
  if (lockedResult && !lockedResult.valid) {
    for (const mf of lockedResult.missingFacts) {
      if (mf.severity === "error") {
        issues.push({
          type: "MISSING_LOCKED_FACT",
          field: mf.field,
          matchedText: mf.expectedValue,
          message: `Required locked fact "${mf.field}" ("${mf.expectedValue}") was altered or omitted.`,
        });
      }
    }
  }

  // 5. Empty Required Facts Check
  if (requiredFacts) {
    for (const rf of requiredFacts) {
      if (!rf.value || rf.value.trim() === "" || rf.value === "undefined" || rf.value === "null") {
        issues.push({
          type: "EMPTY_REQUIRED_FIELD",
          field: rf.field,
          matchedText: "",
          message: `Required source fact "${rf.field}" is empty or missing from applicant input data.`,
        });
      }
    }
  }

  const isBlocked = issues.length > 0;
  const summary = isBlocked
    ? `Document export BLOCKED: ${issues.length} unresolved placeholder(s) or missing locked fact(s) detected.`
    : "Document passed all blocking placeholder checks. Ready for final export.";

  return {
    isBlocked,
    issues,
    summary,
  };
}
