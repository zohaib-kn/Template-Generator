"use client";

import { useState } from "react";
import { useDocumentState } from "../hooks/useDocumentState";

interface ResumeDeveloperToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentLoaded?: () => void;
}

type SendStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; httpStatus: number; message: string }
  | { kind: "error"; message: string };

export function ResumeDeveloperToolsModal({
  isOpen,
  onClose,
  onStudentLoaded,
}: ResumeDeveloperToolsModalProps) {
  const { data, loadTestStudent, reset } = useDocumentState();
  const [sendStatus, setSendStatus] = useState<SendStatus>({ kind: "idle" });

  if (!isOpen) return null;

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

  function handleLoadTest() {
    loadTestStudent();
    if (onStudentLoaded) onStudentLoaded();
    setSendStatus({ kind: "idle" });
  }

  function handleClear() {
    reset();
    if (onStudentLoaded) onStudentLoaded();
    setSendStatus({ kind: "idle" });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-devtools-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-lg overflow-hidden my-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-base">🔗</span>
              <div>
                <h3 id="resume-devtools-modal-title" className="text-sm font-semibold text-slate-900 leading-snug">
                  Developer Tools & Webhook Testing
                </h3>
                <p className="text-[11px] text-slate-500">
                  Integration tests and external webhook delivery for Resume Builder
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 text-xs">
            {/* Quick Actions */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Local State Controls
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLoadTest}
                  className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-medium text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  Load Test Student Fixture
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-rose-700 font-medium text-xs transition-colors shadow-2xs cursor-pointer"
                >
                  Clear Resume State
                </button>
              </div>
            </div>

            {/* Webhook Delivery */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Outbound Webhook Delivery
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  POST /api/resume-webhook
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sends the currently active in-memory resume state payload to the configured external webhook URL.
              </p>

              <button
                type="button"
                id="webhook-send-btn"
                onClick={handleSend}
                disabled={sendStatus.kind === "sending"}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-medium text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {sendStatus.kind === "sending" ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Transmitting payload…</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Send Resume to Webhook</span>
                  </>
                )}
              </button>

              {/* Status Reports */}
              {sendStatus.kind === "success" && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-0.5 animate-fade-in">
                  <p className="font-semibold text-emerald-800">✅ Webhook Delivered Successfully</p>
                  <p className="text-emerald-700 text-[11px]">HTTP Response: {sendStatus.httpStatus} — {sendStatus.message}</p>
                </div>
              )}

              {sendStatus.kind === "error" && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 space-y-0.5 animate-fade-in">
                  <p className="font-semibold text-rose-800">✕ Webhook Delivery Failed</p>
                  <p className="text-rose-700 text-[11px] break-all">{sendStatus.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50 flex-shrink-0">
            <button
              onClick={onClose}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
