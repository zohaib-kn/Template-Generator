"use client";

import { useMemo } from "react";
import type { TemplateSection, StudentDocumentContext, SopTemplate } from "../types/sop-generator";
import { interpolate } from "../lib/interpolateTemplate";
import { calculateDocumentWordCount } from "../lib/wordCount";

import { SopDocumentLetter } from "./SopDocumentLetter";

interface DocumentPreviewProps {
  sections: TemplateSection[];
  sectionContents: Record<string, string>;
  ctx: StudentDocumentContext;
  onClose: () => void;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
  template?: SopTemplate;
}

/**
 * Full A4 letter preview modal.
 *
 * Supports single-page embassy format or university statement of purpose:
 * - Centered title (from template config: COVER LETTER or STATEMENT OF PURPOSE)
 * - Configurable salutation and signoff
 * - Natural human student prose with bold factual highlights
 * - Calibrated typography and safe inline styles
 */
export function DocumentPreview({
  sections,
  sectionContents,
  ctx,
  onClose,
  onDownloadPdf,
  isGeneratingPdf = false,
  template,
}: DocumentPreviewProps) {
  const headerTitle = template?.documentHeaderTitle || "COVER LETTER";
  const isUniversitySop = template?.documentType === "UNIVERSITY_SOP";

  const totalWordCount = useMemo(
    () => calculateDocumentWordCount(sections, sectionContents, ctx),
    [sections, sectionContents, ctx]
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 flex items-start justify-center overflow-y-auto py-6 px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        aria-modal="true"
        role="dialog"
        aria-label="Document preview"
      >
        <div className="relative w-full max-w-[820px] my-auto">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-white tracking-wider uppercase">
                  Document Preview ({headerTitle})
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/15 text-white text-[10px] font-semibold border border-white/20">
                  {totalWordCount} words
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                {isUniversitySop
                  ? "Official Academic Statement · Formatted Standard"
                  : "Official A4 Letter · Compact On-Point Format · Zero Overflow"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onDownloadPdf && (
                <button
                  id="preview-download-pdf-btn"
                  onClick={onDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="bg-[#096491] hover:bg-[#074f74] active:bg-[#063f5d] active:scale-95 text-white rounded-lg px-3.5 py-1.5
                             text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <svg
                        className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white"
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Generating PDF ({totalWordCount} words)…</span>
                    </>
                  ) : (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              )}
              <button
                id="preview-close-btn"
                onClick={onClose}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20
                           border border-white/20 rounded-lg px-3 py-1.5
                           text-xs font-medium transition-all"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* A4 Single Page Document */}
          <SopDocumentLetter
            sections={sections}
            sectionContents={sectionContents}
            ctx={ctx}
            template={template}
            id="sop-preview-letter-page"
          />

          <p className="text-center text-[11px] text-white/50 mt-2.5">
            {isUniversitySop
              ? `University Statement of Purpose · Academic Standard (${totalWordCount} words)`
              : `Single-Page A4 Embassy Standard (Times New Roman · 13px / 1.23 line-height · ${totalWordCount} words)`}
          </p>
        </div>
      </div>
    </>
  );
}
