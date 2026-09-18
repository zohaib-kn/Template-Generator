"use client";

import { useState } from "react";

type TestStatus = "idle" | "loading" | "success" | "failed";

interface ApiResponse {
  success: boolean;
  model?: string;
  text?: string;
  error?: {
    code: string;
    message: string;
  };
}

export default function AiTestPage() {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const runTest = async () => {
    setStatus("loading");
    setResponse(null);
    setDurationMs(null);

    const startTime = performance.now();

    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });

      const elapsed = Math.round(performance.now() - startTime);
      setDurationMs(elapsed);

      const data: ApiResponse = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setResponse(data);
      } else {
        setStatus("failed");
        setResponse(data);
      }
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - startTime);
      setDurationMs(elapsed);
      setStatus("failed");
      setResponse({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Network failure while reaching /api/ai/test",
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-start p-6 md:p-12 font-sans">
      <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700 rounded-xl shadow-2xl p-6 md:p-8 backdrop-blur">
        {/* Header */}
        <div className="border-b border-slate-700 pb-5 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/60 px-2.5 py-1 rounded">
              Phase AI-1 • Dev Test Only
            </span>
            <span className="text-xs text-slate-400 font-mono">
              POST /api/ai/test
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-3">
            Gemini API Connection Test
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Validates server-side Google GenAI SDK connectivity using fictional dummy context (Aarav Mehta). No real CRM data is sent.
          </p>
        </div>

        {/* Action Button & Status */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button
            onClick={runTest}
            disabled={status === "loading"}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-60 text-white font-medium text-sm rounded-lg shadow transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
          >
            {status === "loading" ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Calling Gemini API...</span>
              </>
            ) : (
              <span>Test Gemini API</span>
            )}
          </button>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-slate-400">Status:</span>
            {status === "idle" && (
              <span className="inline-flex items-center gap-1.5 text-slate-400 bg-slate-700/50 px-2.5 py-1 rounded-md text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Idle
              </span>
            )}
            {status === "loading" && (
              <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-md text-xs font-mono animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Loading...
              </span>
            )}
            {status === "success" && (
              <span className="inline-flex items-center gap-1.5 text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-md text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Success {durationMs ? `(${durationMs}ms)` : ""}
              </span>
            )}
            {status === "failed" && (
              <span className="inline-flex items-center gap-1.5 text-rose-300 bg-rose-950/60 border border-rose-800/50 px-2.5 py-1 rounded-md text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Failed {durationMs ? `(${durationMs}ms)` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Details & Output */}
        <div className="space-y-4">
          {/* Model info if success */}
          {response?.model && (
            <div className="flex items-center justify-between bg-slate-900/70 border border-slate-700/80 rounded-lg px-4 py-2 text-xs font-mono">
              <span className="text-slate-400">Active Model:</span>
              <span className="text-indigo-300 font-semibold">{response.model}</span>
            </div>
          )}

          {/* Response Text display */}
          {status === "success" && response?.text && (
            <div className="bg-slate-900/90 border border-emerald-900/50 rounded-lg p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 font-mono">
                Response (Why This Course — Aarav Mehta):
              </div>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {response.text}
              </p>
            </div>
          )}

          {/* Error display */}
          {status === "failed" && response?.error && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1 font-mono">
                Error Code: {response.error.code}
              </div>
              <p className="text-rose-200 text-xs font-mono">
                {response.error.message}
              </p>
            </div>
          )}

          {/* Idle Placeholder */}
          {status === "idle" && (
            <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-700 rounded-lg">
              Click &quot;Test Gemini API&quot; to initiate server-side generation via POST /api/ai/test
            </div>
          )}
        </div>

        {/* Security & Privacy Footer */}
        <div className="mt-8 pt-4 border-t border-slate-700/60 flex flex-col gap-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Server-side key protection: GEMINI_API_KEY is not exposed to frontend.
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Fictional data only: No real CRM records or student PII transmitted.
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> SOP & Resume Builder isolated: No production workflows altered.
          </div>
        </div>
      </div>
    </div>
  );
}
