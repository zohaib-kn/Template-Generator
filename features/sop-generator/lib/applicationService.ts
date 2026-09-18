/**
 * SOP Application Service
 *
 * Single access point for all SOP application data.
 * UI components must NOT import mock data files directly.
 *
 * Phase 1: all functions return mock / local data.
 * Phase 2+: replace function bodies with real API calls.
 *           The function signatures do not change — zero component updates needed.
 */

import type { SopTemplate } from "../types/sop-generator";
import type { StudentDocumentContext } from "../types/sop-generator";
import { buildStudentDocumentContext } from "./buildStudentDocumentContext";
import { italyTypeDCoverLetter } from "../templates/italy-type-d-cover-letter";

// ---------------------------------------------------------------------------
// Application record
// ---------------------------------------------------------------------------

export interface ApplicationRecord {
  id: string;
  studentName: string;
  templateId: string;
  status: "draft" | "in_review" | "approved";
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns the current application record.
 * Phase 1: mock data.
 */
export function getApplication(): ApplicationRecord {
  return {
    id: "app-2026-aafia-italy-001",
    studentName: "Aafia Ameen",
    templateId: "italy-type-d-student-visa-cover-letter",
    status: "draft",
    createdAt: "2026-09-17T00:00:00Z",
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/**
 * Returns the SOP template for the given template ID.
 * Phase 1: only supports "italy-type-d-student-visa-cover-letter".
 */
export function getTemplate(
  templateId: string = "italy-type-d-student-visa-cover-letter"
): SopTemplate {
  if (templateId === "italy-type-d-student-visa-cover-letter") {
    return italyTypeDCoverLetter;
  }
  throw new Error(`Unknown template ID: ${templateId}`);
}

// ---------------------------------------------------------------------------
// Student document context
// ---------------------------------------------------------------------------

/**
 * Returns the normalised StudentDocumentContext for the current application.
 * Phase 1: calls `buildStudentDocumentContext()` which reads from mock data.
 */
export function getStudentDocumentContext(): StudentDocumentContext {
  return buildStudentDocumentContext();
}
