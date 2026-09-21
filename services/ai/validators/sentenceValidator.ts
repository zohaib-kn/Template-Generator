/**
 * services/ai/validators/sentenceValidator.ts
 *
 * Analyzes sentence length and structure complexity.
 * Implements document-specific validation:
 * For VISA_COVER_LETTER:
 * - preferred: 12-24 words
 * - review: 25-30 words
 * - rewrite where practical: over 30 words for editorial sentences
 *
 * Preserves factual/legal sentences (logistics, financial breakdowns, enclosure lists)
 * without damaging them merely to satisfy arbitrary word counts.
 */

import { SENTENCE_LENGTH_THRESHOLDS, COVER_LETTER_SENTENCE_THRESHOLDS } from "../config/writingRules";

export interface LongSentenceIssue {
  sentenceIndex: number;
  wordCount: number;
  sentenceSnippet: string;
  isFactualOrLegal: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface SentenceValidationResult {
  valid: boolean;
  score: number; // 0 to 100
  totalSentences: number;
  averageWordCount: number;
  issues: LongSentenceIssue[];
}

/**
 * Checks if a sentence is primarily a factual enumeration, financial breakdown,
 * accommodation/travel itinerary, or official enclosure list.
 * Such sentences naturally contain multiple identifiers and must not be broken arbitrarily.
 */
function isFactualOrLegalSentence(sentence: string): boolean {
  // Check for presence of multiple financial, logistical, or enclosure indicators
  const indicators = [
    /\b(?:INR|EUR|USD|GBP|€|\$|£)\s*\d+/i,
    /\b(?:Policy No|Booking Ref|PNR|Flight|Passport No)\b/i,
    /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i,
    /\b(?:enclosed|enclosures|sanction letters|bank statements|tax returns|transcripts)\b/i,
    /\b(?:Via|Street|Road|Piazza|Residenza|Casa dello Studente)\b/i,
  ];

  let matches = 0;
  for (const regex of indicators) {
    if (regex.test(sentence)) matches++;
  }

  return matches >= 1;
}

export function validateSentenceLengths(
  text: string,
  documentType?: string
): SentenceValidationResult {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) {
    return {
      valid: true,
      score: 100,
      totalSentences: 0,
      averageWordCount: 0,
      issues: [],
    };
  }

  const isCoverLetter = documentType === "VISA_COVER_LETTER";
  const issues: LongSentenceIssue[] = [];
  let totalWords = 0;

  sentences.forEach((sentence, idx) => {
    const words = sentence.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    totalWords += wordCount;
    const isFactual = isFactualOrLegalSentence(sentence);

    if (isCoverLetter) {
      if (isFactual) {
        // Allow longer factual sentences up to 48 words (e.g. detailed itinerary + insurance + PNR)
        if (wordCount > 48) {
          issues.push({
            sentenceIndex: idx + 1,
            wordCount,
            sentenceSnippet: words.slice(0, 10).join(" ") + "...",
            isFactualOrLegal: true,
            severity: "warning",
            message: `Sentence ${idx + 1} is a dense factual/logistic statement (${wordCount} words). Consider separating logistics into two sentences if practical.`,
          });
        }
      } else {
        // Editorial sentence in Visa Cover Letter
        if (wordCount > COVER_LETTER_SENTENCE_THRESHOLDS.rewriteThreshold) {
          issues.push({
            sentenceIndex: idx + 1,
            wordCount,
            sentenceSnippet: words.slice(0, 10).join(" ") + "...",
            isFactualOrLegal: false,
            severity: "critical",
            message: `Editorial sentence ${idx + 1} exceeds 30 words (${wordCount} words; preferred 12-24). Consider splitting into simpler, more direct sentences.`,
          });
        } else if (wordCount >= COVER_LETTER_SENTENCE_THRESHOLDS.reviewThreshold) {
          issues.push({
            sentenceIndex: idx + 1,
            wordCount,
            sentenceSnippet: words.slice(0, 10).join(" ") + "...",
            isFactualOrLegal: false,
            severity: "warning",
            message: `Editorial sentence ${idx + 1} has ${wordCount} words (review threshold is 25-30; preferred 12-24).`,
          });
        }
      }
    } else {
      // Default / SOP / LOR thresholds
      if (wordCount >= SENTENCE_LENGTH_THRESHOLDS.criticalWords) {
        issues.push({
          sentenceIndex: idx + 1,
          wordCount,
          sentenceSnippet: words.slice(0, 10).join(" ") + "...",
          isFactualOrLegal: isFactual,
          severity: "critical",
          message: `Sentence ${idx + 1} is too long (${wordCount} words; max recommended is ${SENTENCE_LENGTH_THRESHOLDS.criticalWords}). Consider splitting into two sentences.`,
        });
      } else if (wordCount >= SENTENCE_LENGTH_THRESHOLDS.warningWords) {
        issues.push({
          sentenceIndex: idx + 1,
          wordCount,
          sentenceSnippet: words.slice(0, 10).join(" ") + "...",
          isFactualOrLegal: isFactual,
          severity: "warning",
          message: `Sentence ${idx + 1} has ${wordCount} words (warning threshold is ${SENTENCE_LENGTH_THRESHOLDS.warningWords}).`,
        });
      }
    }
  });

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const valid = criticalIssues.length === 0;

  const averageWordCount = Math.round(totalWords / sentences.length);
  const penalty = criticalIssues.length * 20 + (issues.length - criticalIssues.length) * 5;
  const score = Math.max(0, 100 - penalty);

  return {
    valid,
    score,
    totalSentences: sentences.length,
    averageWordCount,
    issues,
  };
}
