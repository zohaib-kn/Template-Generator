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

import { useState } from "react";
import type { StudentDocumentContext } from "../types/sop-generator";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import {
  mapCrmToNormalizedStudent,
  mapNormalizedToSop,
} from "@/services/normalization";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DataSource = "live-crm" | "cached-crm" | "test-data";

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

interface ParsedStudentInput {
  studentId?: string;
  key?: string;
  baseUrl?: string;
  isBareKey?: boolean;
}

/** Extract Student ID, key, and baseUrl from plain text, MongoDB ObjectId, or full CRM URL. */
function parseStudentInput(input: string): ParsedStudentInput {
  const trimmed = input.trim();
  if (!trimmed) return {};

  // If user pasted a 32+ char hex string that isn't a URL, they pasted an API key by mistake
  if (/^[0-9a-fA-F]{32,}$/.test(trimmed)) {
    return { isBareKey: true };
  }

  // If input is a URL or partial URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes("/api/students/")
  ) {
    try {
      const fullUrl = trimmed.startsWith("http")
        ? trimmed
        : `https://dummy.local${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
      const urlObj = new URL(fullUrl);

      const pathIdMatch = urlObj.pathname.match(/[0-9a-fA-F]{24}/);
      const studentId = pathIdMatch ? pathIdMatch[0] : undefined;
      const key = urlObj.searchParams.get("key")?.trim() || undefined;
      const baseUrl = trimmed.startsWith("http") ? urlObj.origin : undefined;
      return { studentId, key, baseUrl };
    } catch {
      // fallback to regex
    }
  }

  // Plain student ID
  const match = trimmed.match(/[0-9a-fA-F]{24}/);
  return { studentId: match ? match[0] : undefined };
}

function sourceLabel(source: DataSource): string {
  if (source === "live-crm") return "Live CRM";
  if (source === "cached-crm") return "Cached CRM";
  return "Test Data";
}

function sourceBadgeClass(source: DataSource): string {
  if (source === "live-crm")
    return "bg-violet-100 text-violet-700 border-violet-200";
  if (source === "cached-crm")
    return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
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
  const [studentInput, setStudentInput] = useState("");
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ kind: "idle" });

  // Multiple-program selector state
  const [currentSnapshot, setCurrentSnapshot] = useState<CrmSnapshot | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<NormalizedAppliedProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [activeCrmSource, setActiveCrmSource] = useState<
    "senior-crm-api" | "cached-snapshot"
  >("cached-snapshot");

  // ── Fetch student from internal backend ─────────────────────────────────

  async function handleLoadStudent(overrideId?: string) {
    const rawInput = (typeof overrideId === "string" ? overrideId : studentInput).trim();
    const parsed = parseStudentInput(rawInput);

    if (parsed.isBareKey) {
      setFetchStatus({
        kind: "error",
        message:
          "You pasted the API key instead of the Student ID or full URL. Please paste the full CRM URL or the 24-character Student ID.",
      });
      return;
    }

    if (!parsed.studentId || !/^[0-9a-fA-F]{24}$/.test(parsed.studentId)) {
      setFetchStatus({
        kind: "error",
        message: "Please enter a valid 24-character hexadecimal Student ID or CRM URL.",
      });
      return;
    }

    const effectiveId = parsed.studentId;
    setFetchStatus({ kind: "loading" });

    try {
      const queryParams = new URLSearchParams();
      if (parsed.key) queryParams.set("key", parsed.key);
      if (parsed.baseUrl) queryParams.set("baseUrl", parsed.baseUrl);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const res = await fetch(`/api/student/${effectiveId}${queryString}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const errCode: string = json.error?.code ?? "";
        let msg =
          json.error?.message ?? `Failed to load student (HTTP ${res.status}).`;

        // Counsellor-friendly overrides
        if (errCode === "STUDENT_NOT_FOUND")
          msg = "Student not found. Please check the ID.";
        if (errCode === "INVALID_STUDENT_ID")
          msg =
            "Invalid Student ID format. Please enter a 24-character hexadecimal ID.";
        if (errCode === "UPSTREAM_TIMEOUT")
          msg = "The CRM service timed out. Please try again.";
        if (errCode === "CONFIG_ERROR")
          msg = "Senior CRM API is not configured on this server.";

        setFetchStatus({ kind: "error", message: msg });
        return;
      }

      // 1. Map raw CRM snapshot → NormalizedStudentProfile
      const rawSnapshot = json.data as CrmSnapshot;
      const crmSource = json.source as "senior-crm-api" | "cached-snapshot";
      const normalized = mapCrmToNormalizedStudent(rawSnapshot, { source: crmSource });

      // 2. Project NormalizedStudentProfile → StudentDocumentContext (SOP shape)
      const sopCtx = mapNormalizedToSop(normalized);

      // 3. Determine counsellor-facing data source badge
      const dataSource: DataSource =
        crmSource === "senior-crm-api" ? "live-crm" : "cached-crm";

      // 4. Retain state for multi-program selector
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

      // 5. Notify SopWorkspace with full payload
      onStudentLoaded({
        ctx: sopCtx,
        studentId: effectiveId,
        studentName,
        source: dataSource,
        availablePrograms: normalized.applications.all,
        selectedProgramId: activeProgramId,
      });
    } catch (err: unknown) {
      setFetchStatus({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Network error. Unable to reach the CRM.",
      });
    }
  }

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

  // ── Clear ────────────────────────────────────────────────────────────────

  function handleClear() {
    setStudentInput("");
    setFetchStatus({ kind: "idle" });
    setCurrentSnapshot(null);
    setAvailablePrograms([]);
    setSelectedProgramId("");
    onClearStudent();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex-shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-2.5"
      aria-label="Student loader"
    >
      <div className="flex items-start gap-3 flex-wrap">

        {/* Label + badge */}
        <div className="flex flex-col justify-center min-w-0 flex-shrink-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
              📥 Load Student
            </span>
            {isStudentLoaded && currentSource && (
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${sourceBadgeClass(
                  currentSource
                )}`}
              >
                {sourceLabel(currentSource)}
              </span>
            )}
            {isStudentLoaded && loadedStudentName && (
              <span className="text-[11px] text-slate-600 font-medium truncate max-w-[200px]">
                — {loadedStudentName}
              </span>
            )}
          </div>
          {!isStudentLoaded && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              Enter a Student ID to populate this workspace with real CRM data.
            </p>
          )}
        </div>

        {/* Input row — only when no student loaded */}
        {!isStudentLoaded && (
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            {/* Text input */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <input
                id="sop-student-id-input"
                type="text"
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLoadStudent();
                }}
                placeholder="Student ID (24-char hex)"
                aria-label="Student ID"
                className="w-full text-[11px] bg-white border border-slate-300 rounded-lg
                           pl-2.5 pr-7 py-1.5 text-slate-800 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-500
                           focus:border-transparent transition-all shadow-sm"
              />
              {studentInput.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setStudentInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[11px] font-bold"
                  title="Clear input"
                  aria-label="Clear student ID input"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Preset chips */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
              <button
                type="button"
                id="sop-preset-kaavya"
                onClick={() => {
                  const id = "6a508a96af13bb33e9fc07ce";
                  setStudentInput(id);
                  handleLoadStudent(id);
                }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200 active:scale-95 transition-all"
                title="Kaavya Girish Nair"
              >
                👩‍⚖️ Kaavya
              </button>
              <button
                type="button"
                id="sop-preset-fardee"
                onClick={() => {
                  const id = "69e600e750f7c6e4051f547e";
                  setStudentInput(id);
                  handleLoadStudent(id);
                }}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200 active:scale-95 transition-all"
                title="Fardee Kumar"
              >
                👨‍💻 Fardee
              </button>
            </div>

            {/* Load button */}
            <button
              id="sop-load-student-btn"
              onClick={() => handleLoadStudent()}
              disabled={fetchStatus.kind === "loading"}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                         bg-indigo-600 text-white hover:bg-indigo-700
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-95 transition-all shadow-sm whitespace-nowrap"
            >
              {fetchStatus.kind === "loading" ? "Loading…" : "Load Student"}
            </button>
          </div>
        )}

        {/* Loaded row — multi-program selector + clear button */}
        {isStudentLoaded && (
          <div className="flex items-center gap-2 flex-wrap">
            {availablePrograms.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="sop-program-selector"
                  className="text-[10px] font-semibold text-slate-500 whitespace-nowrap"
                >
                  🎯 Program:
                </label>
                <select
                  id="sop-program-selector"
                  value={selectedProgramId}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="text-[11px] font-medium text-slate-800 bg-white border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm max-w-[300px]"
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
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg
                         border border-slate-300 text-slate-600 bg-white
                         hover:bg-red-50 hover:border-red-300 hover:text-red-600
                         active:scale-95 transition-all"
              title="Clear and load a different student"
            >
              ✕ Clear Student
            </button>
          </div>
        )}
      </div>

      {/* Status messages (full row below) */}
      {(fetchStatus.kind === "loading" || fetchStatus.kind === "error") && (
        <div className="mt-1.5">
          {fetchStatus.kind === "loading" && (
            <p className="text-[10px] text-indigo-500 animate-pulse">
              Fetching student via /api/student/[id]…
            </p>
          )}
          {fetchStatus.kind === "error" && (
            <div
              role="alert"
              className="inline-flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2.5 py-1"
            >
              <span className="text-red-600 font-bold text-[11px]">✕</span>
              <span className="text-[11px] text-red-700">{fetchStatus.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
