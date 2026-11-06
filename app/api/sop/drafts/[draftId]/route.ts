/**
 * app/api/sop/drafts/[draftId]/route.ts
 *
 * DELETE /api/sop/drafts/[draftId] — Permanently removes an SOP draft from MongoDB.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SopDraftModel } from "@/models/SopDraft";
import { canAccessRecord, requireSession } from "@/lib/auth/session";

export async function DELETE(
  req: NextRequest,
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

    const auth = await requireSession(req);
    if (auth.response) return auth.response;

    await connectToDatabase();

    const existing = await SopDraftModel.findOne({ id: draftId }).select("studentId createdBy").lean();
    if (!existing || !canAccessRecord(auth.session, existing)) {
      return NextResponse.json({ success: false, error: "Draft not found." }, { status: 404 });
    }

    const result = await SopDraftModel.deleteOne({ id: draftId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Draft not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, draftId });
  } catch (err: unknown) {
    console.error("[api] request failed:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
