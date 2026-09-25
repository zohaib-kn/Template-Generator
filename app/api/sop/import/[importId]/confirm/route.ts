/**
 * app/api/sop/import/[importId]/confirm/route.ts
 *
 * Marks an SOP import as "APPLIED" and creates/updates a SopDraft in MongoDB Atlas.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SopImportModel } from "@/models/SopImport";
import { SopDraftModel } from "@/models/SopDraft";
import type { ReviewStatus, StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;
    const body = await req.json();
    const sectionContents = (body.sectionContents as Record<string, string>) || {};
    const sectionStatuses = (body.sectionStatuses as Record<string, ReviewStatus>) || {};
    const ctx = body.ctx as StudentDocumentContext | undefined;
    const templateId = body.templateId || "italy-type-d-student-visa-cover-letter";
    const documentType = body.documentType || "VISA_COVER_LETTER";

    await connectToDatabase();

    const importRecord = await SopImportModel.findOne({ id: importId });
    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: "Import record not found." },
        { status: 404 }
      );
    }

    importRecord.status = "APPLIED";
    importRecord.sectionContents = sectionContents;
    importRecord.updatedAt = new Date().toISOString();
    await importRecord.save();

    // Create a synchronized draft in MongoDB Atlas
    const studentName = ctx?.student?.fullName?.trim() || importRecord.studentName;
    const draftId = `sop-${studentName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    const draft = await SopDraftModel.create({
      id: draftId,
      documentType,
      studentName,
      course: ctx?.destination?.course,
      university: ctx?.destination?.university,
      templateId,
      savedAt: new Date().toISOString(),
      sectionContents,
      sectionStatuses,
      docApproved: false,
      ctx: ctx || {},
      currentSource: "live-crm",
      loadedStudentName: studentName,
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
