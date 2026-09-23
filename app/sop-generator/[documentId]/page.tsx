import type { Metadata } from "next";
import Link from "next/link";
import { findById } from "@/services/webhook/documentStore";
import { SopWorkspace } from "@/features/sop-generator/components/SopWorkspace";
import { getStudentDocumentContext } from "@/features/sop-generator/lib/applicationService";
import type { SopDraftRecord } from "@/features/sop-generator/types/sop-generator";
import { resolveStudentProfile } from "@/services/webhook/normalizeRequest";
import { SopDocumentGenerator } from "@/services/webhook/generators/sopGenerator";
import type { DocumentRecord } from "@/services/webhook/types";

interface PageProps {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ studentId?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { documentId } = await params;
  const query = await searchParams;
  const doc = await findById(documentId);
  const title = doc
    ? `Review: ${doc.studentName} — SOP Generator`
    : query?.studentId
    ? `Review: Student (${query.studentId}) — SOP Generator`
    : "Document Review — SOP Generator";

  return {
    title,
    description: "Counsellor review workspace for generated document.",
  };
}

export default async function SopDocumentReviewPage({ params, searchParams }: PageProps) {
  const { documentId } = await params;
  const query = await searchParams;
  let doc: DocumentRecord | null = await findById(documentId);

  // Auto-recovery for Vercel serverless where memory store resets across lambda instances:
  if (!doc && query?.studentId?.trim()) {
    try {
      const studentId = query.studentId.trim();
      const profile = await resolveStudentProfile({ studentId, documentType: "SOP" });
      const sopGen = new SopDocumentGenerator();
      const genResult = await sopGen.generate(profile);
      doc = {
        id: documentId,
        studentId,
        studentName: profile.personal.fullName || "Student",
        documentType: "SOP",
        templateId: genResult.templateId,
        status: genResult.status,
        reviewUrl: `/sop-generator/${documentId}?studentId=${studentId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sectionContents: genResult.sectionContents,
        sectionStatuses: genResult.sectionStatuses,
        validationIssues: genResult.validationIssues,
        normalizedProfile: profile,
        sopContext: genResult.sopContext,
      };
    } catch (err) {
      console.warn(`[Review Page] Dynamic student recovery failed for ${query.studentId}:`, err);
    }
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Document Not Found</h1>
            <p className="text-xs font-mono text-slate-500 mt-1 bg-slate-50 py-1 px-2 rounded inline-block">
              {documentId}
            </p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            This document could not be located in the server memory store. Note that documents generated via webhook are stored in-memory during Phase 2 and reset if the development server is restarted.
          </p>
          <div className="pt-2">
            <Link
              href="/sop-generator"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
            >
              Open Default SOP Generator →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initialDraft: SopDraftRecord = {
    id: doc.id,
    studentName: doc.studentName,
    course: doc.sopContext?.destination?.course || "Target Course",
    university: doc.sopContext?.destination?.university || "Target University",
    templateId: doc.templateId,
    savedAt: doc.createdAt,
    sectionContents: doc.sectionContents,
    sectionStatuses: doc.sectionStatuses,
    docApproved: doc.status === "GENERATED",
    ctx: doc.sopContext || getStudentDocumentContext(),
    currentSource: "live-crm",
    loadedStudentName: doc.studentName,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      <SopWorkspace initialDraft={initialDraft} />
    </div>
  );
}
