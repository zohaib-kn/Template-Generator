/**
 * services/webhook/generators/interface.ts
 *
 * Common contract for all document generators (SOP, RESUME, LOR).
 */

import type { DocumentType, WebhookDocumentStatus } from "../types";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import type {
  ReviewStatus,
  StudentDocumentContext,
  ValidationIssue,
} from "@/features/sop-generator/types/sop-generator";

export interface DocumentGenerationOptions {
  templateId?: string;
  metadata?: Record<string, unknown>;
}

export interface GeneratedDocumentResult {
  templateId: string;
  status: WebhookDocumentStatus;
  sectionContents: Record<string, string>;
  sectionStatuses: Record<string, ReviewStatus>;
  validationIssues: ValidationIssue[];
  sopContext?: StudentDocumentContext;
  warnings?: string[];
}

export interface DocumentGenerator {
  readonly type: DocumentType;
  generate(
    profile: NormalizedStudentProfile,
    options?: DocumentGenerationOptions
  ): Promise<GeneratedDocumentResult>;
}
