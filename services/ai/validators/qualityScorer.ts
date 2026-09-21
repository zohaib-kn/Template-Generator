/**
 * services/ai/validators/qualityScorer.ts
 *
 * Computes a transparent, multi-dimensional Writing Quality Report.
 * Incorporates language density, plain language fidelity, and blocking placeholder status.
 *
 * NOTE: This is strictly an editorial and stylistic WRITING QUALITY heuristic.
 * It is NOT an "AI detector" and never outputs pseudo-scientific "human percentage" scores.
 */

import { LockedFactValidationResult } from "./lockedFactValidator";
import { RepetitionValidationResult } from "./repetitionValidator";
import { SentenceValidationResult } from "./sentenceValidator";
import { GenericPhraseValidationResult } from "./genericPhraseValidator";
import { LanguageDensityValidationResult } from "./languageDensityValidator";
import { BlockingValidationResult } from "./blockingValidator";

export interface WritingQualityReport {
  overallScore: number; // 0 to 100
  rating: "EXCELLENT" | "GOOD" | "REQUIRES_POLISH" | "NEEDS_REWRITE";
  metrics: {
    factualConsistency: number;   // 0 to 20
    specificity: number;          // 0 to 20
    repetitionControl: number;    // 0 to 20
    sentenceVariation: number;    // 0 to 20
    plainLanguage: number;        // 0 to 20
    genericPhraseControl: number; // 0 to 20
    documentStructure: number;    // 0 to 20
  };
  summary: string[];
}

export function computeWritingQualityReport(params: {
  text: string;
  lockedResult: LockedFactValidationResult;
  repetitionResult: RepetitionValidationResult;
  sentenceResult: SentenceValidationResult;
  clicheResult: GenericPhraseValidationResult;
  densityResult?: LanguageDensityValidationResult;
  blockingResult?: BlockingValidationResult;
  paragraphCount: number;
  expectedParagraphCount: number;
}): WritingQualityReport {
  const {
    text,
    lockedResult,
    repetitionResult,
    sentenceResult,
    clicheResult,
    densityResult,
    blockingResult,
    paragraphCount,
    expectedParagraphCount,
  } = params;

  // 1. Factual Consistency (Max 20)
  let factualConsistency = Math.round((lockedResult.score / 100) * 20);
  if (blockingResult?.isBlocked) {
    factualConsistency = Math.max(0, factualConsistency - 10);
  }

  // 2. Repetition Control (Max 20)
  const repetitionControl = Math.round((repetitionResult.score / 100) * 20);

  // 3. Sentence Variation & Length (Max 20)
  const sentenceVariation = Math.round((sentenceResult.score / 100) * 20);

  // 4. Generic Phrase / Cliché Control (Max 20)
  let clicheScore = Math.round((clicheResult.score / 100) * 20);
  if (densityResult) {
    // Deduct for promotional evaluative words found
    clicheScore = Math.max(0, clicheScore - densityResult.totalEvaluativeWords * 2);
  }
  const genericPhraseControl = Math.min(20, Math.max(0, clicheScore));

  // 5. Document Structure & Completeness (Max 20)
  let structureScore = 20;
  if (paragraphCount < Math.floor(expectedParagraphCount * 0.6)) {
    structureScore -= 8;
  } else if (paragraphCount < expectedParagraphCount) {
    structureScore -= 3;
  }
  const documentStructure = Math.max(5, structureScore);

  // 6. Specificity (Max 20)
  // Evaluated based on presence of concrete facts and absence of zero-information filler
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  let specificity = 18;
  if (wordCount < 150) specificity = 12;
  else if (wordCount > 350) specificity = 19;

  if (densityResult && densityResult.fillerSentences.length > 0) {
    specificity = Math.max(5, specificity - densityResult.fillerSentences.length * 4);
  }

  // 7. Plain Language (Max 20)
  let plainLanguage = 19;
  if (sentenceResult.averageWordCount > 30) plainLanguage -= 4;
  else if (sentenceResult.averageWordCount > 25) plainLanguage -= 2;

  if (densityResult) {
    // Penalize for excessive abstract corporate words
    if (densityResult.totalAbstractWords > 3) {
      plainLanguage -= Math.min(8, (densityResult.totalAbstractWords - 3) * 2);
    }
    // Penalize for matched un-transformed inflated phrases
    if (densityResult.plainLanguageSuggestions.length > 0) {
      plainLanguage -= Math.min(6, densityResult.plainLanguageSuggestions.length * 2);
    }
  }
  plainLanguage = Math.max(0, plainLanguage);

  // Total raw score out of 140 scaled to 100
  const rawSum =
    factualConsistency +
    specificity +
    repetitionControl +
    sentenceVariation +
    plainLanguage +
    genericPhraseControl +
    documentStructure;

  let overallScore = Math.round((rawSum / 140) * 100);

  // If there are blocking placeholder issues, cap score at 50
  if (blockingResult?.isBlocked) {
    overallScore = Math.min(50, overallScore);
  }

  let rating: WritingQualityReport["rating"] = "GOOD";
  if (overallScore >= 88 && !blockingResult?.isBlocked) rating = "EXCELLENT";
  else if (overallScore >= 75 && !blockingResult?.isBlocked) rating = "GOOD";
  else if (overallScore >= 60 && !blockingResult?.isBlocked) rating = "REQUIRES_POLISH";
  else rating = "NEEDS_REWRITE";

  const summary: string[] = [];
  if (factualConsistency === 20) {
    summary.push("100% of locked factual anchors preserved.");
  } else {
    summary.push(`Factual fidelity score: ${factualConsistency}/20.`);
  }

  if (genericPhraseControl >= 18) {
    summary.push("Clear of marketing clichés and promotional fluff.");
  } else {
    summary.push(`Promotional language detected; generic phrase control: ${genericPhraseControl}/20.`);
  }

  if (plainLanguage >= 17) {
    summary.push("Direct, capable student tone with good plain-language clarity.");
  } else {
    summary.push(`Language is overly abstract or corporate; plain language: ${plainLanguage}/20.`);
  }

  if (blockingResult?.isBlocked) {
    summary.push(`BLOCKING WARNING: ${blockingResult.summary}`);
  }

  return {
    overallScore,
    rating,
    metrics: {
      factualConsistency,
      specificity,
      repetitionControl,
      sentenceVariation,
      plainLanguage,
      genericPhraseControl,
      documentStructure,
    },
    summary,
  };
}
