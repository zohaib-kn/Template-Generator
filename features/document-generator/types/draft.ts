/**
 * features/document-generator/types/draft.ts
 *
 * Types for persisted Resume Builder drafts.
 */

import type { DocumentData } from "@/types";
import type { ApplicationTarget } from "../guidance/types";

export interface ResumeDraftRecord {
  id: string;
  studentName: string;
  targetUniversity?: string;
  intendedCourse?: string;
  destinationCountry?: string;
  savedAt: string; // ISO string
  data: DocumentData;
  applicationTarget?: ApplicationTarget;
  origin?: "MANUAL" | "CRM" | "IMPORTED";
  sourceFileName?: string;
  importId?: string;
  dbId?: string;
  /**
   * CRM student _id (e.g. "6a508a96af13bb33e9fc07ce").
   * Optional — absent in drafts saved before Phase 0.
   * Required by the academic alignment engine to retrieve program-scoped
   * evidence server-side. Old drafts without this field remain fully
   * usable in the Resume Builder but are not promoted as authoritative
   * alignment evidence.
   */
  studentId?: string;
  /**
   * NormalizedAppliedProgram.id for the target application at save time.
   * Optional — absent in drafts saved before Phase 0.
   * Together with studentId, scopes evidence to a specific program so a
   * Business Analytics resume draft is never used as evidence for a
   * Mechanical Engineering SOP.
   */
  programId?: string;
}

