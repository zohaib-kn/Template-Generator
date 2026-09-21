/**
 * services/webhook/normalizeRequest.ts
 *
 * Normalizes an incoming webhook request into a unified NormalizedStudentProfile.
 * Selects Mode A (inline payload) or Mode B (CRM API fetch) dynamically.
 */

import type { GenerateDocumentRequest } from "./types";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import {
  InlineStudentDataProvider,
  CrmApiStudentDataProvider,
  type StudentDataProvider,
} from "./studentDataProvider";
import { mapCrmToNormalizedStudent } from "@/services/normalization/mapCrmToNormalizedStudent";

export async function resolveStudentProfile(
  req: GenerateDocumentRequest
): Promise<NormalizedStudentProfile> {
  const provider: StudentDataProvider = req.studentData
    ? new InlineStudentDataProvider(req.studentData)
    : new CrmApiStudentDataProvider();

  const snapshot = await provider.getStudent(req.studentId);

  return mapCrmToNormalizedStudent(snapshot, {
    source: req.studentData ? "static-mock" : "senior-crm-api",
  });
}
