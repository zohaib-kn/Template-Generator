/**
 * services/ai/validators/lockedFactValidator.ts
 *
 * Deterministic post-generation verification ensuring every locked fact is preserved.
 * If any locked value is incorrectly missing or altered, marks generation invalid and
 * reports the exact field and required value.
 */

import { LockedFact } from "./lockedFactExtractor";

export interface MissingLockedFact {
  field: string;
  expectedValue: string;
  category: string;
  severity: "error" | "warning";
}

export interface LockedFactValidationResult {
  valid: boolean;
  score: number; // 0 to 100
  totalFacts: number;
  matchedFacts: number;
  missingFacts: MissingLockedFact[];
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function validateLockedFacts(
  generatedText: string,
  lockedFacts: LockedFact[]
): LockedFactValidationResult {
  if (lockedFacts.length === 0) {
    return {
      valid: true,
      score: 100,
      totalFacts: 0,
      matchedFacts: 0,
      missingFacts: [],
    };
  }

  const normalizedDoc = normalizeForSearch(generatedText);
  const missingFacts: MissingLockedFact[] = [];
  let matchedCount = 0;

  for (const fact of lockedFacts) {
    const normVal = normalizeForSearch(fact.value);

    // Direct substring check
    let matched = normalizedDoc.includes(normVal);

    // If not matched directly, check without commas for numerical/currency amounts (e.g., "39,00,000" vs "3900000")
    if (!matched && /[0-9]/.test(normVal)) {
      const strippedVal = normVal.replace(/,/g, "");
      const strippedDoc = normalizedDoc.replace(/,/g, "");
      if (strippedDoc.includes(strippedVal)) {
        matched = true;
      }
    }

    // For names with titles, check base name
    if (!matched && normVal.includes(" ")) {
      const nameParts = normVal.split(" ");
      if (nameParts.length >= 2 && normalizedDoc.includes(nameParts[nameParts.length - 1])) {
        // Last name found, check if first name is also found
        if (normalizedDoc.includes(nameParts[0])) {
          matched = true;
        }
      }
    }

    if (matched) {
      matchedCount++;
    } else {
      missingFacts.push({
        field: fact.field,
        expectedValue: fact.value,
        category: fact.category,
        severity: fact.required ? "error" : "warning",
      });
    }
  }

  const requiredErrors = missingFacts.filter((m) => m.severity === "error");
  const isValid = requiredErrors.length === 0;
  const score = Math.round((matchedCount / lockedFacts.length) * 100);

  return {
    valid: isValid,
    score,
    totalFacts: lockedFacts.length,
    matchedFacts: matchedCount,
    missingFacts,
  };
}
