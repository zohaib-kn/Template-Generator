"use client";

import React, { useMemo } from "react";
import type { DocumentData } from "@/types";
import { DEFAULT_MOVABLE_SECTION_ORDER } from "@/types";
import { RESUME_SECTION_METADATA } from "./ResumeSectionSidebar";

interface ResumeSectionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: DocumentData;
  selectedSectionId: string;
  onSelectSection: (sectionId: string) => void;
  onOpenAddContent: () => void;
}

export function ResumeSectionsDrawer({
  isOpen,
  onClose,
  data,
  selectedSectionId,
  onSelectSection,
  onOpenAddContent,
}: ResumeSectionsDrawerProps) {
  const activeOrder = useMemo(() => {
    const custom = data.sectionOrder ?? DEFAULT_MOVABLE_SECTION_ORDER;
    const complete = [
      ...custom,
      ...DEFAULT_MOVABLE_SECTION_ORDER.filter((id) => !custom.includes(id)),
    ];
    return ["personalDetails", ...complete];
  }, [data.sectionOrder]);

  if (!isOpen) return null;

  function isSectionFilled(id: string): boolean {
    switch (id) {
      case "personalDetails":
        return Boolean(data.personal?.fullName && (data.personal.email || data.personal.phone));
      case "aboutMe":
        return Boolean(data.aboutMe && data.aboutMe.trim().length > 0);
      case "education":
        return (data.education ?? []).length > 0;
      case "internships":
        return (data.internships ?? []).length > 0;
      case "academicProjects":
        return (data.academicProjects ?? []).length > 0;
      case "certifications":
        return (data.certifications ?? []).length > 0;
      case "academicInterests":
        return (data.academicInterests ?? []).length > 0;
      case "achievements":
        return (data.achievements ?? []).length > 0;
      case "leadershipActivities":
        return (data.leadershipActivities ?? []).length > 0;
      case "volunteering":
        return (data.volunteering ?? []).length > 0;
      case "languages":
        return (data.languages ?? []).length > 0 || Boolean(data.motherTongue?.trim());
      case "englishCertificate":
        return Boolean(data.englishCertificate?.examName || data.englishCertificate?.score);
      case "skills":
        return (data.skills ?? []).length > 0;
      case "hobbies":
        return (data.hobbies ?? []).length > 0;
      case "recommendations":
        return (data.recommendations ?? []).length > 0;
      case "declaration":
        return Boolean(data.declaration && data.declaration.trim().length > 0);
      case "portfolio":
        return Boolean(data.personal?.portfolioUrl?.trim() || data.portfolioUrl?.trim());
      default:
        return false;
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-2xs z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl border-r border-slate-200 flex flex-col animate-in slide-in-from-left duration-200 select-none"
        role="dialog"
        aria-label="Resume Sections"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Resume Sections
            </h3>
            <p className="text-[11px] text-slate-500">
              Jump directly to any section
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {activeOrder.map((secId, idx) => {
            const meta = RESUME_SECTION_METADATA[secId] ?? { title: secId };
            const filled = isSectionFilled(secId);
            const isSelected = selectedSectionId === secId;

            return (
              <button
                key={secId}
                type="button"
                onClick={() => {
                  onSelectSection(secId);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white font-semibold shadow-2xs"
                    : "text-slate-700 hover:bg-slate-100/80"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`w-4 text-center font-mono text-[10px] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{meta.title}</span>
                </div>

                <span className="flex-shrink-0 text-xs">
                  {filled ? (
                    <span className={isSelected ? "text-emerald-300" : "text-emerald-600"}>✓</span>
                  ) : (
                    <span className={isSelected ? "text-slate-400" : "text-slate-300"}>○</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddContent();
            }}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add More Content</span>
          </button>
        </div>
      </aside>
    </>
  );
}
