"use client";

import { useState } from "react";
import type {
  TemplateSection,
  ReviewStatus,
  StudentDocumentContext,
} from "../types/sop-generator";
import { SourceBadge } from "./SourceBadge";
import { ReviewStatusBadge } from "./ReviewStatusBadge";
import { interpolate } from "../lib/interpolateTemplate";

interface SourceDataDialogProps {
  section: TemplateSection;
  ctx: StudentDocumentContext;
  onClose: () => void;
}

/**
 * Modal dialog for viewing structured source facts in WEBHOOK / HYBRID sections.
 *
 * Displays:
 * - Each source fact key → resolved value (or MISSING indicator)
 * - A notice that these are factual values, not AI-generated
 *
 * Phase 1: read-only with a clear notice. Editing is local-state only.
 */
export function SourceDataDialog({ section, ctx, onClose }: SourceDataDialogProps) {
  const facts = section.sourceFacts ?? {};

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-dialog-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md">
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <div>
              <p
                id="source-dialog-title"
                className="text-sm font-bold text-slate-800"
              >
                {section.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <SourceBadge source={section.source} />
              </div>
            </div>
            <button
              id="source-dialog-close-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg
                         hover:bg-slate-100 transition-colors ml-2"
              aria-label="Close"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Notice */}
          <div className="mx-5 mt-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-[11px] text-blue-700 leading-relaxed">
              <strong>These are factual student values</strong> and are not AI-generated.
              Factual data comes from the student&apos;s application record and must be verified
              before the document is approved.
            </p>
          </div>

          {/* Facts table */}
          <div className="px-5 py-4">
            {Object.keys(facts).length === 0 ? (
              <p className="text-[12px] text-slate-400 italic">
                No structured source facts available for this section.
              </p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide w-2/5">
                      Field
                    </th>
                    <th className="text-left pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(facts).map(([key, template]) => {
                    const value = interpolate(template, ctx);
                    const isMissing = value.includes("[MISSING:");
                    return (
                      <tr key={key} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pr-4 text-slate-500 font-medium align-top">
                          {key}
                        </td>
                        <td
                          className={`py-2 align-top font-medium break-words ${
                            isMissing
                              ? "text-red-500 italic"
                              : "text-slate-800"
                          }`}
                        >
                          {value}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-4 pt-0 flex justify-end">
            <button
              onClick={onClose}
              className="text-[12px] font-semibold px-4 py-1.5 rounded-lg
                         bg-slate-100 text-slate-600 hover:bg-slate-200
                         active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── SectionEditor ────────────────────────────────────────────────────────────

interface SectionEditorProps {
  section: TemplateSection;
  ctx: StudentDocumentContext;
  content: string;
  status: ReviewStatus;
  onContentChange: (newContent: string) => void;
  onReset: () => void;
  onApprove: () => void;
  onRegenerate?: (sectionId: string) => Promise<void>;
  isRegenerating?: boolean;
}

/**
 * Centre panel editor.
 *
 * For FIXED / DATABASE sections: shows rendered text, no free editing.
 * For AI_SUGGESTED sections: editable textarea with live Gemini AI regeneration.
 * For WEBHOOK sections: shows structured facts + rendered content, read-only.
 * For HYBRID sections: shows source facts table THEN an editable narrative area.
 */
export function SectionEditor({
  section,
  ctx,
  content,
  status,
  onContentChange,
  onReset,
  onApprove,
  onRegenerate,
  isRegenerating = false,
}: SectionEditorProps) {
  const [showSourceData, setShowSourceData] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const resolved = interpolate(content, ctx);
  const isModified = content !== section.content;

  async function handleRegenerateClick() {
    if (!onRegenerate) return;
    setRegenFeedback(null);
    try {
      await onRegenerate(section.id);
      setRegenFeedback({
        type: "success",
        message: `Tailored narrative for "${ctx.destination.course || section.title}" generated with Gemini AI.`,
      });
      setTimeout(() => setRegenFeedback(null), 4500);
    } catch (err: unknown) {
      setRegenFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to regenerate narrative. Please try again.",
      });
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Section header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-slate-100 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800 leading-snug">
              {section.title}
              {section.required && (
                <span className="ml-1.5 text-red-400 text-[10px]" aria-label="Required section">
                  Required
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <SourceBadge source={section.source} />
              <ReviewStatusBadge status={status} />
            </div>
          </div>

          {/* Section actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View source data */}
            {(section.source === "WEBHOOK" ||
              section.source === "HYBRID" ||
              section.source === "DATABASE") &&
              section.sourceFacts &&
              Object.keys(section.sourceFacts).length > 0 && (
                <button
                  id={`view-source-data-${section.id}`}
                  onClick={() => setShowSourceData(true)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg
                             border border-blue-200 text-blue-600 bg-blue-50
                             hover:bg-blue-100 active:scale-95 transition-all"
                >
                  View Source Data
                </button>
              )}

            {/* Regenerate */}
            {section.regeneratable && (
              <button
                id={`regenerate-${section.id}`}
                onClick={handleRegenerateClick}
                disabled={isRegenerating}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg
                           border border-violet-200 text-violet-600 bg-violet-50
                           hover:bg-violet-100 active:scale-95 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isRegenerating ? (
                  <>
                    <svg
                      className="animate-spin h-3 w-3 text-violet-600"
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
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <span>✨ Regenerate</span>
                )}
              </button>
            )}

            {/* Reset */}
            {isModified && (
              <button
                id={`reset-${section.id}`}
                onClick={onReset}
                disabled={isRegenerating}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg
                           border border-slate-200 text-slate-500 bg-white
                           hover:bg-slate-50 active:scale-95 transition-all
                           disabled:opacity-50"
              >
                Reset
              </button>
            )}

            {/* Approve */}
            <button
              id={`approve-${section.id}`}
              onClick={onApprove}
              disabled={status === "APPROVED" || isRegenerating}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg
                         bg-emerald-600 text-white
                         hover:bg-emerald-700 active:scale-95 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {status === "APPROVED" ? "✓ Approved" : "Approve Section"}
            </button>
          </div>
        </div>

        {/* Feedback notice */}
        {regenFeedback && (
          <div
            className={`mt-2 px-3 py-2 rounded-lg text-[11px] flex items-center justify-between transition-all ${
              regenFeedback.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-rose-50 border border-rose-200 text-rose-700"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>{regenFeedback.type === "success" ? "✓" : "⚠️"}</span>
              <span>{regenFeedback.message}</span>
            </div>
            <button
              onClick={() => setRegenFeedback(null)}
              className="opacity-70 hover:opacity-100 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-4">

        {/* WEBHOOK: show structured facts then rendered text (read-only) */}
        {section.source === "WEBHOOK" && section.sourceFacts && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">
              👤 Student Data — Factual Source Values
            </p>
            <p className="text-[10px] text-blue-500 mb-3 leading-relaxed">
              These are factual student values and are not AI-generated.
            </p>
            <dl className="grid gap-y-1.5">
              {Object.entries(section.sourceFacts).map(([key, tmpl]) => {
                const val = interpolate(tmpl, ctx);
                const missing = val.includes("[MISSING:");
                return (
                  <div key={key} className="flex gap-3">
                    <dt className="w-36 text-[11px] text-blue-500 font-medium flex-shrink-0">
                      {key}
                    </dt>
                    <dd
                      className={`text-[11px] font-semibold ${
                        missing ? "text-red-500 italic" : "text-blue-900"
                      }`}
                    >
                      {val}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        {/* HYBRID: show source facts + editable narrative separately */}
        {section.source === "HYBRID" && section.sourceFacts && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">
              🔀 Source Facts (Verified)
            </p>
            <p className="text-[10px] text-amber-500 mb-3">
              These factual values anchor the narrative below. They must not be AI-generated.
            </p>
            <dl className="grid gap-y-1.5">
              {Object.entries(section.sourceFacts).map(([key, tmpl]) => {
                const val = interpolate(tmpl, ctx);
                const missing = val.includes("[MISSING:");
                return (
                  <div key={key} className="flex gap-3">
                    <dt className="w-36 text-[11px] text-amber-600 font-medium flex-shrink-0">
                      {key}
                    </dt>
                    <dd
                      className={`text-[11px] font-semibold ${
                        missing ? "text-red-500 italic" : "text-amber-900"
                      }`}
                    >
                      {val}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        {/* Editable or read-only content */}
        {section.editable ? (
          <div>
            {section.source === "HYBRID" && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                ✨ Suggested Narrative (Editable)
              </p>
            )}
            <textarea
              id={`section-editor-textarea-${section.id}`}
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              rows={18}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3
                         text-[12px] text-slate-700 font-mono leading-relaxed
                         focus:outline-none focus:border-indigo-400 focus:ring-1
                         focus:ring-indigo-200 resize-none transition-colors"
              aria-label={`Edit content for ${section.title}`}
            />
            {isModified && (
              <p className="text-[10px] text-amber-600 mt-1.5">
                ⚠ Content modified from original.{" "}
                {status === "APPROVED" && "Status reset to Needs Review."}
              </p>
            )}
          </div>
        ) : (
          <div>
            {/* Non-editable: rendered preview */}
            <div
              className="rounded-xl border border-slate-200 bg-white px-4 py-3
                          text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap font-mono"
              aria-label={`Content preview for ${section.title}`}
            >
              {resolved}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              This section is controlled by the data source and cannot be free-text edited.
            </p>
          </div>
        )}

        {/* DATABASE: verified info notice */}
        {section.source === "DATABASE" && (
          <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2">
            <p className="text-[11px] text-green-700">
              ✅ <strong>Verified Data.</strong> This section is sourced from the verified
              destination database and does not require counsellor editing.
            </p>
          </div>
        )}

        {/* FIXED: template text notice */}
        {section.source === "FIXED" && (
          <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
            <p className="text-[11px] text-slate-500">
              📋 This section uses standard template wording. It can be lightly edited
              if your institution requires custom language.
            </p>
          </div>
        )}
      </div>

      {/* Source data dialog */}
      {showSourceData && (
        <SourceDataDialog
          section={section}
          ctx={ctx}
          onClose={() => setShowSourceData(false)}
        />
      )}
    </div>
  );
}
