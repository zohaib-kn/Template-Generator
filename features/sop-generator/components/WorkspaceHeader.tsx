"use client";

import { useState, useRef, useEffect } from "react";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import type { DataSource, SopDocumentType } from "../types/sop-generator";

interface WorkspaceHeaderProps {
  templateName: string;
  studentName: string;
  studentInitials?: string;
  destinationSummary?: string;
  documentStatus: "draft" | "in_review" | "approved";
  approvedCount: number;
  requiredCount: number;
  totalCount: number;
  hasErrors: boolean;
  onSaveDraft: () => void;
  draftCount?: number;
  onOpenDrafts?: () => void;
  isSavingDraft?: boolean;
  savedNoticeText?: string | null;
  onPreview: () => void;
  onApproveDocument: () => void;
  onApproveAll?: () => void;
  onGenerateAllAi?: () => void;
  isGeneratingAllAi?: boolean;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
  totalWordCount?: number;
  // Document Type Switching
  activeDocumentType?: SopDocumentType;
  onDocumentTypeChange?: (type: SopDocumentType) => void;
  // Student selection & program switching
  isStudentLoaded?: boolean;
  currentSource?: DataSource;
  availablePrograms?: NormalizedAppliedProgram[];
  selectedProgramId?: string;
  onProgramChange?: (programId: string) => void;
  onClearStudent?: () => void;
  onOpenStudentSelect?: () => void;
  onOpenImport?: () => void;
}

const DOC_STATUS_LABELS: Record<string, { label: string; colors: string }> = {
  draft:     { label: "Draft",     colors: "bg-slate-100 text-slate-600 border-slate-200" },
  in_review: { label: "In Review", colors: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:  { label: "Approved",  colors: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function WorkspaceHeader({
  templateName,
  studentName,
  studentInitials,
  destinationSummary: _destinationSummary,
  documentStatus,
  approvedCount,
  requiredCount,
  totalCount: _totalCount,
  hasErrors,
  onSaveDraft,
  draftCount = 0,
  onOpenDrafts,
  isSavingDraft = false,
  savedNoticeText,
  onPreview,
  onApproveDocument,
  onApproveAll,
  onGenerateAllAi,
  isGeneratingAllAi = false,
  onDownloadPdf,
  isGeneratingPdf = false,
  totalWordCount,
  activeDocumentType,
  onDocumentTypeChange,
  isStudentLoaded = false,
  currentSource,
  availablePrograms = [],
  selectedProgramId,
  onProgramChange,
  onClearStudent,
  onOpenStudentSelect,
  onOpenImport,
}: WorkspaceHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const statusCfg = DOC_STATUS_LABELS[documentStatus] ?? DOC_STATUS_LABELS.draft;
  const allRequiredApproved = approvedCount >= requiredCount;
  const canApprove = allRequiredApproved && !hasErrors;
  const isApproved = documentStatus === "approved";

  const initials =
    studentInitials ||
    studentName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "ST";

  const disabledReason = !canApprove
    ? hasErrors
      ? "Resolve validation errors before approving"
      : `${requiredCount - approvedCount} section${
          requiredCount - approvedCount !== 1 ? "s" : ""
        } still need review`
    : null;

  // Close overflow menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex-shrink-0 border-b border-slate-200/90 bg-white">
      {/* Top Bar: Breadcrumb + Document Title + Auto-save + Actions */}
      <div className="px-6 py-2.5 flex items-center justify-between border-b border-slate-100 text-xs gap-4 flex-wrap">
        {/* Breadcrumb + Document Title + Document Type Toggle */}
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-shrink-0">
              <span>Documents</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 font-medium">SOP Generator</span>
            </nav>
            <span className="text-slate-300 select-none text-xs">/</span>
            <h1
              className="text-xs md:text-sm font-semibold text-slate-900 tracking-tight truncate max-w-xs md:max-w-sm lg:max-w-md"
              title={templateName}
            >
              {templateName}
            </h1>
          </div>

          {/* Document Type Switcher */}
          {onDocumentTypeChange && (
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/90 text-xs flex-shrink-0">
              <button
                type="button"
                id="sop-doc-type-visa-btn"
                onClick={() => onDocumentTypeChange("VISA_COVER_LETTER")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  activeDocumentType === "VISA_COVER_LETTER"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Visa Cover Letter
              </button>
              <button
                type="button"
                id="sop-doc-type-sop-btn"
                onClick={() => onDocumentTypeChange("UNIVERSITY_SOP")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  activeDocumentType === "UNIVERSITY_SOP"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                University SOP
              </button>
            </div>
          )}
        </div>

        {/* Right: Saved state notice + Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Subtle save indicator */}
          {savedNoticeText ? (
            <span className="text-[11px] text-emerald-700 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 animate-fade-in flex items-center gap-1">
              <span>✓</span>
              <span>{savedNoticeText.replace(/^✓\s*/, "")}</span>
            </span>
          ) : isSavingDraft ? (
            <span className="text-[11px] text-slate-400">Saving…</span>
          ) : null}

          {/* Preview CTA */}
          <button
            type="button"
            id="sop-preview-btn"
            onClick={onPreview}
            className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
          >
            Preview
          </button>

          {/* Primary CTA: Approve Document */}
          <div className="relative group">
            <button
              type="button"
              id="sop-approve-document-btn"
              onClick={onApproveDocument}
              disabled={!canApprove || isApproved}
              className={`h-8 px-3.5 rounded-lg text-xs font-medium transition-all shadow-xs flex items-center gap-1.5
                ${
                  isApproved
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/90 cursor-default"
                    : canApprove
                    ? "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                }`}
            >
              {isApproved ? (
                <>
                  <span>✓</span>
                  <span>Document Approved</span>
                </>
              ) : (
                <span>Approve Document</span>
              )}
            </button>

            {/* Concise disabled explanation tooltip */}
            {disabledReason && !isApproved && (
              <div
                role="tooltip"
                className="absolute right-0 top-full mt-1.5 z-30 w-52 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {disabledReason}
              </div>
            )}
          </div>

          {/* If approved, show direct Download PDF */}
          {isApproved && onDownloadPdf && (
            <button
              type="button"
              id="sop-download-pdf-btn"
              onClick={onDownloadPdf}
              disabled={isGeneratingPdf}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <span>Generating PDF…</span>
              ) : (
                <>
                  <span>📥</span>
                  <span>Download PDF</span>
                </>
              )}
            </button>
          )}

          {/* Secondary Actions Overflow Menu (•••) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              id="sop-header-more-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors shadow-xs"
              title="More actions"
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 text-xs text-slate-700"
                role="menu"
              >
                {/* Import Existing SOP */}
                {onOpenImport && (
                  <button
                    type="button"
                    id="sop-menu-import-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenImport();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    role="menuitem"
                  >
                    <span>📥</span>
                    <span>Import Existing SOP</span>
                  </button>
                )}
                {/* Save Draft */}
                <button
                  type="button"
                  id="sop-save-draft-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onSaveDraft();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                  role="menuitem"
                >
                  <span className="flex items-center gap-2">
                    <span>💾</span>
                    <span>Save Draft</span>
                  </span>
                </button>

                {/* View Saved Drafts */}
                {onOpenDrafts && (
                  <button
                    type="button"
                    id="sop-open-drafts-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDrafts();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between"
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2">
                      <span>📁</span>
                      <span>Saved Drafts</span>
                    </span>
                    {draftCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {draftCount}
                      </span>
                    )}
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                {/* Generate All AI Suggestions */}
                {onGenerateAllAi && (
                  <button
                    type="button"
                    id="sop-header-generate-all-ai-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      onGenerateAllAi();
                    }}
                    disabled={isGeneratingAllAi}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 disabled:opacity-50"
                    role="menuitem"
                  >
                    <span>✨</span>
                    <span>{isGeneratingAllAi ? "Generating AI…" : "Generate All AI"}</span>
                  </button>
                )}

                {/* Approve All */}
                {onApproveAll && !isApproved && (
                  <button
                    type="button"
                    id="sop-header-approve-all-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      onApproveAll();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    role="menuitem"
                  >
                    <span>✓</span>
                    <span>Approve All Sections</span>
                  </button>
                )}

                {/* Download PDF option in menu if not already shown */}
                {onDownloadPdf && !isApproved && (
                  <button
                    type="button"
                    id="sop-menu-download-pdf-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      if (canApprove) {
                        onApproveDocument();
                      }
                      onDownloadPdf();
                    }}
                    disabled={isGeneratingPdf}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 disabled:opacity-50 cursor-pointer"
                    role="menuitem"
                    title={canApprove ? "Download official PDF" : "Download PDF draft"}
                  >
                    <span>📥</span>
                    <span>{canApprove ? "Download PDF" : "Download PDF (Draft)"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Row: Student Persona & Controls + Review Progress */}
      <div className="px-6 py-2 flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Student Persona and Destination Line */}
        <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap min-w-0">
          {isStudentLoaded ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80">
                <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-semibold text-[10px] flex items-center justify-center flex-shrink-0">
                  {initials}
                </div>
                <span className="font-semibold text-slate-900">
                  {studentName}
                </span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full border ${
                    currentSource === "imported-sop"
                      ? "bg-sky-50 text-sky-800 border-sky-200 font-semibold"
                      : statusCfg.colors
                  }`}
                >
                  {currentSource === "imported-sop" ? "Imported SOP" : statusCfg.label}
                </span>
              </div>

              {/* Link / Switch Student Button */}
              {onOpenStudentSelect && (
                <button
                  type="button"
                  id="sop-switch-student-btn"
                  onClick={onOpenStudentSelect}
                  className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title={currentSource === "imported-sop" ? "Link this imported SOP to a student in CRM" : "Select a different student from CRM"}
                >
                  <span>{currentSource === "imported-sop" ? "🔗" : "⇄"}</span>
                  <span>{currentSource === "imported-sop" ? "Link to CRM" : "Switch Student"}</span>
                </button>
              )}

              {/* Import SOP Button for this Student */}
              {onOpenImport && (
                <button
                  type="button"
                  id="sop-import-btn-loaded"
                  onClick={onOpenImport}
                  className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Import existing SOP for this student"
                >
                  <span>📥</span>
                  <span>Import SOP</span>
                </button>
              )}

              {/* Clear Student Button */}
              {onClearStudent && (
                <button
                  type="button"
                  id="sop-clear-student-btn"
                  onClick={onClearStudent}
                  className="h-7 px-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[11px] transition-colors cursor-pointer"
                  title="Clear student and reset to sample template"
                >
                  ✕
                </button>
              )}

              {/* Multiple program switcher inline if available */}
              {availablePrograms.length > 1 && onProgramChange && (
                <div className="flex items-center gap-1.5 ml-1">
                  <label htmlFor="sop-prog-switcher" className="text-[10px] text-slate-400 uppercase font-semibold">
                    Program:
                  </label>
                  <select
                    id="sop-prog-switcher"
                    value={selectedProgramId}
                    onChange={(e) => onProgramChange(e.target.value)}
                    className="text-[11px] font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2 h-7 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg truncate focus:outline-none focus:border-slate-800 cursor-pointer shadow-xs"
                  >
                    {availablePrograms.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.university} — {prog.course}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs italic">No student loaded</span>
              {onOpenStudentSelect && (
                <button
                  type="button"
                  id="sop-select-student-btn"
                  onClick={onOpenStudentSelect}
                  className="h-7 px-3 rounded-lg bg-[#096491] hover:bg-[#074f74] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>+</span>
                  <span>Select Student from CRM</span>
                </button>
              )}

              {onOpenImport && (
                <button
                  type="button"
                  id="sop-import-btn"
                  onClick={onOpenImport}
                  className="h-7 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Import existing SOP (PDF / DOCX)"
                >
                  <span>📥</span>
                  <span>Import Existing SOP</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Review Progress & Word Count */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end text-xs">
              <span className="text-slate-500">
                <strong className={allRequiredApproved ? "text-emerald-700 font-semibold" : "text-slate-900 font-semibold"}>
                  {approvedCount}
                </strong>
                {" of "}
                {requiredCount} reviewed
              </span>

              {totalWordCount !== undefined && totalWordCount > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500 font-medium">
                    {totalWordCount} words
                  </span>
                </>
              )}
            </div>

            {/* Calm progress bar */}
            <div className="w-36 h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5 ml-auto">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  allRequiredApproved ? "bg-emerald-600" : "bg-slate-900"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (approvedCount / Math.max(1, requiredCount)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
