"use client";

import { useState, useRef, useEffect } from "react";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";

interface ResumeWorkspaceHeaderProps {
  documentTitle?: string;
  studentName?: string;
  studentInitials?: string;
  destinationSummary?: string;
  isStudentLoaded?: boolean;
  availablePrograms?: NormalizedAppliedProgram[];
  selectedProgramId?: string;
  onProgramChange?: (programId: string) => void;
  onOpenStudentSelect?: () => void;
  onClearStudent?: () => void;
  filledSectionsCount: number;
  totalSectionsCount: number;
  isSavingDraft?: boolean;
  savedNoticeText?: string | null;
  onSaveDraft?: () => void;
  onOpenDrafts?: () => void;
  draftCount?: number;
  onNewResume?: () => void;
  onOpenRawData?: () => void;
  onOpenDevTools?: () => void;
  onGeneratePdf: () => void;
  isGeneratingPdf?: boolean;
  pdfErrorMessage?: string | null;
  viewMode?: "split" | "editor" | "preview";
  onViewModeChange?: (mode: "split" | "editor" | "preview") => void;
  isContextOpen?: boolean;
  onToggleContext?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function ResumeWorkspaceHeader({
  documentTitle = "Europass Resume",
  studentName = "Student",
  studentInitials,
  destinationSummary,
  isStudentLoaded = false,
  availablePrograms = [],
  selectedProgramId,
  onProgramChange,
  onOpenStudentSelect,
  onClearStudent,
  filledSectionsCount,
  totalSectionsCount,
  isSavingDraft = false,
  savedNoticeText,
  onSaveDraft,
  onOpenDrafts,
  draftCount = 0,
  onNewResume,
  onOpenRawData,
  onOpenDevTools,
  onGeneratePdf,
  isGeneratingPdf = false,
  pdfErrorMessage,
  viewMode = "split",
  onViewModeChange,
  isContextOpen = false,
  onToggleContext,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: ResumeWorkspaceHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials =
    studentInitials ||
    studentName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "ST";

  const isComplete = filledSectionsCount >= totalSectionsCount && totalSectionsCount > 0;
  const progressPercent = Math.min(
    100,
    Math.round((filledSectionsCount / Math.max(1, totalSectionsCount)) * 100)
  );

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
    <header className="flex-shrink-0 border-b border-slate-200/90 bg-white z-10 select-none">
      {/* ── Single Consolidated Workspace Header Bar (~52px) ── */}
      <div className="px-5 h-[52px] flex items-center justify-between gap-3">
        {/* Left: Breadcrumbs + Student Persona / Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile/Tablet sidebar toggle button */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 cursor-pointer"
              title={isSidebarCollapsed ? "Show Resume Structure" : "Hide Resume Structure"}
              aria-label="Toggle navigation sidebar"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
          )}

          {/* Minimal breadcrumb */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 flex-shrink-0">
            <span>Documents</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 font-medium">Resume</span>
            <span className="text-slate-300">/</span>
          </nav>

          {/* Student Persona badge or Select Student button */}
          {isStudentLoaded ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100/90 border border-slate-200/80 max-w-xs md:max-w-sm lg:max-w-md truncate">
                <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-semibold text-[10px] flex items-center justify-center flex-shrink-0">
                  {initials}
                </div>
                <span className="font-semibold text-slate-900 text-xs truncate">
                  {studentName}
                </span>

                {availablePrograms.length > 1 && onProgramChange ? (
                  <select
                    id="resume-prog-switcher"
                    value={selectedProgramId}
                    onChange={(e) => onProgramChange(e.target.value)}
                    className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 max-w-[140px] truncate focus:outline-none focus:border-slate-800 cursor-pointer shadow-2xs"
                  >
                    {availablePrograms.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.university} — {prog.course}
                      </option>
                    ))}
                  </select>
                ) : destinationSummary ? (
                  <span className="text-[11px] text-slate-500 font-normal hidden xl:inline truncate max-w-[180px]">
                    · {destinationSummary}
                  </span>
                ) : null}
              </div>

              {onOpenStudentSelect && (
                <button
                  type="button"
                  id="resume-switch-student-btn"
                  onClick={onOpenStudentSelect}
                  className="h-7 px-2 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  title="Switch student from CRM"
                >
                  <span>⇄</span>
                  <span className="hidden md:inline">Switch</span>
                </button>
              )}

              {onClearStudent && (
                <button
                  type="button"
                  id="resume-clear-student-btn"
                  onClick={onClearStudent}
                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors flex items-center justify-center cursor-pointer"
                  title="Clear student profile"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {onOpenStudentSelect && (
                <button
                  type="button"
                  id="resume-select-student-btn"
                  onClick={onOpenStudentSelect}
                  className="h-7.5 px-3 rounded-lg bg-[#096491] hover:bg-[#074f74] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>+</span>
                  <span>Select Student from CRM</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Center: View Switcher (Editor | Split | Preview) + Completeness */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {onViewModeChange && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[11px]">
              <button
                type="button"
                onClick={() => onViewModeChange("editor")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "editor"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("split")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "split"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("preview")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === "preview"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Preview
              </button>
            </div>
          )}

          {/* Calm completeness status */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
            <span>
              <strong className={isComplete ? "text-emerald-700" : "text-slate-900"}>
                {filledSectionsCount}
              </strong>
              /{totalSectionsCount} filled
            </span>
            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete ? "bg-emerald-600" : "bg-slate-800"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Saved status + Context Drawer Trigger + Primary Generate PDF + Overflow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Saved status notice */}
          {savedNoticeText ? (
            <span className="text-[11px] text-emerald-700 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center gap-1">
              <span>✓</span>
              <span>Saved</span>
            </span>
          ) : isSavingDraft ? (
            <span className="text-[11px] text-slate-400">Saving…</span>
          ) : null}

          {/* On-Demand Profile Context Drawer Trigger */}
          {onToggleContext && (
            <button
              type="button"
              id="resume-context-drawer-btn"
              onClick={onToggleContext}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                isContextOpen
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              }`}
              title="Toggle student & target application context drawer"
            >
              <span className="text-xs">ℹ</span>
              <span className="hidden sm:inline">Context</span>
            </button>
          )}

          {/* Primary Action: Generate PDF (Single, authoritative button) */}
          <button
            type="button"
            id="generate-pdf-btn"
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf}
            className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            aria-label="Generate and download PDF"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={isGeneratingPdf ? "animate-spin" : ""}
            >
              {isGeneratingPdf ? (
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              ) : (
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </>
              )}
            </svg>
            <span>{isGeneratingPdf ? "Generating…" : "Generate PDF"}</span>
          </button>

          {/* Secondary Actions Overflow Menu (•••) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              id="resume-header-more-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
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
                className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs text-slate-700 divide-y divide-slate-100"
                role="menu"
              >
                {/* Draft Actions */}
                <div className="py-1">
                  {onSaveDraft && (
                    <button
                      type="button"
                      id="resume-menu-save-draft-btn"
                      onClick={() => {
                        setMenuOpen(false);
                        onSaveDraft();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                      role="menuitem"
                    >
                      <span className="flex items-center gap-2">
                        <span>💾</span>
                        <span>Save Draft</span>
                      </span>
                    </button>
                  )}

                  {onOpenDrafts && (
                    <button
                      type="button"
                      id="resume-menu-open-drafts-btn"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenDrafts();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
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

                  {onNewResume && (
                    <button
                      type="button"
                      id="resume-menu-new-btn"
                      onClick={() => {
                        setMenuOpen(false);
                        onNewResume();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                      role="menuitem"
                    >
                      <span>＋</span>
                      <span>New Blank Resume</span>
                    </button>
                  )}
                </div>

                {/* Inspect & Technical Tools */}
                <div className="py-1">
                  {onOpenRawData && (
                    <button
                      type="button"
                      id="resume-menu-raw-data-btn"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenRawData();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                      role="menuitem"
                    >
                      <span>📋</span>
                      <span>View Raw Student Data</span>
                    </button>
                  )}

                  {onOpenDevTools && (
                    <button
                      type="button"
                      id="resume-menu-devtools-btn"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenDevTools();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                      role="menuitem"
                    >
                      <span>🔗</span>
                      <span>Developer Tools (Webhook)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error banner if PDF generation fails ── */}
      {pdfErrorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 px-5 py-2 bg-red-50 border-t border-red-200 text-red-700 text-xs font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>PDF generation failed: {pdfErrorMessage}</span>
        </div>
      )}
    </header>
  );
}
