/**
 * services/webhook/generators/sopGenerator.ts
 *
 * Full SOP & Visa Cover Letter Document Generator.
 * Reuses existing Phase 1 SOP engine:
 * - mapNormalizedToSop
 * - validateDocumentContext & hasErrors
 * - italyTypeDCoverLetter template
 * - interpolate
 */

import type {
  DocumentGenerator,
  DocumentGenerationOptions,
  GeneratedDocumentResult,
} from "./interface";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import type { ReviewStatus } from "@/features/sop-generator/types/sop-generator";
import { mapNormalizedToSop } from "@/services/normalization/mapNormalizedToSop";
import {
  validateDocumentContext,
  hasErrors,
} from "@/features/sop-generator/lib/validateDocumentContext";
import { getTemplate } from "@/features/sop-generator/lib/applicationService";
import { interpolate } from "@/features/sop-generator/lib/interpolateTemplate";

const DEFAULT_SOP_TEMPLATE_ID = "italy-type-d-student-visa-cover-letter";

export class SopDocumentGenerator implements DocumentGenerator {
  readonly type = "SOP" as const;

  async generate(
    profile: NormalizedStudentProfile,
    options?: DocumentGenerationOptions
  ): Promise<GeneratedDocumentResult> {
    const templateId = options?.templateId || DEFAULT_SOP_TEMPLATE_ID;

    // 1. Map Normalized Profile to SOP Context
    const sopContext = mapNormalizedToSop(profile);

    // 2. Validate Context
    const validationIssues = validateDocumentContext(sopContext);
    const containsErrors = hasErrors(validationIssues);

    // 3. Resolve Template
    const template = getTemplate(templateId);

    // 4. Interpolate Template Sections
    const sectionContents: Record<string, string> = {};
    const sectionStatuses: Record<string, ReviewStatus> = {};

    for (const sec of template.sections) {
      sectionContents[sec.id] = interpolate(sec.content, sopContext);
      sectionStatuses[sec.id] = "NEEDS_REVIEW";
    }

    // 5. Derive Status & Warnings
    const status = containsErrors ? "VALIDATION_FAILED" : "NEEDS_REVIEW";
    const warnings = validationIssues
      .filter((i) => i.severity === "warning" || i.severity === "error")
      .map((i) => i.message);

    return {
      templateId,
      status,
      sectionContents,
      sectionStatuses,
      validationIssues,
      sopContext,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
