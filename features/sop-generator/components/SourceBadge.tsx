"use client";

import type { ContentSource } from "../types/sop-generator";
import {
  CONTENT_SOURCE_ICONS,
  CONTENT_SOURCE_LABELS,
} from "../types/sop-generator";

interface SourceBadgeProps {
  source: ContentSource;
  /** Additional CSS classes */
  className?: string;
}

const SOURCE_COLORS: Record<ContentSource, string> = {
  FIXED:        "bg-slate-100 text-slate-600 border-slate-200",
  WEBHOOK:      "bg-blue-50  text-blue-700  border-blue-200",
  DATABASE:     "bg-green-50 text-green-700 border-green-200",
  AI_SUGGESTED: "bg-violet-50 text-violet-700 border-violet-200",
  HYBRID:       "bg-amber-50 text-amber-700  border-amber-200",
};

/**
 * Compact pill that communicates where a section's content came from.
 * Uses both icon AND text so it never relies on colour alone.
 */
export function SourceBadge({ source, className = "" }: SourceBadgeProps) {
  const colors = SOURCE_COLORS[source];
  const icon = CONTENT_SOURCE_ICONS[source];
  const label = CONTENT_SOURCE_LABELS[source];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  text-[10px] font-semibold tracking-wide border
                  ${colors} ${className}`}
      title={label}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
