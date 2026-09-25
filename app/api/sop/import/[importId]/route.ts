/**
 * app/api/sop/import/[importId]/route.ts
 *
 * GET: Retrieve a specific SOP import record by its ID.
 * PATCH: Update an import record with counsellor modifications made in review.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SopImportModel } from "@/models/SopImport";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;
    await connectToDatabase();

    const record = await SopImportModel.findOne({ id: importId });
    if (!record) {
      return NextResponse.json(
        { success: false, error: "Import record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;
    const body = await req.json();

    await connectToDatabase();
    const updated = await SopImportModel.findOneAndUpdate(
      { id: importId },
      {
        $set: {
          sectionContents: body.sectionContents,
          sectionsSummary: body.sectionsSummary,
          ambiguousItems: body.ambiguousItems,
          unmappedParagraphs: body.unmappedParagraphs,
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
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
