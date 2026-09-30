/**
 * app/api/sop/drafts/[draftId]/route.ts
 *
 * DELETE /api/sop/drafts/[draftId] — Permanently removes an SOP draft from MongoDB.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SopDraftModel } from "@/models/SopDraft";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params;

    if (!draftId) {
      return NextResponse.json(
        { success: false, error: "draftId is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const result = await SopDraftModel.deleteOne({ id: draftId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Draft not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, draftId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
