"use client";

import type { TemplateSection, StudentDocumentContext } from "../types/sop-generator";
import { interpolate } from "../lib/interpolateTemplate";

interface DocumentPreviewProps {
  sections: TemplateSection[];
  sectionContents: Record<string, string>;
  ctx: StudentDocumentContext;
  onClose: () => void;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

/**
 * Parses markdown bold (**text**) into <strong> elements with safe inline styling.
 * Avoids any Tailwind v4 color classes so html2canvas never crashes on lab/oklch.
 */
function renderFormatted(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: "#111827" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Full A4 single-page letter preview modal.
 *
 * Strict single-page embassy format (matching Images 3 & 4):
 * - Centered COVER LETTER title
 * - Recipient & bold subject line
 * - Natural human student prose with bold factual highlights
 * - Calibrated density (line-height 1.23, 13px serif font) fitting easily within 1 A4 page
 */
export function DocumentPreview({
  sections,
  sectionContents,
  ctx,
  onClose,
  onDownloadPdf,
  isGeneratingPdf = false,
}: DocumentPreviewProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

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
              <span className="text-[12px] font-bold text-white tracking-wider uppercase">
                Document Preview (Single-Page Embassy Standard)
              </span>
              <p className="text-[11px] text-white/60">
                Official A4 Letter · Compact On-Point Format · Zero Overflow
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
                      Generating PDF…
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
          <div
            id="sop-preview-letter-page"
            style={{
              width: "794px",
              minHeight: "1123px",
              padding: "36px 48px",
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              fontSize: "13px",
              lineHeight: "1.23",
              color: "#111827",
              backgroundColor: "#ffffff",
              textAlign: "justify",
              boxSizing: "border-box",
              margin: "0 auto",
            }}
          >
            {/* Centered Document Header */}
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  textDecoration: "underline",
                  letterSpacing: "0.08em",
                }}
              >
                COVER LETTER
              </span>
            </div>

            {/* Sections in flowing letter format */}
            {sorted.map((section) => {
              const rawContent = sectionContents[section.id] ?? section.content;
              const rendered = interpolate(rawContent, ctx);

              if (section.id === "recipient") {
                return (
                  <div
                    key={section.id}
                    style={{
                      marginBottom: "10px",
                      whiteSpace: "pre-line",
                      lineHeight: "1.22",
                      textAlign: "left",
                    }}
                  >
                    {renderFormatted(rendered)}
                  </div>
                );
              }

              if (section.id === "subject") {
                return (
                  <div
                    key={section.id}
                    style={{
                      fontWeight: "bold",
                      marginBottom: "10px",
                      textAlign: "left",
                      lineHeight: "1.22",
                    }}
                  >
                    {renderFormatted(rendered)}
                  </div>
                );
              }

              if (section.id === "signature") {
                return (
                  <div
                    key={section.id}
                    style={{
                      marginTop: "12px",
                      whiteSpace: "pre-line",
                      lineHeight: "1.22",
                      textAlign: "left",
                    }}
                  >
                    {renderFormatted(rendered)}
                  </div>
                );
              }

              // Standard narrative / factual paragraph
              return (
                <div
                  key={section.id}
                  style={{
                    marginBottom: "5.5px",
                    textIndent: "0",
                  }}
                >
                  <p style={{ margin: 0, padding: 0 }}>
                    {renderFormatted(rendered)}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-white/50 mt-2.5">
            Single-Page A4 Embassy Standard (Times New Roman · 13px / 1.23 line-height)
          </p>
        </div>
      </div>
    </>
  );
}
