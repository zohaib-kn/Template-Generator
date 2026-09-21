/**
 * services/ai/validators/genericPhraseValidator.ts
 *
 * Scans generated text for generic AI-style marketing clichés and buzzwords.
 * Evaluates counts against configurable severity thresholds.
 */

import { GENERIC_AI_PHRASES, CLICHE_THRESHOLDS } from "../config/writingRules";

export interface GenericPhraseMatch {
  phrase: string;
  count: number;
  severity: "acceptable" | "warning" | "critical";
}

export interface GenericPhraseValidationResult {
  valid: boolean;
  totalClichesFound: number;
  overallSeverity: "acceptable" | "warning" | "critical";
  score: number; // 0 to 100
  matches: GenericPhraseMatch[];
}

export function validateGenericPhrases(text: string): GenericPhraseValidationResult {
  const lower = text.toLowerCase();
  const matches: GenericPhraseMatch[] = [];
  let totalCliches = 0;

  for (const phrase of GENERIC_AI_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const found = lower.match(regex);

    if (found && found.length > 0) {
      const count = found.length;
      totalCliches += count;

      let severity: GenericPhraseMatch["severity"] = "acceptable";
      if (count >= 2) severity = "warning";
      if (count >= 3) severity = "critical";

      matches.push({
        phrase,
        count,
        severity,
      });
    }
  }

  let overallSeverity: GenericPhraseValidationResult["overallSeverity"] = "acceptable";
  if (totalCliches >= CLICHE_THRESHOLDS.rewriteTrigger) {
    overallSeverity = "critical";
  } else if (totalCliches > CLICHE_THRESHOLDS.acceptableMax) {
    overallSeverity = "warning";
  }

  // Cliché scoring: start at 100, subtract 12 per cliché found
  const score = Math.max(0, 100 - totalCliches * 12);
  const valid = totalCliches < CLICHE_THRESHOLDS.rewriteTrigger;

  return {
    valid,
    totalClichesFound: totalCliches,
    overallSeverity,
    score,
    matches,
  };
}
