/**
 * features/document-generator/components/ResumeImportModal.tsx
 *
 * Primary modal dialog orchestrating the entire Resume Import workflow:
 * 1. Safe import check (protects unsaved changes).
 * 2. File upload dropzone.
 * 3. Step-by-step processing animation.
 * 4. Interactive review workstation.
 */

"use client";

import React, { useState } from "react";
import type { DocumentData } from "@/types";
import type { ResumeImportResult } from "../types/import";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import type { ApplicationTarget } from "../guidance/types";
import { ResumeImportDropzone } from "./ResumeImportDropzone";
import { ResumeImportReview } from "./ResumeImportReview";
import { ResumeUnsavedChangesDialog } from "./ResumeUnsavedChangesDialog";

interface ResumeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportApplied: (data: DocumentData) => void;
  onSaveCurrentDraft: () => void;
  hasUnsavedChanges: boolean;
  crmSnapshot?: CrmSnapshot | null;
  applicationTarget?: ApplicationTarget;
}

type ModalStage =
  | "unsaved_check"
  | "upload"
  | "processing"
  | "review"
  | "error";

export function ResumeImportModal({
  isOpen,
  onClose,
  onImportApplied,
  onSaveCurrentDraft,
  hasUnsavedChanges,
  crmSnapshot,
  applicationTarget,
}: ResumeImportModalProps) {
  const [stage, setStage] = useState<ModalStage>(() =>
    hasUnsavedChanges ? "unsaved_check" : "upload"
  );
  const [processingStep, setProcessingStep] = useState<string>("Reading document...");
  const [importResult, setImportResult] = useState<ResumeImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleFileSelect(file: File) {
    setStage("processing");
    setErrorMessage(null);
    setProcessingStep("Reading document and extracting text...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (crmSnapshot) {
        formData.append("crmSnapshot", JSON.stringify(crmSnapshot));
        formData.append("studentId", crmSnapshot.student?._id || "");
      }

      setProcessingStep("Classifying sections with AI and checking CRM records...");

      const res = await fetch("/api/resume/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Server returned error (${res.status})`);
      }

      setImportResult(json.data as ResumeImportResult);
      setStage("review");
    } catch (err: unknown) {
      console.error("[ResumeImportModal] Import error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while processing the document."
      );
      setStage("error");
    }
  }

  async function handleConfirmApply(finalData: DocumentData) {
    if (importResult) {
      try {
        await fetch(`/api/resume/import/${importResult.importId}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: finalData,
            applicationTarget,
          }),
        });
      } catch (err) {
        console.warn("[ResumeImportModal] Server confirmation sync warning:", err);
      }
    }

    onImportApplied(finalData);
    onClose();
  }

  return (
    <>
      {/* 1. Unsaved Changes Guard Dialog */}
      {stage === "unsaved_check" && (
        <ResumeUnsavedChangesDialog
          isOpen={true}
          onClose={onClose}
          onSaveAndProceed={() => {
            onSaveCurrentDraft();
            setStage("upload");
          }}
          onDiscardAndProceed={() => {
            setStage("upload");
          }}
        />
      )}

      {/* 2. Main Upload / Processing / Review Modal */}
      {stage !== "unsaved_check" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full overflow-hidden transition-all ${
              stage === "review" ? "max-w-4xl" : "max-w-xl p-6"
            }`}
          >
            {/* STAGE: UPLOAD */}
            {stage === "upload" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Import Existing Resume
                    </h3>
                    <p className="text-xs text-slate-500">
                      Upload a PDF or DOCX resume to load into Template Generator
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <ResumeImportDropzone onFileSelect={handleFileSelect} />

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* STAGE: PROCESSING */}
            {stage === "processing" && (
              <div className="py-10 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-sky-50 text-[#096491] flex items-center justify-center text-2xl font-bold animate-pulse">
                  ⚙️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Importing Resume...
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">{processingStep}</p>
                </div>
                <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-[#096491] rounded-full animate-indeterminate" />
                </div>
              </div>
            )}

            {/* STAGE: REVIEW */}
            {stage === "review" && importResult && (
              <ResumeImportReview
                importResult={importResult}
                onApply={handleConfirmApply}
                onCancel={onClose}
              />
            )}

            {/* STAGE: ERROR */}
            {stage === "error" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <span className="text-2xl">⚠️</span>
                  <h4 className="text-sm font-bold text-slate-900">
                    Import Failed
                  </h4>
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium leading-relaxed">
                  {errorMessage || "Unable to import resume document."}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage("upload")}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                  >
                    Try Another File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
