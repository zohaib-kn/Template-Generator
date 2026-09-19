"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";

// ---------------------------------------------------------------------------
// Safe PDF button — only renders when inside a DocumentProvider
// ---------------------------------------------------------------------------
// We use a lazy/deferred import pattern to avoid calling useDocumentContext
// on the SOP route where no DocumentProvider is present.
// The PdfButton component itself is defined in a separate internal function
// that wraps both hooks. We catch the missing-context error boundary at
// the component level via the optional context hook approach.
// ---------------------------------------------------------------------------

import { useContext } from "react";
import { usePdfGenerator } from "@/features/document-generator/hooks/usePdfGenerator";

// Re-export the context value type without importing the context directly
// to avoid circular concerns. We access the context via the hook internally.
import {
  useDocumentContext,
} from "@/features/document-generator/state/DocumentContext";

/**
 * PDF generation controls — ONLY rendered on Resume Builder routes where
 * DocumentProvider is present. Gracefully renders nothing on other routes.
 */
function PdfControls() {
  // useDocumentContext throws if not in DocumentProvider.
  // We call it unconditionally here — the parent (AppHeader) only renders
  // this component when isResumeRoute is true, ensuring a provider is present.
  const { data } = useDocumentContext();
  const { status, errorMessage, generate } = usePdfGenerator();
  const isGenerating = status === "generating";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={isGenerating}
        onClick={() => generate(data, {})}
        className="border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 shadow-xs text-xs font-semibold disabled:opacity-50"
        aria-label="Generate and download PDF"
        id="generate-pdf-btn"
      >
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
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          ) : (
            <>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </>
          )}
        </svg>
        {isGenerating ? "Generating PDF…" : "Generate PDF"}
      </Button>

      {/* Error banner */}
      {status === "error" && errorMessage && (
        <div
          role="alert"
          className="absolute top-full left-0 right-0 flex items-center gap-2 px-6 py-2
                     bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium z-10"
        >
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
          >
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

// ---------------------------------------------------------------------------
// Navigation tabs config
// ---------------------------------------------------------------------------

interface NavTab {
  label: string;
  href: string;
  id: string;
}

const NAV_TABS: NavTab[] = [
  { label: "Resume Builder", href: "/",             id: "nav-tab-resume" },
  { label: "SOP Generator",  href: "/sop-generator", id: "nav-tab-sop"    },
  { label: "LOR Generator",  href: "/lor-generator", id: "nav-tab-lor"    },
];

// ---------------------------------------------------------------------------
// AppHeader
// ---------------------------------------------------------------------------

interface AppHeaderProps {
  target?: { destinationCountry?: string };
}

/**
 * Shared product header — visible on Resume Builder, SOP Generator, and LOR Generator.
 *
 * Contains:
 *   - Brand logo + product name
 *   - Tool navigation tabs (Resume Builder | SOP Generator | LOR Generator)
 *   - PDF generation controls (Resume Builder only)
 */
export function AppHeader({ target: _target }: AppHeaderProps = {}) {
  const pathname = usePathname();

  // Resume Builder is the root route. Exact match to avoid false positives.
  const isResumeRoute = pathname === "/";

  return (
    <>
      <header
        className="flex items-center justify-between px-6 h-14 bg-navy border-b border-navy-dark
                   flex-shrink-0 z-20 shadow-md relative"
      >
        {/* ── Brand ── */}
        <div className="flex items-center gap-3">
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
          <span className="text-white font-semibold text-sm tracking-tight" style={{ color: "#ffffff" }}>
            Template Generator
          </span>
        </div>

        {/* ── Tool navigation tabs ── */}
        <nav
          className="flex items-center gap-1 bg-white/10 rounded-lg p-1"
          aria-label="Tool navigation"
        >
          {NAV_TABS.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                id={tab.id}
                style={{
                  color: isActive ? "#0f1e30" : "#ffffff",
                  backgroundColor: isActive ? "#ffffff" : "transparent",
                }}
                className={`px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all duration-150 ${
                  isActive
                    ? "shadow-sm font-bold"
                    : "hover:bg-white/15"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  style={{
                    color: isActive ? "#0f1e30" : "#ffffff",
                  }}
                  className={isActive ? "font-bold text-[#0f1e30]" : "text-white font-medium"}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ── Right: PDF controls (Resume Builder only) ── */}
        <div className="flex items-center gap-3">
          {isResumeRoute ? (
            <PdfControls />
          ) : (
            /* Placeholder to keep layout balanced */
            <div className="w-[130px]" aria-hidden="true" />
          )}
        </div>
      </header>
    </>
  );
}
