"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  TemplateSection,
  ReviewStatus,
  StudentDocumentContext,
} from "../types/sop-generator";
import { interpolate } from "../lib/interpolateTemplate";
import { calculateSectionWordCount } from "../lib/wordCount";

interface SourceDataDialogProps {
  section: TemplateSection;
  ctx: StudentDocumentContext;
  onClose: () => void;
}

/**
 * Modal dialog for inspecting structured source facts in WEBHOOK / HYBRID / DATABASE sections.
 * Presented contextually without cluttering the document canvas.
 */
export function SourceDataDialog({ section, ctx, onClose }: SourceDataDialogProps) {
  const facts = section.sourceFacts ?? {};
  const hasFacts = Object.keys(facts).length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
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
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Source Data Inspection
              </p>
              <h3 id="source-dialog-title" className="text-sm font-semibold text-slate-900">
                {section.title}
              </h3>
            </div>
            <button
              id="source-dialog-close-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Factual Notice */}
          <div className="mx-6 mt-4 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-600">
            <p className="leading-relaxed">
              <strong className="font-semibold text-slate-800">Verified CRM Fields:</strong> These values reflect official student records and application submissions. They anchor the letter narrative.
            </p>
          </div>

          {/* Facts Table */}
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {!hasFacts ? (
              <p className="text-xs text-slate-400 italic py-2">
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
                      Verified Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(facts).map(([key, template]) => {
                    const value = interpolate(template, ctx);
                    const isMissing = value.includes("[MISSING:");
                    return (
                      <tr key={key}>
                        <td className="py-2.5 pr-4 text-slate-500 font-medium align-top">
                          {key}
                        </td>
                        <td
                          className={`py-2.5 align-top font-medium break-words ${
                            isMissing ? "text-rose-600 font-semibold italic" : "text-slate-900"
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
          <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
            <button
              onClick={onClose}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Done
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
  onUndoApprove?: () => void;
  onRegenerate?: (sectionId: string, mode?: "generate" | "rewrite-natural") => Promise<void>;
  isRegenerating?: boolean;
}

/**
 * Parses markdown bold (**text**) into <strong> elements for rich reading typography.
 */
function renderFormatted(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Editorial Document Canvas & Section Editor.
 *
 * Designed around reading and polishing a student's visa letter.
 * The letter prose is the primary visual surface.
 */
export function SectionEditor({
  section,
  ctx,
  content,
  status,
  onContentChange,
  onReset,
  onApprove,
  onUndoApprove,
  onRegenerate,
  isRegenerating = false,
}: SectionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(content);
  const [showSourceData, setShowSourceData] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync draftText when section changes
  useEffect(() => {
    setDraftText(content);
    setIsEditing(false);
    setFeedback(null);
  }, [section.id, content]);

  const resolved = useMemo(() => interpolate(content, ctx), [content, ctx]);
  const isModified = content !== section.content;
  const isApproved = status === "APPROVED";
  const isNeedsReview = status === "NEEDS_REVIEW";

  const sectionWordCount = useMemo(
    () => calculateSectionWordCount(content, ctx),
    [content, ctx]
  );

  const factsCount = section.sourceFacts ? Object.keys(section.sourceFacts).length : 0;

  async function handleRegenerateClick(mode: "generate" | "rewrite-natural" = "generate") {
    if (!onRegenerate) return;
    setFeedback(null);
    try {
      await onRegenerate(section.id, mode);
      setFeedback({
        type: "success",
        message:
          mode === "rewrite-natural"
            ? `Rewritten in natural student voice for ${ctx.destination.course || section.title}.`
            : `Tailored narrative draft generated for ${ctx.destination.course || section.title}.`,
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to generate narrative draft.",
      });
    }
  }

  function handleSaveEdit() {
    onContentChange(draftText);
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setDraftText(content);
    setIsEditing(false);
  }

  function handleResetClick() {
    onReset();
    setDraftText(section.content);
    setIsEditing(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8F9FA] overflow-y-auto">
      {/* Contextual Toolbar for the selected section (Full-width from Story Structure to Context Panel) */}
      <div className="flex-shrink-0 sticky top-0 z-10 px-6 py-3 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
        <div className="w-full flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Section Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {String(section.order).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 truncate">
                  {section.title}
                </h2>
                {section.required && (
                  <span className="text-rose-500 text-xs" title="Required section">
                    *
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>
                  {section.regeneratable
                    ? "Suggested draft"
                    : section.source === "WEBHOOK"
                    ? "Student data"
                    : section.source === "DATABASE"
                    ? "Verified destination"
                    : "Template section"}
                </span>
                <span className="text-slate-300">·</span>
                <span>{sectionWordCount} words</span>
                <span className="text-slate-300">·</span>
                <span
                  className={
                    isApproved
                      ? "text-emerald-700 font-medium"
                      : isNeedsReview
                      ? "text-amber-700 font-medium"
                      : "text-slate-500"
                  }
                >
                  {isApproved ? "Approved" : isNeedsReview ? "Needs review" : "Not reviewed"}
                </span>
              </p>
            </div>
          </div>

          {/* Right: Contextual Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>

                {isModified && (
                  <button
                    type="button"
                    id={`reset-${section.id}`}
                    onClick={handleResetClick}
                    className="h-8 px-3 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-xs font-medium transition-colors"
                  >
                    Reset
                  </button>
                )}

                {section.regeneratable && (
                  <button
                    type="button"
                    id={`regenerate-${section.id}`}
                    onClick={() => handleRegenerateClick("generate")}
                    disabled={isRegenerating}
                    className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isRegenerating ? (
                      <span className="animate-spin text-slate-500">⟳</span>
                    ) : (
                      <span>✨ Regenerate</span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="h-8 px-3.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium transition-colors shadow-xs"
                >
                  Done Editing
                </button>
              </>
            ) : (
              <>
                {/* Free edit button */}
                <button
                  type="button"
                  id={`edit-${section.id}`}
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
                >
                  Edit
                </button>

                {/* Regenerate if AI narrative */}
                {section.regeneratable && (
                  <button
                    type="button"
                    id={`regenerate-${section.id}`}
                    onClick={() => handleRegenerateClick("generate")}
                    disabled={isRegenerating}
                    className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isRegenerating ? (
                      <>
                        <span className="animate-spin text-slate-500">⟳</span>
                        <span>Writing…</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>Regenerate</span>
                      </>
                    )}
                  </button>
                )}

                {/* Rewrite in authentic student voice */}
                {section.regeneratable && content.trim().length > 0 && (
                  <button
                    type="button"
                    id={`rewrite-natural-${section.id}`}
                    onClick={() => handleRegenerateClick("rewrite-natural")}
                    disabled={isRegenerating}
                    className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    title="Rewrite paragraph in natural, authentic student voice"
                  >
                    <span>✍️</span>
                    <span>Rewrite Natural</span>
                  </button>
                )}

                {/* Reset button if modified */}
                {isModified && (
                  <button
                    type="button"
                    id={`reset-${section.id}`}
                    onClick={handleResetClick}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 text-xs font-medium transition-colors"
                    title="Reset to template original"
                  >
                    Reset
                  </button>
                )}

                {/* Approve section CTA / Approved state with Undo */}
                {isApproved ? (
                  <div className="flex items-center gap-1.5">
                    <span className="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-medium flex items-center gap-1">
                      ✓ Approved
                    </span>
                    {onUndoApprove && (
                      <button
                        type="button"
                        onClick={onUndoApprove}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 text-xs font-medium transition-colors"
                        title="Undo approval"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    id={`approve-${section.id}`}
                    onClick={onApprove}
                    disabled={isRegenerating}
                    className="h-8 px-3.5 rounded-lg bg-[#096491] hover:bg-[#074f74] active:bg-[#063f5d] text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
                  >
                    Approve Section
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Feedback notice if any */}
        {feedback && (
          <div className="w-full mt-2">
            <div
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                feedback.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}
            >
              <span>{feedback.message}</span>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Document Workspace Canvas */}
      <div className="flex-1 py-8 px-4 md:px-8">
        <div className="max-w-[760px] mx-auto">
          {/* Subtle paper sheet */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
            {/* Paper Header / Document Masthead */}
            <div className="px-8 pt-8 pb-4 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="uppercase tracking-wider font-semibold">
                Visa Cover Letter · Embassy Submission
              </span>
              <span>
                Section {section.order} of 16
              </span>
            </div>

            {/* Document Content Area */}
            <div className="p-8 md:p-12 font-serif text-[15px] md:text-[16px] text-slate-800 leading-[1.8] tracking-[0.01em]">
              {isEditing ? (
                <div className="space-y-3 font-sans">
                  <div className="relative rounded-xl border border-slate-300 focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 p-3 bg-slate-50/50 transition-all">
                    <textarea
                      id={`section-editor-textarea-${section.id}`}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      rows={12}
                      className="w-full bg-transparent text-[14px] text-slate-900 font-sans leading-[1.7] resize-none outline-none"
                      aria-label={`Edit content for ${section.title}`}
                      placeholder="Type section narrative here…"
                      autoFocus
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px] text-slate-400 font-sans">
                      <span>{calculateSectionWordCount(draftText, ctx)} words</span>
                      <span>Press &apos;Done Editing&apos; to commit</span>
                    </div>
                  </div>
                  {isModified && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium font-sans">
                      <span>⚠</span>
                      <span>Modified from template default.</span>
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className="space-y-4 whitespace-pre-wrap select-text"
                  aria-label={`Letter content for ${section.title}`}
                >
                  {renderFormatted(resolved)}
                </div>
              )}
            </div>

            {/* Subtle contextual source info line below document prose */}
            {factsCount > 0 && (
              <div className="px-8 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-sans">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">ⓘ</span>
                  <span>Uses {factsCount} factual verified student fields</span>
                </span>
                <button
                  type="button"
                  id={`view-source-data-${section.id}`}
                  onClick={() => setShowSourceData(true)}
                  className="text-[11px] font-medium text-[#096491] hover:text-[#074f74] hover:underline"
                >
                  View source data →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source Data Modal / Popover */}
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
