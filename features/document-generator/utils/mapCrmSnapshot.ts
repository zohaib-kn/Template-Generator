/**
 * utils/mapCrmSnapshot.ts
 *
 * Backward-compatible adapter entry point for Resume Generator.
 *
 * Pipelines raw CrmSnapshot through the Unified Normalization Layer:
 *   CrmSnapshot → NormalizedStudentProfile → DocumentData + ApplicationTarget
 */

import type { DocumentData } from "@/types";
import type { ApplicationTarget } from "../guidance/types";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { mapCrmToNormalizedStudent } from "@/services/normalization/mapCrmToNormalizedStudent";
import { mapNormalizedToResume } from "@/services/normalization/mapNormalizedToResume";

export interface CrmMapResult {
  /** Fully mapped DocumentData ready to load into Resume Builder state. */
  student: DocumentData;
  /** Derived ApplicationTarget for auto-populating the Suggestions panel. */
  target: Partial<ApplicationTarget>;
}

/**
 * Main adapter function.
 *
 * @param snapshot  The raw JSON returned by the CRM data-snapshot API.
 * @returns         { student: DocumentData, target: Partial<ApplicationTarget> }
 */
export function mapCrmSnapshot(snapshot: CrmSnapshot): CrmMapResult {
  const normalized = mapCrmToNormalizedStudent(snapshot);
  return mapNormalizedToResume(normalized);
}
