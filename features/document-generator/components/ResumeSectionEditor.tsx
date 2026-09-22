"use client";

import type { GuidanceResult } from "../guidance/types";
import { RESUME_SECTION_METADATA } from "./ResumeSectionSidebar";

// Form imports
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

interface ResumeSectionEditorProps {
  selectedSectionId: string;
  guidance: GuidanceResult | null;
  onSelectSection: (id: string) => void;
}

const SECTION_KEYS = Object.keys(RESUME_SECTION_METADATA);

export function ResumeSectionEditor({
  selectedSectionId,
  guidance,
  onSelectSection,
}: ResumeSectionEditorProps) {
  const meta = RESUME_SECTION_METADATA[selectedSectionId] ?? RESUME_SECTION_METADATA.personalDetails;
  const orderNum = String(meta.order).padStart(2, "0");

  // Lookup admissions guidance for this specific section
  const sectionGuidance = guidance?.sections.find((s) => s.sectionKey === selectedSectionId);

  // Navigation: prev & next
  const currentIndex = SECTION_KEYS.indexOf(selectedSectionId);
  const prevKey = currentIndex > 0 ? SECTION_KEYS[currentIndex - 1] : null;
  const nextKey = currentIndex < SECTION_KEYS.length - 1 ? SECTION_KEYS[currentIndex + 1] : null;
  const prevMeta = prevKey ? RESUME_SECTION_METADATA[prevKey] : null;
  const nextMeta = nextKey ? RESUME_SECTION_METADATA[nextKey] : null;

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
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden border-r border-slate-200/90">
      {/* ── Section Header ── */}
      <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono text-slate-400 block mb-0.5">
              Section {orderNum}
            </span>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              {meta.title}
            </h2>
          </div>

          {sectionGuidance && (
            <div className="flex items-center gap-1.5">
              {sectionGuidance.priority === "highly-relevant" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  Highly Relevant
                </span>
              )}
              {sectionGuidance.priority === "recommended" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                  Recommended
                </span>
              )}
              {sectionGuidance.priority === "optional" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  Optional
                </span>
              )}
            </div>
          )}
        </div>

        {/* Section guidance hint */}
        {sectionGuidance?.hint && (
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs">
            <span className="font-semibold text-slate-700">Targeting tip:</span>{" "}
            {sectionGuidance.hint}
          </p>
        )}
      </div>

      {/* ── Active Form Content (Scrollable) ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-xl mx-auto space-y-4">
          {renderActiveForm()}
        </div>
      </div>

      {/* ── Guided Footer Navigation (Prev / Next) ── */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-shrink-0">
        {prevKey && prevMeta ? (
          <button
            type="button"
            onClick={() => onSelectSection(prevKey)}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <span>←</span>
            <span className="truncate max-w-[140px] sm:max-w-[180px]">
              {prevMeta.title}
            </span>
          </button>
        ) : (
          <div />
        )}

        {nextKey && nextMeta ? (
          <button
            type="button"
            onClick={() => onSelectSection(nextKey)}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium flex items-center gap-1.5 py-1.5 px-3 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span className="truncate max-w-[140px] sm:max-w-[180px]">
              {nextMeta.title}
            </span>
            <span>→</span>
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
