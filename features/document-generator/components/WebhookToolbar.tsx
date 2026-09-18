"use client";

import { useState } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import type { ApplicationTarget } from "../guidance/types";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { mapCrmToNormalizedStudent, mapNormalizedToResume } from "@/services/normalization";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";

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

  // Section A state
  const [sendStatus, setSendStatus] = useState<SendStatus>({ kind: "idle" });

  // Section B state
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ kind: "idle" });
  const [studentInput, setStudentInput] = useState("");

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

  // ── Helper: Extract Student ID, key, and baseUrl from text or URL ──────────
  function parseStudentInput(input?: string): {
    studentId?: string;
    key?: string;
    baseUrl?: string;
    isBareKey?: boolean;
  } {
    if (!input) return {};
    const trimmed = input.trim();
    if (!trimmed) return {};

    if (/^[0-9a-fA-F]{32,}$/.test(trimmed)) {
      return { isBareKey: true };
    }

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

    const match = trimmed.match(/[0-9a-fA-F]{24}/);
    return { studentId: match ? match[0] : undefined };
  }

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

  // ── Section B: Fetch student from internal backend /api/student/[id] ───────
  async function handleFetchFromBackend(overrideInput?: string) {
    const rawInput = (typeof overrideInput === "string" ? overrideInput : studentInput).trim();
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
        message: rawInput
          ? "Please enter a valid 24-character hexadecimal Student ID or CRM URL."
          : "Please enter a Student ID or use one of the preset chips below.",
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
        setFetchStatus({
          kind: "error",
          message: json.error?.message || `Failed to load student (HTTP ${res.status}).`,
        });
        return;
      }

      // 1. Map raw snapshot to NormalizedStudentProfile
      const rawSnapshot = json.data as CrmSnapshot;
      const source = json.source as "senior-crm-api" | "cached-snapshot";
      const normalized = mapCrmToNormalizedStudent(rawSnapshot, { source });

      // 2. Project Normalized Profile to DocumentData + ApplicationTarget
      const { student, target } = mapNormalizedToResume(normalized);

      // 3. Load into existing Resume Builder state (editable by counsellor)
      loadStudent(student);

      // 4. Update ApplicationTarget for Suggestions Panel
      if (target && onTargetDetected) {
        onTargetDetected(target);
      }

      // 5. Update RawDataPanel — map source to the two-value union that onRawSnapshot expects
      if (onRawSnapshot) {
        onRawSnapshot(rawSnapshot, source === "senior-crm-api" ? "crm-api" : "mock");
      }

      // 6. Retain state for multiple-application selector
      setCurrentSnapshot(rawSnapshot);
      setCurrentSource(source);
      setAvailablePrograms(normalized.applications.all);
      setSelectedProgramId(normalized.applications.activeProgramId || (normalized.applications.all[0]?.id ?? ""));

      setFetchStatus({
        kind: "success",
        name: student.personal?.fullName ?? "Student",
        source,
      });
    } catch (err: unknown) {
      setFetchStatus({
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

      {/* ── Section B: Load student FROM CRM API ── */}
      <div className="space-y-2.5">
        <div>
          <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest">
            📥 Load Student From CRM
          </p>
          <p className="text-[10px] text-indigo-500 leading-relaxed mt-0.5">
            Fetch any student via ID or full snapshot URL. Also auto-fills <strong>🎯 Application Target</strong>.
          </p>
        </div>

        {/* Input box with clear button */}
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="text"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFetchFromBackend();
                }
              }}
              placeholder="Student ID (e.g. 6a508...) or full CRM URL"
              className="w-full text-[11px] bg-white border border-indigo-200 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all shadow-sm"
            />
            {studentInput.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setStudentInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[12px] font-bold p-0.5"
                title="Clear input"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-indigo-500">Presets:</span>
            <button
              type="button"
              onClick={() => {
                const id = "6a508a96af13bb33e9fc07ce";
                setStudentInput(id);
                handleFetchFromBackend(id);
              }}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200 active:scale-95 transition-all"
              title="Load Kaavya Girish Nair (Law student)"
            >
              👩‍⚖️ Kaavya (Law)
            </button>
            <button
              type="button"
              onClick={() => {
                const id = "69e600e750f7c6e4051f547e";
                setStudentInput(id);
                handleFetchFromBackend(id);
              }}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 hover:bg-indigo-200 active:scale-95 transition-all"
              title="Load Fardee kumar (Tech student with work experience)"
            >
              👨‍💻 Fardee (Tech)
            </button>
          </div>
        </div>

        <button
          id="mock-webhook-load-btn"
          onClick={() => handleFetchFromBackend()}
          disabled={fetchStatus.kind === "loading"}
          className="w-full text-[12px] font-semibold rounded-lg px-3 py-2
                     bg-violet-600 text-white hover:bg-violet-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     active:scale-95 transition-all shadow-sm"
        >
          {fetchStatus.kind === "loading"
            ? "Loading…"
            : studentInput.trim().length > 0
            ? "🌐 Load Specified Student"
            : "🌐 Load Student From CRM"}
        </button>

        {/* Fetch status */}
        {fetchStatus.kind === "idle" && (
          <p className="text-[11px] text-indigo-400">Status: Idle</p>
        )}
        {fetchStatus.kind === "loading" && (
          <p className="text-[11px] text-violet-600 animate-pulse">Fetching via /api/student/[id]…</p>
        )}
        {fetchStatus.kind === "success" && (
          <div className="rounded-lg bg-emerald-100 border border-emerald-300 px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[11px] font-semibold text-emerald-800">
                ✅ {fetchStatus.name}
              </p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                fetchStatus.source === "senior-crm-api"
                  ? "bg-violet-100 text-violet-700 border border-violet-200"
                  : fetchStatus.source === "cached-snapshot"
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}>
                {fetchStatus.source === "senior-crm-api"
                  ? "Live CRM"
                  : fetchStatus.source === "cached-snapshot"
                  ? "Cached CRM"
                  : "Mock Data"}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Resume and suggestions updated. You can edit any field below.
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
        {fetchStatus.kind === "error" && (
          <div className="rounded-lg bg-red-100 border border-red-300 px-3 py-2">
            <p className="text-[11px] font-semibold text-red-800">✕ Failed to load student</p>
            <p className="text-[11px] text-red-700 break-all mt-0.5">{fetchStatus.message}</p>
          </div>
        )}
      </div>

    </div>
  );
}
