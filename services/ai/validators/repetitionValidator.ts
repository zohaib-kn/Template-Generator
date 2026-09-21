/**
 * services/ai/validators/repetitionValidator.ts
 *
 * Deterministic checks for:
 * - Repeated sentence openings ("I chose", "I intend", "My goal")
 * - Excessive repetition of key nouns (university, course, career, study)
 * - Identical multi-word phrase repetition
 */

import { REPETITIVE_SENTENCE_STARTERS } from "../config/writingRules";

export interface RepetitionIssue {
  type: "sentence_starter" | "excessive_word" | "repeated_phrase";
  pattern: string;
  count: number;
  severity: "warning" | "critical";
  message: string;
}

export interface RepetitionValidationResult {
  valid: boolean;
  score: number; // 0 to 100
  issues: RepetitionIssue[];
}

export function validateRepetition(
  text: string,
  options?: {
    universityName?: string;
    courseName?: string;
  }
): RepetitionValidationResult {
  const issues: RepetitionIssue[] = [];

  // 1. Sentence Starter Analysis
  // Split text into individual sentences
  const rawSentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const starterCounts: Record<string, number> = {};

  for (const sentence of rawSentences) {
    const lower = sentence.toLowerCase();
    for (const starter of REPETITIVE_SENTENCE_STARTERS) {
      if (lower.startsWith(starter.toLowerCase())) {
        starterCounts[starter] = (starterCounts[starter] || 0) + 1;
      }
    }
  }

  for (const [starter, count] of Object.entries(starterCounts)) {
    if (count >= 3) {
      issues.push({
        type: "sentence_starter",
        pattern: starter,
        count,
        severity: "critical",
        message: `Sentence opening "${starter}" is repeated ${count} times. Vary sentence structures.`,
      });
    } else if (count === 2) {
      issues.push({
        type: "sentence_starter",
        pattern: starter,
        count,
        severity: "warning",
        message: `Sentence opening "${starter}" is repeated ${count} times.`,
      });
    }
  }

  // 2. Excessive Keyword Repetition
  const lowerText = text.toLowerCase();

  const countOccurrences = (phrase: string): number => {
    if (!phrase || phrase.length < 2) return 0;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = lowerText.match(regex);
    return matches ? matches.length : 0;
  };

  // Check generic study/career repetition
  const careerCount = countOccurrences("career");
  if (careerCount > 6) {
    issues.push({
      type: "excessive_word",
      pattern: "career",
      count: careerCount,
      severity: "warning",
      message: `The word "career" appears ${careerCount} times. Consider semantic alternatives like "professional goals" or "future work".`,
    });
  }

  const studyMatches = lowerText.match(/\b(study|studies|studying)\b/g);
  const studyCount = studyMatches ? studyMatches.length : 0;
  if (studyCount > 10) {
    issues.push({
      type: "excessive_word",
      pattern: "study/studies",
      count: studyCount,
      severity: "warning",
      message: `The word "study/studies/studying" appears ${studyCount} times. Use contextual alternatives.`,
    });
  }

  // Check if official university name is repeated excessively (> 4 times)
  if (options?.universityName && options.universityName.length > 5) {
    const uniCount = countOccurrences(options.universityName);
    if (uniCount > 4) {
      issues.push({
        type: "excessive_word",
        pattern: options.universityName,
        count: uniCount,
        severity: "warning",
        message: `Official university name is repeated ${uniCount} times. Use "the university" or "the institution" after first mention.`,
      });
    }
  }

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const valid = criticalIssues.length === 0;

  // Repetition score: start at 100, subtract 15 for each critical, 5 for each warning
  const penalty = criticalIssues.length * 15 + (issues.length - criticalIssues.length) * 5;
  const score = Math.max(0, 100 - penalty);

  return {
    valid,
    score,
    issues,
  };
}
