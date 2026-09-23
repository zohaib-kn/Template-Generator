/**
 * features/document-generator/types/import.ts
 *
 * Domain types for Resume Document Import and Interactive Review.
 */

import type { DocumentData } from "@/types";

export type ImportStatus =
  | "IDLE"
  | "UPLOADING"
  | "PROCESSING"
  | "NEEDS_REVIEW"
  | "APPLIED"
  | "FAILED";

export interface AmbiguousItem {
  id: string;
  originalText: string;
  suggestedSection: keyof DocumentData;
  candidateSections: (keyof DocumentData)[];
  reason: string;
}

export interface CrmConflictItem {
  field: string;
  label: string;
  crmValue: string;
  uploadedValue: string;
  resolution: "USE_CRM" | "USE_UPLOADED" | "CUSTOM";
  customValue?: string;
}

export interface DetectedSectionSummary {
  sectionKey: keyof DocumentData;
  title: string;
  itemCount: number;
  status: "DETECTED" | "NEEDS_REVIEW" | "NOT_FOUND" | "CONFLICT";
}

export interface ResumeImportResult {
  importId: string;
  fileName: string;
  fileSizeBytes: number;
  extractedAt: string;
  status: ImportStatus;
  data: DocumentData;
  sectionsSummary: DetectedSectionSummary[];
  ambiguousItems: AmbiguousItem[];
  crmConflicts: CrmConflictItem[];
  unmappedSnippets: string[];
  gridfsFileId?: string;
  errorMessage?: string;
}
