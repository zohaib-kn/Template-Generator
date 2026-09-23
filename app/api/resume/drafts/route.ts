/**
 * app/api/resume/drafts/route.ts
 *
 * Server-side MongoDB draft persistence API for Resume Builder.
 * Synchronizes with client localStorage for multi-device recovery.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ResumeDraftModel } from "@/models/ResumeDraft";
import type { ResumeDraftRecord } from "@/features/document-generator/types/draft";

export async function GET() {
  try {
    await connectToDatabase();
    const drafts = await ResumeDraftModel.find().sort({ savedAt: -1 }).limit(50);
    return NextResponse.json({ success: true, drafts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ResumeDraftRecord;
    await connectToDatabase();

    const id =
      body.id ||
      `resume-${(body.studentName || "student")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    const saved = await ResumeDraftModel.findOneAndUpdate(
      { id },
      {
        $set: {
          ...body,
          id,
          savedAt: body.savedAt || new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, draft: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
