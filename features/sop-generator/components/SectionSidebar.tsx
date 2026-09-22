"use client";

import { useMemo } from "react";
import type { TemplateSection, ReviewStatus } from "../types/sop-generator";

interface SectionSidebarProps {
  sections: TemplateSection[];
  selectedId: string | null;
  statuses: Record<string, ReviewStatus>;
  onSelectSection: (id: string) => void;
  onToggleStatus?: (sectionId: string) => void;
}

interface SectionGroup {
  id: string;
  title: string;
  sectionIds: string[];
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
}: SectionSidebarProps) {
  // Map sections by id for fast group lookup
  const sectionsById = useMemo(() => {
    return new Map(sections.map((s) => [s.id, s]));
  }, [sections]);

  // Track approved count per group
  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number; approved: number }> = {};
    for (const group of SECTION_GROUPS) {
      let total = 0;
      let approved = 0;
      for (const id of group.sectionIds) {
        const sec = sectionsById.get(id);
        if (sec) {
          total++;
          if (statuses[id] === "APPROVED") approved++;
        }
      }
      stats[group.id] = { total, approved };
    }
    return stats;
  }, [sectionsById, statuses]);

  return (
    <aside
      className="w-64 xl:w-72 flex-shrink-0 flex flex-col border-r border-slate-200/90 bg-[#FAFBFD] overflow-hidden select-none"
      aria-label="Document story sections navigation"
    >
      {/* Sidebar Top Meta */}
      <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Story Structure
        </span>
        <span className="text-[11px] text-slate-400 font-medium">
          {sections.length} sections
        </span>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {SECTION_GROUPS.map((group) => {
          const groupSecs = group.sectionIds
            .map((id) => sectionsById.get(id))
            .filter((s): s is TemplateSection => Boolean(s));

          if (groupSecs.length === 0) return null;
          const stat = groupStats[group.id];

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Header */}
              <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  {group.title}
                </span>
                {stat && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {stat.approved}/{stat.total}
                  </span>
                )}
              </div>

              {/* Group Items */}
              <ul className="space-y-0.5" role="listbox">
                {groupSecs.map((section) => {
                  const status = statuses[section.id] ?? "NOT_REVIEWED";
                  const isSelected = section.id === selectedId;
                  const orderNum = String(section.order).padStart(2, "0");
                  const isApproved = status === "APPROVED";
                  const isNeedsReview = status === "NEEDS_REVIEW";

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

                        {/* Interactive Status Toggle Circle */}
                        <button
                          type="button"
                          id={`section-status-toggle-${section.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus?.(section.id);
                          }}
                          className="flex-shrink-0 p-0.5 rounded-full hover:scale-110 active:scale-95 transition-all cursor-pointer focus:outline-none"
                          title={
                            isApproved
                              ? "Click to unapprove section"
                              : "Click to approve section"
                          }
                          aria-label={
                            isApproved
                              ? `Mark ${section.title} as unapproved`
                              : `Mark ${section.title} as approved`
                          }
                        >
                          {isApproved ? (
                            <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center text-[10px] font-bold shadow-2xs hover:bg-emerald-100 hover:text-emerald-700">
                              ✓
                            </span>
                          ) : isNeedsReview ? (
                            <span className="w-4 h-4 rounded-full bg-amber-50 text-amber-600 border border-amber-300 flex items-center justify-center text-[10px] font-bold shadow-2xs hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300">
                              !
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-300 flex items-center justify-center text-[9px] hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50">
                              ○
                            </span>
                          )}
                        </button>
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
