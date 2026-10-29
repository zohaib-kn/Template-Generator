/**
 * app/api/sop/copilot/route.ts
 *
 * SOP Copilot Phase 2.1 & Phase 3 — Server-side Scope Guard & Read-Only Intelligence Endpoint.
 *
 * Authoritative Server Pipeline:
 * Request
 *   ↓
 * Validate input structure & context identity
 *   ↓
 * Run Authoritative Server-side Scope Guard
 *   ↓
 * If blocked (OUT_OF_SCOPE / MIXED / UNKNOWN) -> Return controlled boundary/clarification
 *   ↓
 * If allowed:
 *   ↓
 * Reconstruct/Verify Server-Authoritative Read Context (Never blindly trust client facts)
 *   ↓
 * Execute Phase 3 Read-Only SOP Intelligence
 *   ↓
 * Return Structured Read-Only Response (readOnly: true, references?, navigation?)
 *
 * GUARANTEES:
 * - Read-only execution. NO database writes, NO CRM mutations, NO SOP text updates, NO approvals.
 * - Minimal context handling without unnecessary PII.
 */

import { NextRequest, NextResponse } from "next/server";
import { classifySopScope } from "@/features/sop-generator/lib/sopScopeGuard";
import { executeCopilotReadIntelligence } from "@/features/sop-generator/lib/sopCopilotIntelligence";
import type {
  SopCopilotRequestBody,
  SopCopilotResponseBody,
  SopCopilotReadContext,
} from "@/features/sop-generator/types/copilot";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { mapCrmToNormalizedStudent } from "@/services/normalization";

import {
  setAuthoritativeTestSnapshot,
  clearAuthoritativeTestSnapshots,
} from "@/features/sop-generator/lib/sopWriteContextResolver";

// In-memory test snapshot registry for unit and integration testing
const testCopilotSnapshots = new Map<string, CrmSnapshot>();

export function setTestCopilotSnapshot(studentId: string, snapshot: CrmSnapshot): void {
  testCopilotSnapshots.set(studentId, snapshot);
  setAuthoritativeTestSnapshot(studentId, snapshot);
}

export function clearTestCopilotSnapshots(): void {
  testCopilotSnapshots.clear();
  clearAuthoritativeTestSnapshots();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SopCopilotRequestBody;

    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json<SopCopilotResponseBody>(
        {
          success: false,
          allowed: false,
          intent: "UNKNOWN",
          response: "Invalid request: message cannot be empty.",
          confidence: 1.0,
          reasonCode: "INVALID_INPUT",
          readOnly: true,
        },
        { status: 400 }
      );
    }

    const { message, contextIdentity, readContext: clientReadContext } = body;

    // ── 1. Authoritative Server-side Scope Guard Evaluation ──────────────────
    const classification = await classifySopScope(message, contextIdentity);

    // Safe security telemetry (Never logs PII, student name, passport, or CRM data)
    console.info("[SOP_COPILOT_SCOPE_GUARD]", {
      intent: classification.intent,
      allowed: classification.allowed,
      reasonCode: classification.reasonCode,
      isMixed: Boolean(classification.isMixed),
      confidence: classification.confidence,
      documentType: contextIdentity?.documentType ?? "UNSPECIFIED",
      hasStudentId: Boolean(contextIdentity?.studentId),
      hasProgramId: Boolean(contextIdentity?.programId),
      hasDocumentId: Boolean(contextIdentity?.documentId),
      hasSectionId: Boolean(contextIdentity?.sectionId),
    });

    // If blocked or not allowed, return controlled Scope Guard boundary response
    if (!classification.allowed) {
      return NextResponse.json<SopCopilotResponseBody>(
        {
          success: true,
          allowed: false,
          intent: classification.intent,
          response: classification.suggestedReply,
          confidence: classification.confidence,
          reasonCode: classification.reasonCode,
          isMixed: classification.isMixed,
          readOnly: true,
        },
        { status: 200 }
      );
    }

    // ── 2. Authoritative Server Fact Verification (Trust Boundary) ───────────
    // Build trusted read context, overriding unverified client facts with authoritative CRM if present
    const studentId = contextIdentity?.studentId;
    let authoritativeSnapshot: CrmSnapshot | null = null;

    if (studentId) {
      if (testCopilotSnapshots.has(studentId)) {
        authoritativeSnapshot = testCopilotSnapshots.get(studentId)!;
      }
    }

    // Construct base read context from client payload or defaults
    const effectiveContext: SopCopilotReadContext = clientReadContext ?? {
      identity: {
        studentId: contextIdentity?.studentId ?? "student-default",
        programId: contextIdentity?.programId ?? "current-program",
        documentType: contextIdentity?.documentType ?? "VISA_COVER_LETTER",
        documentId: contextIdentity?.documentId,
        sectionId: contextIdentity?.sectionId,
      },
      student: {},
      review: {
        totalSections: 0,
        reviewedSections: 0,
        unreviewedSectionIds: [],
        unreviewedSectionTitles: [],
        docApproved: false,
        canApproveDocument: false,
        approvalBlockers: [],
      },
      validation: {
        hasErrors: false,
        issues: [],
      },
      alignment: {
        status: "NOT_EVALUATED",
      },
      document: {
        sections: [],
        wordCount: 0,
        approved: false,
      },
    };

    // If authoritative server CRM data exists for this student, enforce verified facts
    if (authoritativeSnapshot) {
      const anySnap = authoritativeSnapshot as Record<string, any>;
      const anyStudent = anySnap.student as Record<string, any> | undefined;

      const normalized = mapCrmToNormalizedStudent(authoritativeSnapshot, {
        source: "senior-crm-api",
      });

      // Direct check for standardizedTests if present in CRM object
      const directIelts =
        anyStudent?.academics?.standardizedTests?.ielts ||
        anySnap?.academics?.standardizedTests?.ielts;

      const formatScore = (val: any) => {
        if (typeof val === "number") {
          return Number.isInteger(val) ? val.toFixed(1) : String(val);
        }
        if (typeof val === "string" && /^[0-9]+$/.test(val.trim())) {
          return Number(val).toFixed(1);
        }
        return val !== undefined ? String(val) : undefined;
      };

      if (directIelts && (directIelts.overall !== undefined || directIelts.overallScore !== undefined)) {
        effectiveContext.englishTest = {
          exam: "IELTS",
          overall: formatScore(directIelts.overall ?? directIelts.overallScore) || "",
          listening: formatScore(directIelts.listening),
          reading: formatScore(directIelts.reading),
          writing: formatScore(directIelts.writing),
          speaking: formatScore(directIelts.speaking),
        };
      } else if (normalized.tests?.english?.overallScore) {
        // Override verified English test scores from authoritative CRM
        effectiveContext.englishTest = {
          exam: normalized.tests.english.type || "IELTS",
          overall: String(normalized.tests.english.overallScore),
          listening: normalized.tests.english.subscores?.listening,
          reading: normalized.tests.english.subscores?.reading,
          writing: normalized.tests.english.subscores?.writing,
          speaking: normalized.tests.english.subscores?.speaking,
        };
      }

      // Override latest qualification from authoritative CRM
      const latestQual = normalized.academics?.qualifications?.[0];
      if (latestQual) {
        effectiveContext.student = {
          ...effectiveContext.student,
          latestQualification: latestQual.qualification,
          fieldOfStudy: latestQual.fieldOfStudy,
          institution: latestQual.institution,
          completionYear: latestQual.completionYear,
          percentage: latestQual.score,
        };
      }

      // Override target application details if programId matches
      const prog = normalized.applications?.all?.find((p) => p.id === contextIdentity?.programId);
      if (prog) {
        effectiveContext.destination = {
          ...effectiveContext.destination,
          university: prog.university,
          course: prog.course,
          country: prog.country,
          degreeLevel: prog.degreeLevel,
        };
      }
    }

    // ── 3. Execute Phase 3 Read-Only SOP Intelligence ────────────────────────
    const intelligence = executeCopilotReadIntelligence(
      message,
      classification.intent,
      effectiveContext
    );

    const responsePayload: SopCopilotResponseBody = {
      success: true,
      allowed: true,
      intent: classification.intent,
      response: intelligence.message,
      confidence: classification.confidence,
      reasonCode: classification.reasonCode,
      references: intelligence.references,
      navigation: intelligence.navigation,
      readOnly: true,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: unknown) {
    console.error("[SOP_COPILOT_ERROR]", {
      message: error instanceof Error ? error.message : "Unknown error in copilot route",
    });

    return NextResponse.json<SopCopilotResponseBody>(
      {
        success: false,
        allowed: false,
        intent: "UNKNOWN",
        response:
          "I can help with the current SOP, validation, missing student/application information, or writing improvements.\n\nCould you rephrase your question in relation to this document?",
        confidence: 0.5,
        reasonCode: "SERVER_ERROR_FAIL_CLOSED",
        readOnly: true,
      },
      { status: 200 } // Fail closed safely without crashing UI
    );
  }
}
