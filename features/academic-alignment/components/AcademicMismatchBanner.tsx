"use client";

/**
 * features/academic-alignment/components/AcademicMismatchBanner.tsx
 *
 * Prominent contextual banner displaying academic alignment status,
 * blocking reasons, and immediate resolution actions.
 *
 * Integrated into SOP Generator (ContextPanel / WorkspaceHeader)
 * and Resume Builder (ResumeContextPanel).
 */

import React, { useState } from "react";
import type { AcademicAlignmentResult } from "@/services/academicAlignment/types";
import { AlignmentStatusBadge } from "./AlignmentStatusBadge";

interface AcademicMismatchBannerProps {
  result: AcademicAlignmentResult;
  isStale?: boolean;
  staleReason?: string;
  onReviewTargetCourse?: () => void;
  onConfirmIntentionalTransition?: () => void;
  onResetResolution?: () => void;
  className?: string;
}

export function AcademicMismatchBanner({
  result,
  isStale = false,
  staleReason,
  onReviewTargetCourse,
  onConfirmIntentionalTransition,
  onResetResolution,
  className = "",
}: AcademicMismatchBannerProps) {
  const [expanded, setExpanded] = useState(false);

  // If aligned and not stale, show nothing (or render compact badge if desired)
  if (result.status === "ALIGNED" && !isStale) {
    return null;
  }

  // -------------------------------------------------------------------------
  // Visual Theme Config
  // -------------------------------------------------------------------------
  let containerStyles = "bg-amber-50/95 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200";
  let iconBg = "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300";

  if (isStale) {
    containerStyles = "bg-orange-50/95 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-900 dark:text-orange-200";
    iconBg = "bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300";
  } else if (result.status === "CONFIRMED_TRANSITION") {
    containerStyles = "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200";
    iconBg = "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300";
  } else if (result.status === "RELATED_TRANSITION") {
    containerStyles = "bg-sky-50/90 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200";
    iconBg = "bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300";
  } else if (result.status === "UNKNOWN") {
    containerStyles = "bg-slate-50/95 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200";
    iconBg = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
  }

  const sourceDomainName = result.sourceField.domain.replace(/_/g, " ");
  const targetDomainName = result.targetField.domain.replace(/_/g, " ");

  return (
    <div
      className={`rounded-xl border p-4 shadow-xs transition-all ${containerStyles} ${className}`}
      role="alert"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Icon and Main Headline */}
        <div className="flex items-start gap-3.5">
          <div className={`shrink-0 rounded-lg p-2 ${iconBg}`}>
            {result.status === "CONFIRMED_TRANSITION" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : result.status === "RELATED_TRANSITION" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm sm:text-base leading-tight">
                {isStale
                  ? "Target Program Changed Since Transition Confirmed"
                  : result.status === "ACADEMIC_MISMATCH"
                  ? `Academic Mismatch: ${sourceDomainName} → ${targetDomainName}`
                  : result.status === "UNKNOWN"
                  ? "Academic Alignment Needs Counsellor Review"
                  : result.status === "RELATED_TRANSITION"
                  ? `Cognate Transition: ${sourceDomainName} → ${targetDomainName}`
                  : `Intentional Transition Confirmed: ${sourceDomainName} → ${targetDomainName}`}
              </h4>
              <AlignmentStatusBadge status={result.status} isStale={isStale} size="sm" />
            </div>

            <p className="text-xs sm:text-sm opacity-90 leading-relaxed max-w-2xl">
              {isStale
                ? staleReason ||
                  "The student's target program was updated. Please review whether the confirmed transition rationale still applies."
                : result.status === "ACADEMIC_MISMATCH"
                ? "The student's previous academic background does not align with the target degree. AI generation for sensitive sections (Why Course, Career Plan) is paused until a transition rationale and verified evidence are submitted."
                : result.status === "UNKNOWN"
                ? "Academic alignment could not be determined with high certainty from available education records. Please review previous qualifications or target course details."
                : result.status === "RELATED_TRANSITION"
                ? "The student is transitioning between related disciplines. Nuanced bridging content is enabled."
                : "A counsellor-verified transition with supporting evidence is in effect. Sensitive AI generation is permitted with safe factual bridging."}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-2 sm:mt-0 sm:self-center shrink-0">
          {onReviewTargetCourse && (
            <button
              type="button"
              onClick={onReviewTargetCourse}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-current/30 hover:bg-current/10 transition-colors focus:outline-hidden focus:ring-2 focus:ring-current/20"
            >
              Review Target
            </button>
          )}

          {(result.status === "ACADEMIC_MISMATCH" || isStale) && onConfirmIntentionalTransition && (
            <button
              type="button"
              onClick={onConfirmIntentionalTransition}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              Justify Transition
            </button>
          )}

          {result.status === "CONFIRMED_TRANSITION" && onResetResolution && (
            <button
              type="button"
              onClick={onResetResolution}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              title="Reset confirmation"
            >
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="p-1.5 text-xs rounded-md text-current/70 hover:text-current hover:bg-current/10 transition-colors"
            title={expanded ? "Hide details" : "Show details"}
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Technical / Domain Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-current/20 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2.5">
            <span className="font-semibold block mb-1">Source Academic Profile</span>
            <div className="space-y-0.5 text-current/80">
              <p>Domain: <span className="font-medium text-current">{result.sourceField.domain}</span></p>
              {result.sourceField.subDomain && (
                <p>Sub-discipline: <span className="font-medium text-current">{result.sourceField.subDomain}</span></p>
              )}
              <p className="text-[11px] opacity-75">Source: {result.sourceField.classifiedFrom}</p>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2.5">
            <span className="font-semibold block mb-1">Target Application</span>
            <div className="space-y-0.5 text-current/80">
              <p>Target Domain: <span className="font-medium text-current">{result.targetField.domain}</span></p>
              {result.targetField.subDomain && (
                <p>Sub-discipline: <span className="font-medium text-current">{result.targetField.subDomain}</span></p>
              )}
              <p className="text-[11px] opacity-75">Target: {result.targetField.classifiedFrom}</p>
            </div>
          </div>

          {result.blockingReason && (
            <div className="sm:col-span-2 bg-red-50/80 dark:bg-red-950/30 text-red-800 dark:text-red-300 p-2.5 rounded-lg border border-red-200 dark:border-red-900 text-xs">
              <span className="font-semibold">Generation Guard: </span>
              {result.blockingReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AcademicMismatchBanner;
