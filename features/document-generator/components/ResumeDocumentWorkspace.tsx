"use client";

import React from "react";
import type { DocumentData } from "@/types";
import { EuropassTemplate } from "@/templates/europass/EuropassTemplate";
import { PreviewScaler } from "../preview/PreviewScaler";
import { ResumeEmptyState } from "./ResumeEmptyState";

interface ResumeDocumentWorkspaceProps {
  data: DocumentData;
  isStudentActive: boolean;
  isEmpty: boolean;
  viewMode: "edit" | "preview" | "split" | "editor";
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  onOpenAddContent: () => void;
  onOpenStudentSelect: () => void;
  onOpenImport: () => void;
  onStartManual: () => void;
}

export function ResumeDocumentWorkspace({
  data,
  isStudentActive,
  isEmpty,
  viewMode,
  activeSectionId,
  onSelectSection,
  onOpenAddContent,
  onOpenStudentSelect,
  onOpenImport,
  onStartManual,
}: ResumeDocumentWorkspaceProps) {
  // If no student and no data, show welcoming onboarding empty state
  if (!isStudentActive && isEmpty) {
    return (
      <main
        className="flex-1 overflow-y-auto bg-slate-100/70 p-6 flex items-center justify-center"
        aria-label="Resume Workspace Empty State"
      >
        <ResumeEmptyState
          onOpenStudentSelect={onOpenStudentSelect}
          onOpenImport={onOpenImport}
          onStartManual={onStartManual}
        />
      </main>
    );
  }

  const isInteractive = viewMode !== "preview";

  return (
    <main
      className="flex-1 overflow-y-auto overflow-x-hidden bg-[#E2E6EE] flex flex-col items-center py-6 px-4"
      aria-label="Live Resume Document Workspace"
    >
      {/* ── Document Meta Header (Europass · A4 Standard) ── */}
      <div
        data-html2canvas-ignore="true"
        data-no-print="true"
        className="w-full max-w-[794px] px-2 mb-3 flex items-center justify-between text-xs text-slate-500 select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-600">
            {viewMode === "preview" ? "Print Preview" : "Interactive Document"}
          </span>
          {isInteractive && (
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80 font-medium">
              Click any section to edit
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Europass Standard · A4
        </span>
      </div>

      {/* ── Scaled A4 Document Canvas ── */}
      <div className="w-full max-w-[794px] flex justify-center">
        <PreviewScaler contentWidth={794}>
          <EuropassTemplate
            data={data}
            isInteractive={isInteractive}
            activeSectionId={activeSectionId}
            onSelectSection={onSelectSection}
          />
        </PreviewScaler>
      </div>

      {/* ── Bottom "+ Add Content" Button on Canvas ── */}
      {isInteractive && (
        <div
          data-html2canvas-ignore="true"
          data-no-print="true"
          className="w-full max-w-[794px] mt-6 mb-12 flex justify-center"
        >
          <button
            type="button"
            id="resume-bottom-add-content-btn"
            onClick={onOpenAddContent}
            className="w-full max-w-md py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors flex items-center justify-center text-xs">
              +
            </span>
            <span>Add More Sections to Resume</span>
          </button>
        </div>
      )}
    </main>
  );
}
