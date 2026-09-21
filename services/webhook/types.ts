/**
 * services/webhook/types.ts
 *
 * Types for the Unified Document Generation Webhook (Phase 2).
 */

import type {
  StudentDocumentContext,
  ReviewStatus,
  ValidationIssue,
} from "@/features/sop-generator/types/sop-generator";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";

export type DocumentType = "SOP" | "RESUME" | "LOR";

export const SUPPORTED_DOCUMENT_TYPES: readonly DocumentType[] = [
  "SOP",
  "RESUME",
  "LOR",
] as const;

export type WebhookDocumentStatus =
  | "GENERATED"
  | "NEEDS_REVIEW"
  | "FAILED"
  | "VALIDATION_FAILED";

export interface GenerateDocumentRequest {
  documentType: DocumentType | string;
  studentId: string;
  templateId?: string;
  externalReferenceId?: string;
  callbackUrl?: string;
  studentData?: unknown;
  metadata?: Record<string, unknown>;
}

export interface GenerateDocumentSuccessResponse {
  success: true;
  documentId: string;
  studentId: string;
  documentType: DocumentType;
  status: WebhookDocumentStatus;
  reviewUrl: string;
  templateId?: string;
  createdAt: string;
  warnings?: string[];
  externalReferenceId?: string;
}

export type WebhookErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "STUDENT_NOT_FOUND"
  | "UNSUPPORTED_DOCUMENT_TYPE"
  | "TEMPLATE_NOT_FOUND"
  | "VALIDATION_FAILED"
  | "GENERATION_FAILED"
  | "INTERNAL_ERROR";

export interface WebhookErrorResponse {
  success: false;
  code: WebhookErrorCode;
  message: string;
  details?: unknown;
}

export type GenerateDocumentResponse =
  | GenerateDocumentSuccessResponse
  | WebhookErrorResponse;

export interface DocumentRecord {
  id: string; // e.g. DOC-xyz123
  externalReferenceId?: string;
  studentId: string;
  studentName: string;
  documentType: DocumentType;
  templateId: string;
  status: WebhookDocumentStatus;
  reviewUrl: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  sectionContents: Record<string, string>;
  sectionStatuses: Record<string, ReviewStatus>;
  validationIssues: ValidationIssue[];
  normalizedProfile: NormalizedStudentProfile;
  sopContext?: StudentDocumentContext;
  metadata?: Record<string, unknown>;
}
