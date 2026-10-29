/**
 * features/sop-generator/types/copilot.ts
 *
 * Domain types for SOP Copilot Phase 2.1 & Phase 3:
 * - Strict SOP-Only Scope Guard
 * - Session Boundary Scoping with documentId
 * - Read-Only SOP Intelligence Data Contracts
 */

import type { SopDocumentType, ReviewStatus } from "./sop-generator";

/**
 * Strict Allowed and Blocked Copilot Intent Model.
 */
export type SopCopilotIntent =
  | "REVIEW"
  | "COMPLETE_MISSING_INFO"
  | "EXPLAIN"
  | "IMPROVE_WRITING"
  | "NAVIGATE"
  | "OUT_OF_SCOPE"
  | "UNKNOWN";

/**
 * Context Identity representing the current document session.
 * Used for session boundary scoping and context isolation.
 */
export interface SopCopilotContextIdentity {
  studentId: string;
  programId: string;
  documentType: SopDocumentType;
  documentId?: string;
  sectionId?: string;
}

/**
 * Computes a strong session boundary key including documentId / draftId.
 * Format: `${studentId}::${programId}::${documentType}::${documentId ?? "unsaved"}`
 * Optionally includes documentInstanceId to disambiguate separate document instances.
 */
export function computeSessionBoundaryKey(
  identity: SopCopilotContextIdentity,
  documentInstanceId?: string
): string {
  const docId = identity.documentId?.trim() || "unsaved";
  const instancePart = documentInstanceId?.trim() ? `::${documentInstanceId.trim()}` : "";
  return `${identity.studentId}::${identity.programId}::${identity.documentType}::${docId}${instancePart}`;
}

/**
 * Evaluates whether a boundary key transition represents the exact same document
 * instance being persisted (e.g. unsaved -> saved) versus opening an existing different draft.
 */
export function isSameDocumentSessionTransition(
  prevBoundary: string,
  currBoundary: string
): boolean {
  if (prevBoundary === currBoundary) return true;

  const prevParts = prevBoundary.split("::");
  const currParts = currBoundary.split("::");

  const [prevStudent, prevProg, prevDocType, prevDocId, prevInst] = prevParts;
  const [currStudent, currProg, currDocType, currDocId, currInst] = currParts;

  // Student, program, or docType change always resets
  if (prevStudent !== currStudent || prevProg !== currProg || prevDocType !== currDocType) {
    return false;
  }

  // If instance IDs are tracked and differ, they are different documents -> reset
  if (prevInst && currInst && prevInst !== currInst) {
    return false;
  }

  // Unsaved -> saved draft transition for the same instance
  if (prevDocId === "unsaved" && currDocId !== "unsaved") {
    return true;
  }

  return false;
}

/**
 * Minimal server-safe Read Context Packet for Phase 3 Read-Only Intelligence.
 * Excludes unnecessary PII (no passport number, DOB, phone, email, home address).
 */
export interface SopCopilotReadContext {
  identity: SopCopilotContextIdentity;

  student: {
    fullName?: string;
    latestQualification?: string;
    fieldOfStudy?: string;
    institution?: string;
    completionYear?: string;
    percentage?: string;
  };

  englishTest?: {
    exam?: string;
    overall?: string;
    listening?: string;
    reading?: string;
    writing?: string;
    speaking?: string;
  };

  destination?: {
    country?: string;
    city?: string;
    university?: string;
    course?: string;
    degreeLevel?: string;
    intake?: string;
  };

  review: {
    totalSections: number;
    reviewedSections: number;
    unreviewedSectionIds: string[];
    unreviewedSectionTitles: string[];
    currentSectionId?: string;
    currentSectionTitle?: string;
    docApproved: boolean;
    canApproveDocument: boolean;
    approvalBlockers: string[];
  };

  validation: {
    hasErrors: boolean;
    issues: Array<{
      id: string;
      field?: string;
      severity: "error" | "warning" | "info";
      message: string;
    }>;
  };

  alignment: {
    status: string;
    domain?: string;
    targetDomain?: string;
    generationAllowed?: boolean;
    blockingReason?: string;
    reasonSummary?: string;
    isStale?: boolean;
    intentionalTransitionConfirmed?: boolean;
  };

  document: {
    sections: Array<{
      id: string;
      title: string;
      content: string;
      status: ReviewStatus;
      required: boolean;
    }>;
    wordCount: number;
    approved: boolean;
  };
}

/**
 * Navigation directive returned when Copilot resolves a section request.
 */
export interface SopCopilotNavigationDirective {
  sectionId: string;
  sectionTitle: string;
}

/**
 * Standard structured result returned by the Scope Guard classifier.
 */
export interface ScopeGuardResult {
  allowed: boolean;
  intent: SopCopilotIntent;
  confidence: number;
  reasonCode: string;
  isMixed?: boolean;
  suggestedReply: string;
}

/**
 * Standard API Request payload for POST /api/sop/copilot.
 */
export interface SopCopilotRequestBody {
  message: string;
  contextIdentity?: SopCopilotContextIdentity;
  readContext?: SopCopilotReadContext;
}

/**
 * Standard API Response payload for POST /api/sop/copilot.
 */
export interface SopCopilotResponseBody {
  success: boolean;
  allowed: boolean;
  intent: SopCopilotIntent;
  response: string;
  confidence: number;
  reasonCode: string;
  isMixed?: boolean;
  references?: {
    sectionIds?: string[];
    validationIssueIds?: string[];
  };
  navigation?: SopCopilotNavigationDirective;
  readOnly: true;
  error?: string;
}
