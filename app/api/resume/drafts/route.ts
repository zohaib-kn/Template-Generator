/**
 * app/api/resume/drafts/route.ts
 *
 * Server-side MongoDB draft persistence API for Resume Builder.
 * Synchronizes with client localStorage for multi-device recovery.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { accessibleRecordsFilter, canAccessRecord, requireSession } from "@/lib/auth/session";
import { ResumeDraftModel } from "@/models/ResumeDraft";
import type { ResumeDraftRecord } from "@/features/document-generator/types/draft";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSession(req);
    if (auth.response) return auth.response;
    await connectToDatabase();
    const drafts = await ResumeDraftModel.find(accessibleRecordsFilter(auth.session)).sort({ savedAt: -1 }).limit(50);
    return NextResponse.json({ success: true, drafts });
  } catch (err: unknown) {
    console.error("[api] request failed:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ResumeDraftRecord;
    const auth = await requireSession(req, { studentId: body?.studentId ?? null });
    if (auth.response) return auth.response;
    await connectToDatabase();

    const id =
      body.id ||
      `resume-${(body.studentName || "student")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    // Overwriting an existing draft requires access to it.
    const existing = await ResumeDraftModel.findOne({ id }).select("studentId createdBy").lean();
    if (existing && !canAccessRecord(auth.session, existing)) {
      return NextResponse.json({ success: false, error: "Draft not found." }, { status: 404 });
    }

    const { createdBy: _ignoredOwner, ...fields } = body;
    void _ignoredOwner;
    const saved = await ResumeDraftModel.findOneAndUpdate(
      { id },
      {
        $setOnInsert: { createdBy: auth.session.sub },
        $set: {
          ...fields,
          id,
          savedAt: body.savedAt || new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, draft: saved });
  } catch (err: unknown) {
    console.error("[api] request failed:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
