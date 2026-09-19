"use client";

import type { ReviewStatus } from "../types/sop-generator";

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  /** Show compact single-character version (for sidebar). */
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  ReviewStatus,
  { icon: string; label: string; textClass: string; pillClass: string; indicatorClass: string }
> = {
  NOT_REVIEWED: {
    icon: "○",
    label: "Not Reviewed",
    textClass: "text-slate-500",
    pillClass: "bg-slate-50 text-slate-600 border-slate-200",
    indicatorClass: "text-slate-400 border-slate-200 bg-slate-50",
  },
  NEEDS_REVIEW: {
    icon: "!",
    label: "Needs Review",
    textClass: "text-amber-600",
    pillClass: "bg-amber-50 text-amber-700 border-amber-200",
    indicatorClass: "text-amber-600 border-amber-200 bg-amber-50",
  },
  APPROVED: {
    icon: "✓",
    label: "Approved",
    textClass: "text-emerald-600",
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    indicatorClass: "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
};

/**
 * Displays the counsellor review status of one section.
 * `compact` mode shows a neat indicator dot (for sidebar rows).
 */
export function ReviewStatusBadge({
  status,
  compact = false,
  className = "",
}: ReviewStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NOT_REVIEWED;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full border
                    text-[9px] font-bold flex-shrink-0 leading-none ${cfg.indicatorClass} ${className}`}
        title={cfg.label}
        aria-label={cfg.label}
      >
        {cfg.icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium leading-none ${cfg.pillClass} ${className}`}
      aria-label={cfg.label}
    >
      <span aria-hidden="true" className="text-[10px] font-bold">
        {cfg.icon}
      </span>
      <span>{cfg.label}</span>
    </span>
  );
}
