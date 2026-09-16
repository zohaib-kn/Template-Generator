"use client";

import { useState } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { testStudentData } from "../utils/testStudentData";
import type { DocumentData } from "@/types";

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
  | { kind: "success"; name: string }
  | { kind: "error"; message: string };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * WebhookToolbar — integration test controls.
 *
 * Section A — Send to Webhook:
 *   testStudentData → LOAD_TEST_STUDENT → state → live preview
 *   state (possibly edited) → POST /api/resume-webhook → external webhook URL
 *
 * Section B — Load Student From Webhook:
 *   GET /api/mock-student-webhook → result.student → LOAD_STUDENT → state → preview
 *   Proves: "Can the Resume Builder receive student data from a URL?"
 *   Later: replace mock URL with seniors' real API URL — zero other code changes needed.
 *
 * IMPORTANT: No database. No authentication. No AI. Temporary testing only.
 */
export function WebhookToolbar() {
  const { data, loadTestStudent, loadStudent, reset } = useDocumentState();

  // Section A state
  const [sendStatus, setSendStatus] = useState<SendStatus>({ kind: "idle" });

  // Section B state
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ kind: "idle" });

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

  // ── Section B: Fetch student from mock API and load into state ───────────
  async function handleFetchFromWebhook() {
    setFetchStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/mock-student-webhook");

      if (!res.ok) {
        setFetchStatus({
          kind: "error",
          message: `API responded with HTTP ${res.status}.`,
        });
        return;
      }

      const json = (await res.json()) as {
        success: boolean;
        source: string;
        student?: DocumentData;
      };

      if (!json.success || !json.student || typeof json.student !== "object") {
        setFetchStatus({
          kind: "error",
          message: "Response missing valid student data.",
        });
        return;
      }

      // Load fetched data into Resume Builder state via generic LOAD_STUDENT action.
      // This works for mock data now and will work for real API data later.
      loadStudent(json.student);

      setFetchStatus({
        kind: "success",
        name: json.student.personal?.fullName ?? "Student",
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

      {/* ── Section B: Load student FROM mock webhook URL ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest">
          📥 Load From Webhook URL
        </p>
        <p className="text-[10px] text-indigo-500 leading-relaxed">
          Calls <code className="bg-indigo-100 px-1 rounded">/api/mock-student-webhook</code> and loads the returned student into the resume.
        </p>

        <button
          id="mock-webhook-load-btn"
          onClick={handleFetchFromWebhook}
          disabled={fetchStatus.kind === "loading"}
          className="w-full text-[12px] font-semibold rounded-lg px-3 py-2
                     bg-violet-600 text-white hover:bg-violet-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     active:scale-95 transition-all"
        >
          {fetchStatus.kind === "loading" ? "Loading…" : "🌐 Load Student From Webhook"}
        </button>

        {/* Fetch status */}
        {fetchStatus.kind === "idle" && (
          <p className="text-[11px] text-indigo-400">Status: Idle</p>
        )}
        {fetchStatus.kind === "loading" && (
          <p className="text-[11px] text-violet-600 animate-pulse">Loading from API…</p>
        )}
        {fetchStatus.kind === "success" && (
          <div className="rounded-lg bg-emerald-100 border border-emerald-300 px-3 py-2">
            <p className="text-[11px] font-semibold text-emerald-800">
              ✅ Student loaded — {fetchStatus.name}
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Resume preview has updated.
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
