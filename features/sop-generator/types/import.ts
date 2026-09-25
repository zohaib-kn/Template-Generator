/**
 * features/sop-generator/types/import.ts
 *
 * Domain types for SOP Document Import, Paragraph Classification,
 * and Interactive Review Workstation.
 */

import type { StudentDocumentContext } from "./sop-generator";

export type SopImportStatus =
  | "IDLE"
  | "UPLOADING"
  | "PROCESSING"
  | "NEEDS_REVIEW"
  | "APPLIED"
  | "FAILED";

export interface SopParagraphBlock {
  id: string;
  originalText: string;
  assignedSectionId: string;
  isAmbiguous: boolean;
  candidateSections: string[];
  reason?: string;
  sourceIndex: number;
}

export interface SopCrmConflictItem {
  field: string;
  label: string;
  crmValue: string;
  uploadedValue: string;
  resolution: "USE_CRM" | "USE_UPLOADED" | "CUSTOM";
  customValue?: string;
}

export interface SopSectionSummary {
  sectionId: string;
  title: string;
  paragraphCount: number;
  status: "DETECTED" | "AMBIGUOUS" | "NOT_FOUND" | "CONFLICT";
  paragraphs: SopParagraphBlock[];
}

export interface ExtractedSopFacts {
  fullName?: string;
  nationality?: string;
  passportNumber?: string;
  qualification?: string;
  institution?: string;
  board?: string;
  completionYear?: string;
  percentage?: string;
  ieltsScore?: string;
  ieltsListening?: string;
  ieltsReading?: string;
  ieltsWriting?: string;
  ieltsSpeaking?: string;
  targetUniversity?: string;
  targetCourse?: string;
  sponsorName?: string;
  sponsorRelationship?: string;
  sponsorOccupation?: string;
  educationLoanAmount?: string;
  bankName?: string;
}

export interface SopImportResult {
  importId: string;
  fileName: string;
  fileSizeBytes: number;
  extractedAt: string;
  status: SopImportStatus;
  studentId?: string;
  studentName: string;
  rawTextSnippet?: string;
  sectionContents: Record<string, string>;
  sectionsSummary: SopSectionSummary[];
  ambiguousItems: SopParagraphBlock[];
  unmappedParagraphs: SopParagraphBlock[];
  crmConflicts: SopCrmConflictItem[];
  extractedFacts: ExtractedSopFacts;
  gridfsFileId?: string;
  errorMessage?: string;
}
