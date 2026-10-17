"use client";

import { useState, useRef, useEffect } from "react";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import type { DataSource, SopDocumentType } from "../types/sop-generator";

// ── Crisp bespoke SVG Icons ──────────────────────────────────────────────────
function ArrowsRightLeftIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function XIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function UploadCloudIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
    </svg>
  );
}

function EyeIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SidebarIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function DocumentTextIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function SaveDiskIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function FolderIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SparklesIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function UsersIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

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
  isGenerationBlocked?: boolean;
  generationBlockedReason?: string;
  // Redesign toggle controls
  isContextOpen?: boolean;
  onToggleContext?: () => void;
  isStoryStructureOpen?: boolean;
  onToggleStoryStructure?: () => void;
}

const DOC_STATUS_LABELS: Record<string, { label: string; colors: string }> = {
  draft:     { label: "Draft",     colors: "bg-slate-100 text-slate-600 border-slate-200" },
  in_review: { label: "In Review", colors: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:  { label: "Approved",  colors: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function WorkspaceHeader({
  templateName: _templateName,
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
  activeDocumentType = "VISA_COVER_LETTER",
  onDocumentTypeChange,
  isStudentLoaded = false,
  currentSource,
  availablePrograms = [],
  selectedProgramId,
  onProgramChange,
  onClearStudent,
  onOpenStudentSelect,
  onOpenImport,
  isGenerationBlocked = false,
  generationBlockedReason,
  isContextOpen = true,
  onToggleContext,
  isStoryStructureOpen = false,
  onToggleStoryStructure,
}: WorkspaceHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const statusCfg = DOC_STATUS_LABELS[documentStatus] ?? DOC_STATUS_LABELS.draft;
  const cleanStudentName = studentName.replace(/\s*-\s*$/, "").trim() || "Student";

  const initials =
    studentInitials ||
    cleanStudentName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "ST";

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
    <header className="flex-shrink-0 border-b border-slate-200/90 bg-white select-none">
      <div className="h-[54px] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 md:gap-4">
        {/* ── LEFT: Student / Switch Student / Import SOP ── */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {isStudentLoaded ? (
            <div className="flex items-center bg-slate-50/90 hover:bg-slate-100/70 border border-slate-200/90 rounded-lg p-0.5 transition-all shadow-2xs">
              {/* Clickable student persona badge */}
              <button
                type="button"
                onClick={onOpenStudentSelect}
                className="flex items-center gap-2 pl-1 pr-1.5 py-0.5 text-left cursor-pointer"
                title={`${cleanStudentName} (Click to switch student)`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white font-semibold text-[10px] flex items-center justify-center flex-shrink-0 ring-1 ring-white shadow-2xs">
                  {initials}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-slate-900 text-xs truncate max-w-[110px] sm:max-w-[150px] md:max-w-[180px]">
                    {cleanStudentName}
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
              </button>

              {/* Program switcher if multiple programs available */}
              {availablePrograms.length > 1 && onProgramChange && (
                <div className="border-l border-slate-200/90 pl-1.5 pr-1">
                  <select
                    id="sop-prog-switcher"
                    value={selectedProgramId}
                    onChange={(e) => onProgramChange(e.target.value)}
                    className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 max-w-[110px] md:max-w-[140px] truncate focus:outline-none focus:border-slate-800 cursor-pointer shadow-2xs"
                    title="Select applied program"
                  >
                    {availablePrograms.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.university} — {prog.course}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Integrated actions: Switch & Clear */}
              <div className="flex items-center border-l border-slate-200/90 pl-0.5 pr-0.5 gap-0.5">
                {onOpenStudentSelect && (
                  <button
                    type="button"
                    id="sop-switch-student-btn"
                    onClick={onOpenStudentSelect}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
                    title={currentSource === "imported-sop" ? "Link this imported SOP to a student in CRM" : "Switch student from CRM"}
                    aria-label="Switch student"
                  >
                    <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                  </button>
                )}

                {onClearStudent && (
                  <button
                    type="button"
                    id="sop-clear-student-btn"
                    onClick={onClearStudent}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Clear student profile"
                    aria-label="Clear student profile"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-shrink-0">
              {onOpenStudentSelect && (
                <button
                  type="button"
                  id="sop-select-student-btn"
                  onClick={onOpenStudentSelect}
                  className="h-8 px-3 rounded-lg bg-[#096491] hover:bg-[#074f74] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span>Select Student</span>
                </button>
              )}

              {onOpenImport && (
                <button
                  type="button"
                  id="sop-import-btn"
                  onClick={onOpenImport}
                  className="h-8 px-3 rounded-lg border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Import existing SOP (PDF / DOCX)"
                >
                  <UploadCloudIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Import SOP</span>
                </button>
              )}
            </div>
          )}

          {/* Import SOP Button when student is loaded */}
          {isStudentLoaded && onOpenImport && (
            <button
              type="button"
              id="sop-import-btn-loaded"
              onClick={onOpenImport}
              className="hidden lg:flex h-8 px-2.5 rounded-lg border border-slate-200/90 text-slate-600 bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer items-center gap-1.5 flex-shrink-0"
              title="Import existing SOP for this student"
            >
              <UploadCloudIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Import SOP</span>
            </button>
          )}
        </div>

        {/* Divider before Center Document Type Switcher */}
        <div className="hidden lg:block h-3.5 w-px bg-slate-200/80 mx-1 flex-shrink-0" />

        {/* ── CENTER: Visa Cover Letter | University SOP ── */}
        <div className="flex items-center flex-shrink-0">
          {onDocumentTypeChange && (
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/90 text-xs shadow-2xs">
              <button
                type="button"
                id="sop-doc-type-visa-btn"
                onClick={() => onDocumentTypeChange("VISA_COVER_LETTER")}
                className={`h-7 px-3 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center ${
                  activeDocumentType === "VISA_COVER_LETTER"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Visa Cover Letter
              </button>
              <button
                type="button"
                id="sop-doc-type-sop-btn"
                onClick={() => onDocumentTypeChange("UNIVERSITY_SOP")}
                className={`h-7 px-3 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center ${
                  activeDocumentType === "UNIVERSITY_SOP"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                University SOP
              </button>
            </div>
          )}
        </div>

        {/* Divider after Center Document Type Switcher */}
        <div className="hidden lg:block h-3.5 w-px bg-slate-200/80 mx-1 flex-shrink-0" />

        {/* ── RIGHT: Review Progress | Context | Preview | Approve | More ── */}
        <div className="flex items-center gap-2 md:gap-2.5 flex-shrink-0">
          {/* Saved notice or auto-saving state */}
          {savedNoticeText ? (
            <span className="hidden xl:inline-flex text-[11px] text-emerald-700 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 animate-fade-in items-center gap-1">
              <span>✓</span>
              <span>{savedNoticeText.replace(/^✓\s*/, "")}</span>
            </span>
          ) : isSavingDraft ? (
            <span className="hidden xl:inline text-[11px] text-slate-400">Saving…</span>
          ) : null}

          {/* Document Word Count Badge */}
          {totalWordCount !== undefined && totalWordCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium border-r border-slate-200/90 pr-2.5">
              <span>{totalWordCount} words</span>
            </div>
          )}

          {/* Context Panel Toggle */}
          {onToggleContext && (
            <button
              type="button"
              id="sop-toggle-context-btn"
              onClick={onToggleContext}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                isContextOpen
                  ? "bg-slate-100 border-slate-300 text-slate-900 font-semibold"
                  : "bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50"
              }`}
              title={isContextOpen ? "Hide Context panel" : "Show Context panel"}
            >
              <SidebarIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Context</span>
              {hasErrors && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Validation errors present" />
              )}
            </button>
          )}

          {/* Preview CTA */}
          <button
            type="button"
            id="sop-preview-btn"
            onClick={onPreview}
            className="h-8 px-3 rounded-lg border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Clean full-document preview modal"
          >
            <EyeIcon className="w-3 h-3 text-slate-500" />
            <span>Preview</span>
          </button>

          {/* Primary CTA: Download PDF */}
          {onDownloadPdf && (
            <button
              type="button"
              id="sop-download-pdf-btn"
              onClick={onDownloadPdf}
              disabled={isGeneratingPdf}
              className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              title="Download official PDF document"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="animate-spin text-white">⟳</span>
                  <span>Generating PDF…</span>
                </>
              ) : (
                <>
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          )}

          {/* More actions overflow menu (•••) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              id="sop-header-more-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-8 w-8 rounded-lg border border-slate-200/90 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
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
                {/* Toggle Story Structure (Reversible Navigation) */}
                {onToggleStoryStructure && (
                  <button
                    type="button"
                    id="sop-toggle-story-structure-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleStoryStructure();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 cursor-pointer"
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2">
                      <DocumentTextIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Story Structure</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isStoryStructureOpen ? "Hide" : "Show"}
                    </span>
                  </button>
                )}

                {/* Import Existing SOP */}
                {onOpenImport && (
                  <button
                    type="button"
                    id="sop-menu-import-btn"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenImport();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                    role="menuitem"
                  >
                    <UploadCloudIcon className="w-3.5 h-3.5 text-slate-500" />
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
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  role="menuitem"
                >
                  <span className="flex items-center gap-2">
                    <SaveDiskIcon className="w-3.5 h-3.5 text-slate-500" />
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
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2">
                      <FolderIcon className="w-3.5 h-3.5 text-slate-500" />
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
                    disabled={isGeneratingAllAi || isGenerationBlocked}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 disabled:opacity-50 cursor-pointer"
                    title={isGenerationBlocked ? (generationBlockedReason || "AI generation blocked for sensitive sections") : undefined}
                    role="menuitem"
                  >
                    <SparklesIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isGeneratingAllAi ? "Generating AI…" : "Generate All AI"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
