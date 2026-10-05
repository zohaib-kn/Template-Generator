/**
 * app/api/sop/generate/route.ts
 *
 * Authoritative Server-Side AI Narrative Generator for SOP & Visa Cover Letter sections.
 *
 * Implements Phase 6 Server-Side Authority Architecture:
 * - Authoritative validation of academic alignment prior to calling Google Gemini.
 * - Recomputes alignment server-side for sensitive sections (isSensitiveSection).
 * - Enforces trust boundary: untrusted client-supplied academics/qualifications are discarded
 *   when authoritative CRM snapshot is available.
 * - Program-scoped evidence retrieval: only reviewed Resume drafts for the specific
 *   (studentId, programId) pair are promoted into the safe evidence packet.
 * - Stale resolution detection: flags when target course has changed since confirmation.
 * - Hard blocking with HTTP 403 (ACADEMIC_MISMATCH_UNRESOLVED) when alignment is not allowed.
 *   Gemini is NEVER invoked on unresolved mismatch or indeterminate alignment.
 * - Injects safe evidence packet into Gemini prompt via buildNaturalStudentPrompt.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  StudentDocumentContext,
  SopDocumentType,
} from "@/features/sop-generator/types/sop-generator";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import type {
  NormalizedQualification,
  NormalizedAppliedProgram,
  NormalizedWorkExperience,
} from "@/types";
import { buildNaturalStudentPrompt } from "@/services/ai/prompts/studentVoiceGuidelines";
import {
  isSensitiveSection,
  computeAcademicAlignment,
  isGenerationAllowed,
} from "@/services/academicAlignment/academicAlignmentEngine";
import { CrmApiStudentDataProvider } from "@/services/webhook/studentDataProvider";
import { mapCrmToNormalizedStudent } from "@/services/normalization";
import { connectToDatabase } from "@/lib/db";
import {
  AcademicAlignmentResolutionModel,
  type AcademicAlignmentResolutionRecord,
} from "@/models/AcademicAlignmentResolution";
import { ResumeDraftModel } from "@/models/ResumeDraft";
import type { ResumeDraftRecord } from "@/features/document-generator/types/draft";

// ---------------------------------------------------------------------------
// Types & Request Contract
// ---------------------------------------------------------------------------

export interface GenerateSectionRequest {
  studentId?: string;
  programId?: string;
  sectionId: string;
  sectionTitle: string;
  context: StudentDocumentContext;
  currentContent?: string;
  mode?: "generate" | "rewrite-natural";
  documentType?: SopDocumentType;
}

// Fast Flash models cascade
const FAST_FLASH_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Test Isolation Stores & Helpers
// ---------------------------------------------------------------------------

function isTestEnvironment(): boolean {
  if (process.env.FORCE_MONGO === "true") return false;
  return (
    process.env.NODE_ENV === "test" ||
    process.argv.some(
      (arg) =>
        arg.includes("--test") ||
        arg.includes("__tests__") ||
        arg.includes(".test.ts") ||
        arg.includes(".test.js")
    ) ||
    process.execArgv.some((arg) => arg.includes("--test"))
  );
}

const testResolutions = new Map<string, AcademicAlignmentResolutionRecord>();
const testResumeDrafts: ResumeDraftRecord[] = [];
const testStudentSnapshots = new Map<string, CrmSnapshot>();
let lastGeneratedPrompt: string | null = null;

export function getLastGeneratedPrompt(): string | null {
  return lastGeneratedPrompt;
}

export function setTestResolution(record: AcademicAlignmentResolutionRecord): void {
  testResolutions.set(`${record.studentId}::${record.programId}`, record);
}

export function setTestResumeDraft(draft: ResumeDraftRecord): void {
  testResumeDrafts.push(draft);
}

export function setTestStudentSnapshot(studentId: string, snapshot: CrmSnapshot): void {
  testStudentSnapshots.set(studentId, snapshot);
}

export function clearTestStore(): void {
  testResolutions.clear();
  testResumeDrafts.length = 0;
  testStudentSnapshots.clear();
  lastGeneratedPrompt = null;
}

// ---------------------------------------------------------------------------
// POST Handler: /api/sop/generate
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: GenerateSectionRequest;
  try {
    body = (await req.json()) as GenerateSectionRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON request body.",
        },
      },
      { status: 400 }
    );
  }

  const {
    studentId,
    programId,
    sectionId,
    sectionTitle,
    context,
    currentContent,
    mode = "generate",
    documentType = "VISA_COVER_LETTER",
  } = body;

  if (!sectionId || !context) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELDS",
          message: "Missing required fields: sectionId and context.",
        },
      },
      { status: 400 }
    );
  }

  // ── Step 1: Check Section Sensitivity ──────────────────────────────────────
  const sensitive = isSensitiveSection(sectionId, documentType);

  let qualifications: NormalizedQualification[] = [];
  let workExperience: NormalizedWorkExperience[] | undefined;
  let targetProgram: NormalizedAppliedProgram | null = null;
  let safeEvidencePacket = undefined;

  // ── Step 2: Authoritative Student Background & Target Course Resolution ───
  if (studentId) {
    try {
      let snapshot: CrmSnapshot | null = null;
      if (isTestEnvironment() && testStudentSnapshots.has(studentId)) {
        snapshot = testStudentSnapshots.get(studentId)!;
      } else {
        const crmProvider = new CrmApiStudentDataProvider();
        snapshot = await crmProvider.getStudent(studentId);
      }

      if (snapshot) {
        const crmProfile = mapCrmToNormalizedStudent(snapshot, { source: "senior-crm-api" });
        qualifications = crmProfile.academics?.qualifications || [];
        workExperience = crmProfile.workExperience;

        if (programId && crmProfile.applications?.all) {
          targetProgram = crmProfile.applications.all.find((p) => p.id === programId) || null;
        }
        if (!targetProgram && !context.destination?.course && crmProfile.applications?.activeProgram) {
          targetProgram = crmProfile.applications.activeProgram;
        }
      }
    } catch {
      // In case of non-CRM or unresolvable student, qualifications will fall back below
    }
  }

  // Fallback to client context only if qualifications were not resolved from authoritative CRM
  if (qualifications.length === 0) {
    qualifications = [
      {
        id: "fallback-qual-1",
        levelOfStudy: "Undergraduate",
        qualification: context.academics?.latestQualification || "Undergraduate",
        fieldOfStudy: context.academics?.subjects || context.academics?.latestQualification || "",
        institution: context.academics?.institution || "",
        score: context.academics?.percentage || "",
      },
    ];
  }

  // Resolve target program from client context if not resolved from CRM applications
  if (!targetProgram) {
    targetProgram = {
      id: programId || "target-program",
      university: context.destination?.university || "Target University",
      course: context.destination?.course || "",
      country: context.destination?.country || "Target Country",
      degreeLevel: context.destination?.degreeLevel || "Master's",
      courseCategory: "Other",
    };
  }

  const effectiveProgramId = programId?.trim() || targetProgram.id;

  // ── Step 3: Guard Academically Sensitive Sections ──────────────────────────
  if (sensitive) {
    let storedResolution: AcademicAlignmentResolutionRecord | null = null;
    let storedResumeDraft: ResumeDraftRecord | null = null;

    if (isTestEnvironment()) {
      if (studentId) {
        storedResolution = testResolutions.get(`${studentId}::${effectiveProgramId}`) || null;

        // Primary: exactly matches studentId AND programId
        storedResumeDraft =
          testResumeDrafts.find(
            (d) => d.studentId === studentId && d.programId === effectiveProgramId
          ) || null;

        // Fallback: match pre-Phase-0 draft without programId (only if no programId set on draft)
        if (!storedResumeDraft) {
          storedResumeDraft =
            testResumeDrafts.find(
              (d) => d.studentId === studentId && (!d.programId || d.programId === "")
            ) || null;
        }
      }
    } else {
      if (studentId) {
        try {
          await connectToDatabase();
          const foundRes = await AcademicAlignmentResolutionModel.findOne({
            studentId,
            programId: effectiveProgramId,
          }).lean();
          if (foundRes) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resObj = (foundRes as any).toObject ? (foundRes as any).toObject() : foundRes;
            delete resObj._id;
            storedResolution = resObj as AcademicAlignmentResolutionRecord;
          }

          let foundDraft = await ResumeDraftModel.findOne({
            studentId,
            programId: effectiveProgramId,
          })
            .sort({ savedAt: -1 })
            .lean();

          if (!foundDraft) {
            foundDraft = await ResumeDraftModel.findOne({
              studentId,
              programId: { $exists: false },
            })
              .sort({ savedAt: -1 })
              .lean();
          }

          if (foundDraft) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const draftObj = (foundDraft as any).toObject ? (foundDraft as any).toObject() : foundDraft;
            delete draftObj._id;
            storedResumeDraft = draftObj as ResumeDraftRecord;
          }
        } catch (dbErr) {
          console.warn("[SOP Generate API] MongoDB retrieval warning:", dbErr);
        }
      }
    }

    // Step 4: Extract Verified Evidence from Program-Scoped Resume Draft
    type DraftItem = Record<string, string | undefined>;
    const draftData = storedResumeDraft?.data as Record<string, unknown> | undefined;
    const certifications = ((draftData?.certifications as DraftItem[]) || []).map((c) => ({
      id: c.id || `cert-${Math.random()}`,
      name: c.name || c.title || "",
      issuer: c.issuer || c.organisation || c.provider || "",
    }));
    const academicProjects = ((draftData?.academicProjects as DraftItem[]) || []).map((p) => ({
      id: p.id || `proj-${Math.random()}`,
      title: p.title || "",
      description: p.description || "",
    }));
    const skills = ((draftData?.skills as DraftItem[]) || []).map((s) => ({
      id: s.id || `skill-${Math.random()}`,
      name: s.name || (s as { skill?: string }).skill || "",
    }));
    const internships = ((draftData?.internships as DraftItem[]) || []).map((i) => ({
      id: i.id || `intern-${Math.random()}`,
      role: i.role || "",
      organization: i.company || i.organisation || "",
      description: i.description || "",
    }));

    // Step 5: Check Stale Resolution
    let isStale = false;
    let staleReason: string | undefined;

    if (storedResolution && storedResolution.resolution === "INTENTIONAL_CONFIRMED") {
      const cleanCurrentCourse = (targetProgram.course || "").trim().toLowerCase();
      const storedCourse = (storedResolution.targetCourseSnapshot || "").trim().toLowerCase();

      if (
        cleanCurrentCourse &&
        cleanCurrentCourse !== "unknown target course" &&
        storedCourse &&
        storedCourse !== cleanCurrentCourse
      ) {
        isStale = true;
        staleReason = `Resolution was confirmed for "${storedResolution.targetCourseSnapshot}", but target course is now "${targetProgram.course}".`;
      }
    }

    // Step 6: Pure Recomputation of Academic Alignment
    const transitionContext =
      storedResolution?.resolution === "INTENTIONAL_CONFIRMED" && !isStale
        ? storedResolution.transitionContext
        : null;

    const alignmentResult = computeAcademicAlignment({
      qualifications,
      workExperience,
      targetProgram,
      transitionContext,
      certifications,
      academicProjects,
      skills,
      internships,
    });

    if (isStale) {
      alignmentResult.isStale = true;
      alignmentResult.staleReason = staleReason;
      alignmentResult.generationAllowed = false;
      alignmentResult.blockingReason =
        staleReason ||
        "Academic alignment confirmation is outdated because the target course changed. Please re-confirm.";
    }

    // Step 7: Block Generation with HTTP 403 on Unresolved Mismatch or Stale
    if (!isGenerationAllowed(alignmentResult)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACADEMIC_MISMATCH_UNRESOLVED",
            message:
              alignmentResult.blockingReason ||
              "AI narrative generation for this section is blocked due to unresolved academic mismatch. Counsellor confirmation required.",
            status: alignmentResult.status,
            isStale: Boolean(alignmentResult.isStale),
            staleReason: alignmentResult.staleReason,
          },
        },
        { status: 403 }
      );
    }

    safeEvidencePacket = alignmentResult.safeEvidencePacket;
  }

  // ── Step 8: Build Sanitized Context for Generation ─────────────────────────
  const primaryQual = qualifications[0];
  const sanitizedContext: StudentDocumentContext = {
    ...context,
    academics: {
      ...context.academics,
      latestQualification: primaryQual?.qualification || context.academics?.latestQualification,
      subjects: primaryQual?.fieldOfStudy || context.academics?.subjects,
      institution: primaryQual?.institution || context.academics?.institution,
      percentage: primaryQual?.score || context.academics?.percentage,
    },
    destination: {
      ...context.destination,
      course: targetProgram.course || context.destination?.course,
      university: targetProgram.university || context.destination?.university,
      country: targetProgram.country || context.destination?.country,
      degreeLevel: targetProgram.degreeLevel || context.destination?.degreeLevel,
    },
  };

  // ── Step 9: Build Natural Student Voice Prompt with Safe Evidence ──────────
  const prompt = buildNaturalStudentPrompt({
    sectionId,
    sectionTitle,
    context: sanitizedContext,
    currentContent,
    mode,
    documentType,
    alignmentContext: safeEvidencePacket,
  });

  lastGeneratedPrompt = prompt;

  // ── Step 10: AI Model Execution ───────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // Test mode mock fallback
  if (isTestEnvironment() && (!apiKey || apiKey === "mock-test-key" || apiKey === "test")) {
    return NextResponse.json(
      {
        success: true,
        sectionId,
        mode,
        model: "mock-gemini-test",
        text: `Authoritative verified student narrative for section "${sectionTitle}" focusing on ${targetProgram.course}.`,
      },
      { status: 200 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_KEY_MISSING",
          message: "GEMINI_API_KEY is not configured on the server.",
        },
      },
      { status: 500 }
    );
  }

  // Initialize Gemini SDK
  let ai: GoogleGenAI;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GEMINI_INIT_FAILED",
          message: "Failed to initialize Gemini SDK.",
        },
      },
      { status: 500 }
    );
  }

  // Try fast Flash models in sequence with a 15s timeout safeguard
  let lastError: unknown = null;

  for (const modelName of FAST_FLASH_MODELS) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 15_000)
      );

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const text = response?.text?.trim();

      if (text && text.length > 20) {
        return NextResponse.json(
          {
            success: true,
            sectionId,
            mode,
            model: modelName,
            text,
          },
          { status: 200 }
        );
      }
    } catch (err: unknown) {
      lastError = err;
      const errStr = err instanceof Error ? err.message : String(err);

      if (
        errStr.includes("503") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("high demand") ||
        errStr.includes("TIMEOUT") ||
        errStr.includes("404") ||
        errStr.includes("429") ||
        errStr.includes("quota") ||
        errStr.includes("RESOURCE_EXHAUSTED")
      ) {
        await delay(800);
        continue;
      }
      break;
    }
  }

  const errMessage =
    lastError instanceof Error ? lastError.message : String(lastError ?? "");

  let code = "GENERATION_FAILED";
  let message = "Unable to generate narrative with Gemini.";
  let status = 502;

  if (
    errMessage.includes("503") ||
    errMessage.includes("UNAVAILABLE") ||
    errMessage.includes("high demand")
  ) {
    code = "MODEL_OVERLOADED";
    message = "Google AI is currently experiencing high demand. Please try again in a few seconds.";
    status = 503;
  } else if (errMessage.includes("429") || errMessage.includes("quota")) {
    code = "QUOTA_EXCEEDED";
    message = "Gemini API rate limit or quota exceeded. Please try again in a moment.";
    status = 429;
  } else if (errMessage.includes("401") || errMessage.includes("API key not valid")) {
    code = "INVALID_API_KEY";
    message = "Configured Gemini API key is invalid.";
    status = 401;
  } else if (errMessage.includes("TIMEOUT")) {
    code = "TIMEOUT";
    message = "AI generation timed out. Please try again.";
    status = 504;
  }

  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}
