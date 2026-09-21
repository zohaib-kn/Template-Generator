/**
 * services/ai/__tests__/plainProfessionalLanguagePolicy.test.ts
 *
 * Automated regression test suite for VISA WRITING — PLAIN PROFESSIONAL LANGUAGE POLICY.
 * Tests:
 * 1. Simplicity rule (detects and suggests plain replacements for all 8 comparison pairs).
 * 2. Sentence modesty rule (ensures paragraphs include at least one direct 8-16 word sentence).
 * 3. Abstract language stacking control (blocks stacking methodologies, competencies, frameworks, etc.).
 * 4. Evaluative adjective control (flags paragraphs with > 1 evaluative adjective).
 * 5. Country section tourism fluff detection (flags safe, beautiful, vibrant, historic, culturally rich).
 * 6. Section word limits (verifies 80-110, 70-90, 60-80, 90-120 ranges).
 * 7. Career realism check (flags corporate consultant buzzwords like "lead digital transformation").
 * 8. Authentic plain-language document passes all 12 policy gates with high score.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { validateLanguageDensity } from "../validators/languageDensityValidator";
import { VISA_SECTION_WORD_LIMITS } from "../config/writingRules";

import { validateSentenceLengths } from "../validators/sentenceValidator";
import { validateBlockingPlaceholders } from "../validators/blockingValidator";
import { computeWritingQualityReport } from "../validators/qualityScorer";
import { validateLockedFacts } from "../validators/lockedFactValidator";
import { validateRepetition } from "../validators/repetitionValidator";
import { validateGenericPhrases } from "../validators/genericPhraseValidator";

describe("Visa Writing — Plain Professional Language Policy Tests", () => {
  // ── Test 1: Simplicity Rule (8 Key Comparison Pairs) ─────────────────────
  test("Test 1: Simplicity Rule flags inflated expressions and suggests plain alternatives", () => {
    const inflatedSample = `
I wish to build an impactful professional career by acquiring rigorous technical training and analytical methodologies.
I intend to leverage the competencies acquired and contribute to the rapidly expanding technological ecosystem.
The programme will allow me to acquire advanced competencies and earn a prestigious European diploma.
I was attracted by world-class traditions of rigorous engineering scholarship which will help me optimize commercial decision-making.
    `.trim();

    const densityResult = validateLanguageDensity(inflatedSample);

    const checkSuggestion = (inflated: string, expectedPlain: string) => {
      const match = densityResult.plainLanguageSuggestions.find((s) =>
        s.found.toLowerCase().includes(inflated.toLowerCase())
      );
      assert.ok(
        match,
        `Expected plain-language suggestion for "${inflated}", but none was found.`
      );
      assert.equal(
        match.suggested,
        expectedPlain,
        `Expected suggestion "${expectedPlain}" for "${inflated}", got "${match.suggested}"`
      );
    };

    checkSuggestion("build an impactful professional career", "begin my career");
    checkSuggestion(
      "rigorous technical training and analytical methodologies",
      "technical knowledge and practical skills"
    );
    checkSuggestion("leverage the competencies acquired", "use what I learned");
    checkSuggestion(
      "contribute to the rapidly expanding technological ecosystem",
      "work in the technology sector"
    );
    checkSuggestion("acquire advanced competencies", "develop my skills");
    checkSuggestion("prestigious European diploma", "degree");
    checkSuggestion(
      "world-class traditions of rigorous engineering scholarship",
      "engineering education"
    );
    checkSuggestion(
      "optimize commercial decision-making",
      "help businesses make better decisions"
    );
  });

  // ── Test 2: Sentence Modesty Rule (8-16 Word Direct Sentence) ────────────
  test("Test 2: Flags narrative paragraphs lacking an 8-16 word direct sentence", () => {
    // A paragraph where every sentence is complex (> 25 words) with NO simple direct sentence
    const overlySophisticatedParagraph = `
Having completed my higher secondary coursework in Physics, Chemistry, and Mathematics, I determined that embarking upon an academic programme in Information Engineering would provide the foundational theoretical framework necessary to pursue technical problem-solving.
The laboratory components and faculty expertise offered by the curriculum align precisely with my academic objectives to engage in practical engineering and develop analytical discipline across computing, electronics, and communication systems.
    `.trim();

    const resultOverlyComplex = validateLanguageDensity(overlySophisticatedParagraph);
    const pIssue = resultOverlyComplex.paragraphIssues[0];
    assert.equal(
      pIssue.hasDirectSentence,
      false,
      "Paragraph without any 8-16 word sentence must fail modesty check"
    );
    assert.equal(pIssue.needsRewrite, true);
    assert.ok(pIssue.reason.includes("8-16 words"));

    // Adding a simple, direct 8-16 word sentence satisfies modesty rule:
    const balancedParagraph = `
${overlySophisticatedParagraph}
My plan is to return to India after completing my degree.
    `.trim();

    const resultBalanced = validateLanguageDensity(balancedParagraph);
    const balancedIssue = resultBalanced.paragraphIssues[0];
    assert.equal(
      balancedIssue.hasDirectSentence,
      true,
      "Adding 'My plan is to return to India after completing my degree.' (11 words) must satisfy modesty rule"
    );
  });

  // ── Test 3: Abstract Language Stacking Control ────────────────────────────
  test("Test 3: Flags sentences stacking multiple abstract nouns", () => {
    const stackedAbstractSentence =
      "The analytical methodologies and technical competencies will guide my execution and expertise across this modern framework.";

    const result = validateLanguageDensity(stackedAbstractSentence);
    const critIssue = result.sentenceIssues.find((s) => s.severity === "critical");
    assert.ok(
      critIssue,
      "Sentence stacking 4 abstract nouns must be flagged with critical severity"
    );
    assert.ok(critIssue.abstractWords.length >= 3);
  });

  // ── Test 4: Evaluative Adjective Control (Max 1 per paragraph) ────────────
  test("Test 4: Flags paragraphs containing more than one evaluative adjective", () => {
    const multipleAdjectivesParagraph = `
I chose this prestigious institution because of its distinguished faculty and comprehensive coursework.
    `.trim();

    const result = validateLanguageDensity(multipleAdjectivesParagraph);
    assert.equal(result.valid, false);
    assert.ok(
      result.paragraphIssues[0].evaluativeCount > 1,
      "Paragraph with prestigious, distinguished, comprehensive has > 1 evaluative words"
    );
    assert.ok(result.paragraphIssues[0].needsRewrite);
  });

  // ── Test 5: Country Section Tourism Fluff Detection ───────────────────────
  test("Test 5: Detects tourism and promotional adjectives in destination references", () => {
    const tourismFluffText = `
Italy was my first choice because it is a safe, beautiful, vibrant country with a historic and culturally rich environment.
    `.trim();

    const result = validateLanguageDensity(tourismFluffText);
    assert.ok(result.tourismFluffFound.length >= 3);
    assert.ok(result.tourismFluffFound.includes("beautiful"));
    assert.ok(result.tourismFluffFound.includes("vibrant"));
    assert.ok(result.tourismFluffFound.includes("historic"));
  });

  // ── Test 6: Section Word Limits Definition ────────────────────────────────
  test("Test 6: Verifies strict section word limits for Visa Cover Letters", () => {
    assert.equal(VISA_SECTION_WORD_LIMITS.course_motivation.minWords, 80);
    assert.equal(VISA_SECTION_WORD_LIMITS.course_motivation.maxWords, 110);

    assert.equal(VISA_SECTION_WORD_LIMITS.university_choice.minWords, 70);
    assert.equal(VISA_SECTION_WORD_LIMITS.university_choice.maxWords, 90);

    assert.equal(VISA_SECTION_WORD_LIMITS.country_choice.minWords, 60);
    assert.equal(VISA_SECTION_WORD_LIMITS.country_choice.maxWords, 80);

    assert.equal(VISA_SECTION_WORD_LIMITS.future_education_career.minWords, 90);
    assert.equal(VISA_SECTION_WORD_LIMITS.future_education_career.maxWords, 120);
  });

  // ── Test 7: Career Realism Policy (Disallows Corporate Buzzwords) ─────────
  test("Test 7: Flags corporate consultant buzzwords in career plans", () => {
    const buzzwordCareerText = `
Upon graduation, I intend to drive technological innovation, lead digital transformation, and create sustainable competitive advantage across global ecosystems.
    `.trim();

    const result = validateLanguageDensity(buzzwordCareerText);
    assert.ok(result.careerBuzzwordsFound.length >= 3);
    assert.ok(result.careerBuzzwordsFound.includes("drive technological innovation"));
    assert.ok(result.careerBuzzwordsFound.includes("lead digital transformation"));
    assert.ok(result.careerBuzzwordsFound.includes("create sustainable competitive advantage"));
  });

  // ── Test 8: Authentic Plain-Language Document Passes All Policy Gates ─────
  test("Test 8: Authentic Plain-Language Document adhering to all 12 policy rules passes with high score", () => {
    const cleanPolicyCoverLetter = `
To the Visa Officer,
Embassy of Italy, New Delhi, India.
Subject: Application for Type D National Student Visa — Aafia Ameen (Passport No: Z9876543)

I completed Class XII from Carmel Convent School, Bhopal, under the Central Board of Secondary Education in 2026, studying Physics, Chemistry, and Mathematics with 88.6%. To satisfy the English language proficiency requirements for this degree, I took the IELTS Academic test and scored an overall band of 7.5.

During my higher secondary studies, I enjoyed laboratory experiments and mathematics problem-solving. I chose Information Engineering because the coursework covers computing, electronics, and communication systems. The programme provides the technical knowledge and practical skills I want to learn.

I chose the University of Padua because of its engineering department and laboratory facilities. The university offers this programme in English, which allows me to study my chosen subjects directly. These practical laboratory courses match my study goals.

Italy offers degrees structured under the Bologna framework, with qualification recognition across Europe and affordable tuition fees. The University of Padua provides the specific English-taught curriculum I need for my studies.

After completing my degree, my plan is to return to India to begin my career. I want to gain practical experience as a software engineer in India's technology sector. My family lives in Bhopal, and my personal and family ties remain in my home country.

My education is sponsored by my father, Mohammed Ameen, Civil Engineer with the Government of Madhya Pradesh (Annual Income: INR 14,00,000). He has secured an education loan of INR 20,00,000 from State Bank of India, along with INR 8,50,000 in personal savings, providing total available funds of INR 28,50,000. All financial documents are enclosed.

I have confirmed accommodation at ESU Casa dello Studente — Residenza Torricelli, Via Venezia 12, 35131 Padova, Italy, from 1 September 2026 to 30 June 2027 (Booking Ref: ESU-PADUV-2026-4471). Travel and health insurance is confirmed with Bajaj Allianz (Policy No: OG-2026-1801-0000-12345, EUR 50,000 coverage). Flight booking is confirmed on Air India (Flight: AI 0131, PNR: AIINDBHO2026881).

Thank you for considering my application. I respectfully request your favourable review, and I remain available should you need any further information.

Sincerely,
Aafia Ameen
Passport No: Z9876543
Email: aafia.ameen@gmail.com | Phone: +91 94255 67890
    `.trim();

    const lockedFacts = [
      { field: "applicant.name", value: "Aafia Ameen", category: "identity" as const, required: true },
      { field: "applicant.passportNumber", value: "Z9876543", category: "identity" as const, required: true },
      { field: "university.officialName", value: "University of Padua", category: "academic" as const, required: true },
      { field: "financials.educationLoan.amount", value: "INR 20,00,000", category: "financial" as const, required: true },
    ];

    const densityResult = validateLanguageDensity(cleanPolicyCoverLetter);
    const genericResult = validateGenericPhrases(cleanPolicyCoverLetter);
    const sentenceResult = validateSentenceLengths(cleanPolicyCoverLetter, "VISA_COVER_LETTER");
    const blockingResult = validateBlockingPlaceholders(cleanPolicyCoverLetter);
    const repetitionResult = validateRepetition(cleanPolicyCoverLetter, {
      universityName: "University of Padua",
      courseName: "Information Engineering",
    });
    const lockedResult = validateLockedFacts(cleanPolicyCoverLetter, lockedFacts);

    assert.equal(blockingResult.isBlocked, false, "Document must not be blocked");
    assert.equal(genericResult.totalClichesFound, 0, "Must have zero marketing clichés");
    assert.equal(densityResult.valid, true, "Density checks must pass");
    assert.equal(densityResult.careerBuzzwordsFound.length, 0, "No career buzzwords");
    assert.equal(densityResult.tourismFluffFound.length, 0, "No tourism fluff");

    const quality = computeWritingQualityReport({
      text: cleanPolicyCoverLetter,
      lockedResult,
      repetitionResult,
      sentenceResult,
      clicheResult: genericResult,
      densityResult,
      blockingResult,
      paragraphCount: 9,
      expectedParagraphCount: 9,
    });

    assert.ok(
      quality.overallScore >= 90,
      `Expected overall score >= 90, got ${quality.overallScore}`
    );
    assert.equal(quality.rating, "EXCELLENT");
  });
});
