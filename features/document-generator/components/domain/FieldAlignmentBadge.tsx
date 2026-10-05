/**
 * features/document-generator/components/domain/FieldAlignmentBadge.tsx
 *
 * Visual status badge displaying real-time academic alignment for form inputs:
 * 🟢 Direct Match with Degree
 * 🟡 Career Transition Bridge
 * 🔴 Divergent / Cross-Field Notice
 */

"use client";

import React from "react";
import type { FieldEvaluationResult } from "../../context/AcademicProfileContext";

interface FieldAlignmentBadgeProps {
  evaluation: FieldEvaluationResult;
  className?: string;
}

export function FieldAlignmentBadge({
  evaluation,
  className = "",
}: FieldAlignmentBadgeProps) {
  if (evaluation.status === "NEUTRAL" || !evaluation.message) {
    return null;
  }

  const isMatch = evaluation.status === "MATCH";
  const isBridge = evaluation.status === "BRIDGE";
  const isDivergent = evaluation.status === "DIVERGENT";

  return (
    <div
      className={`mt-1.5 flex items-start gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition-all animate-in fade-in duration-200 ${
        isMatch
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
          : isBridge
          ? "bg-amber-50 text-amber-900 border border-amber-200/80"
          : "bg-rose-50 text-rose-800 border border-rose-200/80"
      } ${className}`}
      role="status"
    >
      <span className="font-semibold text-xs shrink-0 select-none">
        {isMatch && "✓"}
        {isBridge && "⚡︎"}
        {isDivergent && "⚠"}
      </span>
      <div className="leading-tight">
        <span className="font-medium mr-1">
          {isMatch && "Degree Aligned:"}
          {isBridge && "Career Transition Bridge:"}
          {isDivergent && "Cross-Field Notice:"}
        </span>
        <span className="opacity-90">{evaluation.message}</span>
      </div>
    </div>
  );
}
