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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
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
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-3.5 border-b border-slate-100">
            <div>
              <p
                id="source-dialog-title"
                className="text-sm font-bold text-slate-900"
              >
                {section.title}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <SourceBadge source={section.source} />
              </div>
            </div>
            <button
              id="source-dialog-close-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg
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

          {/* Restrained Factual Notice */}
          <div className="mx-6 mt-4 px-3.5 py-2.5 rounded-lg bg-[#F4F9FA] border border-[#D9EAF0]">
            <p className="text-[11px] text-[#096491] leading-relaxed">
              <strong className="font-semibold">These are factual student values</strong> and are not AI-generated.
              Factual data comes from the student&apos;s application record and must be verified
              before the document is approved.
            </p>
          </div>

          {/* Facts table */}
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {Object.keys(facts).length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No structured source facts available for this section.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-2/5">
                      Field
                    </th>
                    <th className="text-left pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {Object.entries(facts).map(([key, template]) => {
                    const value = interpolate(template, ctx);
                    const isMissing = value.includes("[MISSING:");
                    return (
                      <tr key={key}>
                        <td className="py-2.5 pr-4 text-slate-500 font-medium align-top text-xs">
                          {key}
                        </td>
                        <td
                          className={`py-2.5 align-top font-medium text-xs break-words ${
                            isMissing
                              ? "text-rose-500 italic"
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
          <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end bg-slate-50/50">
            <button
              onClick={onClose}
              className="h-8 px-4 rounded-lg text-xs font-medium
                         bg-white border border-slate-200 text-slate-700 hover:bg-slate-50
                         transition-colors shadow-xs"
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
  onRegenerate?: (sectionId: string, mode?: "generate" | "rewrite-natural") => Promise<void>;
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

  async function handleRegenerateClick(mode: "generate" | "rewrite-natural" = "generate") {
    if (!onRegenerate) return;
    setRegenFeedback(null);
    try {
      await onRegenerate(section.id, mode);
      setRegenFeedback({
        type: "success",
        message:
          mode === "rewrite-natural"
            ? `Narrative rewritten in natural student voice for "${ctx.destination.course || section.title}".`
            : `Tailored narrative for "${ctx.destination.course || section.title}" generated with Gemini AI.`,
      });
      setTimeout(() => setRegenFeedback(null), 4500);
    } catch (err: unknown) {
      setRegenFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to process narrative. Please try again.",
      });
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
      {/* Section header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] md:text-[18px] font-semibold text-slate-900 leading-snug truncate">
                {section.title}
              </h2>
              {section.required && (
                <span className="text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full" aria-label="Required section">
                  Required
                </span>
              )}
            </div>

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
                  className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
                >
                  View Source Data
                </button>
              )}

            {/* Regenerate */}
            {section.regeneratable && (
              <button
                id={`regenerate-${section.id}`}
                onClick={() => handleRegenerateClick("generate")}
                disabled={isRegenerating}
                title="Generate a new section narrative tailored to this student and degree"
                className="h-8 px-3 rounded-lg border border-[#D2E7F0] text-[#096491] bg-[#F0F7FA] hover:bg-[#E2F0F7] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <>
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-[#096491]"
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
                    <span>Generating…</span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px]">✨</span>
                    <span>Regenerate</span>
                  </>
                )}
              </button>
            )}

            {/* Rewrite in Natural Student Voice */}
            {section.regeneratable && content && content.trim().length > 0 && (
              <button
                id={`rewrite-natural-${section.id}`}
                onClick={() => handleRegenerateClick("rewrite-natural")}
                disabled={isRegenerating}
                title="Rewrite current paragraph in a sincere, believable student voice while strictly preserving all facts"
                className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-[11px]">✍️</span>
                <span>Rewrite Natural</span>
              </button>
            )}

            {/* Reset */}
            {isModified && (
              <button
                id={`reset-${section.id}`}
                onClick={onReset}
                disabled={isRegenerating}
                className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
              >
                Reset
              </button>
            )}

            {/* Approve Section (Dominant local action) */}
            <button
              id={`approve-${section.id}`}
              onClick={onApprove}
              disabled={status === "APPROVED" || isRegenerating}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5
                         ${
                           status === "APPROVED"
                             ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                             : "bg-[#096491] text-white hover:bg-[#074f74] active:bg-[#063f5d] disabled:opacity-50 disabled:cursor-not-allowed"
                         }`}
            >
              {status === "APPROVED" ? "✓ Approved" : "Approve Section"}
            </button>
          </div>
        </div>

        {/* Feedback notice */}
        {regenFeedback && (
          <div
            className={`mt-2.5 px-3.5 py-2 rounded-lg text-xs flex items-center justify-between transition-all ${
              regenFeedback.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{regenFeedback.type === "success" ? "✓" : "⚠️"}</span>
              <span>{regenFeedback.message}</span>
            </div>
            <button
              onClick={() => setRegenFeedback(null)}
              className="opacity-70 hover:opacity-100 font-bold ml-2 cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* WEBHOOK: Restrained Information Block (Student Data — Factual Source Values) */}
        {section.source === "WEBHOOK" && section.sourceFacts && (
          <div className="rounded-xl border border-[#D9EAF0] bg-[#F4F9FA] p-5 shadow-xs">
            <p className="text-[11px] font-bold text-[#096491] uppercase tracking-wider mb-1">
              STUDENT DATA — FACTUAL SOURCE VALUES
            </p>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              These are factual student values and are not AI-generated.
            </p>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
              {Object.entries(section.sourceFacts).map(([key, tmpl]) => {
                const val = interpolate(tmpl, ctx);
                const missing = val.includes("[MISSING:");
                return (
                  <div key={key} className="flex gap-3 items-baseline">
                    <dt className="w-36 text-[11px] text-slate-500 font-medium flex-shrink-0">
                      {key}
                    </dt>
                    <dd
                      className={`text-xs font-semibold ${
                        missing ? "text-rose-500 italic" : "text-slate-800"
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

        {/* HYBRID: Restrained Information Block for Source Facts */}
        {section.source === "HYBRID" && section.sourceFacts && (
          <div className="rounded-xl border border-[#EFE7D8] bg-[#FAF8F5] p-5 shadow-xs">
            <p className="text-[11px] font-bold text-[#8C6B38] uppercase tracking-wider mb-1">
              SOURCE FACTS (VERIFIED)
            </p>
            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              These factual values anchor the narrative below. They must not be AI-generated.
            </p>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
              {Object.entries(section.sourceFacts).map(([key, tmpl]) => {
                const val = interpolate(tmpl, ctx);
                const missing = val.includes("[MISSING:");
                return (
                  <div key={key} className="flex gap-3 items-baseline">
                    <dt className="w-36 text-[11px] text-slate-500 font-medium flex-shrink-0">
                      {key}
                    </dt>
                    <dd
                      className={`text-xs font-semibold ${
                        missing ? "text-rose-500 italic" : "text-slate-800"
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

        {/* Editable or Document Workspace content */}
        {section.editable ? (
          <div className="space-y-2">
            {section.source === "HYBRID" && (
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Suggested Narrative (Editable)
              </p>
            )}
            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs focus-within:border-[#096491] focus-within:ring-1 focus-within:ring-[#096491] transition-all">
              <textarea
                id={`section-editor-textarea-${section.id}`}
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                rows={16}
                className="w-full bg-transparent px-3 py-2 text-[14px] text-slate-800 font-sans leading-[1.65] resize-none outline-none"
                aria-label={`Edit content for ${section.title}`}
              />
            </div>
            {isModified && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1.5 font-medium">
                <span>⚠</span>
                <span>Content modified from original. {status === "APPROVED" && "Status reset to Needs Review."}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Non-editable: Document preview card */}
            <div
              className="rounded-xl border border-slate-200 bg-white p-5 md:p-6 text-[14px] text-slate-800 font-sans leading-[1.65] whitespace-pre-wrap shadow-xs"
              aria-label={`Content preview for ${section.title}`}
            >
              {resolved}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>This section is controlled by the data source and cannot be free-text edited.</span>
            </div>
          </div>
        )}

        {/* DATABASE: Verified info notice */}
        {section.source === "DATABASE" && (
          <div className="rounded-xl border border-[#D9EAF0] bg-[#F4F9FA] px-4 py-3 flex items-start gap-2.5">
            <span className="text-[#096491] text-xs mt-0.5">✓</span>
            <p className="text-xs text-[#096491] leading-relaxed">
              <strong className="font-semibold">Verified Data.</strong> This section is sourced from the verified destination database and does not require counsellor editing.
            </p>
          </div>
        )}

        {/* FIXED: Template text notice */}
        {section.source === "FIXED" && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-start gap-2.5 shadow-xs">
            <span className="text-slate-400 text-xs mt-0.5">📋</span>
            <p className="text-xs text-slate-600 leading-relaxed">
              This section uses standard template wording. It can be lightly edited if your institution requires custom language.
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
