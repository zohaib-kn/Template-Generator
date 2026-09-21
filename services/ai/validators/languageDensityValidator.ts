/**
 * services/ai/validators/languageDensityValidator.ts
 *
 * Density-based quality validator for AI document generation.
 * Enforces the Visa Writing — Plain Professional Language Policy:
 * 1. Promotional-language density (evaluative word groups per sentence & paragraph).
 * 2. Abstract-language density (corporate/academic abstract nouns per sentence & paragraph).
 * 3. Plain-language transformation matches (suggesting capable student equivalents).
 * 4. Information-value check (identifies zero-information promotional filler).
 * 5. Sentence modesty check (every paragraph must have at least one direct 8-16 word sentence).
 * 6. Country section tourism fluff detection.
 * 7. Career realism check (flags corporate buzzwords).
 */

import {
  EVALUATIVE_WORDS,
  ABSTRACT_WORDS,
  PLAIN_LANGUAGE_TRANSFORMATIONS,
  DENSITY_THRESHOLDS,
  CAREER_REALISM_POLICY,
  COUNTRY_TOURISM_WORDS,
} from "../config/writingRules";

export interface ParagraphDensityIssue {
  paragraphIndex: number; // 1-indexed
  wordCount: number;
  evaluativeCount: number;
  evaluativeWords: string[];
  abstractCount: number;
  abstractWords: string[];
  hasDirectSentence: boolean; // Has at least one 8-16 word sentence
  needsRewrite: boolean;
  reason: string;
}

export interface SentenceDensityIssue {
  sentenceIndex: number; // 1-indexed
  paragraphIndex: number;
  textSnippet: string;
  evaluativeWords: string[];
  abstractWords: string[];
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface LanguageDensityValidationResult {
  valid: boolean;
  totalEvaluativeWords: number;
  totalAbstractWords: number;
  evaluativeWordsFound: string[];
  abstractWordsFound: string[];
  paragraphsNeedingRewrite: number[];
  paragraphIssues: ParagraphDensityIssue[];
  sentenceIssues: SentenceDensityIssue[];
  fillerSentences: string[];
  plainLanguageSuggestions: Array<{ found: string; suggested: string }>;
  careerBuzzwordsFound: string[];
  tourismFluffFound: string[];
  score: number; // 0 to 100
}

/**
 * Checks if a sentence conveys verifiable information value:
 * - Contains digits, currency, percentages, or official identifiers.
 * - Contains concrete academic or curricular justification.
 * - Serves as a standard formal consular letterhead / enclosure / closing statement.
 */
function hasInformationValue(sentence: string): boolean {
  const s = sentence.trim();
  if (s.length === 0) return true;

  // 1. Numbers, percentages, currency, dates, booking codes, PNRs
  if (/\b\d+(?:[.,]\d+)?%?|\b(?:INR|EUR|USD|GBP|€|\$|£)\b|[A-Z0-9]{4,}-[A-Z0-9]{3,}/i.test(s)) {
    return true;
  }

  // 2. Formal consular/document declarations
  if (
    /(?:visa officer|consulate|embassy|enclosed|attached|documentation|sincerely|respectfully|request|available should you require|to whom it may concern|subject:|dear)/i.test(
      s
    )
  ) {
    return true;
  }

  // 3. Genuine personal/academic grounding words
  if (
    /(?:because|prior to|studied|completed|curriculum offers|laboratory|coursework covers|return to|family resides|career in|work as|intends to|evaluate)/i.test(
      s
    )
  ) {
    return true;
  }

  return false;
}

export function validateLanguageDensity(text: string): LanguageDensityValidationResult {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const paragraphIssues: ParagraphDensityIssue[] = [];
  const sentenceIssues: SentenceDensityIssue[] = [];
  const paragraphsNeedingRewrite: number[] = [];
  const fillerSentences: string[] = [];
  const plainLanguageSuggestions: Array<{ found: string; suggested: string }> = [];
  const careerBuzzwordsFound: string[] = [];
  const tourismFluffFound: string[] = [];

  const allEvaluativeFound: string[] = [];
  const allAbstractFound: string[] = [];

  // 1. Check Plain-Language Transformation Matches
  const lowerText = text.toLowerCase();
  for (const [inflated, plain] of Object.entries(PLAIN_LANGUAGE_TRANSFORMATIONS)) {
    if (lowerText.includes(inflated.toLowerCase())) {
      plainLanguageSuggestions.push({ found: inflated, suggested: plain });
    }
  }

  // 2. Check Career Realism Disallowed Phrases
  for (const buzzword of CAREER_REALISM_POLICY.disallowedPhrases) {
    const escaped = buzzword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lowerText)) {
      careerBuzzwordsFound.push(buzzword);
    }
  }

  // 3. Check Tourism Fluff in Destination References
  for (const tourismWord of COUNTRY_TOURISM_WORDS) {
    const escaped = tourismWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(lowerText)) {
      // Flag if found in proximity of country / cultural descriptions
      tourismFluffFound.push(tourismWord);
    }
  }

  let globalSentenceIndex = 0;

  paragraphs.forEach((para, pIdx) => {
    const pNumber = pIdx + 1;
    const sentences = para
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const pWords = para.split(/\s+/).filter(Boolean);
    const pEvaluativeWords: string[] = [];
    const pAbstractWords: string[] = [];
    let hasDirectSentence = false;

    sentences.forEach((sentence) => {
      globalSentenceIndex++;
      const sLower = sentence.toLowerCase();
      const sWords = sentence.split(/\s+/).filter(Boolean);
      const wordCount = sWords.length;

      // Check if sentence qualifies as a simple direct sentence (8-16 words)
      if (
        wordCount >= DENSITY_THRESHOLDS.directSentenceRange.min &&
        wordCount <= DENSITY_THRESHOLDS.directSentenceRange.max
      ) {
        hasDirectSentence = true;
      }

      // Detect evaluative words
      const sEval: string[] = [];
      for (const word of EVALUATIVE_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        const matches = sLower.match(regex);
        if (matches) {
          for (let i = 0; i < matches.length; i++) {
            sEval.push(word);
            pEvaluativeWords.push(word);
            allEvaluativeFound.push(word);
          }
        }
      }

      // Detect abstract words
      const sAbstract: string[] = [];
      for (const word of ABSTRACT_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        const matches = sLower.match(regex);
        if (matches) {
          for (let i = 0; i < matches.length; i++) {
            sAbstract.push(word);
            pAbstractWords.push(word);
            allAbstractFound.push(word);
          }
        }
      }

      // Check Information-Value: flags pure promotional fluff sentences
      if (!hasInformationValue(sentence) && (sEval.length >= 1 || sAbstract.length >= 2)) {
        fillerSentences.push(sentence);
        sentenceIssues.push({
          sentenceIndex: globalSentenceIndex,
          paragraphIndex: pNumber,
          textSnippet: sentence.slice(0, 70) + "...",
          evaluativeWords: sEval,
          abstractWords: sAbstract,
          severity: "critical",
          message: `Sentence ${globalSentenceIndex} is zero-information promotional filler with no concrete facts.`,
        });
      } else if (sAbstract.length >= DENSITY_THRESHOLDS.maxAbstractWordsPerSentence) {
        sentenceIssues.push({
          sentenceIndex: globalSentenceIndex,
          paragraphIndex: pNumber,
          textSnippet: sentence.slice(0, 70) + "...",
          evaluativeWords: sEval,
          abstractWords: sAbstract,
          severity: "critical",
          message: `Sentence ${globalSentenceIndex} contains ${sAbstract.length} abstract nouns (${sAbstract.join(
            ", "
          )}). Do not stack abstract nouns in the same sentence.`,
        });
      } else if (sEval.length >= 1) {
        sentenceIssues.push({
          sentenceIndex: globalSentenceIndex,
          paragraphIndex: pNumber,
          textSnippet: sentence.slice(0, 70) + "...",
          evaluativeWords: sEval,
          abstractWords: sAbstract,
          severity: "warning",
          message: `Sentence ${globalSentenceIndex} contains evaluative praise: ${sEval.join(", ")}.`,
        });
      }
    });

    // Paragraph-level evaluation:
    // A paragraph needs rewrite if:
    // - More than 1 evaluative word is present in a Cover Letter paragraph
    // - More than 2 abstract words are present in the paragraph
    // - In a narrative paragraph (>40 words, >=2 sentences), it lacks any direct 8-16 word sentence
    const isFactualDataParagraph =
      /(?:class\s*xii|ielts|toefl|cbse|sponsor|sanction|education\s*loan|bank\s*balance|residenza|booking\s*ref|policy\s*no|flight|pnr|enclosed)/i.test(
        para
      );
    const isNarrativeParagraph = !isFactualDataParagraph && pWords.length >= 35 && sentences.length >= 2;
    const excessiveEvaluative = pEvaluativeWords.length > DENSITY_THRESHOLDS.maxEvaluativeWordsPerParagraph;
    const excessiveAbstract = pAbstractWords.length >= DENSITY_THRESHOLDS.maxAbstractWordsPerParagraph;
    const missingDirect = isNarrativeParagraph && !hasDirectSentence;

    const needsRewrite = excessiveEvaluative || excessiveAbstract || missingDirect;


    const reasons: string[] = [];
    if (excessiveEvaluative) {
      reasons.push(`Too many evaluative adjectives (${pEvaluativeWords.length}): ${pEvaluativeWords.join(", ")} (max 1 allowed).`);
    }
    if (excessiveAbstract) {
      reasons.push(`Too many abstract corporate nouns (${pAbstractWords.length}): ${pAbstractWords.join(", ")}.`);
    }
    if (missingDirect) {
      reasons.push("Every paragraph must include at least one direct, simple sentence of 8-16 words.");
    }

    if (needsRewrite) {
      paragraphsNeedingRewrite.push(pNumber);
    }

    paragraphIssues.push({
      paragraphIndex: pNumber,
      wordCount: pWords.length,
      evaluativeCount: pEvaluativeWords.length,
      evaluativeWords: pEvaluativeWords,
      abstractCount: pAbstractWords.length,
      abstractWords: pAbstractWords,
      hasDirectSentence,
      needsRewrite,
      reason: reasons.length > 0 ? reasons.join(" ") : "Within acceptable language density.",
    });
  });

  // Global density check
  const totalEvaluativeWords = allEvaluativeFound.length;
  const totalAbstractWords = allAbstractFound.length;

  // Compute a 0-100 density score
  let deductions = 0;
  deductions += totalEvaluativeWords * 10;
  deductions += Math.max(0, totalAbstractWords - 3) * 6;
  deductions += fillerSentences.length * 15;
  deductions += plainLanguageSuggestions.length * 8;
  deductions += careerBuzzwordsFound.length * 10;
  deductions += tourismFluffFound.length * 6;

  const score = Math.max(0, 100 - deductions);

  const valid =
    paragraphsNeedingRewrite.length === 0 &&
    fillerSentences.length === 0 &&
    plainLanguageSuggestions.length === 0 &&
    careerBuzzwordsFound.length === 0 &&
    totalEvaluativeWords <= DENSITY_THRESHOLDS.maxTotalEvaluativeInDoc;

  return {
    valid,
    totalEvaluativeWords,
    totalAbstractWords,
    evaluativeWordsFound: Array.from(new Set(allEvaluativeFound)),
    abstractWordsFound: Array.from(new Set(allAbstractFound)),
    paragraphsNeedingRewrite,
    paragraphIssues,
    sentenceIssues,
    fillerSentences,
    plainLanguageSuggestions,
    careerBuzzwordsFound,
    tourismFluffFound: Array.from(new Set(tourismFluffFound)),
    score,
  };
}
