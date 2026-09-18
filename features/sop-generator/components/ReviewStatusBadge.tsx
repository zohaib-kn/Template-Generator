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
  { icon: string; label: string; colors: string }
> = {
  NOT_REVIEWED: {
    icon: "○",
    label: "Not Reviewed",
    colors: "text-slate-400",
  },
  NEEDS_REVIEW: {
    icon: "!",
    label: "Needs Review",
    colors: "text-amber-600",
  },
  APPROVED: {
    icon: "✓",
    label: "Approved",
    colors: "text-emerald-600",
  },
};

/**
 * Displays the counsellor review status of one section.
 * `compact` mode shows only the icon (for sidebar rows).
 */
export function ReviewStatusBadge({
  status,
  compact = false,
  className = "",
}: ReviewStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full
                    text-[11px] font-bold flex-shrink-0 ${cfg.colors} ${className}`}
        title={cfg.label}
        aria-label={cfg.label}
      >
        {cfg.icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${cfg.colors} ${className}`}
      aria-label={cfg.label}
    >
      <span aria-hidden="true" className="text-[13px]">
        {cfg.icon}
      </span>
      <span>{cfg.label}</span>
    </span>
  );
}
