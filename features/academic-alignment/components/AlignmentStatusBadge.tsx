"use client";

/**
 * features/academic-alignment/components/AlignmentStatusBadge.tsx
 *
 * Visual status badge displaying the academic alignment state with
 * curated color palettes, icons, and sizing options.
 */

import React from "react";
import type { AcademicAlignmentStatus } from "@/services/academicAlignment/types";

interface AlignmentStatusBadgeProps {
  status: AcademicAlignmentStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  isStale?: boolean;
}

const STATUS_CONFIG: Record<
  AcademicAlignmentStatus,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
    iconSvg: React.ReactNode;
  }
> = {
  ALIGNED: {
    label: "Direct Field Match",
    bg: "bg-emerald-50/90 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-300",
    dot: "bg-emerald-500",
    iconSvg: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  RELATED_TRANSITION: {
    label: "Related Field Transition",
    bg: "bg-sky-50/90 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-800 dark:text-sky-300",
    dot: "bg-sky-500",
    iconSvg: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  CONFIRMED_TRANSITION: {
    label: "Field Change Confirmed",
    bg: "bg-indigo-50/90 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800",
    text: "text-indigo-800 dark:text-indigo-300",
    dot: "bg-indigo-500",
    iconSvg: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  ACADEMIC_MISMATCH: {
    label: "Field Change (Switching Stream)",
    bg: "bg-amber-50/90 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
    iconSvg: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  UNKNOWN: {
    label: "Field Check Needed",
    bg: "bg-slate-50/90 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
    iconSvg: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 10-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5 gap-1.5",
  md: "text-xs px-2.5 py-1 gap-2 font-medium",
  lg: "text-sm px-3 py-1.5 gap-2.5 font-medium",
};

export function AlignmentStatusBadge({
  status,
  size = "md",
  showIcon = true,
  className = "",
  isStale = false,
}: AlignmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border shadow-xs transition-all ${config.bg} ${config.border} ${config.text} ${SIZE_CLASSES[size]} ${className}`}
      title={isStale ? "Stored resolution is stale — target program changed" : config.label}
    >
      {showIcon && (
        <span className="shrink-0 flex items-center justify-center">
          {config.iconSvg}
        </span>
      )}
      <span>{isStale ? "Stale Resolution (Review)" : config.label}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${isStale ? "bg-amber-400 animate-pulse" : config.dot}`} />
    </span>
  );
}

export default AlignmentStatusBadge;
