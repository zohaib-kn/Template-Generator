"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionAccordionProps {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Hint shown next to title when collapsed, e.g. entry count */
  badge?: string;
}

export function SectionAccordion({
  title,
  icon,
  defaultOpen = false,
  children,
  badge,
}: SectionAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left",
          "hover:bg-slate-50 transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
        )}
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-700">
          {title}
        </span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-semibold">
            {badge}
          </span>
        )}
        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            "text-slate-400 flex-shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}
