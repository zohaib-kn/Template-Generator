"use client";

import { Button } from "@/components/ui";
import { useDocumentContext } from "@/features/document-generator/state/DocumentContext";
import { usePdfGenerator } from "@/features/document-generator/hooks/usePdfGenerator";

export function AppHeader() {
  const { data } = useDocumentContext();
  const { status, errorMessage, generate } = usePdfGenerator();

  const isGenerating = status === "generating";

  return (
    <>
      <header className="flex items-center justify-between px-6 h-14 bg-navy border-b border-navy-dark flex-shrink-0 z-10 shadow-md">
        {/* Brand */}
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-md bg-gold flex items-center justify-center flex-shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="6" height="9" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="9" y="1" width="6" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="9" y="8" width="6" height="7" rx="1" fill="white" fillOpacity="0.6" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">
            Template Generator
          </span>
        </div>

        {/* Template badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium border border-white/10">
            Europass · v1
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={isGenerating}
            onClick={() => generate(data)}
            className="border-white/25 text-white bg-white/10 hover:bg-white/20 hover:border-white/40 disabled:opacity-60"
            aria-label="Generate and download PDF"
            id="generate-pdf-btn"
          >
            {/* Download icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={isGenerating ? "animate-pulse" : ""}
            >
              {isGenerating ? (
                // Spinner-style path while generating
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              ) : (
                // Download icon at idle
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </>
              )}
            </svg>
            {isGenerating ? "Generating PDF…" : "Generate PDF"}
          </Button>
        </div>
      </header>

      {/* Error banner — shown below header, above editor/preview */}
      {status === "error" && errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>PDF generation failed: {errorMessage}</span>
        </div>
      )}
    </>
  );
}
