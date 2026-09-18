"use client";

import { useState } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { testStudentData } from "../utils/testStudentData";
import type { DocumentData } from "@/types";
import type { ApplicationTarget } from "../guidance/types";
import type { CrmSnapshot } from "@/types/crmSnapshot";

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
  | { kind: "success"; name: string; source: "crm-api" | "mock" }
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
 * Section B — Load Student From Webhook:
 *   GET /api/mock-student-webhook
 *     → If CRM env vars set: fetches live student from senior's CRM API
 *     → Otherwise: returns static testStudentData fixture
 *   → maps result → LOAD_STUDENT → state → live preview + PDF
 *   → fires onTargetDetected(target) → auto-populates Application Target dropdowns
 *
 * IMPORTANT: No database. No authentication. No AI.
 */
export function WebhookToolbar({ onTargetDetected, onRawSnapshot }: WebhookToolbarProps = {}) {
  const { data, loadTestStudent, loadStudent, reset } = useDocumentState();

  // Section A state
  const [sendStatus, setSendStatus] = useState<SendStatus>({ kind: "idle" });

  // Section B state
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ kind: "idle" });
  const [studentInput, setStudentInput] = useState("");

  // Detect whether student data is loaded in state (to toggle Load / Clear)
  const isTestDataLoaded = Boolean(
    data.personal?.fullName ||
    (data.education ?? []).length > 0 ||
    (data.internships ?? []).length > 0 ||
    data.aboutMe
  );

  // ── Section A: Send current state to external webhook ───────────────────
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

  // ── Section B: Fetch student from CRM API (or mock fallback) ────────────
  async function handleFetchFromWebhook(overrideInput?: string) {
    const inputToUse = (typeof overrideInput === "string" ? overrideInput : studentInput).trim();
    setFetchStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/mock-student-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputToUse || undefined }),
      });

      if (!res.ok) {
        setFetchStatus({
          kind: "error",
          message: `API responded with HTTP ${res.status}.`,
        });
        return;
      }

      const json = (await res.json()) as {
        success: boolean;
        source: "crm-api" | "mock";
        student?: DocumentData;
        target?: Partial<ApplicationTarget> | null;
        rawSnapshot?: CrmSnapshot | null;
      };

      if (!json.success || !json.student || typeof json.student !== "object") {
        setFetchStatus({
          kind: "error",
          message: "Response missing valid student data.",
        });
        return;
      }

      // 1. Load student data into Resume Builder state
      loadStudent(json.student);

      // 2. If we got a detected target from the CRM, auto-populate
      //    the Application Target dropdowns → triggers Suggestions Panel
      if (json.target && onTargetDetected) {
        onTargetDetected(json.target);
      }

      // 3. Pass the full raw snapshot to the RawDataPanel
      if (onRawSnapshot) {
        onRawSnapshot(json.rawSnapshot ?? null, json.source);
      }

      setFetchStatus({
        kind: "success",
        name: json.student.personal?.fullName ?? "Student",
        source: json.source,
      });
    } catch (err: unknown) {
      setFetchStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
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
              onClick={() => { reset(); setSendStatus({ kind: "idle" }); setFetchStatus({ kind: "idle" }); }}
              className="flex-1 text-[12px] font-semibold rounded-lg px-3 py-2
                         bg-white border border-slate-300 text-slate-600
                         hover:bg-slate-50 active:scale-95 transition-all"
            >
              ✕ Clear Data
            </button>
          ) : (
            <button
              id="webhook-load-btn"
              onClick={() => { loadTestStudent(); setSendStatus({ kind: "idle" }); }}
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
                  handleFetchFromWebhook();
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
                handleFetchFromWebhook(id);
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
                handleFetchFromWebhook(id);
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
          onClick={() => handleFetchFromWebhook()}
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
            : "🌐 Load Default Student From CRM"}
        </button>

        {/* Fetch status */}
        {fetchStatus.kind === "idle" && (
          <p className="text-[11px] text-indigo-400">Status: Idle</p>
        )}
        {fetchStatus.kind === "loading" && (
          <p className="text-[11px] text-violet-600 animate-pulse">Fetching from CRM API…</p>
        )}
        {fetchStatus.kind === "success" && (
          <div className="rounded-lg bg-emerald-100 border border-emerald-300 px-3 py-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[11px] font-semibold text-emerald-800">
                ✅ {fetchStatus.name}
              </p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                fetchStatus.source === "crm-api"
                  ? "bg-violet-100 text-violet-700 border border-violet-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}>
                {fetchStatus.source === "crm-api" ? "Live CRM" : "Mock Data"}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Resume and suggestions updated.
            </p>
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
