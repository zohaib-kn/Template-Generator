"use client";

import { useState, useEffect, useCallback } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import type { ApplicationTarget } from "../guidance/types";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { mapCrmToNormalizedStudent, mapNormalizedToResume } from "@/services/normalization";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import { StudentDropdown } from "@/components/common/StudentDropdown";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SendStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; httpStatus: number; message: string }
  | { kind: "error"; message: string };

type FetchStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; name: string; source: "senior-crm-api" | "cached-snapshot" | "mock" }
  | { kind: "error"; message: string };

interface WebhookToolbarProps {
  /** Called after a student is loaded from the CRM API with the detected ApplicationTarget. */
  onTargetDetected?: (target: Partial<ApplicationTarget>) => void;
  /** Called with the full raw CRM snapshot for the RawDataPanel. */
  onRawSnapshot?: (snapshot: CrmSnapshot | null, source: "crm-api" | "mock") => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * WebhookToolbar — integration test controls.
 *
 * Section A — Send to Webhook:
 *   state (possibly edited) → POST /api/resume-webhook → external webhook URL
 *
 * Section B — Load Student From CRM:
 *   Calls internal backend GET /api/student/[studentId]
 *     → Backend fetches Senior CRM (or cached dev fallback)
 *     → mapCrmToNormalizedStudent → mapNormalizedToResume
 *     → loadStudent → live preview + PDF
 *     → updates ApplicationTarget → triggers Admissions Guidance & Profile Suggestions
 *     → supports switching active program when multiple applications exist
 */
export function WebhookToolbar({ onTargetDetected, onRawSnapshot }: WebhookToolbarProps = {}) {
  const { data, loadTestStudent, loadStudent, reset } = useDocumentState();
  const { selectedStudentData, loadStatus: globalLoadStatus, selectedStudentId } = useGlobalStudent();

  // Section A state
  const [sendStatus, setSendStatus] = useState<SendStatus>({ kind: "idle" });

  // Section B state (kept for program selector after load)
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ kind: "idle" });

  // Multiple programs state
  const [currentSnapshot, setCurrentSnapshot] = useState<CrmSnapshot | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<NormalizedAppliedProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [currentSource, setCurrentSource] = useState<"senior-crm-api" | "cached-snapshot">("cached-snapshot");

  // Detect whether student data is loaded in state (to toggle Load / Clear)
  const isTestDataLoaded = Boolean(
    data.personal?.fullName ||
    (data.education ?? []).length > 0 ||
    (data.internships ?? []).length > 0 ||
    data.aboutMe
  );

  // ── React to global student selection ──────────────────────────────────────
  // When the user picks a student from the dropdown (in any module), load
  // their CRM snapshot into the Resume Builder automatically.
  const handleGlobalStudentLoaded = useCallback((studentId: string) => {
    if (!selectedStudentData) return;
    const rawSnapshot = selectedStudentData;
    const source = "senior-crm-api" as const;
    const normalized = mapCrmToNormalizedStudent(rawSnapshot, { source });
    const { student, target } = mapNormalizedToResume(normalized);

    loadStudent(student);

    if (target && onTargetDetected) onTargetDetected(target);
    if (onRawSnapshot) onRawSnapshot(rawSnapshot, "crm-api");

    setCurrentSnapshot(rawSnapshot);
    setCurrentSource(source);
    setAvailablePrograms(normalized.applications.all);
    setSelectedProgramId(normalized.applications.activeProgramId || (normalized.applications.all[0]?.id ?? ""));
    setFetchStatus({
      kind: "success",
      name: student.personal?.fullName ?? "Student",
      source,
    });
  }, [selectedStudentData, loadStudent, onTargetDetected, onRawSnapshot]);

  // Also reset fetchStatus if student is cleared
  useEffect(() => {
    if (!selectedStudentId) {
      setFetchStatus({ kind: "idle" });
      setAvailablePrograms([]);
      setCurrentSnapshot(null);
    }
  }, [selectedStudentId]);


  // ── Section A: Send current state to external webhook ─────────────────────
  async function handleSend() {
    setSendStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/resume-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: data }),
      });
      const json = (await res.json()) as {
        success: boolean;
        status: number;
        message: string;
      };
      if (json.success) {
        setSendStatus({ kind: "success", httpStatus: json.status, message: json.message });
      } else {
        setSendStatus({ kind: "error", message: json.message });
      }
    } catch (err: unknown) {
      setSendStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    }
  }


  // ── Handler: Active program changed by counsellor ─────────────────────────
  function handleProgramChange(programId: string) {
    if (!currentSnapshot) return;
    setSelectedProgramId(programId);

    // Re-project normalized student with the newly selected active program
    const updatedNormalized = mapCrmToNormalizedStudent(currentSnapshot, {
      source: currentSource,
      activeProgramId: programId,
    });
    const { target: newTarget } = mapNormalizedToResume(updatedNormalized);

    if (newTarget && onTargetDetected) {
      onTargetDetected(newTarget);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 space-y-3">

      {/* ── Section A: Send to external webhook ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest">
          🔗 Webhook Test
        </p>

        <div className="flex gap-2">
          {isTestDataLoaded ? (
            <button
              id="webhook-clear-btn"
              onClick={() => {
                reset();
                setSendStatus({ kind: "idle" });
                setFetchStatus({ kind: "idle" });
                setAvailablePrograms([]);
                setCurrentSnapshot(null);
              }}
              className="flex-1 text-[12px] font-semibold rounded-lg px-3 py-2
                         bg-white border border-slate-300 text-slate-600
                         hover:bg-slate-50 active:scale-95 transition-all"
            >
              ✕ Clear Data
            </button>
          ) : (
            <button
              id="webhook-load-btn"
              onClick={() => {
                loadTestStudent();
                setSendStatus({ kind: "idle" });
                setFetchStatus({ kind: "idle" });
                setAvailablePrograms([]);
                setCurrentSnapshot(null);
              }}
              className="flex-1 text-[12px] font-semibold rounded-lg px-3 py-2
                         bg-white border border-indigo-300 text-indigo-700
                         hover:bg-indigo-50 active:scale-95 transition-all"
            >
              👤 Load Test Student
            </button>
          )}

          <button
            id="webhook-send-btn"
            onClick={handleSend}
            disabled={sendStatus.kind === "sending"}
            className="flex-1 text-[12px] font-semibold rounded-lg px-3 py-2
                       bg-indigo-600 text-white hover:bg-indigo-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       active:scale-95 transition-all"
          >
            {sendStatus.kind === "sending" ? "Sending…" : "🚀 Send to Webhook"}
          </button>
        </div>

        {/* Send status */}
        {sendStatus.kind === "idle" && (
          <p className="text-[11px] text-indigo-400">Status: Not sent</p>
        )}
        {sendStatus.kind === "sending" && (
          <p className="text-[11px] text-indigo-600 animate-pulse">Sending…</p>
        )}
        {sendStatus.kind === "success" && (
          <div className="rounded-lg bg-emerald-100 border border-emerald-300 px-3 py-2">
            <p className="text-[11px] font-semibold text-emerald-800">✅ Webhook sent successfully</p>
            <p className="text-[11px] text-emerald-700">HTTP Status: {sendStatus.httpStatus}</p>
          </div>
        )}
        {sendStatus.kind === "error" && (
          <div className="rounded-lg bg-red-100 border border-red-300 px-3 py-2">
            <p className="text-[11px] font-semibold text-red-800">✕ Webhook failed</p>
            <p className="text-[11px] text-red-700 break-all mt-0.5">{sendStatus.message}</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-indigo-200" />

      {/* ── Section B: Load student FROM CRM — Dropdown ── */}
      <div className="space-y-2.5">
        <div>
          <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest">
            📥 Load Student From CRM
          </p>
          <p className="text-[10px] text-indigo-500 leading-relaxed mt-0.5">
            Pick a student — data auto-fills Resume, SOP, and LOR instantly.
          </p>
        </div>

        {/* ── Student Dropdown ── */}
        <StudentDropdown
          onStudentSelected={handleGlobalStudentLoaded}
          compact
          className="w-full"
        />

        {/* Status messages */}
        {globalLoadStatus.kind === "loading" && (
          <p className="text-[11px] text-violet-600 animate-pulse">Fetching student data from CRM…</p>
        )}
        {fetchStatus.kind === "success" && (
          <div className="rounded-lg bg-emerald-100 border border-emerald-300 px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[11px] font-semibold text-emerald-800">
                ✅ {fetchStatus.name}
              </p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                Live CRM
              </span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Resume updated. You can edit any field below.
            </p>

            {/* Application Selector when multiple programs exist */}
            {availablePrograms.length > 1 && (
              <div className="mt-2 pt-2 border-t border-emerald-200 space-y-1">
                <label className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  🎯 Target Application ({availablePrograms.length} available):
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="w-full text-[11px] font-medium text-slate-800 bg-white border border-indigo-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-sm"
                >
                  {availablePrograms.map((prog) => (
                    <option key={prog.id} value={prog.id}>
                      {prog.university} — {prog.course} ({prog.country})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-500">
                  Selecting a program updates admissions suggestions automatically.
                </p>
              </div>
            )}
          </div>
        )}
        {globalLoadStatus.kind === "error" && (
          <div className="rounded-lg bg-red-100 border border-red-300 px-3 py-2">
            <p className="text-[11px] font-semibold text-red-800">✕ Failed to load student</p>
            <p className="text-[11px] text-red-700 break-all mt-0.5">{globalLoadStatus.message}</p>
          </div>
        )}
      </div>

    </div>
  );
}
