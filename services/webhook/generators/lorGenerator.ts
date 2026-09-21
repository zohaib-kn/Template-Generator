/**
 * services/webhook/generators/lorGenerator.ts
 *
 * SCAFFOLDED LOR GENERATOR — NOT PRODUCTION-READY
 *
 * Status: Phase 2 Backend Scaffold
 * LOR documents require external recommender, faculty title, relationship length,
 * and academic institution reference data that are not yet available from Senior CRM snapshots.
 * Full LOR builder flow will be implemented in a subsequent phase.
 */

import type {
  DocumentGenerator,
  DocumentGenerationOptions,
  GeneratedDocumentResult,
} from "./interface";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";

const DEFAULT_LOR_TEMPLATE_ID = "lor-generic-academic";

export class LorDocumentGenerator implements DocumentGenerator {
  readonly type = "LOR" as const;

  async generate(
    profile: NormalizedStudentProfile,
    options?: DocumentGenerationOptions
  ): Promise<GeneratedDocumentResult> {
    const templateId = options?.templateId || DEFAULT_LOR_TEMPLATE_ID;
    const studentName = profile.personal.fullName || "Student";

    const sectionContents: Record<string, string> = {
      salutation: "To Whom It May Concern,",
      body: `I am writing this Letter of Recommendation on behalf of ${studentName}.`,
      endorsement: "Scaffolded recommendation content. Awaiting recommender input.",
      signoff: "Sincerely,\n[Recommender Name]\n[Recommender Title]",
    };

    const sectionStatuses = {
      salutation: "NEEDS_REVIEW" as const,
      body: "NEEDS_REVIEW" as const,
      endorsement: "NEEDS_REVIEW" as const,
      signoff: "NEEDS_REVIEW" as const,
    };

    return {
      templateId,
      status: "NEEDS_REVIEW",
      sectionContents,
      sectionStatuses,
      validationIssues: [
        {
          id: "lor-recommender-missing",
          field: "recommender",
          severity: "warning",
          message: "Recommender profile not provided in CRM snapshot.",
        },
      ],
      warnings: [
        "SCAFFOLD: LOR generation is scaffolded. Recommender data must be provided manually.",
      ],
    };
  }
}
