"use client";

/**
 * components/ui/HinglishRewriteControl.tsx
 *
 * Reusable UI component providing the "Convert to Natural English" action
 * and non-destructive inline review workflow.
 *
 * UX Guarantee:
 * - The original user text is NEVER overwritten until [ Use This Version ] is clicked.
 * - [ Try Again ] always re-runs the transformation from the original input.
 * - [ Cancel ] safely dismisses the suggestion leaving the original text untouched.
 */

import React from "react";
import { useTextTransformation } from "@/hooks/useTextTransformation";

export interface HinglishRewriteControlProps {
  /** The current text in the target textarea */
  value: string;
  /** Callback to update the target form field when the user accepts the suggestion */
  onApply: (newText: string) => void;
  /** Context identifier (e.g. "aboutMe", "internship_description") */
  fieldName?: string;
  /** Custom button label (default: "Convert to Natural English") */
  label?: string;
  /** Additional container styling */
  className?: string;
  /** Disables the trigger button if parent form is submitting or read-only */
  disabled?: boolean;
}

export function HinglishRewriteControl({
  value,
  onApply,
  fieldName,
  label = "Convert to Natural English",
  className = "",
  disabled = false,
}: HinglishRewriteControlProps) {
  const {
    isConverting,
    isReviewing,
    isError,
    suggestedText,
    setSuggestedText,
    errorMessage,
    convert,
    tryAgain,
    cancel,
    accept,
    dismissError,
  } = useTextTransformation({ fieldName });

  const hasMinimumLength = value && value.trim().length >= 5;

  return (
    <div className={`space-y-2 mt-1.5 ${className}`}>
      {/* Trigger & Loading State */}
      {!isReviewing && !isError && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            id={fieldName ? `hinglish-rewrite-${fieldName}` : undefined}
            onClick={() => convert(value)}
            disabled={disabled || isConverting || !hasMinimumLength}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all border ${
              isConverting
                ? "bg-slate-100 text-slate-500 border-slate-200 cursor-wait"
                : hasMinimumLength && !disabled
                ? "text-indigo-700 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100/90 border-indigo-200/90 shadow-2xs cursor-pointer active:scale-98"
                : "text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-60"
            }`}
            title={
              !hasMinimumLength
                ? "Type at least 5 characters to enable conversion"
                : "Convert Hinglish / informal draft thoughts into clear, natural English"
            }
          >
            {isConverting ? (
              <>
                <span className="animate-spin text-indigo-600">⟳</span>
                <span>Converting to English…</span>
              </>
            ) : (
              <>
                <span className="text-[12px]">🌐</span>
                <span>{label}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Review Card State */}
      {isReviewing && (
        <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800/70 space-y-2.5 transition-all shadow-xs animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <span>✨</span>
              <span>Suggested Natural English:</span>
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              Review & edit if needed
            </span>
          </div>

          <textarea
            value={suggestedText}
            onChange={(e) => setSuggestedText(e.target.value)}
            rows={3}
            className="w-full text-xs sm:text-sm rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-2.5 text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
            aria-label="Suggested English text"
          />

          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => accept(onApply)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer active:scale-98"
              >
                <span>✓</span>
                <span>Use This Version</span>
              </button>

              <button
                type="button"
                onClick={tryAgain}
                disabled={isConverting}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="Regenerate using the original source text"
              >
                <span className={isConverting ? "animate-spin" : ""}>⟳</span>
                <span>Try Again</span>
              </button>
            </div>

            <button
              type="button"
              onClick={cancel}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
            >
              Cancel / Keep Original
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-800 animate-in fade-in-50">
          <div className="flex items-start gap-2">
            <span className="text-rose-500 font-bold shrink-0">⚠</span>
            <span>
              {errorMessage || "Couldn't convert the text. Your original text has not been changed."}
            </span>
          </div>
          <button
            type="button"
            onClick={dismissError}
            className="text-[11px] font-medium text-rose-600 hover:text-rose-800 underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
