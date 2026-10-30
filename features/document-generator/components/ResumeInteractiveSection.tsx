"use client";

import React, { useState } from "react";

interface ResumeInteractiveSectionProps {
  sectionId: string;
  title: string;
  isSelected?: boolean;
  hasError?: boolean;
  onEdit?: () => void;
  children: React.ReactNode;
}

/**
 * Contextual hover wrapper for sections on the live Resume canvas.
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
      {(isSelected || hasError) && (
        <div
          data-html2canvas-ignore="true"
          data-no-print="true"
          data-pdf-ignore="true"
          className="absolute -top-3 right-3 z-30 transition-all duration-150 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-md shadow-xs px-1.5 py-0.5 text-xs select-none opacity-100 pointer-events-auto"
        >
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            {title}
          </span>
          {isSelected && (
            <span className="text-[9.5px] px-1 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
              ✨ Modified
            </span>
          )}

          {hasError && (
            <span
              className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded font-bold"
              title="Needs attention"
            >
              ⚠
            </span>
          )}
        </div>
      )}

      {/* ── Section Body ── */}
      <div>
        {children}
      </div>
    </div>
  );
}
