"use client";

/**
 * features/academic-alignment/components/TransitionJustificationModal.tsx
 *
 * Dedicated modal dialog for justifying an intentional academic stream change.
 * Allows counsellors to review the mismatch, select bridging evidence credentials,
 * write or insert pre-formulated rationale, and submit verification to unblock AI generation.
 */

import React, { useEffect } from "react";
import type {
  AcademicAlignmentResult,
  TransitionContext,
} from "@/services/academicAlignment/types";
import { TransitionContextPanel } from "./TransitionContextPanel";

export interface TransitionJustificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AcademicAlignmentResult;
  initialContext?: TransitionContext | null;
  studentName?: string;
  availableCertifications?: Array<{ id: string; name: string; issuer?: string }>;
  availableProjects?: Array<{ id: string; title: string; description?: string }>;
  availableSkills?: Array<{ id: string; name: string }>;
  availableInternships?: Array<{ id: string; role: string; organization?: string; description?: string }>;
  onConfirm: (context: TransitionContext) => Promise<boolean> | void;
  isLoading?: boolean;
}

export function TransitionJustificationModal({
  isOpen,
  onClose,
  result,
  initialContext,
  studentName,
  availableCertifications = [],
  availableProjects = [],
  availableSkills = [],
  availableInternships = [],
  onConfirm,
  isLoading = false,
}: TransitionJustificationModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sourceDomainName = result.sourceField.domain.replace(/_/g, " ");
  const targetDomainName = result.targetField.domain.replace(/_/g, " ");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transition-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl xl:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/80">
            <div className="space-y-1.5 min-w-0 pr-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Stream Change Verification Studio
                </span>
                {studentName && (
                  <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                    Candidate: <strong className="text-slate-900">{studentName}</strong>
                  </span>
                )}
              </div>

              <h2 id="transition-modal-title" className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                Justify Academic Field Transition
              </h2>

              {/* Source -> Target Pill */}
              <div className="flex items-center gap-2 pt-0.5 text-xs font-semibold text-slate-700 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                  {sourceDomainName} {result.sourceField.rawSource ? `(${result.sourceField.rawSource})` : ""}
                </span>
                <span className="text-amber-500 font-bold">→</span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 shadow-2xs font-bold">
                  {targetDomainName} {result.targetField.rawSource ? `(${result.targetField.rawSource})` : ""}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
              aria-label="Close dialog"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Modal Body: Scrollable Panel */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
            <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5 shadow-2xs">
              <span className="text-blue-500 font-bold text-sm shrink-0 mt-0.5">ℹ</span>
              <div>
                Embassy visa officers and admissions committees closely scrutinize students transitioning from non-cognate fields.
                Select verified bridging evidence from the student&apos;s records and provide a clear rationale. Once saved, AI drafting for sensitive sections (Why Course, Career Plan) will be immediately unlocked.
              </div>
            </div>

            <TransitionContextPanel
              result={result}
              initialContext={initialContext}
              availableCertifications={availableCertifications}
              availableProjects={availableProjects}
              availableSkills={availableSkills}
              availableInternships={availableInternships}
              onSave={async (ctx) => {
                const ok = await onConfirm(ctx);
                if (ok !== false) {
                  onClose();
                  return true;
                }
                return false;
              }}
              onCancel={onClose}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default TransitionJustificationModal;
