/**
 * features/sop-generator/lib/templateRegistry.ts
 *
 * Single, authoritative template registry for all SOP Generator document types.
 * Manages template resolution, default template assignment, and document type mapping.
 */

import type { SopTemplate, SopDocumentType } from "../types/sop-generator";
import { italyTypeDCoverLetter } from "../templates/italy-type-d-cover-letter";
import { universitySopTemplate } from "../templates/university-sop";

export const DEFAULT_VISA_TEMPLATE_ID = "italy-type-d-student-visa-cover-letter";
export const DEFAULT_UNIVERSITY_SOP_TEMPLATE_ID = "university-statement-of-purpose";

/**
 * Master template dictionary.
 */
const TEMPLATE_REGISTRY: Record<string, SopTemplate> = {
  [italyTypeDCoverLetter.id]: italyTypeDCoverLetter,
  [universitySopTemplate.id]: universitySopTemplate,
};

/**
 * Returns all registered templates.
 */
export function getAllTemplates(): SopTemplate[] {
  return Object.values(TEMPLATE_REGISTRY);
}

/**
 * Returns all templates for a specific document type.
 */
export function getTemplatesByDocumentType(docType: SopDocumentType): SopTemplate[] {
  return getAllTemplates().filter((t) => t.documentType === docType);
}

/**
 * Resolves a template by its unique ID.
 * Throws an informative Error if the template ID is not recognized.
 */
export function getTemplate(templateId: string = DEFAULT_VISA_TEMPLATE_ID): SopTemplate {
  const template = TEMPLATE_REGISTRY[templateId];
  if (!template) {
    // Graceful fallback for legacy or unknown IDs
    if (templateId.includes("sop") || templateId.includes("university")) {
      return universitySopTemplate;
    }
    if (templateId.includes("visa") || templateId.includes("cover-letter") || templateId.includes("italy")) {
      return italyTypeDCoverLetter;
    }
    throw new Error(`Unknown template ID: "${templateId}". Registered IDs: ${Object.keys(TEMPLATE_REGISTRY).join(", ")}`);
  }
  return template;
}

/**
 * Returns the default template for a given document type.
 */
export function getDefaultTemplate(docType: SopDocumentType): SopTemplate {
  if (docType === "UNIVERSITY_SOP") {
    return universitySopTemplate;
  }
  return italyTypeDCoverLetter;
}

/**
 * Checks if a template ID is registered.
 */
export function isValidTemplateId(templateId: string): boolean {
  return Boolean(TEMPLATE_REGISTRY[templateId]);
}
