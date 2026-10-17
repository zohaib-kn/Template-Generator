"use client";

import React from "react";
import type { ReviewStatus } from "../types/sop-generator";

interface SopInteractiveSectionProps {
  sectionId: string;
  title: string;
  order: number;
  wordCount: number;
  status: ReviewStatus;
  isSelected?: boolean;
  isEditing?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  children: React.ReactNode;
}

/**
 * Clean, non-intrusive section wrapper on the live SOP paper canvas.
 *
 * NO floating buttons, NO toolbars blocking text.
 * - Single click on any section text toggles it directly into editing.
 * - Subtle cursor-text and faint border highlight on hover.
 * - Completely clean for reading.
 */
export function SopInteractiveSection({
  sectionId,
  title,
  isSelected = false,
  isEditing = false,
  onSelect,
  onEdit,
  children,
}: SopInteractiveSectionProps) {
  return (
    <div
      data-section-id={sectionId}
      title={isEditing ? undefined : `Click to edit ${title}`}
      className={`relative transition-all duration-150 rounded-xs print:ring-0 print:bg-transparent ${
        isEditing
          ? "ring-1.5 ring-[#096491] bg-sky-50/15 rounded-xs p-1 -m-1"
          : isSelected
          ? "border-l-3 border-[#096491] bg-[rgba(9,100,145,0.03)] cursor-text"
          : "border-l-3 border-transparent hover:border-slate-300 hover:bg-slate-50/50 cursor-text"
      }`}
      style={{
        paddingLeft: isEditing ? undefined : "8px",
        paddingRight: isEditing ? undefined : "8px",
        marginLeft: isEditing ? undefined : "-8px",
        marginRight: isEditing ? undefined : "-8px",
      }}
      onClick={() => {
        onSelect();
        if (!isEditing) {
          onEdit();
        }
      }}
    >
      {children}
    </div>
  );
}
