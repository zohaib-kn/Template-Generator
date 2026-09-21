"use client";

/**
 * SopStudentLoader
 *
 * Compact, self-contained student-loading control for the SOP Generator.
 *
 * Flow:
 *   Counsellor enters Student ID
 *         ↓
 *   GET /api/student/[studentId]   (Next.js backend proxy — CRM key never sent to browser)
 *         ↓
 *   CrmSnapshot
 *         ↓
 *   mapCrmToNormalizedStudent()
 *         ↓
 *   mapNormalizedToSop()
 *         ↓
 *   StudentDocumentContext   (passed back to SopWorkspace via onStudentLoaded)
 *
 * Security:
 *   SENIOR_API_KEY / SENIOR_API_BASE_URL are server-side only.
 *   No sensitive PII is logged here.
 *
 * Phase 2.6 — Real data integration.
 * AI integration is intentionally absent (future phase).
 */

import { useState, useEffect, useCallback } from "react";
import type { StudentDocumentContext, DataSource } from "../types/sop-generator";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import {
  mapCrmToNormalizedStudent,
  mapNormalizedToSop,
} from "@/services/normalization";
import { StudentDropdown } from "@/components/common/StudentDropdown";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { DataSource };

export interface SopStudentLoadedPayload {
  ctx: StudentDocumentContext;
  studentId: string;
  studentName: string;
  source: DataSource;
  availablePrograms: NormalizedAppliedProgram[];
  selectedProgramId: string;
}

interface SopStudentLoaderProps {
  /** Called when a student is successfully loaded. SopWorkspace owns the ctx state. */
  onStudentLoaded: (payload: SopStudentLoadedPayload) => void;
  /** Called when counsellor clears the live student and reverts to test data. */
  onClearStudent: () => void;
  /** Whether a live student is currently loaded (drives UI toggle). */
  isStudentLoaded: boolean;
  /** Currently loaded student name (for display only). */
  loadedStudentName?: string;
  /** Current data source (for badge display). */
  currentSource?: DataSource;
}

type FetchStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; name: string; source: DataSource }
  | { kind: "error"; message: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function sourceLabel(source: DataSource): string {
  if (source === "live-crm") return "Live CRM";
  if (source === "cached-crm") return "Cached CRM";
  return "Test Data";
}

function sourceBadgeClass(source: DataSource): string {
  if (source === "live-crm")
    return "bg-[#F0F7FA] text-[#096491] border-[#D2E7F0]";
  if (source === "cached-crm")
    return "bg-[#FAF8F5] text-[#8C6B38] border-[#EFE7D8]";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SopStudentLoader({
  onStudentLoaded,
  onClearStudent,
  isStudentLoaded,
  loadedStudentName,
  currentSource,
}: SopStudentLoaderProps) {
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ kind: "idle" });

  // Global student context — shared across Resume, SOP, LOR
  const {
    selectedStudentData,
    selectedStudentId,
    loadStatus: globalLoadStatus,
    clearStudent,
  } = useGlobalStudent();

  // Multiple-program selector state
  const [currentSnapshot, setCurrentSnapshot] = useState<CrmSnapshot | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<NormalizedAppliedProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [activeCrmSource, setActiveCrmSource] = useState<
    "senior-crm-api" | "cached-snapshot"
  >("cached-snapshot");

  // ── React to global student selection ──────────────────────────────────────
  const handleGlobalStudentLoaded = useCallback((studentId: string) => {
    if (!selectedStudentData) return;
    const rawSnapshot = selectedStudentData;
    const crmSource = "senior-crm-api" as const;
    const normalized = mapCrmToNormalizedStudent(rawSnapshot, { source: crmSource });
    const sopCtx = mapNormalizedToSop(normalized);
    const dataSource: DataSource = "live-crm";

    setCurrentSnapshot(rawSnapshot);
    setActiveCrmSource(crmSource);
    setAvailablePrograms(normalized.applications.all);
    const activeProgramId =
      normalized.applications.activeProgramId ||
      normalized.applications.all[0]?.id ||
      "";
    setSelectedProgramId(activeProgramId);

    const studentName = normalized.personal.fullName || "Student";
    setFetchStatus({ kind: "success", name: studentName, source: dataSource });

    onStudentLoaded({
      ctx: sopCtx,
      studentId,
      studentName,
      source: dataSource,
      availablePrograms: normalized.applications.all,
      selectedProgramId: activeProgramId,
    });
  }, [selectedStudentData, onStudentLoaded]);

  // Reset when student is cleared
  useEffect(() => {
    if (!selectedStudentId) {
      setFetchStatus({ kind: "idle" });
      setCurrentSnapshot(null);
      setAvailablePrograms([]);
      setSelectedProgramId("");
    }
  }, [selectedStudentId]);



  // ── Program change ───────────────────────────────────────────────────────

  function handleProgramChange(programId: string) {
    if (!currentSnapshot) return;
    setSelectedProgramId(programId);

    // Re-project with updated active program
    const updatedNormalized = mapCrmToNormalizedStudent(currentSnapshot, {
      source: activeCrmSource,
      activeProgramId: programId,
    });
    const updatedCtx = mapNormalizedToSop(updatedNormalized);
    const dataSource: DataSource =
      activeCrmSource === "senior-crm-api" ? "live-crm" : "cached-crm";

    onStudentLoaded({
      ctx: updatedCtx,
      studentId: updatedNormalized.meta.studentId,
      studentName: updatedNormalized.personal.fullName || "Student",
      source: dataSource,
      availablePrograms: updatedNormalized.applications.all,
      selectedProgramId: programId,
    });
  }

  // ── Clear ─────────────────────────────────────────────────────────────────────────

  function handleClear() {
    setFetchStatus({ kind: "idle" });
    setCurrentSnapshot(null);
    setAvailablePrograms([]);
    setSelectedProgramId("");
    clearStudent(); // also clear from global context
    onClearStudent();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-3 min-h-[64px] flex flex-col justify-center"
      aria-label="Student loader"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* Left: Label + badge */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#F0F7FA] text-[#096491] border border-[#D2E7F0] flex items-center justify-center text-xs flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
              Load Student
            </span>
            {isStudentLoaded && currentSource && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${sourceBadgeClass(
                  currentSource
                )}`}
              >
                {sourceLabel(currentSource)}
              </span>
            )}
            {isStudentLoaded && loadedStudentName && (
              <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                — {loadedStudentName}
              </span>
            )}
          </div>
        </div>

        {/* Center & Right: Dropdown — when no student loaded */}
        {!isStudentLoaded && (
          <div className="flex items-center gap-3 flex-1 justify-end min-w-0 flex-wrap">
            <StudentDropdown
              onStudentSelected={handleGlobalStudentLoaded}
              compact
              className="flex-1 min-w-[220px] max-w-[360px]"
            />
          </div>
        )}

        {/* Loaded state: program selector + clear button */}
        {isStudentLoaded && (
          <div className="flex items-center gap-3 flex-wrap">
            {availablePrograms.length > 1 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="sop-program-selector"
                  className="text-[11px] font-medium text-slate-500 whitespace-nowrap"
                >
                  Program:
                </label>
                <select
                  id="sop-program-selector"
                  value={selectedProgramId}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 h-8 focus:outline-none focus:border-[#096491] focus:ring-1 focus:ring-[#096491] shadow-xs max-w-[320px]"
                >
                  {availablePrograms.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.country} — {prog.university} — {prog.course}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              id="sop-clear-student-btn"
              onClick={handleClear}
              className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs font-medium transition-colors shadow-xs flex items-center gap-1"
              title="Clear and load a different student"
            >
              <span>✕</span>
              <span>Clear Student</span>
            </button>
          </div>
        )}
      </div>

      {/* Status feedback row */}
      {(fetchStatus.kind === "loading" || fetchStatus.kind === "error") && (
        <div className="mt-2">
          {fetchStatus.kind === "loading" && (
            <p className="text-[11px] text-[#096491] animate-pulse flex items-center gap-1.5">
              <span>Fetching student record from CRM…</span>
            </p>
          )}
          {fetchStatus.kind === "error" && (
            <div
              role="alert"
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5"
            >
              <span className="text-red-600 font-bold text-xs">✕</span>
              <span className="text-xs text-red-700">{fetchStatus.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
