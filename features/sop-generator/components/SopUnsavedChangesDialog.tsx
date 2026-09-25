/**
 * features/sop-generator/components/SopUnsavedChangesDialog.tsx
 *
 * Protection modal that prompts the counsellor before importing an existing SOP
 * if they already have unsaved edits in the current workspace.
 */

"use client";

import React from "react";

interface SopUnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndProceed: () => void;
  onDiscardAndProceed: () => void;
}

export function SopUnsavedChangesDialog({
  isOpen,
  onClose,
  onSaveAndProceed,
  onDiscardAndProceed,
}: SopUnsavedChangesDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-sop-changes-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold border border-amber-200">
            ⚠️
          </div>
          <div>
            <h3 id="unsaved-sop-changes-title" className="text-base font-semibold text-slate-900">
              Unsaved SOP In Progress
            </h3>
            <p className="text-xs text-slate-500">
              You have active section edits in your current workspace.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
          Importing an existing SOP will load new content into the workspace. You can save your
          current work as a draft first to ensure no edits are lost.
        </p>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onSaveAndProceed}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💾</span>
            <span>Save Current Draft & Continue Import</span>
          </button>

          <button
            type="button"
            onClick={onDiscardAndProceed}
            className="w-full py-2 px-4 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Discard Current Work & Import</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
