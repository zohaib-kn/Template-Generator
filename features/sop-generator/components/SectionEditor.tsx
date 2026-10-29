"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  TemplateSection,
  ReviewStatus,
  StudentDocumentContext,
} from "../types/sop-generator";
import { interpolate, isPlaceholderMissing } from "../lib/interpolateTemplate";
import { calculateSectionWordCount } from "../lib/wordCount";
import {
  classifySourceDomain,
  classifyTargetDomain,
} from "@/services/academicAlignment/domainClassifier";
import { getDomainCatalog } from "@/features/document-generator/guidance/academicCatalog";
import {
  getSectionTalkingPoints,
} from "../guidance/sopAcademicCatalog";
import { HinglishRewriteControl } from "@/components/ui/HinglishRewriteControl";

// ── Crisp Bespoke SVG Icons ──────────────────────────────────────────────────
function ChevronLeftIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PencilIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function SparklesIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

function DatabaseIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function CheckIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

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
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
                    const path = template.replace(/[{}]/g, "").trim();
                    const isMissing = isPlaceholderMissing(ctx, path);
                    const value = interpolate(template, ctx);
                    return (
                      <tr key={key}>
                        <td className="py-2.5 pr-4 text-slate-500 font-medium align-top">
                          {key}
                        </td>
                        <td className="py-2.5 align-top font-medium break-words text-slate-900">
                          <span>{value}</span>
                          {isMissing && (
                            <span className="ml-2 inline-block text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2 font-normal">
                              Missing in CRM
                            </span>
                          )}
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
              className="h-8 px-4 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
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
  canvasMasthead?: string;
  totalSections?: number;
  isGenerationBlocked?: boolean;
  generationBlockedReason?: string;
  allSections?: TemplateSection[];
  onSelectSection?: (sectionId: string) => void;
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
 * Document-First Section Inspector & Action Bar.
 *
 * Sits elegantly above the centered A4 paper canvas.
 * Allows counsellors to step through sections, inspect CRM source facts,
 * trigger AI writing / rewrites, approve sections, and edit with focused prose controls.
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
  canvasMasthead: _canvasMasthead,
  totalSections,
  isGenerationBlocked = false,
  generationBlockedReason,
  allSections,
  onSelectSection,
}: SectionEditorProps) {
  const [draftText, setDraftText] = useState(content);
  const [showSourceData, setShowSourceData] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sync draftText when section changes
  useEffect(() => {
    setDraftText(content);
    setFeedback(null);
  }, [section.id, content]);

  const isModified = content !== section.content;

  const sectionWordCount = useMemo(
    () => calculateSectionWordCount(draftText, ctx),
    [draftText, ctx]
  );

  const factsCount = section.sourceFacts ? Object.keys(section.sourceFacts).length : 0;

  // Previous and next section calculation
  const { prevSection, nextSection } = useMemo(() => {
    if (!allSections || allSections.length === 0) return { prevSection: null, nextSection: null };
    const sorted = [...allSections].sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((s) => s.id === section.id);
    return {
      prevSection: currentIndex > 0 ? sorted[currentIndex - 1] : null,
      nextSection: currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null,
    };
  }, [allSections, section.id]);

  // ── Academic Domain Resolution & Branch-Aware Talking Points ─────────────
  const sourceField = useMemo(() => {
    return classifySourceDomain([
      {
        id: "qual-sop",
        qualification: ctx.academics.latestQualification || "Degree",
        fieldOfStudy: ctx.academics.subjects || ctx.academics.latestQualification || "General",
        boardOrUniversity: ctx.academics.institution,
      },
    ]);
  }, [ctx.academics]);

  const targetField = useMemo(() => {
    return classifyTargetDomain({
      id: "target-sop",
      course: ctx.destination.course || "Target Course",
      university: ctx.destination.university || "Target University",
      country: ctx.destination.country || "Target Country",
      degreeLevel: ctx.destination.degreeLevel || "Master's",
      courseCategory: "Other",
    });
  }, [ctx.destination]);

  const sourceDomain = sourceField.domain;
  const targetDomain = targetField.domain;
  const isTransition =
    sourceDomain !== "UNKNOWN" &&
    targetDomain !== "UNKNOWN" &&
    sourceDomain !== targetDomain;

  const talkingPoints = useMemo(() => {
    return getSectionTalkingPoints(
      section.id,
      sourceDomain,
      targetDomain,
      isTransition,
      ctx.academics.latestQualification || "Degree",
      ctx.destination.course || "Master's"
    );
  }, [section.id, sourceDomain, targetDomain, isTransition, ctx.academics, ctx.destination]);

  function handleInsertTalkingPoint(textToInsert: string) {
    const trimmed = draftText.trim();
    const nextVal = trimmed ? `${trimmed}\n\n${textToInsert}` : textToInsert;
    setDraftText(nextVal);
    onContentChange(nextVal);
  }

  async function handleRegenerateClick(mode: "generate" | "rewrite-natural" = "generate") {
    if (!onRegenerate) return;
    if (isGenerationBlocked) {
      setFeedback({
        type: "error",
        message:
          generationBlockedReason ||
          "AI narrative generation for this section is blocked due to unresolved academic mismatch.",
      });
      return;
    }
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

  function handleResetClick() {
    onReset();
    setDraftText(section.content);
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 space-y-3.5 text-xs select-text">
      {/* ── 1. Section Header & Stepper ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Active Section</span>
          <span className="font-mono">
            {allSections ? `${section.order} of ${allSections.length}` : `#${section.order}`}
          </span>
        </div>

        {/* Stepper + Dropdown */}
        <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-lg p-1 shadow-2xs gap-1">
          {onSelectSection && prevSection ? (
            <button
              type="button"
              onClick={() => onSelectSection(prevSection.id)}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer flex-shrink-0"
              title={`Previous: ${prevSection.title}`}
              aria-label="Previous section"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-7 h-7 flex items-center justify-center text-slate-300 flex-shrink-0">
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            </div>
          )}

          {allSections && onSelectSection ? (
            <select
              value={section.id}
              onChange={(e) => onSelectSection(e.target.value)}
              className="text-xs font-semibold text-slate-900 bg-transparent px-2 py-1 outline-none cursor-pointer flex-1 min-w-0 truncate"
              aria-label="Select section"
            >
              {allSections
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {String(s.order).padStart(2, "0")}. {s.title}
                  </option>
                ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-900 truncate">
                {section.title}
              </span>
            </div>
          )}

          {onSelectSection && nextSection ? (
            <button
              type="button"
              onClick={() => onSelectSection(nextSection.id)}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer flex-shrink-0"
              title={`Next: ${nextSection.title}`}
              aria-label="Next section"
            >
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-7 h-7 flex items-center justify-center text-slate-300 flex-shrink-0">
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Metadata Badges */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap pt-0.5">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
            {section.regeneratable
              ? "Suggested draft"
              : section.source === "WEBHOOK"
              ? "Student data"
              : section.source === "DATABASE"
              ? "Verified destination"
              : "Template section"}
          </span>

          {/* Source facts badge */}
          {factsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowSourceData(true)}
              className="text-[11px] font-medium text-[#096491] hover:text-[#074f74] hover:underline cursor-pointer flex items-center gap-1 ml-auto"
              title="View verified CRM facts powering this section"
            >
              <DatabaseIcon className="w-3 h-3 text-[#096491]" />
              <span>{factsCount} fields</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner notice if any */}
      {feedback && (
        <div
          className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span className="leading-snug">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Blocked generation alert */}
      {isGenerationBlocked && section.regeneratable && (
        <div className="px-3.5 py-2.5 rounded-lg text-xs bg-amber-50 border border-amber-200 text-amber-900 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <span>⚠️</span>
            <span>AI Generation Blocked</span>
          </div>
          <p className="text-[11px] text-amber-900/90 leading-relaxed">
            {generationBlockedReason ||
              "This section is academically sensitive. Please confirm the intentional academic transition in the Alignment tab before generating AI content."}
          </p>
        </div>
      )}

      {/* ── 2. Direct Content Editor (Open Immediately, Zero-Button Activation) ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Section Content</span>
          <span className="font-sans font-medium text-slate-500">{sectionWordCount} words</span>
        </div>

        <div className="relative rounded-xl border border-slate-300 focus-within:border-[#096491] focus-within:ring-1 focus-within:ring-[#096491] p-3 bg-white transition-all shadow-2xs">
          <textarea
            id={`section-editor-textarea-${section.id}`}
            value={draftText}
            onChange={(e) => {
              const nextVal = e.target.value;
              setDraftText(nextVal);
              onContentChange(nextVal);
            }}
            rows={7}
            className="w-full bg-transparent text-[12.5px] text-slate-900 font-sans leading-[1.6] resize-y outline-none block"
            aria-label={`Edit content for ${section.title}`}
            placeholder="Type section narrative here…"
          />

          {/* Bottom bar of textarea */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-[11px] font-sans">
            {isModified ? (
              <button
                type="button"
                id={`reset-${section.id}`}
                onClick={handleResetClick}
                className="text-amber-600 hover:text-amber-700 text-[11px] font-medium flex items-center gap-1 hover:underline cursor-pointer"
                title="Reset to template original"
              >
                <span>↺</span>
                <span>Reset default</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">Syncs live with canvas</span>
            )}
            <span className="text-[11px] font-medium text-slate-500">
              {sectionWordCount} words
            </span>
          </div>
        </div>

        {/* Approve section CTA / Approved state with Undo */}
        <div className="flex items-center justify-end gap-1.5 pt-2">
          {status === "APPROVED" ? (
            <>
              <span className="h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-medium flex items-center gap-1">
                ✓ Approved
              </span>
              {onUndoApprove && (
                <button
                  type="button"
                  onClick={onUndoApprove}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                  title="Undo approval"
                >
                  Undo
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              id={`approve-${section.id}`}
              onClick={onApprove}
              disabled={isRegenerating}
              className="h-8 px-3.5 rounded-lg bg-[#096491] hover:bg-[#074f74] active:bg-[#063f5d] text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Approve Section
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Streamlined AI & Tone Action Bar ── */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>AI & Tone Actions</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Regenerate */}
          <button
            type="button"
            id={`regenerate-${section.id}`}
            onClick={() => handleRegenerateClick("generate")}
            disabled={!section.regeneratable || isRegenerating || isGenerationBlocked}
            className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={
              !section.regeneratable
                ? "This section uses factual CRM template values"
                : isGenerationBlocked
                ? generationBlockedReason || "AI generation blocked due to academic mismatch"
                : "Generate tailored narrative draft"
            }
          >
            {isRegenerating ? (
              <>
                <span className="animate-spin text-slate-600">⟳</span>
                <span>Writing…</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Regenerate</span>
              </>
            )}
          </button>

          {/* Natural Voice Rewrite */}
          <button
            type="button"
            id={`rewrite-natural-${section.id}`}
            onClick={() => handleRegenerateClick("rewrite-natural")}
            disabled={!section.regeneratable || isRegenerating || isGenerationBlocked || !draftText.trim()}
            className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={
              !section.regeneratable
                ? "This section uses factual CRM template values"
                : isGenerationBlocked
                ? generationBlockedReason || "AI generation blocked due to academic mismatch"
                : "Rewrite in natural, authentic student voice"
            }
          >
            <SparklesIcon className="w-3.5 h-3.5 text-[#096491]" />
            <span>Natural Voice</span>
          </button>
        </div>

        {/* Compact Natural English Converter */}
        <HinglishRewriteControl
          value={draftText}
          onApply={(newText) => {
            setDraftText(newText);
            onContentChange(newText);
          }}
          fieldName={`sop_section_${section.id}`}
          label="Convert to Natural English"
        />
      </div>

      {/* ── 5. Collapsible Academic Guidance & Talking Points ── */}
      {talkingPoints.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowGuidance((v) => !v)}
            className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-800 py-1 font-medium transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <span>💡</span>
              <span>
                {isTransition
                  ? `Transition Bridge Guidance (${talkingPoints.length})`
                  : `Academic Focus Points (${talkingPoints.length})`}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">
              {showGuidance ? "Hide ▲" : "Show ▼"}
            </span>
          </button>

          {showGuidance && (
            <div className="pt-2 space-y-1.5 animate-in fade-in-50 duration-150">
              <div className="flex flex-wrap gap-1.5">
                {talkingPoints.map((point) => (
                  <button
                    key={point.label}
                    type="button"
                    onClick={() => handleInsertTalkingPoint(point.textToInsert)}
                    className={`inline-flex items-center text-[10px] rounded-md px-2 py-1 border transition-colors shadow-2xs cursor-pointer ${
                      point.type === "bridge"
                        ? "bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100"
                        : point.type === "transferable"
                        ? "bg-indigo-50 text-indigo-950 border-indigo-200 hover:bg-indigo-100"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                    title={point.textToInsert}
                  >
                    + {point.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Structured Source Data Dialog */}
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
