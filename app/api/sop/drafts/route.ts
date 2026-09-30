/**
 * app/api/sop/drafts/route.ts
 *
 * GET  /api/sop/drafts  — Returns all SOP drafts from MongoDB, sorted newest-first.
 * POST /api/sop/drafts  — Creates or updates (upserts) an SOP draft in MongoDB.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SopDraftModel } from "@/models/SopDraft";
import type {
  ReviewStatus,
  StudentDocumentContext,
  SopDocumentType,
  DataSource,
} from "@/features/sop-generator/types/sop-generator";

// ── GET /api/sop/drafts ───────────────────────────────────────────────────────

export async function GET() {
  try {
    await connectToDatabase();

    const drafts = await SopDraftModel.find({})
      .sort({ savedAt: -1 })
      .lean();

    // Strip MongoDB's internal _id from each document
    const cleaned = drafts.map(({ _id: _ignored, ...rest }) => rest);

    return NextResponse.json({ success: true, drafts: cleaned });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ── POST /api/sop/drafts ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const incomingId = body.id as string | undefined;
    const studentName = (body.studentName as string | undefined)?.trim() || "Student";
    const documentType = (body.documentType as SopDocumentType | undefined) || "VISA_COVER_LETTER";
    const templateId = (body.templateId as string | undefined) || "italy-type-d-student-visa-cover-letter";
    const sectionContents = (body.sectionContents as Record<string, string>) || {};
    const sectionStatuses = (body.sectionStatuses as Record<string, ReviewStatus>) || {};
    const ctx = (body.ctx as StudentDocumentContext) || {};
    const docApproved = Boolean(body.docApproved);
    const currentSource = (body.currentSource as DataSource) || "live-crm";
    const loadedStudentName = body.loadedStudentName as string | undefined;
    const course = body.course as string | undefined;
    const university = body.university as string | undefined;

    const savedAt = new Date().toISOString();

    // Generate a stable ID only when creating a brand-new draft
    const draftId =
      incomingId ||
      `sop-${studentName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    await connectToDatabase();

    const payload = {
      id: draftId,
      documentType,
      studentName,
      course,
      university,
      templateId,
      savedAt,
      sectionContents,
      sectionStatuses,
      docApproved,
      ctx,
      currentSource,
      loadedStudentName,
      origin: "MANUAL" as const,
    };

    // Upsert: update if exists, create if not — keyed on `id` field
    const draft = await SopDraftModel.findOneAndUpdate(
      { id: draftId },
      { $set: payload },
      { upsert: true, new: true, lean: true }
    );

    return NextResponse.json({
      success: true,
      draftId: draft?.id ?? draftId,
      savedAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
