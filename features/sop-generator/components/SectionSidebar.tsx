"use client";

import type { TemplateSection, ReviewStatus } from "../types/sop-generator";
import { SourceBadge } from "./SourceBadge";
import { ReviewStatusBadge } from "./ReviewStatusBadge";

interface SectionSidebarProps {
  sections: TemplateSection[];
  selectedId: string | null;
  statuses: Record<string, ReviewStatus>;
  onSelectSection: (id: string) => void;
  onApproveAll?: () => void;
}

/**
 * Left-column section navigator.
 * Displays each section with its title, source badge, and review status.
 * Clicking a row updates the selected section in the editor.
 */
export function SectionSidebar({
  sections,
  selectedId,
  statuses,
  onSelectSection,
  onApproveAll,
}: SectionSidebarProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  return (
    <aside
      className="w-64 xl:w-72 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-y-auto"
      aria-label="Section navigation"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Document Sections
        </p>
        {onApproveAll && (
          <button
            id="sop-sidebar-approve-all-btn"
            onClick={onApproveAll}
            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-all active:scale-95 flex items-center gap-1 shadow-xs"
            title="Approve all 16 sections at once"
          >
            ✓ Approve All
          </button>
        )}
      </div>

      {/* Section list */}
      <nav className="flex-1 py-2">
        <ul role="listbox" aria-label="Template sections">
          {sorted.map((section) => {
            const status: ReviewStatus = statuses[section.id] ?? "NOT_REVIEWED";
            const isSelected = section.id === selectedId;

            return (
              <li key={section.id} role="option" aria-selected={isSelected}>
                <button
                  id={`section-nav-${section.id}`}
                  onClick={() => onSelectSection(section.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5
                               transition-colors duration-100 group
                               ${
                                 isSelected
                                   ? "bg-indigo-50 border-r-2 border-indigo-500"
                                   : "hover:bg-slate-50 border-r-2 border-transparent"
                               }`}
                >
                  {/* Order number */}
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold
                                 flex items-center justify-center mt-0.5
                                 ${
                                   isSelected
                                     ? "bg-indigo-100 text-indigo-600"
                                     : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                 }`}
                  >
                    {section.order}
                  </span>

                  {/* Title + badges */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[12px] font-medium leading-snug truncate
                                   ${
                                     isSelected
                                       ? "text-indigo-800"
                                       : "text-slate-700 group-hover:text-slate-900"
                                   }`}
                    >
                      {section.title}
                      {section.required && (
                        <span className="ml-1 text-red-400 text-[9px]" aria-label="Required">
                          *
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1">
                      <SourceBadge source={section.source} />
                    </div>
                  </div>

                  {/* Review status (compact icon) */}
                  <ReviewStatusBadge status={status} compact />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0 space-y-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          Status Legend
        </p>
        {(["APPROVED", "NEEDS_REVIEW", "NOT_REVIEWED"] as ReviewStatus[]).map(
          (s) => (
            <div key={s} className="flex items-center gap-2">
              <ReviewStatusBadge status={s} compact />
              <span className="text-[10px] text-slate-500">
                {s === "APPROVED"
                  ? "Approved"
                  : s === "NEEDS_REVIEW"
                  ? "Needs Review"
                  : "Not Reviewed"}
              </span>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
