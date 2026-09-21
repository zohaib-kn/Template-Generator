/**
 * features/sop-generator/components/SopDraftsModal.tsx
 *
 * Modal dialog displaying all locally saved SOP drafts.
 * Counsellors can inspect saved drafts, see timestamps/courses,
 * load a draft back into the workspace, or delete unwanted drafts.
 */

"use client";

import React, { useState, useEffect } from "react";
import { SopDraftRecord } from "../types/sop-generator";
import { getAllDrafts, deleteDraft } from "../lib/sopDraftStorage";

interface SopDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDraft: (draft: SopDraftRecord) => void;
  onDraftsChange?: () => void;
}

export function SopDraftsModal({
  isOpen,
  onClose,
  onLoadDraft,
  onDraftsChange,
}: SopDraftsModalProps) {
  const [drafts, setDrafts] = useState<SopDraftRecord[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDrafts(getAllDrafts());
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleDelete(id: string) {
    deleteDraft(id);
    const updated = getAllDrafts();
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
      aria-labelledby="sop-drafts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📁</span>
            <h3
              id="sop-drafts-modal-title"
              className="text-sm font-semibold text-slate-800"
            >
              Saved SOP Drafts ({drafts.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-sm"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {drafts.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-xs font-semibold text-slate-700">No saved drafts yet</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                Make changes to any student SOP section and click &quot;Save Draft&quot; in the top bar to save your work here.
              </p>
            </div>
          ) : (
            drafts.map((draft) => {
              const approvedCount = Object.values(draft.sectionStatuses || {}).filter(
                (s) => s === "APPROVED"
              ).length;
              const totalSections = Object.keys(draft.sectionContents || {}).length;

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
                        {draft.course || "Course not specified"}{" "}
                        {draft.university && `• ${draft.university}`}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex-shrink-0">
                      {formatSavedDate(draft.savedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500">
                      Progress:{" "}
                      <span className="font-medium text-slate-700">
                        {approvedCount}/{totalSections} approved
                      </span>
                    </span>

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
