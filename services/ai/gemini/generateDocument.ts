/**
 * services/ai/gemini/generateDocument.ts
 *
 * Master Document Generation Engine.
 *
 * Implements the full pipeline:
 * 1. Document Routing & Unsupported Type Rejection
 * 2. Canonical Data Normalization
 * 3. Pre-generation Conflict Detection (returns NEEDS_REVIEW on contradictions)
 * 4. Fact Lock Layer Extraction
 * 5. Document Planning (Blueprint)
 * 6. Priority Example Retrieval (max 2-3 examples)
 * 7. Gemini Writer Pass (Call #1)
 * 8. Deterministic Local Validators (Locked Facts, Repetition, Sentence Length, Clichés, Density, Fillers)
 * 9. Conditional Auditor / Rewriter Pass (Call #2 triggered on density, clichés, missing facts, long sentences)
 * 10. Blocking Validator (blocks final output on [Placeholders], TBD, example.com, missing locked facts)
 * 11. Multi-dimensional Writing Quality Report
 */

import { routeDocumentRequest } from "../documents/documentRouter";
import { NormalizationInput } from "../documents/normalizeDocumentData";
import { detectDataConflicts, ConflictItem } from "../validators/conflictDetector";
import { extractLockedFacts } from "../validators/lockedFactExtractor";
import { validateLockedFacts } from "../validators/lockedFactValidator";
import { validateRepetition } from "../validators/repetitionValidator";
import { validateSentenceLengths } from "../validators/sentenceValidator";
import { validateGenericPhrases } from "../validators/genericPhraseValidator";
import { validateLanguageDensity } from "../validators/languageDensityValidator";
import { validateBlockingPlaceholders, BlockingValidationIssue } from "../validators/blockingValidator";
import { computeWritingQualityReport, WritingQualityReport } from "../validators/qualityScorer";
import { retrieveRelevantExamples } from "../examples/exampleRetriever";
import { exampleRepository } from "../examples/exampleRepository";
import { buildWriterPrompt, buildAuditorPromptPayload } from "./promptBuilder";
import { geminiService } from "./geminiClient";
import { AuditorIssue } from "../prompts/auditorPrompt";
import { DOCUMENT_LENGTH_TARGETS } from "../config/writingRules";

export interface GenerateDocumentSuccessResponse {
  status: "SUCCESS";
  document: string;
  warnings: string[];
  quality: WritingQualityReport;
  metadata: {
    documentType: string;
    studentName: string;
    targetUniversity: string;
    targetCourse: string;
    usedExampleIds: string[];
    passesUsed: 1 | 2;
    modelUsed: string;
    validation: {
      lockedFactsTotal: number;
      lockedFactsMatched: number;
      lockedFactsValid: boolean;
      clichesFound: number;
      evaluativeWordsFound: number;
      abstractWordsFound: number;
      repetitionIssues: number;
      longSentencesFound: number;
      isExportBlocked: boolean;
    };
  };
}

export interface GenerateDocumentConflictResponse {
  status: "NEEDS_REVIEW";
  document: null;
  conflicts: ConflictItem[];
  blockingIssues?: BlockingValidationIssue[];
  message: string;
}

export interface GenerateDocumentErrorResponse {
  status: "ERROR";
  document: null;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export type GenerateDocumentResult =
  | GenerateDocumentSuccessResponse
  | GenerateDocumentConflictResponse
  | GenerateDocumentErrorResponse;

export async function generateDocument(
  input: NormalizationInput
): Promise<GenerateDocumentResult> {
  // ── Step 1: Document Router & Type Validation ────────────────────────────
  let routed;
  try {
    routed = routeDocumentRequest(input);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unsupported document type.";
    return {
      status: "ERROR",
      document: null,
      error: {
        code: "UNSUPPORTED_DOCUMENT_TYPE",
        message,
        statusCode: 400,
      },
    };
  }

  const { documentType, profile, canonicalData, plan } = routed;

  // ── Step 2: Pre-generation Conflict Detection ────────────────────────────
  const conflictReport = detectDataConflicts(canonicalData);
  if (conflictReport.hasConflicts) {
    return {
      status: "NEEDS_REVIEW",
      document: null,
      conflicts: conflictReport.conflicts,
      message: `Pre-generation conflict check failed: ${conflictReport.conflicts.map((c) => c.message).join("; ")}`,
    };
  }

  // ── Step 3: Extract Locked Facts ─────────────────────────────────────────
  const lockedFacts = extractLockedFacts(canonicalData);

  // ── Step 4: Retrieve Priority Examples (Max 2-3) ─────────────────────────
  const relevantExamples = await retrieveRelevantExamples({
    documentType,
    destinationCountry: canonicalData.university.country,
    studyArea: canonicalData.course.officialName,
    educationLevel: canonicalData.course.level,
    limit: 2,
  });

  // ── Step 5: Gemini Writer Pass (Call #1) ──────────────────────────────────
  const writerPayload = buildWriterPrompt({
    documentType,
    canonicalData,
    plan,
    examples: relevantExamples,
  });


  const writerResult = await geminiService.generate({
    systemInstruction: writerPayload.systemInstruction,
    prompt: writerPayload.userPrompt,
    temperature: profile.temperature,
    timeoutMs: 25000,
  });

  if (!writerResult.success) {
    return {
      status: "ERROR",
      document: null,
      error: writerResult.error,
    };
  }

  let activeDraft = writerResult.text;
  let modelUsed = writerResult.model;
  let passesUsed: 1 | 2 = 1;

  // Save AI Draft for revision learning loop
  await exampleRepository.saveAIDraft({
    documentType,
    destinationCountry: canonicalData.university.country,
    studyArea: canonicalData.course.officialName,
    educationLevel: canonicalData.course.level,
    title: `Draft for ${canonicalData.applicant.name} (${documentType})`,
    inputSnapshot: canonicalData as unknown as Record<string, unknown>,
    aiDraft: activeDraft,
  });

  // ── Step 6: Deterministic Local Validators ────────────────────────────────
  let lockedResult = validateLockedFacts(activeDraft, lockedFacts);
  let repetitionResult = validateRepetition(activeDraft, {
    universityName: canonicalData.university.officialName,
    courseName: canonicalData.course.officialName,
  });
  let sentenceResult = validateSentenceLengths(activeDraft, documentType);
  let clicheResult = validateGenericPhrases(activeDraft);
  let densityResult = validateLanguageDensity(activeDraft);

  // ── Step 7: Evaluate Need for Second-Pass Auditor (Call #2) ───────────────
  const auditorIssues: AuditorIssue[] = [];

  // 1. Missing or altered locked facts
  if (!lockedResult.valid) {
    for (const mf of lockedResult.missingFacts) {
      if (mf.severity === "error") {
        auditorIssues.push({
          type: "LOCKED_FACT_MISSING",
          description: `Required locked fact for field "${mf.field}" was altered or omitted.`,
          expected: mf.expectedValue,
        });
      }
    }
  }

  // 2. Generic Clichés (Trigger on any exact match)
  if (clicheResult.matches.length > 0) {
    for (const match of clicheResult.matches) {
      auditorIssues.push({
        type: "AI_CLICHE_DETECTED",
        description: `Generic marketing phrase "${match.phrase}" was detected. Replace with direct, factual prose.`,
        found: match.count,
      });
    }
  }

  // 3. Promotional-Language Density
  if (densityResult.paragraphsNeedingRewrite.length > 0) {
    for (const pIssue of densityResult.paragraphIssues) {
      if (pIssue.needsRewrite) {
        auditorIssues.push({
          type: "PROMOTIONAL_DENSITY",
          paragraphIndex: pIssue.paragraphIndex,
          description: pIssue.reason,
          found: pIssue.evaluativeWords.join(", "),
        });
      }
    }
  }

  // 4. Abstract Language Density
  const abstractSentenceIssues = densityResult.sentenceIssues.filter(
    (s) => s.severity === "critical" && s.abstractWords.length >= 2
  );
  for (const absIssue of abstractSentenceIssues) {
    auditorIssues.push({
      type: "ABSTRACT_LANGUAGE",
      paragraphIndex: absIssue.paragraphIndex,
      description: `Overly abstract sentence found: "${absIssue.textSnippet}". Replace abstract nouns with concrete skills or actions.`,
      found: absIssue.abstractWords.join(", "),
    });
  }

  // 5. Zero-Information Filler Sentences
  if (densityResult.fillerSentences.length > 0) {
    for (const filler of densityResult.fillerSentences) {
      auditorIssues.push({
        type: "ZERO_INFORMATION_FILLER",
        description: `Unanchored promotional filler sentence with zero concrete facts: "${filler.slice(
          0,
          80
        )}...". Remove or replace with concrete facts.`,
      });
    }
  }

  // 6. Plain-Language Transformation Matches
  if (densityResult.plainLanguageSuggestions.length > 0) {
    for (const sug of densityResult.plainLanguageSuggestions) {
      auditorIssues.push({
        type: "PLAIN_LANGUAGE_REQUIRED",
        description: `Replace inflated expression "${sug.found}" with plain student language: "${sug.suggested}".`,
        expected: sug.suggested,
        found: sug.found,
      });
    }
  }

  // 6b. Career Realism Buzzwords
  if (densityResult.careerBuzzwordsFound.length > 0) {
    for (const buzz of densityResult.careerBuzzwordsFound) {
      auditorIssues.push({
        type: "PLAIN_LANGUAGE_REQUIRED",
        description: `Disallowed corporate career buzzword "${buzz}" found. Replace with realistic early-career language like "begin my career" or "develop my practical skills".`,
        found: buzz,
      });
    }
  }

  // 6c. Destination Tourism Fluff
  if (densityResult.tourismFluffFound.length > 0) {
    for (const tour of densityResult.tourismFluffFound) {
      auditorIssues.push({
        type: "COUNTRY_TOURISM_FLUFF",
        description: `Tourism fluff word "${tour}" found in destination description. Ground country reasons in concrete educational factors only.`,
        found: tour,
      });
    }
  }


  // 7. Critical Repetition (starters repeated >= 3 times)
  const criticalRepetitions = repetitionResult.issues.filter(
    (i) => i.severity === "critical"
  );
  for (const cr of criticalRepetitions) {
    auditorIssues.push({
      type: "REPETITIVE_SENTENCE_OPENING",
      description: cr.message,
      found: cr.count,
    });
  }

  // 8. Run-on or overly long editorial sentences (> 30 words in Cover Letter)
  const criticalSentences = sentenceResult.issues.filter(
    (i) => i.severity === "critical"
  );
  for (const cs of criticalSentences) {
    auditorIssues.push({
      type: "SENTENCE_TOO_LONG",
      description: cs.message,
      found: `${cs.wordCount} words`,
    });
  }

  // 9. Document Length Check (e.g. Visa Cover Letter exceeding 1000 words due to filler)
  const docLengthTarget = DOCUMENT_LENGTH_TARGETS[documentType as keyof typeof DOCUMENT_LENGTH_TARGETS];
  const draftWords = activeDraft.split(/\s+/).filter(Boolean).length;
  if (docLengthTarget && draftWords > docLengthTarget.maxWords) {
    auditorIssues.push({
      type: "DOCUMENT_TOO_LONG",
      description: `Document length (${draftWords} words) exceeds maximum recommended target (${docLengthTarget.maxWords} words). Compress text by removing unanchored filler sentences.`,
      found: `${draftWords} words`,
    });
  }

  // ── Step 8: Execute Auditor Call #2 if Quality Gate Failed ────────────────
  if (auditorIssues.length > 0) {
    const auditorPayload = buildAuditorPromptPayload({
      documentType,
      originalDraft: activeDraft,
      issues: auditorIssues,
      lockedFacts,
    });

    const auditorResult = await geminiService.generate({
      systemInstruction: auditorPayload.systemInstruction,
      prompt: auditorPayload.userPrompt,
      temperature: 0.2, // Low temperature for deterministic corrections
      timeoutMs: 25000,
    });

    if (auditorResult.success && auditorResult.text.length > 50) {
      activeDraft = auditorResult.text;
      modelUsed = auditorResult.model;
      passesUsed = 2;

      // Re-run validators on audited text to update report
      lockedResult = validateLockedFacts(activeDraft, lockedFacts);
      repetitionResult = validateRepetition(activeDraft, {
        universityName: canonicalData.university.officialName,
        courseName: canonicalData.course.officialName,
      });
      sentenceResult = validateSentenceLengths(activeDraft, documentType);
      clicheResult = validateGenericPhrases(activeDraft);
      densityResult = validateLanguageDensity(activeDraft);
    }
  }

  // ── Step 9: Blocking Validation Check ─────────────────────────────────────
  // Validates bracketed placeholders, TBD, literal null, placeholder email domains, and locked facts
  const blockingResult = validateBlockingPlaceholders(activeDraft, lockedResult, lockedFacts);
  if (blockingResult.isBlocked) {
    return {
      status: "NEEDS_REVIEW",
      document: null,
      conflicts: blockingResult.issues.map((iss) => ({
        field: iss.field || iss.type,
        values: [iss.matchedText],
        message: iss.message,
      })),

      blockingIssues: blockingResult.issues,
      message: blockingResult.summary,
    };
  }

  // ── Step 10: Calculate Writing Quality Report ─────────────────────────────
  const paragraphs = activeDraft
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const quality = computeWritingQualityReport({
    text: activeDraft,
    lockedResult,
    repetitionResult,
    sentenceResult,
    clicheResult,
    densityResult,
    blockingResult,
    paragraphCount: paragraphs.length,
    expectedParagraphCount: profile.expectedParagraphCount,
  });

  const warnings: string[] = [];
  if (lockedResult.missingFacts.length > 0) {
    for (const mf of lockedResult.missingFacts) {
      warnings.push(`Notice: Fact "${mf.field}" (${mf.expectedValue}) could not be fully verified.`);
    }
  }
  if (clicheResult.totalClichesFound > 0) {
    warnings.push(`${clicheResult.totalClichesFound} generic AI phrase(s) noted.`);
  }
  if (densityResult.totalEvaluativeWords > 0) {
    warnings.push(`Evaluative word count: ${densityResult.totalEvaluativeWords} (${densityResult.evaluativeWordsFound.join(", ")}).`);
  }

  return {
    status: "SUCCESS",
    document: activeDraft,
    warnings,
    quality,
    metadata: {
      documentType,
      studentName: canonicalData.applicant.name,
      targetUniversity: canonicalData.university.officialName,
      targetCourse: canonicalData.course.officialName,
      usedExampleIds: relevantExamples.map((e) => e.id),
      passesUsed,
      modelUsed,
      validation: {
        lockedFactsTotal: lockedResult.totalFacts,
        lockedFactsMatched: lockedResult.matchedFacts,
        lockedFactsValid: lockedResult.valid,
        clichesFound: clicheResult.totalClichesFound,
        evaluativeWordsFound: densityResult.totalEvaluativeWords,
        abstractWordsFound: densityResult.totalAbstractWords,
        repetitionIssues: repetitionResult.issues.length,
        longSentencesFound: sentenceResult.issues.length,
        isExportBlocked: blockingResult.isBlocked,
      },
    },
  };
}
