"use client";

import { useState, useRef, useEffect } from "react";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import type { AcademicAlignmentResult } from "@/services/academicAlignment/types";

// ── Crisp, bespoke SVG Icons ──────────────────────────────────────────────────
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

function PlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ArrowsUpDownIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 15l5 5 5-5" />
      <path d="M7 9l5-5 5 5" />
    </svg>
  );
}

function ListBulletIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PencilIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
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

function CheckIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function InfoIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
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

function DotsVerticalIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function SaveIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function FolderIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FilePlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function UploadCloudIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
    </svg>
  );
}

function DatabaseIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function TerminalIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function UserPlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

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
  onOpenImport?: () => void;
  onOpenAddContent?: () => void;
  onOpenRearrange?: () => void;
  onOpenSectionsDrawer?: () => void;
  filledSectionsCount: number;
  totalSectionsCount: number;
  activeSectionsCount?: number;
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
  viewMode?: "split" | "editor" | "preview" | "edit";
  onViewModeChange?: (mode: any) => void;
  isContextOpen?: boolean;
  onToggleContext?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  alignmentResult?: AcademicAlignmentResult;
  isStale?: boolean;
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
  onOpenImport,
  onOpenAddContent,
  onOpenRearrange,
  onOpenSectionsDrawer,
  filledSectionsCount,
  totalSectionsCount,
  activeSectionsCount,
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
  alignmentResult,
  isStale = false,
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

  const effectiveActiveSections = activeSectionsCount ?? filledSectionsCount;

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

  const hasAdvisory =
    Boolean(alignmentResult) &&
    (alignmentResult?.status === "ACADEMIC_MISMATCH" ||
      alignmentResult?.status === "UNKNOWN" ||
      isStale);

  return (
    <header className="flex-shrink-0 border-b border-slate-200/90 bg-white z-10 select-none shadow-2xs">
      {/* ── Main Consolidated Workspace Header Bar (~54px) ── */}
      <div className="px-3 sm:px-4 md:px-5 h-[54px] flex items-center justify-between gap-2 md:gap-3">
        {/* ── Left Group: Breadcrumbs + Candidate Identity Chip ── */}
        <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-shrink-0">
          {/* Mobile/Tablet sidebar toggle button */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Show Resume Structure" : "Hide Resume Structure"}
              aria-label="Toggle navigation sidebar"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
          )}

          {/* Clean breadcrumb */}
          <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
            <span className="hover:text-slate-600 transition-colors">Documents</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-semibold">Resume</span>
          </nav>

          <div className="hidden lg:block h-3.5 w-px bg-slate-200 mx-0.5 flex-shrink-0" />

          {/* Candidate Persona Badge (Loaded) or Select Student (Unloaded) */}
          {isStudentLoaded ? (
            <div className="flex items-center bg-slate-50/90 hover:bg-slate-100/70 border border-slate-200/90 rounded-lg p-0.5 transition-all shadow-2xs group flex-shrink-0">
              {/* Clickable student info pill */}
              <button
                type="button"
                onClick={onOpenStudentSelect}
                className="flex items-center gap-2 pl-1 pr-1.5 py-0.5 text-left cursor-pointer transition-colors"
                title={`${studentName}${destinationSummary ? ` · ${destinationSummary}` : ""} (Click to switch candidate)`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white font-semibold text-[10px] flex items-center justify-center flex-shrink-0 shadow-2xs ring-1 ring-white">
                  {initials}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-slate-900 text-xs truncate max-w-[110px] sm:max-w-[150px] md:max-w-[190px]">
                    {studentName}
                  </span>
                  {availablePrograms.length > 1 && onProgramChange ? (
                    <select
                      id="resume-prog-switcher"
                      value={selectedProgramId}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onProgramChange(e.target.value)}
                      className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 max-w-[110px] md:max-w-[150px] truncate focus:outline-none focus:border-slate-800 cursor-pointer shadow-2xs"
                      title="Select applied program"
                    >
                      {availablePrograms.map((prog) => (
                        <option key={prog.id} value={prog.id}>
                          {prog.university} — {prog.course}
                        </option>
                      ))}
                    </select>
                  ) : destinationSummary ? (
                    <span className="text-[11px] text-slate-400 font-normal hidden 2xl:inline truncate max-w-[160px]">
                      · {destinationSummary}
                    </span>
                  ) : null}
                </div>
              </button>

              {/* Integrated Actions: Switch & Clear */}
              <div className="flex items-center border-l border-slate-200/90 pl-0.5 pr-0.5 gap-0.5">
                {onOpenStudentSelect && (
                  <button
                    type="button"
                    id="resume-switch-student-btn"
                    onClick={onOpenStudentSelect}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
                    title="Switch candidate from CRM"
                    aria-label="Switch candidate from CRM"
                  >
                    <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                  </button>
                )}

                {onClearStudent && (
                  <button
                    type="button"
                    id="resume-clear-student-btn"
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
                  id="resume-select-student-btn"
                  onClick={onOpenStudentSelect}
                  className="h-8 px-3 rounded-lg bg-[#096491] hover:bg-[#074f74] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  <span>Select Student from CRM</span>
                </button>
              )}

              {onOpenImport && (
                <button
                  type="button"
                  id="resume-import-btn"
                  onClick={onOpenImport}
                  className="h-8 px-3 rounded-lg border border-slate-200/90 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Import existing resume (PDF / DOCX)"
                >
                  <UploadCloudIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Import Resume</span>
                </button>
              )}
            </div>
          )}

          {/* Optional import shortcut for wide screens when student is active */}
          {isStudentLoaded && onOpenImport && (
            <button
              type="button"
              id="resume-import-btn-loaded"
              onClick={onOpenImport}
              className="hidden 2xl:flex h-8 px-2.5 rounded-lg border border-slate-200/90 text-slate-600 bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs cursor-pointer items-center gap-1.5 flex-shrink-0"
              title="Import existing resume (PDF / DOCX)"
            >
              <UploadCloudIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
            </button>
          )}
        </div>

        {/* ── Center Group: View Toggle + Document Structure Tools ── */}
        <div className="flex items-center gap-2 md:gap-2.5 flex-shrink-0">
          {/* Edit vs Preview Segmented Toggle */}
          {onViewModeChange && (
            <div className="flex items-center bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80 text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => onViewModeChange("edit")}
                className={`h-7 px-2.5 sm:px-3 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  viewMode !== "preview"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Interactive editing mode"
              >
                <PencilIcon className="w-3 h-3 text-slate-500" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("preview")}
                className={`h-7 px-2.5 sm:px-3 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  viewMode === "preview"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Print preview mode"
              >
                <EyeIcon className="w-3 h-3 text-slate-500" />
                <span>Preview</span>
              </button>
            </div>
          )}

          <div className="hidden sm:block h-3.5 w-px bg-slate-200 mx-0.5 flex-shrink-0" />

          {/* Structure Action 1: Add Content */}
          {onOpenAddContent && (
            <button
              type="button"
              id="resume-header-add-content-btn"
              onClick={onOpenAddContent}
              className="h-8 px-2.5 sm:px-3 rounded-lg bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer flex-shrink-0"
              title="Add a section to the resume"
            >
              <PlusIcon className="w-3.5 h-3.5 text-[#096491]" />
              <span className="hidden sm:inline">Add Content</span>
            </button>
          )}

          {/* Structure Action 2: Rearrange */}
          {onOpenRearrange && (
            <button
              type="button"
              id="resume-header-rearrange-btn"
              onClick={onOpenRearrange}
              className="h-8 px-2.5 sm:px-3 rounded-lg bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer flex-shrink-0"
              title="Rearrange section order"
            >
              <ArrowsUpDownIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Rearrange</span>
            </button>
          )}

          {/* Structure Action 3: Sections Drawer Trigger with Embedded Count Badge */}
          {onOpenSectionsDrawer && (
            <button
              type="button"
              id="resume-header-sections-btn"
              onClick={onOpenSectionsDrawer}
              className="h-8 px-2.5 sm:px-3 rounded-lg bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer flex-shrink-0"
              title="View and navigate all resume sections"
            >
              <ListBulletIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Sections</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                {effectiveActiveSections}
              </span>
            </button>
          )}
        </div>

        {/* ── Right Group: Saved Status + Context Trigger + Generate PDF + More Menu ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Subtle save indicator */}
          {savedNoticeText ? (
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-700 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 shadow-2xs flex-shrink-0">
              <CheckIcon className="w-3 h-3 text-emerald-600" />
              <span>Saved</span>
            </span>
          ) : isSavingDraft ? (
            <span className="text-[11px] text-slate-400 flex items-center gap-1 flex-shrink-0">
              <SpinnerIcon className="w-3 h-3 animate-spin text-slate-400" />
              <span>Saving…</span>
            </span>
          ) : null}

          {/* Profile & Target Context Drawer Trigger */}
          {onToggleContext && (
            <button
              type="button"
              id="resume-context-drawer-btn"
              onClick={onToggleContext}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer relative flex-shrink-0 ${
                isContextOpen
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90"
              }`}
              title="Toggle student & target application context drawer"
            >
              <InfoIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Context</span>
              {hasAdvisory && (
                <span
                  id="resume-header-alignment-indicator"
                  className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                  title={isStale ? "Alignment is outdated" : "Academic alignment advisory"}
                />
              )}
            </button>
          )}

          {/* Primary Action: Generate PDF */}
          <button
            type="button"
            id="generate-pdf-btn"
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf}
            className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer flex-shrink-0"
            aria-label="Generate and download PDF"
          >
            {isGeneratingPdf ? (
              <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <DownloadIcon className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingPdf ? "Generating…" : "Generate PDF"}</span>
          </button>

          {/* Secondary Actions Overflow Menu (•••) */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              type="button"
              id="resume-header-more-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-8 w-8 rounded-lg border border-slate-200/90 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="More actions"
              aria-label="More actions"
              aria-expanded={menuOpen}
            >
              <DotsVerticalIcon className="w-4 h-4" />
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
                      <span className="flex items-center gap-2.5">
                        <SaveIcon className="w-3.5 h-3.5 text-slate-500" />
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
                      <span className="flex items-center gap-2.5">
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

                  {onNewResume && (
                    <button
                      type="button"
                      id="resume-menu-new-btn"
                      onClick={() => {
                        setMenuOpen(false);
                        onNewResume();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 cursor-pointer"
                      role="menuitem"
                    >
                      <FilePlusIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>New Blank Resume</span>
                    </button>
                  )}

                  {onOpenImport && (
                    <button
                      type="button"
                      id="resume-menu-import-btn"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenImport();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 cursor-pointer"
                      role="menuitem"
                    >
                      <UploadCloudIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Import Existing Resume</span>
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
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 cursor-pointer"
                      role="menuitem"
                    >
                      <DatabaseIcon className="w-3.5 h-3.5 text-slate-500" />
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
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 cursor-pointer"
                      role="menuitem"
                    >
                      <TerminalIcon className="w-3.5 h-3.5 text-slate-500" />
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
