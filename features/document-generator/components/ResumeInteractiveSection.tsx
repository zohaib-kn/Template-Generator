"use client";

import React, { useState } from "react";

interface ResumeInteractiveSectionProps {
  sectionId: string;
  title: string;
  isSelected?: boolean;
  hasError?: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}

/**
 * Contextual hover wrapper for sections on the live Resume canvas.
 * Allows clicking to edit or adding a repeatable entry.
 * Completely ignored by html2canvas during PDF capture via data-html2canvas-ignore.
 */
export function ResumeInteractiveSection({
  sectionId,
  title,
  isSelected = false,
  hasError = false,
  onEdit,
  children,
}: ResumeInteractiveSectionProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      data-section-id={sectionId}
      className={`relative group transition-all duration-150 rounded-lg print:ring-0 print:bg-transparent ${
        isSelected
          ? "ring-1.5 ring-[#096491] ring-offset-2 bg-[rgba(240,249,255,0.4)]"
          : isHovered
          ? "ring-1 ring-slate-300 ring-offset-1 bg-[rgba(248,250,252,0.5)]"
          : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Contextual Section Micro-Toolbar (Floating top-right) ── */}
      <div
        data-html2canvas-ignore="true"
        data-no-print="true"
        data-pdf-ignore="true"
        className={`absolute -top-3 right-3 z-30 transition-all duration-150 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-md shadow-xs px-1.5 py-0.5 text-xs select-none ${
          isHovered || isSelected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          {title}
        </span>

        {hasError && (
          <span
            className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded font-bold"
            title="Needs attention"
          >
            ⚠
          </span>
        )}



        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="px-2 py-0.5 text-[11px] font-semibold text-slate-900 bg-slate-100/80 hover:bg-slate-200/90 rounded transition-colors cursor-pointer flex items-center gap-1"
          title={`Edit ${title}`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Edit</span>
        </button>
      </div>

      {/* ── Section Body ── */}
      <div>
        {children}
      </div>
    </div>
  );
}
