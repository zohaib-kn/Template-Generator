import type { Metadata } from "next";
import Link from "next/link";
import { findById } from "@/services/webhook/documentStore";
import { SopWorkspace } from "@/features/sop-generator/components/SopWorkspace";
import { getStudentDocumentContext } from "@/features/sop-generator/lib/applicationService";
import type { SopDraftRecord } from "@/features/sop-generator/types/sop-generator";

interface PageProps {
  params: Promise<{ documentId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { documentId } = await params;
  const doc = findById(documentId);
  const title = doc ? `Review: ${doc.studentName} — SOP Generator` : "Document Review — SOP Generator";

  return {
    title,
    description: "Counsellor review workspace for generated document.",
  };
}

export default async function SopDocumentReviewPage({ params }: PageProps) {
  const { documentId } = await params;
  const doc = findById(documentId);

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
