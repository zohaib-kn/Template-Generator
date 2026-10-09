"use client";

import { useMemo } from "react";
import type { DocumentData } from "@/types";
import { DEFAULT_MOVABLE_SECTION_ORDER } from "@/types";
import type { GuidanceResult } from "../guidance/types";
import { useDocumentState } from "../hooks/useDocumentState";

export interface ResumeSectionItem {
  id: string;
  order: number;
  title: string;
  group: "profile" | "experience" | "strength" | "closing";
  count?: number;
  isFilled: boolean;
  priority?: "highly-relevant" | "recommended" | "optional";
}

interface ResumeSectionSidebarProps {
  data: DocumentData;
  guidance: GuidanceResult | null;
  selectedSectionId: string;
  onSelectSection: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const RESUME_SECTION_METADATA: Record<
  string,
  { order: number; title: string; group: "profile" | "experience" | "strength" | "closing" }
> = {
  personalDetails:      { order: 1,  title: "Personal Details",                group: "profile" },
  aboutMe:              { order: 2,  title: "Academic Profile",                group: "profile" },
  education:            { order: 3,  title: "Education & Training",            group: "experience" },
  internships:          { order: 4,  title: "Internships & Work Experience",   group: "experience" },
  academicProjects:     { order: 5,  title: "Academic Projects",               group: "experience" },
  certifications:       { order: 6,  title: "Certifications",                  group: "experience" },
  academicInterests:    { order: 7,  title: "Academic Interests",              group: "strength" },
  achievements:         { order: 8,  title: "Achievements & Awards",           group: "strength" },
  leadershipActivities: { order: 9,  title: "Leadership & Extracurricular",    group: "strength" },
  volunteering:         { order: 10, title: "Volunteering",                    group: "strength" },
  languages:            { order: 11, title: "Language Skills",                 group: "strength" },
  englishCertificate:   { order: 12, title: "English Certificate / IELTS",     group: "strength" },
  skills:               { order: 13, title: "Academic & Transferable Skills",  group: "strength" },
  hobbies:              { order: 14, title: "Hobbies & Personal Interests",    group: "strength" },
  recommendations:      { order: 15, title: "Recommendations",                 group: "closing" },
  declaration:          { order: 16, title: "Declaration",                     group: "closing" },
};

export function ResumeSectionSidebar({
  data,
  guidance,
  selectedSectionId,
  onSelectSection,
  isCollapsed = false,
  onToggleCollapse,
}: ResumeSectionSidebarProps) {
  const { moveSectionUp, moveSectionDown, resetSectionOrder } = useDocumentState();

  const customOrder = data.sectionOrder;
  const isOrderCustomized = Boolean(customOrder && customOrder.length > 0);

  // Compute active order with personalDetails permanently pinned as index 0 (Section 01)
  const activeOrder = useMemo(() => {
    const movable = customOrder ?? DEFAULT_MOVABLE_SECTION_ORDER;
    // Guarantee completeness in case an old draft or custom array was missing any section
    const completeMovable = [
      ...movable,
      ...DEFAULT_MOVABLE_SECTION_ORDER.filter((id) => !movable.includes(id)),
    ];
    return ["personalDetails", ...completeMovable];
  }, [customOrder]);

  // Compute filled status and count for each section in activeOrder
  const sectionsList = useMemo<ResumeSectionItem[]>(() => {
    const p = data.personal;
    const isPersonalFilled = Boolean(p?.fullName && (p.email || p.phone || p.nationality));
    const isAboutMeFilled = Boolean(data.aboutMe && data.aboutMe.trim().length > 0);
    const isEnglishFilled = Boolean(
      data.englishCertificate?.examName || data.englishCertificate?.score
    );
    const isDeclarationFilled = Boolean(
      data.declaration && data.declaration.trim().length > 0
    );

    const counts: Record<string, number> = {
      education: (data.education ?? []).length,
      internships: (data.internships ?? []).length,
      academicProjects: (data.academicProjects ?? []).length,
      certifications: (data.certifications ?? []).length,
      academicInterests: (data.academicInterests ?? []).length,
      achievements: (data.achievements ?? []).length,
      leadershipActivities: (data.leadershipActivities ?? []).length,
      volunteering: (data.volunteering ?? []).length,
      languages:
        (data.motherTongue?.trim() ? 1 : 0) +
        (data.languages ?? []).filter((l) => Boolean(l.language?.trim())).length,
      skills: (data.skills ?? []).length,
      hobbies: (data.hobbies ?? []).length,
      recommendations: (data.recommendations ?? []).length,
    };

    const guidanceMap = new Map<string, "highly-relevant" | "recommended" | "optional">();
    if (guidance) {
      guidance.sections.forEach((s) => {
        guidanceMap.set(s.sectionKey, s.priority);
      });
    }

    return activeOrder.map((id, index) => {
      const meta = RESUME_SECTION_METADATA[id] ?? {
        order: index + 1,
        title: id,
        group: "strength" as const,
      };

      let isFilled = false;
      let count: number | undefined;

      if (id === "personalDetails") {
        isFilled = isPersonalFilled;
      } else if (id === "aboutMe") {
        isFilled = isAboutMeFilled;
      } else if (id === "englishCertificate") {
        isFilled = isEnglishFilled;
      } else if (id === "declaration") {
        isFilled = isDeclarationFilled;
      } else {
        count = counts[id] ?? 0;
        isFilled = count > 0;
      }

      return {
        id,
        order: index + 1,
        title: meta.title,
        group: meta.group,
        count,
        isFilled,
        priority: guidanceMap.get(id),
      };
    });
  }, [data, guidance, activeOrder]);

  const personalSection = sectionsList[0];
  const movableSections = sectionsList.slice(1);
  const filledMovableCount = movableSections.filter((s) => s.isFilled).length;

  if (isCollapsed) {
    return (
      <div className="w-10 border-r border-slate-200/90 bg-[#FAFBFD] flex flex-col items-center py-4 select-none flex-shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          title="Expand resume structure"
          aria-label="Expand resume structure"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-8 [writing-mode:vertical-rl] rotate-180">
          Structure
        </span>
      </div>
    );
  }

  return (
    <aside
      className="w-64 xl:w-72 flex-shrink-0 flex flex-col border-r border-slate-200/90 bg-[#FAFBFD] overflow-hidden select-none"
      aria-label="Resume structure navigation"
    >
      {/* Sidebar Top Meta */}
      <div className="px-3.5 py-3 border-b border-slate-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider truncate">
            Resume Structure
          </span>
          {isOrderCustomized && (
            <button
              type="button"
              onClick={resetSectionOrder}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition-colors cursor-pointer flex-shrink-0"
              title="Reset all sections to standard Europass order"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            {sectionsList.length} sections
          </span>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <span>Hide</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
        {/* Pinned Personal Details */}
        {personalSection && (
          <div className="space-y-0.5">
            <div className="px-2 py-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Header (Pinned)
              </span>
              <span className="text-[9px] text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                Top of Page 1
              </span>
            </div>

            <ul className="space-y-0.5" role="listbox">
              <li role="option" aria-selected={selectedSectionId === personalSection.id}>
                <button
                  type="button"
                  id={`resume-section-nav-${personalSection.id}`}
                  onClick={() => onSelectSection(personalSection.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition-all text-xs group relative cursor-pointer ${
                    selectedSectionId === personalSection.id
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/90 font-medium"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent"
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono tabular-nums flex-shrink-0 transition-colors ${
                      selectedSectionId === personalSection.id
                        ? "text-slate-900 font-semibold"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  >
                    01
                  </span>

                  <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate">
                    <span className="truncate">{personalSection.title}</span>
                  </div>

                  <div className="flex-shrink-0">
                    {personalSection.isFilled ? (
                      <span
                        className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center text-[10px] font-bold shadow-2xs"
                        title="Personal details filled"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 text-slate-300 flex items-center justify-center text-[9px]"
                        title="Personal details incomplete"
                      >
                        ○
                      </span>
                    )}
                  </div>
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* Movable Sections Flow */}
        <div className="space-y-0.5">
          <div className="px-2 py-1 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              Document Sections
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {filledMovableCount}/{movableSections.length}
            </span>
          </div>

          <ul className="space-y-0.5" role="listbox">
            {movableSections.map((section, idx) => {
              const isSelected = section.id === selectedSectionId;
              const orderNum = String(section.order).padStart(2, "0");
              const isFirstMovable = idx === 0;
              const isLastMovable = idx === movableSections.length - 1;

              return (
                <li key={section.id} role="option" aria-selected={isSelected}>
                  <div
                    id={`resume-section-nav-${section.id}`}
                    onClick={() => onSelectSection(section.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs group relative cursor-pointer ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200/90 font-medium"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent"
                    }`}
                  >
                    {/* Order Number */}
                    <span
                      className={`text-[10px] font-mono tabular-nums flex-shrink-0 transition-colors w-4 ${
                        isSelected
                          ? "text-slate-900 font-semibold"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    >
                      {orderNum}
                    </span>

                    {/* Title & Count Badge */}
                    <div className="flex-1 min-w-0 flex items-center gap-1 truncate">
                      <span className="truncate">{section.title}</span>
                      {section.count !== undefined && section.count > 0 && (
                        <span className="text-[10px] font-semibold px-1 py-0.2 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                          {section.count}
                        </span>
                      )}
                      {section.priority === "highly-relevant" && (
                        <span
                          className="text-[9px] text-emerald-700 font-semibold px-1 py-0.2 rounded bg-emerald-50 border border-emerald-200/70 flex-shrink-0"
                          title="Highly relevant for target application"
                        >
                          Priority
                        </span>
                      )}
                    </div>

                    {/* Move Up / Down Buttons */}
                    <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        type="button"
                        disabled={isFirstMovable}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSectionUp(section.id);
                        }}
                        className="p-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="Move section up"
                        aria-label={`Move ${section.title} up`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={isLastMovable}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSectionDown(section.id);
                        }}
                        className="p-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="Move section down"
                        aria-label={`Move ${section.title} down`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>

                    {/* Status indicator circle */}
                    <div className="flex-shrink-0 ml-0.5">
                      {section.isFilled ? (
                        <span
                          className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center text-[10px] font-bold shadow-2xs"
                          title="Section contains entries"
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 text-slate-300 flex items-center justify-center text-[9px]"
                          title="Section optional / empty"
                        >
                          ○
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
