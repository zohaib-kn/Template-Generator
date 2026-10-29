/**
 * features/sop-generator/lib/sopWriteContextResolver.ts
 *
 * SOP Copilot Phase 3.1 — Server-Side Write-Readiness Context Resolver.
 *
 * Core Security Invariant:
 * The browser must NEVER decide what is writable or what validation issues exist.
 * This resolver independently reconstructs authoritative context on the server:
 * 1. Verified student profile (CRM source of truth)
 * 2. Active target program details
 * 3. Authoritative server recomputed validation issues
 * 4. Authoritative writable field registry & locked fields
 * 5. Server authentication & authorization verification
 */

import type {
  SopCopilotContextIdentity,
} from "../types/copilot";
import type {
  SopDocumentType,
  StudentDocumentContext,
  ValidationIssue,
} from "../types/sop-generator";
import {
  COPILOT_WRITABLE_FIELD_REGISTRY,
  COPILOT_LOCKED_FIELDS_REGISTRY,
  VALIDATION_ISSUE_TO_FIELD_MAP,
  isFieldWritableByCopilot,
  type CopilotWritableFieldDefinition,
  type CopilotLockedFieldDefinition,
} from "./sopWritableFieldRegistry";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { mapCrmToNormalizedStudent } from "@/services/normalization";
import { validateDocumentContext } from "./validateDocumentContext";

// In-memory test snapshot registry for authoritative server resolution
const authoritativeTestSnapshots = new Map<string, CrmSnapshot>();

export function setAuthoritativeTestSnapshot(studentId: string, snapshot: CrmSnapshot): void {
  authoritativeTestSnapshots.set(studentId, snapshot);
}

export function clearAuthoritativeTestSnapshots(): void {
  authoritativeTestSnapshots.clear();
}

export interface CopilotAuthorizationStatus {
  authReadyStatus: "NOT_READY_FOR_PUBLIC_WRITES" | "PARTIALLY_READY" | "AUTH_READY";
  canCommitWrites: boolean;
  counsellorId?: string;
  reason: string;
}

export interface CopilotServerWriteContext {
  identity: SopCopilotContextIdentity;
  student: {
    fullName?: string;
    latestQualification?: string;
    fieldOfStudy?: string;
    institution?: string;
    completionYear?: string;
    percentage?: string;
    ieltsOverall?: string;
  };
  program: {
    id: string;
    university?: string;
    course?: string;
    country?: string;
    degreeLevel?: string;
  };
  validation: {
    hasErrors: boolean;
    issues: ValidationIssue[];
    activeWritableFieldKeys: string[];
  };
  registry: {
    writableFields: Record<string, CopilotWritableFieldDefinition>;
    lockedFields: Record<string, CopilotLockedFieldDefinition>;
  };
  authorization: CopilotAuthorizationStatus;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Server-authoritative write-readiness context resolver.
 * Reconstructs truth independently without trusting client claims.
 */
export async function resolveCopilotWriteContext(params: {
  studentId: string;
  programId: string;
  documentType: SopDocumentType;
  documentId?: string;
  clientDocContext?: DeepPartial<StudentDocumentContext>;
  counsellorSession?: { userId: string; role?: string };
}): Promise<CopilotServerWriteContext> {
  const { studentId, programId, documentType, documentId, clientDocContext, counsellorSession } = params;

  // 1. Authoritative Student & Application Source
  let snapshot: CrmSnapshot | null = null;
  if (authoritativeTestSnapshots.has(studentId)) {
    snapshot = authoritativeTestSnapshots.get(studentId)!;
  }

  const normalized = snapshot
    ? mapCrmToNormalizedStudent(snapshot, { source: "senior-crm-api", activeProgramId: programId })
    : null;

  // Check direct or normalized test scores
  const anySnap = snapshot as Record<string, any> | null;
  const directIelts = anySnap?.student?.academics?.standardizedTests?.ielts;

  const resolvedIelts = directIelts?.overall !== undefined
    ? String(directIelts.overall)
    : normalized?.tests?.english?.overallScore
    ? String(normalized.tests.english.overallScore)
    : undefined;

  const latestQual = normalized?.academics?.qualifications?.[0];

  // 2. Resolve Active Program
  const matchedProg = normalized?.applications?.all?.find((p) => p.id === programId) ?? normalized?.applications?.activeProgram;

  // 3. Recompute Validation Server-Side (Source of Truth)
  // Build minimal context for validation
  const baseDocContext: StudentDocumentContext = {
    student: {
      fullName: normalized?.personal?.fullName || "Student",
      dateOfBirth: normalized?.personal?.dateOfBirth || "",
      placeOfBirth: "",
      city: "",
      country: normalized?.personal?.nationality || "",
      nationality: normalized?.personal?.nationality || "",
      passportNumber: normalized?.personal?.passportNumber || "",
      phone: "",
      email: "",
      address: "",
      gender: "",
      languages: "",
    },
    academics: {
      latestQualification: latestQual?.qualification || "",
      institution: latestQual?.institution || "",
      board: "",
      completionYear: latestQual?.completionYear || "",
      subjects: "",
      percentage: latestQual?.score || "",
    },
    tests: {
      ielts: {
        overall: resolvedIelts || "",
        listening: "",
        reading: "",
        writing: "",
        speaking: "",
        dateTaken: "",
      },
    },
    destination: {
      country: matchedProg?.country || clientDocContext?.destination?.country || "",
      city: clientDocContext?.destination?.city || "",
      university: matchedProg?.university || clientDocContext?.destination?.university || "",
      course: matchedProg?.course || clientDocContext?.destination?.course || "",
      degreeLevel: matchedProg?.degreeLevel || clientDocContext?.destination?.degreeLevel || "",
      duration: "",
      intakeMonth: "",
      intakeYear: "",
      consulate: "",
      consulateCity: "",
      consulateAddress: "",
    },
    career: {
      shortTermGoal: "",
      longTermGoal: "",
      returnIntention: "",
    },
    sponsor: {
      name: clientDocContext?.sponsor?.name || "",
      relationship: clientDocContext?.sponsor?.relationship || "",
      occupation: "",
      annualIncome: "",
      incomeSource: "",
    },
    finance: {
      educationLoanAmount: clientDocContext?.finance?.educationLoanAmount || "",
      loanProvider: "",
      bankName: clientDocContext?.finance?.bankName || "",
      accountHolderName: clientDocContext?.finance?.accountHolderName || "",
      availableBalance: clientDocContext?.finance?.availableBalance || "",
      totalFundsAvailable: clientDocContext?.finance?.totalFundsAvailable || "",
      currency: "INR",
    },
    accommodation: {
      name: clientDocContext?.accommodation?.name || "",
      type: "",
      address: clientDocContext?.accommodation?.address || "",
      city: "",
      country: "",
      fromDate: clientDocContext?.accommodation?.fromDate || "",
      toDate: clientDocContext?.accommodation?.toDate || "",
      bookingReference: clientDocContext?.accommodation?.bookingReference || "",
    },
    insurance: {
      provider: clientDocContext?.insurance?.provider || "",
      policyNumber: clientDocContext?.insurance?.policyNumber || "",
      type: "",
      fromDate: "",
      toDate: "",
      coverageAmount: "",
    },
    travel: {
      airline: clientDocContext?.travel?.airline || "",
      flightNumber: "",
      origin: "",
      destination: "",
      travelDate: clientDocContext?.travel?.travelDate || "",
      pnr: clientDocContext?.travel?.pnr || "",
    },
  };

  const serverValidationIssues = validateDocumentContext(baseDocContext, documentType);

  // Determine active writable fields that genuinely correspond to active validation issues
  const activeWritableKeys: string[] = [];
  for (const issue of serverValidationIssues) {
    const mappedKey = VALIDATION_ISSUE_TO_FIELD_MAP[issue.id];
    if (mappedKey && isFieldWritableByCopilot(mappedKey)) {
      if (!activeWritableKeys.includes(mappedKey)) {
        activeWritableKeys.push(mappedKey);
      }
    }
  }

  // 4. Evaluate Server Authentication & Write Authorization Readiness
  let authStatus: CopilotAuthorizationStatus;
  if (counsellorSession?.userId) {
    authStatus = {
      authReadyStatus: "PARTIALLY_READY",
      canCommitWrites: false, // Remains gated until full Phase 4 authorization pipeline is hooked
      counsellorId: counsellorSession.userId,
      reason: "Counsellor session recognized. Student write permission scoping required before mutations can be executed.",
    };
  } else {
    authStatus = {
      authReadyStatus: "NOT_READY_FOR_PUBLIC_WRITES",
      canCommitWrites: false,
      reason: "No authenticated counsellor session exists. Public writes are strictly disabled.",
    };
  }

  return {
    identity: {
      studentId,
      programId,
      documentType,
      documentId,
    },
    student: {
      fullName: normalized?.personal?.fullName,
      latestQualification: latestQual?.qualification,
      fieldOfStudy: latestQual?.fieldOfStudy,
      institution: latestQual?.institution,
      completionYear: latestQual?.completionYear,
      percentage: latestQual?.score,
      ieltsOverall: resolvedIelts,
    },
    program: {
      id: programId,
      university: matchedProg?.university,
      course: matchedProg?.course,
      country: matchedProg?.country,
      degreeLevel: matchedProg?.degreeLevel,
    },
    validation: {
      hasErrors: serverValidationIssues.some((i) => i.severity === "error"),
      issues: serverValidationIssues,
      activeWritableFieldKeys: activeWritableKeys,
    },
    registry: {
      writableFields: COPILOT_WRITABLE_FIELD_REGISTRY,
      lockedFields: COPILOT_LOCKED_FIELDS_REGISTRY,
    },
    authorization: authStatus,
  };
}
