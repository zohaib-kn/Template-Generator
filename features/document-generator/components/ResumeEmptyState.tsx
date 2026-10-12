"use client";

import React from "react";

interface ResumeEmptyStateProps {
  onOpenStudentSelect: () => void;
  onOpenImport: () => void;
  onStartManual: () => void;
}

export function ResumeEmptyState({
  onOpenStudentSelect,
  onOpenImport,
  onStartManual,
}: ResumeEmptyStateProps) {
  return (
    <div className="w-full max-w-xl mx-auto my-12 p-8 sm:p-10 bg-white rounded-2xl border border-slate-200/90 shadow-sm text-center">
      {/* Icon illustration */}
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-2xl shadow-2xs">
        📄
      </div>

      <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
        Create a Resume
      </h2>

      <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
        Start by selecting an existing student from CRM, import a pre-existing resume, or begin building manually.
      </p>

      {/* Action cards / buttons */}
      <div className="flex flex-col gap-3 max-w-sm mx-auto">
        <button
          type="button"
          id="empty-state-select-crm-btn"
          onClick={onOpenStudentSelect}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-base">👤</span>
          <span>Select Student from CRM</span>
        </button>

        <button
          type="button"
          id="empty-state-import-btn"
          onClick={onOpenImport}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 border border-slate-200 font-medium text-sm transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-base">📥</span>
          <span>Import Existing Resume</span>
        </button>

        <button
          type="button"
          id="empty-state-start-manual-btn"
          onClick={onStartManual}
          className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 font-medium text-xs transition-colors cursor-pointer"
        >
          Start with blank template
        </button>
      </div>

      {/* Trust reassurance footer */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span>✓</span> Europass Standard
        </span>
        <span>·</span>
        <span className="flex items-center gap-1.5">
          <span>✓</span> High-Res Vector PDF
        </span>
        <span>·</span>
        <span className="flex items-center gap-1.5">
          <span>✓</span> Auto-saved Drafts
        </span>
      </div>
    </div>
  );
}
