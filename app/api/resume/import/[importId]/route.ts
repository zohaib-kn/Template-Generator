/**
 * app/api/resume/import/[importId]/route.ts
 *
 * GET: Retrieve a specific import record by its ID.
 * PATCH: Update an import record with counsellor modifications made in review.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ResumeImportModel } from "@/models/ResumeImport";
import { canAccessRecord, requireSession } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;
    await connectToDatabase();

    const auth = await requireSession(req);
    if (auth.response) return auth.response;

    const record = await ResumeImportModel.findOne({ id: importId });
    if (!record || !canAccessRecord(auth.session, record)) {
      return NextResponse.json(
        { success: false, error: "Import record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (err: unknown) {
    console.error("[api] request failed:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;
    const body = await req.json();

    const auth = await requireSession(req);
    if (auth.response) return auth.response;

    await connectToDatabase();
    const existing = await ResumeImportModel.findOne({ id: importId }).select("studentId createdBy").lean();
    if (!existing || !canAccessRecord(auth.session, existing)) {
      return NextResponse.json({ success: false, error: "Import record not found." }, { status: 404 });
    }
    const updated = await ResumeImportModel.findOneAndUpdate(
      { id: importId },
      {
        $set: {
          extractedData: body.data,
          sectionsSummary: body.sectionsSummary,
          ambiguousItems: body.ambiguousItems,
          crmConflicts: body.crmConflicts,
          updatedAt: new Date().toISOString(),
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Import record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("[api] request failed:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
