"use client";

import React, { useEffect } from "react";
import { RESUME_SECTION_METADATA } from "./ResumeSectionSidebar";
import { useDocumentState } from "../hooks/useDocumentState";
import type { CrmSnapshot } from "@/types/crmSnapshot";

// Forms
import { PersonalDetailsForm } from "../forms/PersonalDetailsForm";
import { AboutMeForm } from "../forms/AboutMeForm";
import { EducationForm } from "../forms/EducationForm";
import { InternshipsForm } from "../forms/InternshipsForm";
import { AcademicProjectsForm } from "../forms/AcademicProjectsForm";
import { CertificationsForm } from "../forms/CertificationsForm";
import { AcademicInterestsForm } from "../forms/AcademicInterestsForm";
import { AchievementsForm } from "../forms/AchievementsForm";
import { LeadershipForm } from "../forms/LeadershipForm";
import { VolunteeringForm } from "../forms/VolunteeringForm";
import { LanguagesForm } from "../forms/LanguagesForm";
import { EnglishCertificateForm } from "../forms/EnglishCertificateForm";
import { SkillsForm } from "../forms/SkillsForm";
import { HobbiesForm } from "../forms/HobbiesForm";
import { RecommendationsForm } from "../forms/RecommendationsForm";
import { DeclarationForm } from "../forms/DeclarationForm";

interface ResumeEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSectionId: string;
  crmSnapshot?: CrmSnapshot | null;
  onRemoveSection?: (sectionId: string) => void;
  onAddEntry?: () => void;
}

export function ResumeEditDrawer({
  isOpen,
  onClose,
  selectedSectionId,
  crmSnapshot,
  onRemoveSection,
  onAddEntry,
}: ResumeEditDrawerProps) {
  const { moveSectionUp, moveSectionDown, data } = useDocumentState();

  // Close drawer on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const meta =
    RESUME_SECTION_METADATA[selectedSectionId] ??
    RESUME_SECTION_METADATA.personalDetails;

  const isPersonalDetails = selectedSectionId === "personalDetails";

  // Data provenance detection based on CRM snapshot
  const isCrmPopulated = Boolean(
    crmSnapshot &&
      (isPersonalDetails
        ? Boolean(
            crmSnapshot.student?.personalDetails?.firstName ||
              crmSnapshot.student?.personalDetails?.lastName
          )
        : selectedSectionId === "education"
        ? (crmSnapshot.student?.academicQualifications?.length ?? 0) > 0
        : selectedSectionId === "internships"
        ? (crmSnapshot.student?.workExperience?.length ?? 0) > 0
        : selectedSectionId === "englishCertificate"
        ? (crmSnapshot.student?.tests?.length ?? 0) > 0
        : false)
  );

  function renderActiveForm() {
    switch (selectedSectionId) {
      case "personalDetails":
        return <PersonalDetailsForm />;
      case "aboutMe":
        return <AboutMeForm />;
      case "education":
        return <EducationForm />;
      case "internships":
        return <InternshipsForm />;
      case "academicProjects":
        return <AcademicProjectsForm />;
      case "certifications":
        return <CertificationsForm />;
      case "academicInterests":
        return <AcademicInterestsForm />;
      case "achievements":
        return <AchievementsForm />;
      case "leadershipActivities":
        return <LeadershipForm />;
      case "volunteering":
        return <VolunteeringForm />;
      case "languages":
        return <LanguagesForm />;
      case "englishCertificate":
        return <EnglishCertificateForm />;
      case "skills":
        return <SkillsForm />;
      case "hobbies":
        return <HobbiesForm />;
      case "recommendations":
        return <RecommendationsForm />;
      case "declaration":
        return <DeclarationForm />;
      default:
        return <PersonalDetailsForm />;
    }
  }

  return (
    <>
      {/* ── Backdrop Overlay ── */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide-Over Drawer ── */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[500px] lg:w-[520px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 select-none"
        role="dialog"
        aria-label={`Edit ${meta.title}`}
        aria-modal="true"
      >
        {/* ── Drawer Header ── */}
        <div className="px-6 py-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/80 flex-shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                {isPersonalDetails ? "Pinned Header" : "Section"}
              </span>

              {isCrmPopulated ? (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80">
                  ✓ From CRM
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                  Document Entry
                </span>
              )}
            </div>

            <h2 className="text-base font-semibold text-slate-900 truncate">
              {meta.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Up / Down Move controls */}
            {!isPersonalDetails && (
              <div
                className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs"
                title="Reorder this section"
              >
                <button
                  type="button"
                  onClick={() => moveSectionUp(selectedSectionId)}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
                  title="Move section up"
                  aria-label="Move section up"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <span className="text-[10px] text-slate-300 font-mono select-none">|</span>
                <button
                  type="button"
                  onClick={() => moveSectionDown(selectedSectionId)}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
                  title="Move section down"
                  aria-label="Move section down"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              id="resume-edit-drawer-close-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer text-sm font-medium"
              aria-label="Close edit drawer"
              title="Close drawer (Esc)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Drawer Form Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderActiveForm()}
        </div>

        {/* ── Drawer Footer ── */}
        <div className="px-6 py-3.5 border-t border-slate-200/90 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {!isPersonalDetails && onRemoveSection && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove ${meta.title} from the resume?`)) {
                    onRemoveSection(selectedSectionId);
                    onClose();
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
              >
                Remove from Resume
              </button>
            )}

            {onAddEntry && (
              <button
                type="button"
                onClick={onAddEntry}
                className="text-xs font-medium text-[#096491] hover:text-[#074f73] hover:underline cursor-pointer flex items-center gap-1"
                title={`Add another entry to ${meta.title}`}
              >
                <span className="font-bold text-sm leading-none">+</span>
                <span>Add Entry</span>
              </button>
            )}
          </div>

          <button
            type="button"
            id="resume-edit-drawer-done-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </aside>
    </>
  );
}
