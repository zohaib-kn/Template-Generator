/**
 * app/api/academic-alignment/route.ts
 *
 * REST API for Academic Alignment Mismatch Resolutions.
 *
 * Scoped to (studentId, programId) application pairs.
 * Used by both Resume Builder and SOP Generator.
 *
 * Endpoints:
 * - GET    /api/academic-alignment?studentId=&programId=  — fetch existing resolution
 * - POST   /api/academic-alignment                       — create or update resolution
 * - DELETE /api/academic-alignment?studentId=&programId=  — reset / clear resolution
 *
 * SECURITY TODO: When user/counsellor authentication is introduced, authenticate requests
 * and associate resolutions with a verified counsellor / tenant identity. Currently inherits
 * the application's single-tenant trusted model.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  AcademicAlignmentResolutionModel,
  type AcademicAlignmentResolutionRecord,
} from "@/models/AcademicAlignmentResolution";

// ---------------------------------------------------------------------------
// Test Isolation Helper
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

// In-memory store for unit test execution without Atlas network dependencies
const testMemoryStore = new Map<string, AcademicAlignmentResolutionRecord>();

/** Exported test helper to reset in-memory state between tests */
export function clearTestMemoryResolutions(): void {
  testMemoryStore.clear();
}

function stripMongoMeta(doc: unknown): AcademicAlignmentResolutionRecord {
  if (!doc) return doc as AcademicAlignmentResolutionRecord;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = typeof (doc as any).toObject === "function" ? (doc as any).toObject() : { ...(doc as any) };
  delete raw._id;
  delete raw.__v;
  return raw as AcademicAlignmentResolutionRecord;
}

// ---------------------------------------------------------------------------
// GET Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId")?.trim();
    const programId = searchParams.get("programId")?.trim();

    if (!studentId || !programId) {
      return NextResponse.json(
        { success: false, error: "studentId and programId query parameters are required" },
        { status: 400 }
      );
    }

    if (isTestEnvironment()) {
      const key = `${studentId}::${programId}`;
      const record = testMemoryStore.get(key) || null;
      return NextResponse.json({ success: true, resolution: record });
    }

    await connectToDatabase();
    const found = await AcademicAlignmentResolutionModel.findOne({
      studentId,
      programId,
    }).lean();

    return NextResponse.json({
      success: true,
      resolution: found ? stripMongoMeta(found) : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
    const programId = typeof body.programId === "string" ? body.programId.trim() : "";
    const resolution = body.resolution;

    if (!studentId || !programId) {
      return NextResponse.json(
        { success: false, error: "studentId and programId are required" },
        { status: 400 }
      );
    }

    const validResolutions = ["INTENTIONAL_CONFIRMED", "TARGET_CORRECTED", "UNRESOLVED"];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json(
        { success: false, error: `Invalid resolution. Must be one of: ${validResolutions.join(", ")}` },
        { status: 400 }
      );
    }

    // When confirming intentional transition, require justification reason
    if (resolution === "INTENTIONAL_CONFIRMED") {
      const reason = body.transitionContext?.reason;
      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "transitionContext.reason is required for INTENTIONAL_CONFIRMED" },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const id = body.id || `res-${studentId}-${programId}`;

    const payload: AcademicAlignmentResolutionRecord = {
      id,
      studentId,
      programId,
      sourceQualificationSnapshot: body.sourceQualificationSnapshot?.trim() || "Unknown Qualification",
      targetCourseSnapshot: body.targetCourseSnapshot?.trim() || "Unknown Target Course",
      resolution,
      transitionContext: body.transitionContext || undefined,
      confirmedAt: body.confirmedAt || now,
      updatedAt: now,
    };

    if (isTestEnvironment()) {
      const key = `${studentId}::${programId}`;
      testMemoryStore.set(key, payload);
      return NextResponse.json({ success: true, resolution: payload });
    }

    await connectToDatabase();
    const saved = await AcademicAlignmentResolutionModel.findOneAndUpdate(
      { studentId, programId },
      { $set: payload },
      { upsert: true, new: true, lean: true }
    );

    return NextResponse.json({
      success: true,
      resolution: stripMongoMeta(saved),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE Handler
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get("studentId")?.trim();
    let programId = searchParams.get("programId")?.trim();

    // Fallback: check JSON body if not present in query params
    if (!studentId || !programId) {
      try {
        const body = await req.json();
        studentId = body.studentId?.trim() || studentId;
        programId = body.programId?.trim() || programId;
      } catch {
        // Body parsing optional
      }
    }

    if (!studentId || !programId) {
      return NextResponse.json(
        { success: false, error: "studentId and programId are required to delete a resolution" },
        { status: 400 }
      );
    }

    if (isTestEnvironment()) {
      const key = `${studentId}::${programId}`;
      const existed = testMemoryStore.delete(key);
      return NextResponse.json({ success: true, deleted: existed });
    }

    await connectToDatabase();
    const result = await AcademicAlignmentResolutionModel.deleteOne({ studentId, programId });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount > 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
