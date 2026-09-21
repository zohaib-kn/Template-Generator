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
}
