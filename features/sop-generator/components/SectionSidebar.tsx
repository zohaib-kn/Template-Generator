"use client";

import { useMemo } from "react";
import type { TemplateSection, ReviewStatus, SectionGroup } from "../types/sop-generator";

interface SectionSidebarProps {
  sections: TemplateSection[];
  selectedId: string | null;
  statuses: Record<string, ReviewStatus>;
  onSelectSection: (id: string) => void;
  onToggleStatus?: (sectionId: string) => void;
  groups?: SectionGroup[];
  onClose?: () => void;
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: "document",
    title: "Document",
    sectionIds: ["recipient", "subject", "student-introduction"],
  },
  {
    id: "academics",
    title: "Academic Motivation",
    sectionIds: ["academic-background", "why-course", "why-university", "why-italy"],
  },
  {
    id: "future-finance",
    title: "Future & Finance",
    sectionIds: ["future-academic-plan", "career-plan", "return-intent", "financial-sponsorship"],
  },
  {
    id: "closing",
    title: "Logistics & Closing",
    sectionIds: ["accommodation", "insurance", "travel", "closing-statement", "signature"],
  },
];

export function SectionSidebar({
  sections,
  selectedId,
  statuses,
  onSelectSection,
  onToggleStatus,
  groups,
  onClose,
}: SectionSidebarProps) {
  const effectiveGroups = useMemo(() => {
    return groups && groups.length > 0 ? groups : SECTION_GROUPS;
  }, [groups]);

  // Map sections by id for fast group lookup
  const sectionsById = useMemo(() => {
    return new Map(sections.map((s) => [s.id, s]));
  }, [sections]);



  return (
    <aside
      className="w-64 xl:w-72 flex-shrink-0 flex flex-col border-r border-slate-200/90 bg-[#FAFBFD] overflow-hidden select-none"
      aria-label="Document story sections navigation"
    >
      {/* Sidebar Top Meta */}
      <div className="px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Story Structure
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">
            {sections.length} sections
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close Story Structure"
              aria-label="Close Story Structure"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {effectiveGroups.map((group) => {
          const groupSecs = group.sectionIds
            .map((id) => sectionsById.get(id))
            .filter((s): s is TemplateSection => Boolean(s));

          if (groupSecs.length === 0) return null;

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Header */}
              <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  {group.title}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {groupSecs.length}
                </span>
              </div>

              {/* Group Items */}
              <ul className="space-y-0.5" role="listbox">
                {groupSecs.map((section) => {
                  const isSelected = section.id === selectedId;
                  const orderNum = String(section.order).padStart(2, "0");

                  return (
                    <li key={section.id} role="option" aria-selected={isSelected}>
                      <div
                        id={`section-nav-${section.id}`}
                        onClick={() => onSelectSection(section.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectSection(section.id);
                          }
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-all text-xs group relative cursor-pointer
                          ${
                            isSelected
                              ? "bg-white text-slate-900 shadow-xs border border-slate-200/90 font-medium"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent"
                          }`}
                      >
                        {/* Number */}
                        <span
                          className={`text-[10px] font-mono tabular-nums flex-shrink-0 transition-colors ${
                            isSelected
                              ? "text-slate-900 font-semibold"
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        >
                          {orderNum}
                        </span>

                        {/* Title & tags */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate">
                          <span className="truncate">{section.title}</span>
                          {section.regeneratable && (
                            <span
                              className="text-[9px] text-slate-400 px-1 py-0.2 rounded bg-slate-100 border border-slate-200/60 font-normal leading-tight"
                              title="AI-assisted narrative draft"
                            >
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
