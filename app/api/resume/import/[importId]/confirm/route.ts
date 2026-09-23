/**
 * app/api/resume/import/[importId]/confirm/route.ts
 *
 * Marks an import as "APPLIED" and creates/updates a ResumeDraft in MongoDB Atlas.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ResumeImportModel } from "@/models/ResumeImport";
import { ResumeDraftModel } from "@/models/ResumeDraft";
import type { DocumentData } from "@/types";
import type { ApplicationTarget } from "@/features/document-generator/guidance/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;
    const body = await req.json();
    const finalData = body.data as DocumentData;
    const applicationTarget = body.applicationTarget as ApplicationTarget | undefined;

    await connectToDatabase();

    const importRecord = await ResumeImportModel.findOne({ id: importId });
    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: "Import record not found." },
        { status: 404 }
      );
    }

    importRecord.status = "APPLIED";
    importRecord.extractedData = finalData;
    importRecord.updatedAt = new Date().toISOString();
    await importRecord.save();

    // Create a synchronized draft in MongoDB
    const studentName = finalData.personal?.fullName?.trim() || importRecord.studentName;
    const draftId = `resume-${studentName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    const draft = await ResumeDraftModel.create({
      id: draftId,
      studentName,
      targetUniversity: applicationTarget?.universityName,
      intendedCourse: applicationTarget?.intendedCourse,
      destinationCountry: applicationTarget?.destinationCountry,
      savedAt: new Date().toISOString(),
      data: finalData,
      applicationTarget,
      origin: "IMPORTED",
      sourceFileName: importRecord.fileName,
      importId,
    });

    return NextResponse.json({
      success: true,
      draftId: draft.id,
      importId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
