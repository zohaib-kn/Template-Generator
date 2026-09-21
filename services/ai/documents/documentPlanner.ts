/**
 * services/ai/documents/documentPlanner.ts
 *
 * Generates an internal structured paragraph plan (blueprint) before prompting Gemini.
 * Maps relevant canonical facts to each paragraph ID.
 * Does NOT expose chain-of-thought, keeping planning structured and deterministic.
 */

import { DocumentProfile } from "../config/documentProfiles";
import { CanonicalDocumentData } from "./canonicalDocument";

export interface PlannedParagraph {
  id: string;
  title: string;
  purpose: string;
  maxWords?: number;
  availableFacts: Record<string, unknown>;
}

export interface DocumentPlan {
  documentType: string;
  targetDegree: string;
  targetUniversity: string;
  paragraphs: PlannedParagraph[];
}

function resolveFactPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function buildDocumentPlan(
  data: CanonicalDocumentData,
  profile: DocumentProfile
): DocumentPlan {
  const plannedParagraphs: PlannedParagraph[] = [];
  const dataRecord = data as unknown as Record<string, unknown>;

  for (const item of profile.defaultPlan) {
    const paragraphFacts: Record<string, unknown> = {};

    // Collect required facts
    for (const reqPath of item.requiredFacts) {
      const val = resolveFactPath(dataRecord, reqPath);
      if (val !== undefined && val !== null && val !== "") {
        paragraphFacts[reqPath] = val;
      }
    }

    // Collect optional facts
    if (item.optionalFacts) {
      for (const optPath of item.optionalFacts) {
        const val = resolveFactPath(dataRecord, optPath);
        if (val !== undefined && val !== null && val !== "") {
          // If array, ensure non-empty
          if (Array.isArray(val) && val.length === 0) continue;
          paragraphFacts[optPath] = val;
        }
      }
    }

    // If a paragraph requires specific facts and none are present, and it's optional logistics/finances, skip
    if (
      Object.keys(paragraphFacts).length === 0 &&
      (item.id === "logistics" || item.id === "finances")
    ) {
      continue;
    }

    plannedParagraphs.push({
      id: item.id,
      title: item.title,
      purpose: item.purpose,
      maxWords: item.maxWords,
      availableFacts: paragraphFacts,
    });
  }

  return {
    documentType: data.documentType,
    targetDegree: data.course.officialName,
    targetUniversity: data.university.officialName,
    paragraphs: plannedParagraphs,
  };
}
