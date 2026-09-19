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
      className="w-68 xl:w-72 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-hidden"
      aria-label="Section navigation"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Document Sections
        </p>
        {onApproveAll && (
          <button
            id="sop-sidebar-approve-all-btn"
            onClick={onApproveAll}
            className="text-[11px] font-medium text-[#096491] hover:text-[#074f74] hover:underline transition-all flex items-center gap-1"
            title="Approve all 16 sections at once"
          >
            <span>✓ Approve All</span>
          </button>
        )}
      </div>

      {/* Section list */}
      <nav className="flex-1 overflow-y-auto">
        <ul role="listbox" aria-label="Template sections">
          {sorted.map((section) => {
            const status: ReviewStatus = statuses[section.id] ?? "NOT_REVIEWED";
            const isSelected = section.id === selectedId;
            const orderNum = String(section.order).padStart(2, "0");

            return (
              <li key={section.id} role="option" aria-selected={isSelected}>
                <button
                  id={`section-nav-${section.id}`}
                  onClick={() => onSelectSection(section.id)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center gap-2.5
                               transition-colors duration-100 group relative
                               ${
                                 isSelected
                                   ? "bg-[#F1F8FA] border-l-[3px] border-[#096491]"
                                   : "hover:bg-[#F8FAFC] border-l-[3px] border-transparent"
                               }`}
                >
                  {/* Order number */}
                  <span
                    className={`flex-shrink-0 w-6 h-5 rounded text-[10px] font-semibold
                                 flex items-center justify-center
                                 ${
                                   isSelected
                                     ? "bg-[#E2F0F7] text-[#096491]"
                                     : "bg-slate-100 text-slate-400 group-hover:bg-slate-200/80 group-hover:text-slate-600"
                                 }`}
                  >
                    {orderNum}
                  </span>

                  {/* Title + badges */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[12px] leading-tight truncate
                                   ${
                                     isSelected
                                       ? "font-semibold text-slate-900"
                                       : "font-medium text-slate-700 group-hover:text-slate-900"
                                   }`}
                    >
                      <span>{section.title}</span>
                      {section.required && (
                        <span className="ml-1 text-rose-500 font-normal text-[11px]" aria-label="Required">
                          *
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1">
                      <SourceBadge source={section.source} />
                    </div>
                  </div>

                  {/* Review status (compact icon aligned on far right) */}
                  <div className="flex-shrink-0 ml-1">
                    <ReviewStatusBadge status={status} compact />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Status Legend
        </p>
        <div className="flex items-center justify-between gap-1">
          {(["APPROVED", "NEEDS_REVIEW", "NOT_REVIEWED"] as ReviewStatus[]).map(
            (s) => (
              <div key={s} className="flex items-center gap-1.5">
                <ReviewStatusBadge status={s} compact />
                <span className="text-[10px] text-slate-500 font-medium">
                  {s === "APPROVED"
                    ? "Approved"
                    : s === "NEEDS_REVIEW"
                    ? "Review"
                    : "Pending"}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </aside>
  );
}
