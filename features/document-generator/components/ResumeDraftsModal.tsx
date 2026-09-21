/**
 * features/document-generator/components/ResumeDraftsModal.tsx
 *
 * Modal dialog displaying all locally saved Resume Builder drafts.
 * Users can view saved resumes, see target courses/dates,
 * load a draft back into the workspace, or delete unwanted drafts.
 */

"use client";

import React, { useState, useEffect } from "react";
import type { ResumeDraftRecord } from "../types/draft";
import { getAllResumeDrafts, deleteResumeDraft } from "../lib/resumeDraftStorage";

interface ResumeDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDraft: (draft: ResumeDraftRecord) => void;
  onNewResume?: () => void;
  onDraftsChange?: () => void;
}

export function ResumeDraftsModal({
  isOpen,
  onClose,
  onLoadDraft,
  onNewResume,
  onDraftsChange,
}: ResumeDraftsModalProps) {
  const [drafts, setDrafts] = useState<ResumeDraftRecord[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDrafts(getAllResumeDrafts());
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleDelete(id: string) {
    deleteResumeDraft(id);
    const updated = getAllResumeDrafts();
    setDrafts(updated);
    setConfirmDeleteId(null);
    if (onDraftsChange) onDraftsChange();
  }

  function formatSavedDate(iso: string): string {
    try {
      const date = new Date(iso);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const timeStr = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (isToday) {
        return `Today at ${timeStr}`;
      }
      return `${date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })} at ${timeStr}`;
    } catch {
      return iso;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-drafts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📁</span>
            <h3
              id="resume-drafts-modal-title"
              className="text-sm font-semibold text-slate-800"
            >
              Saved Resume Drafts ({drafts.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onNewResume && (
              <button
                id="modal-new-resume-btn"
                onClick={() => {
                  onNewResume();
                  onClose();
                }}
                className="h-7 px-2.5 text-xs font-semibold rounded-md border border-[#096491] text-[#096491] bg-white hover:bg-slate-50 transition-colors shadow-xs"
                title="Clear editor to start a new blank resume"
              >
                + New Resume
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-sm"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {drafts.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-xs font-semibold text-slate-700">
                No saved resume drafts yet
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                Fill in sections of the resume and click &quot;Save Draft&quot; in the top bar to save your work here.
              </p>
            </div>
          ) : (
            drafts.map((draft) => {
              const edCount = draft.data.education?.length ?? 0;
              const skillCount = draft.data.skills?.length ?? 0;
              const internCount = draft.data.internships?.length ?? 0;

              return (
                <div
                  key={draft.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {draft.studentName || "Unnamed Student"}
                      </h4>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                        {draft.intendedCourse || "Target Course not set"}
                        {draft.targetUniversity && ` • ${draft.targetUniversity}`}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex-shrink-0">
                      {formatSavedDate(draft.savedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      {edCount > 0 && (
                        <span className="bg-slate-200/70 px-1.5 py-0.5 rounded">
                          {edCount} Edu
                        </span>
                      )}
                      {internCount > 0 && (
                        <span className="bg-slate-200/70 px-1.5 py-0.5 rounded">
                          {internCount} Intern
                        </span>
                      )}
                      {skillCount > 0 && (
                        <span className="bg-slate-200/70 px-1.5 py-0.5 rounded">
                          {skillCount} Skills
                        </span>
                      )}
                      {edCount === 0 && internCount === 0 && skillCount === 0 && (
                        <span>Basic details</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {confirmDeleteId === draft.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-rose-600 font-medium">
                            Delete?
                          </span>
                          <button
                            onClick={() => handleDelete(draft.id)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-medium rounded transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-medium rounded transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(draft.id)}
                          className="px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] rounded transition-colors"
                          title="Delete draft"
                        >
                          Delete
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onLoadDraft(draft);
                          onClose();
                        }}
                        className="h-7 px-3 text-[11px] font-semibold rounded-md bg-[#096491] text-white hover:bg-[#074f73] transition-colors shadow-xs"
                      >
                        Load Draft
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="h-8 px-4 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
