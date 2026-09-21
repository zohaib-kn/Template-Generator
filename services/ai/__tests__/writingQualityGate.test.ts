/**
 * services/ai/__tests__/writingQualityGate.test.ts
 *
 * Automated regression test suite for the strengthened Writing Quality Gate.
 * Tests:
 * 1. Detection of all 19 observed real-output AI-slop phrases.
 * 2. Promotional-language density detection per sentence and paragraph.
 * 3. Abstract-language density detection per sentence and paragraph.
 * 4. Plain-language transformation suggestions.
 * 5. Information-value check for zero-information promotional filler.
 * 6. Sentence-length validation for Visa Cover Letters (12-24 pref, >30 rewrite for editorial).
 * 7. Blocking validation for bracketed placeholders, literal placeholders, and example.com email domains.
 * 8. Clean, authentic student-voice text passes quality checks.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validateGenericPhrases } from "../validators/genericPhraseValidator";
import { validateLanguageDensity } from "../validators/languageDensityValidator";
import { validateSentenceLengths } from "../validators/sentenceValidator";
import { validateBlockingPlaceholders } from "../validators/blockingValidator";
import { computeWritingQualityReport } from "../validators/qualityScorer";
import { validateLockedFacts } from "../validators/lockedFactValidator";
import { validateRepetition } from "../validators/repetitionValidator";

describe("Writing Quality Gate — Strengthened Anti-AI Slop & Density Tests", () => {
  // ── Test 1: Observed Real-Output Phrases Detection ────────────────────────
  test("Test 1: Detects and flags all 19 observed real-output AI-slop phrases", () => {
    const problematicText = `
I wish to translate these quantitative foundations into advanced technical execution.
The comprehensive curriculum perfectly balances theoretical rigor with laboratory practice.
Studying here will provide vital technical competencies and expose me to a remarkable academic legacy.
The university holds exceptional standing as a prestigious institution with a remarkably well-structured curriculum.
The syllabus seamlessly integrates applied data science with distinguished faculty and pioneering research.
This degree offers a globally enriching perspective within an exceptional framework and academically stimulating environment.
My background provides a robust foundation to build a high-impact technical career.
I look forward to applying technical precision and analytical methodologies with the unwavering support of my family.
I am resolutely committed to my studies with steadfast dedication.
    `.trim();

    // 1. Generic Phrase Validator Check
    const genericResult = validateGenericPhrases(problematicText);
    assert.ok(
      genericResult.totalClichesFound >= 5,
      `Expected generic validator to catch multiple clichés, caught ${genericResult.totalClichesFound}`
    );

    // 2. Language Density Validator Check
    const densityResult = validateLanguageDensity(problematicText);
    assert.equal(
      densityResult.valid,
      false,
      "Density validator must mark problematic real output as INVALID / needing rewrite"
    );
    assert.ok(
      densityResult.totalEvaluativeWords >= 5,
      `Expected evaluative words count >= 5, got ${densityResult.totalEvaluativeWords}`
    );
    assert.ok(
      densityResult.totalAbstractWords >= 5,
      `Expected abstract words count >= 5, got ${densityResult.totalAbstractWords}`
    );
    assert.ok(
      densityResult.plainLanguageSuggestions.length >= 3,
      `Expected plain language suggestions, got ${densityResult.plainLanguageSuggestions.length}`
    );
  });

  // ── Test 2: Promotional Language Density Detection ────────────────────────
  test("Test 2: Paragraph with excessive evaluative adjectives is flagged for rewrite", () => {
    const evaluativeParagraph = `
The university is an exceptional and prestigious institution with distinguished faculty.
Its remarkable and illustrious legacy provides a pioneering research environment.
    `.trim();

    const result = validateLanguageDensity(evaluativeParagraph);
    assert.equal(result.valid, false);
    assert.ok(result.paragraphsNeedingRewrite.includes(1));
    assert.ok(
      result.paragraphIssues[0].evaluativeCount >= 2,
      `Paragraph should have >= 2 evaluative words, found: ${result.paragraphIssues[0].evaluativeCount}`
    );
  });

  // ── Test 3: Abstract Language Density Detection ───────────────────────────
  test("Test 3: Sentence with excessive abstract nouns is flagged as overly abstract", () => {
    const abstractSentence =
      "I intend to leverage the advanced methodology, infrastructure, and framework of this curriculum to enhance my technical execution and competencies.";

    const result = validateLanguageDensity(abstractSentence);
    const criticalSentence = result.sentenceIssues.find((s) => s.severity === "critical");
    assert.ok(
      criticalSentence,
      "Expected critical sentence issue for sentence with 4+ abstract nouns"
    );
    assert.ok(
      criticalSentence.abstractWords.length >= 2,
      "Expected sentence to have multiple abstract words detected"
    );
  });

  // ── Test 4: Plain-Language Transformation Policy ──────────────────────────
  test("Test 4: Maps inflated expressions to direct student language", () => {
    const inflatedDraft = `
The degree will equip me with essential competencies and allow me to build a high-impact technical career.
My father has provided unwavering support for my education.
    `.trim();

    const result = validateLanguageDensity(inflatedDraft);
    const hasCompetencies = result.plainLanguageSuggestions.some((s) =>
      s.found.includes("essential competencies")
    );
    const hasCareer = result.plainLanguageSuggestions.some((s) =>
      s.found.includes("high-impact technical career")
    );
    const hasSupport = result.plainLanguageSuggestions.some((s) =>
      s.found.includes("unwavering support")
    );

    assert.ok(hasCompetencies, "Should suggest plain replacement for 'essential competencies'");
    assert.ok(hasCareer, "Should suggest plain replacement for 'high-impact technical career'");
    assert.ok(hasSupport, "Should suggest plain replacement for 'unwavering support'");
  });

  // ── Test 5: Information-Value Check (Zero-Information Filler) ─────────────
  test("Test 5: Flags zero-information promotional filler sentences lacking concrete facts", () => {
    const fluffSentence =
      "The university stands as a distinguished beacon of exceptional academic legacy that seamlessly inspires students.";

    const result = validateLanguageDensity(fluffSentence);
    assert.ok(
      result.fillerSentences.length > 0,
      "Should identify unanchored promotional praise sentence as zero-information filler"
    );
  });

  // ── Test 6: Strengthened Sentence-Length Validation for Cover Letters ──────
  test("Test 6: Flags editorial sentences > 30 words in Cover Letter, but preserves factual lists", () => {
    // 33-word editorial sentence
    const longEditorial =
      "I decided to pursue this particular degree because throughout my secondary education I developed a profound fascination with analytical computing and wanted to study at an institution known for balanced practical and theoretical coursework.";

    // 38-word factual financial/legal sentence
    const longFactual =
      "My father, Mohammed Ameen, Civil Engineer with the Government of Madhya Pradesh, is my sponsor and has secured an education loan of INR 20,00,000 from State Bank of India along with INR 8,50,000 in personal bank savings.";

    const editorialResult = validateSentenceLengths(longEditorial, "VISA_COVER_LETTER");
    const factualResult = validateSentenceLengths(longFactual, "VISA_COVER_LETTER");

    // Long editorial sentence MUST trigger critical issue (> 30 words)
    assert.equal(
      editorialResult.valid,
      false,
      "Editorial sentence over 30 words must be flagged for rewrite"
    );
    const critEditorial = editorialResult.issues.find((i) => i.severity === "critical");
    assert.ok(critEditorial, "Must have critical severity issue on editorial sentence");

    // Factual sentence must NOT trigger critical issue
    const critFactual = factualResult.issues.find((i) => i.severity === "critical");
    assert.equal(
      critFactual,
      undefined,
      "Factual sentence with specific figures must NOT trigger critical rewrite"
    );
  });

  // ── Test 7: Blocking Validation on Placeholders and example.com ────────────
  test("Test 7: Blocks final export on [Passport Number], TBD, and example.com email domain", () => {
    const textWithBracket = "My passport number is [Passport Number] and I reside in Bhopal.";
    const textWithEmail = "You may contact me at applicant@example.com or phone +91 94255 12345.";
    const textWithTBD = "My accommodation address is TBD pending final allocation.";

    const blockBracket = validateBlockingPlaceholders(textWithBracket);
    assert.equal(blockBracket.isBlocked, true);
    assert.ok(blockBracket.issues.some((i) => i.type === "BRACKETED_PLACEHOLDER"));

    const blockEmail = validateBlockingPlaceholders(textWithEmail);
    assert.equal(blockEmail.isBlocked, true);
    assert.ok(blockEmail.issues.some((i) => i.type === "PLACEHOLDER_EMAIL_DOMAIN"));

    const blockTBD = validateBlockingPlaceholders(textWithTBD);
    assert.equal(blockTBD.isBlocked, true);
    assert.ok(blockTBD.issues.some((i) => i.type === "LITERAL_PLACEHOLDER"));
  });

  // ── Test 8: Capable Student Voice & Clean Human Text Passes All Gates ──────
  test("Test 8: Authentic, plain-language student text passes Quality Gate with high score", () => {
    const authenticText = `
I completed Class XII from Carmel Convent School, Bhopal, in 2026, studying Physics, Chemistry, and Mathematics with 88.6%. To satisfy the English proficiency requirements, I took the IELTS Academic test and scored an overall band of 7.5.

Having developed an interest in technical problem-solving during school, I selected Information Engineering because the curriculum provides balanced training in computing and electronics.

I chose the University of Padua because of its engineering faculty and English-taught coursework. The institution provides structured laboratory courses that match my study plans.

Following graduation, I plan to return to India to work as an engineer in the technology sector. My family resides in Bhopal, and my personal and professional ties remain in my home country.

My education is sponsored by my father, Mohammed Ameen, Civil Engineer with the Government of Madhya Pradesh (Annual Income: INR 14,00,000). He has secured an education loan of INR 20,00,000 from State Bank of India, supplemented by INR 8,50,000 in personal savings.
    `.trim();

    const lockedFacts = [
      { field: "applicant.name", value: "Aafia Ameen", category: "identity" as const, required: true },
      { field: "university.officialName", value: "University of Padua", category: "academic" as const, required: true },
      { field: "financials.educationLoan.amount", value: "INR 20,00,000", category: "financial" as const, required: true },
    ];


    const lockedResult = validateLockedFacts(authenticText, lockedFacts);
    const repetitionResult = validateRepetition(authenticText, {
      universityName: "University of Padua",
      courseName: "Information Engineering",
    });
    const sentenceResult = validateSentenceLengths(authenticText, "VISA_COVER_LETTER");
    const clicheResult = validateGenericPhrases(authenticText);
    const densityResult = validateLanguageDensity(authenticText);
    const blockingResult = validateBlockingPlaceholders(authenticText);

    assert.equal(blockingResult.isBlocked, false, "Authentic text must not be blocked");
    assert.equal(clicheResult.totalClichesFound, 0, "Authentic text should have zero clichés");
    assert.equal(densityResult.valid, true, "Authentic text must pass density checks");

    const quality = computeWritingQualityReport({
      text: authenticText,
      lockedResult,
      repetitionResult,
      sentenceResult,
      clicheResult,
      densityResult,
      blockingResult,
      paragraphCount: 5,
      expectedParagraphCount: 5,
    });

    assert.ok(
      quality.overallScore >= 85,
      `Authentic text should score >= 85, scored: ${quality.overallScore}`
    );
    assert.notEqual(quality.rating, "NEEDS_REWRITE");
  });
});
