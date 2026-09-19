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
  FIXED:        "bg-[#F8FAFC] text-slate-600 border-slate-200",
  WEBHOOK:      "bg-[#F0F7FA] text-[#096491] border-[#D2E7F0]",
  DATABASE:     "bg-[#F0F7FA] text-[#096491] border-[#D2E7F0]",
  AI_SUGGESTED: "bg-[#F8F7FC] text-[#6B5B95] border-[#EAE6F4]",
  HYBRID:       "bg-[#FAF8F5] text-[#8C6B38] border-[#EFE7D8]",
};

/**
 * Standardized soft semantic pill that communicates where a section's content came from.
 * Height ~24px, subtle border, gentle brand/semantic tint without dominating the screen.
 */
export function SourceBadge({ source, className = "" }: SourceBadgeProps) {
  const colors = SOURCE_COLORS[source] ?? SOURCE_COLORS.FIXED;
  const icon = CONTENT_SOURCE_ICONS[source];
  const label = CONTENT_SOURCE_LABELS[source];

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full
                  text-[10px] font-medium tracking-normal border
                  ${colors} ${className}`}
      title={label}
    >
      <span aria-hidden="true" className="text-[10px] leading-none opacity-80">{icon}</span>
      <span className="leading-none">{label}</span>
    </span>
  );
}
