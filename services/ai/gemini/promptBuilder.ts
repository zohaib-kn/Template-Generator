/**
 * services/ai/gemini/promptBuilder.ts
 *
 * Constructs structured prompts for the Gemini Writer and Auditor passes.
 * Separates permanent system instructions from dynamic applicant facts and examples.
 */

import { DOCUMENT_TYPES, DocumentType } from "../config/documentTypes";
import { CanonicalDocumentData } from "../documents/canonicalDocument";
import { DocumentPlan } from "../documents/documentPlanner";
import { ApprovedDocumentExample } from "../examples/exampleTypes";
import { formatExamplesForPrompt } from "../examples/exampleRetriever";
import { MASTER_SYSTEM_PROMPT } from "../prompts/systemPrompt";
import { buildCoverLetterPrompt } from "../prompts/coverLetterPrompt";
import { buildSopPrompt } from "../prompts/sopPrompt";
import { buildLorPrompt } from "../prompts/lorPrompt";
import { buildAuditorPrompt, AuditorIssue } from "../prompts/auditorPrompt";
import { LockedFact } from "../validators/lockedFactExtractor";

export interface WriterPromptPayload {
  systemInstruction: string;
  userPrompt: string;
}

export function buildWriterPrompt(params: {
  documentType: DocumentType;
  canonicalData: CanonicalDocumentData;
  plan: DocumentPlan;
  examples: ApprovedDocumentExample[];
}): WriterPromptPayload {
  const { documentType, canonicalData, plan, examples } = params;

  let docSpecificPrompt = "";
  switch (documentType) {
    case DOCUMENT_TYPES.VISA_COVER_LETTER:
      docSpecificPrompt = buildCoverLetterPrompt(canonicalData, plan);
      break;
    case DOCUMENT_TYPES.SOP:
      docSpecificPrompt = buildSopPrompt(canonicalData, plan);
      break;
    case DOCUMENT_TYPES.LOR:
      docSpecificPrompt = buildLorPrompt(canonicalData, plan);
      break;
  }

  const examplesBlock = formatExamplesForPrompt(examples);

  const parts = [
    docSpecificPrompt,
    examplesBlock,
    `TASK EXECUTION:
Generate the finalized document now following the structural blueprint and rules above.`,
  ].filter(Boolean);

  return {
    systemInstruction: MASTER_SYSTEM_PROMPT,
    userPrompt: parts.join("\n\n"),
  };
}

export function buildAuditorPromptPayload(params: {
  documentType: DocumentType;
  originalDraft: string;
  issues: AuditorIssue[];
  lockedFacts: LockedFact[];
}): WriterPromptPayload {
  const userPrompt = buildAuditorPrompt({
    documentType: params.documentType,
    originalDraft: params.originalDraft,
    issues: params.issues,
    lockedFacts: params.lockedFacts,
  });

  return {
    systemInstruction: MASTER_SYSTEM_PROMPT,
    userPrompt,
  };
}
