"use client";

import { cn } from "@/lib/cn";
import type { ProfileSuggestion } from "../guidance/profileSuggestions/profileSuggestions.types";

interface SuggestionChipProps {
  suggestion: ProfileSuggestion;
  isAdded: boolean;
  onClick: () => void;
}

/**
 * SuggestionChip — editor-only UI component.
 *
 * Displays a single suggestion as a clickable chip.
 * When the suggestion is already present in DocumentData, shows "✓ Added"
 * and disables further clicks.
 *
 * Source labels are shown subtly for transparency.
 * NEVER appears in the PDF template.
 */
export function SuggestionChip({ suggestion, isAdded, onClick }: SuggestionChipProps) {
  const sourceLabel =
    suggestion.source === "country"
      ? "Destination idea"
      : suggestion.source === "intendedCourse"
      ? "Course match"
      : null;

  if (isAdded) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium",
          "bg-emerald-50 border border-emerald-200 text-emerald-700",
          "cursor-default select-none"
        )}
        aria-label={`${suggestion.label} — already added`}
      >
        <span className="text-emerald-500">✓</span>
        <span>{suggestion.label}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium",
        "bg-white border border-slate-200 text-slate-700",
        "hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800",
        "transition-all duration-150 cursor-pointer group",
        "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400/50"
      )}
      aria-label={`Suggest ${suggestion.label}`}
    >
      <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">+</span>
      <span>{suggestion.label}</span>
      {sourceLabel && (
        <span className="text-slate-300 group-hover:text-indigo-300 text-[9px] font-normal ml-0.5 hidden sm:inline transition-colors">
          · {sourceLabel}
        </span>
      )}
    </button>
  );
}
