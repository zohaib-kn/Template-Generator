/**
 * services/webhook/generators/registry.ts
 *
 * Central registry mapping DocumentType to its corresponding DocumentGenerator.
 */

import type { DocumentType } from "../types";
import type { DocumentGenerator } from "./interface";
import { SopDocumentGenerator } from "./sopGenerator";
import { ResumeDocumentGenerator } from "./resumeGenerator";
import { LorDocumentGenerator } from "./lorGenerator";

const registry = new Map<DocumentType, DocumentGenerator>();

const sopGen = new SopDocumentGenerator();
const resumeGen = new ResumeDocumentGenerator();
const lorGen = new LorDocumentGenerator();

registry.set("SOP", sopGen);
registry.set("RESUME", resumeGen);
registry.set("LOR", lorGen);

export function normalizeDocumentType(input?: string): DocumentType | null {
  if (!input || typeof input !== "string") return null;
  const upper = input.trim().toUpperCase();

  if (upper === "SOP" || upper === "VISA_COVER_LETTER") {
    return "SOP";
  }
  if (upper === "RESUME" || upper === "CV") {
    return "RESUME";
  }
  if (upper === "LOR") {
    return "LOR";
  }

  return null;
}

export function getGenerator(type: string): DocumentGenerator | null {
  const normalized = normalizeDocumentType(type);
  if (!normalized) return null;
  return registry.get(normalized) ?? null;
}

export function isSupportedDocumentType(type: string): boolean {
  return normalizeDocumentType(type) !== null;
}
