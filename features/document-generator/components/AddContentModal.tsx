"use client";

import React, { useMemo } from "react";
import type { DocumentData } from "@/types";
import type { GuidanceResult } from "../guidance/types";
import { useDocumentState } from "../hooks/useDocumentState";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DocumentData;
  guidance: GuidanceResult | null;
  onSelectSection: (sectionId: string) => void;
  onOpenImport?: () => void;
}

interface SectionOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  isRepeatable: boolean;
}

const SECTION_OPTIONS: SectionOption[] = [
  {
    id: "aboutMe",
    title: "About Me",
    description: "Add a concise personal summary and academic background.",
    icon: "👤",
    isRepeatable: false,
  },
  {
    id: "education",
    title: "Education and Training",
    description: "Add qualifications, degrees, and study history.",
    icon: "🎓",
    isRepeatable: true,
  },
  {
    id: "internships",
    title: "Work Experience / Internships",
    description: "Add internships, jobs, and professional experience.",
    icon: "💼",
    isRepeatable: true,
  },
  {
    id: "academicProjects",
    title: "Academic Projects",
    description: "Highlight academic, research, or personal projects.",
    icon: "🔬",
    isRepeatable: true,
  },
  {
    id: "certifications",
    title: "Certifications",
    description: "Add professional and academic credentials.",
    icon: "📜",
    isRepeatable: true,
  },
  {
    id: "academicInterests",
    title: "Academic Interests",
    description: "Specify research areas and fields of academic interest.",
    icon: "📚",
    isRepeatable: true,
  },
  {
    id: "achievements",
    title: "Achievements & Awards",
    description: "Add awards, scholarships, and special recognitions.",
    icon: "🏆",
    isRepeatable: true,
  },
  {
    id: "leadershipActivities",
    title: "Leadership & Extracurricular",
    description: "Highlight clubs, student councils, and leadership roles.",
    icon: "🤝",
    isRepeatable: true,
  },
  {
    id: "volunteering",
    title: "Volunteering / Community Engagement",
    description: "Add volunteer work and community initiatives.",
    icon: "🌱",
    isRepeatable: true,
  },
  {
    id: "languages",
    title: "Language Skills",
    description: "Add native and acquired languages with proficiency.",
    icon: "🗣",
    isRepeatable: true,
  },
  {
    id: "englishCertificate",
    title: "English Language Certificate (IELTS)",
    description: "Add IELTS, TOEFL, PTE, or English test score bands.",
    icon: "🌍",
    isRepeatable: false,
  },
  {
    id: "skills",
    title: "Skills",
    description: "Add domain-specific, analytical, and technical skills.",
    icon: "⚡",
    isRepeatable: true,
  },
  {
    id: "hobbies",
    title: "Hobbies and Interests",
    description: "Add relevant personal interests and creative pursuits.",
    icon: "🎨",
    isRepeatable: true,
  },
  {
    id: "recommendations",
    title: "Recommendations",
    description: "Add academic and professional references.",
    icon: "✉",
    isRepeatable: true,
  },
  {
    id: "declaration",
    title: "Declaration",
    description: "Add formal declaration and date of submission.",
    icon: "✍",
    isRepeatable: false,
  },
];

export function AddContentModal({
  isOpen,
  onClose,
  data,
  guidance,
  onSelectSection,
  onOpenImport,
}: AddContentModalProps) {
  const {
    addEducation,
    addInternship,
    addAcademicProject,
    addCertification,
    addAcademicInterest,
    addAchievement,
    addLeadershipActivity,
    addVolunteering,
    addLanguage,
    addSkill,
    addHobby,
    addRecommendation,
  } = useDocumentState();

  const guidanceMap = useMemo(() => {
    const map = new Map<string, string>();
    if (guidance) {
      guidance.sections.forEach((s) => map.set(s.sectionKey, s.priority));
    }
    return map;
  }, [guidance]);

  if (!isOpen) return null;

  // Determine populated counts for each section
  function getSectionStatus(id: string): { isAdded: boolean; count?: number } {
    switch (id) {
      case "aboutMe":
        return { isAdded: Boolean(data.aboutMe && data.aboutMe.trim().length > 0) };
      case "education":
        return { isAdded: (data.education ?? []).length > 0, count: (data.education ?? []).length };
      case "internships":
        return { isAdded: (data.internships ?? []).length > 0, count: (data.internships ?? []).length };
      case "academicProjects":
        return { isAdded: (data.academicProjects ?? []).length > 0, count: (data.academicProjects ?? []).length };
      case "certifications":
        return { isAdded: (data.certifications ?? []).length > 0, count: (data.certifications ?? []).length };
      case "academicInterests":
        return { isAdded: (data.academicInterests ?? []).length > 0, count: (data.academicInterests ?? []).length };
      case "achievements":
        return { isAdded: (data.achievements ?? []).length > 0, count: (data.achievements ?? []).length };
      case "leadershipActivities":
        return { isAdded: (data.leadershipActivities ?? []).length > 0, count: (data.leadershipActivities ?? []).length };
      case "volunteering":
        return { isAdded: (data.volunteering ?? []).length > 0, count: (data.volunteering ?? []).length };
      case "languages": {
        const cnt = (data.motherTongue?.trim() ? 1 : 0) + (data.languages ?? []).length;
        return { isAdded: cnt > 0, count: cnt };
      }
      case "englishCertificate":
        return {
          isAdded: Boolean(
            data.englishCertificate?.examName || data.englishCertificate?.score
          ),
        };
      case "skills":
        return { isAdded: (data.skills ?? []).length > 0, count: (data.skills ?? []).length };
      case "hobbies":
        return { isAdded: (data.hobbies ?? []).length > 0, count: (data.hobbies ?? []).length };
      case "recommendations":
        return { isAdded: (data.recommendations ?? []).length > 0, count: (data.recommendations ?? []).length };
      case "declaration":
        return { isAdded: Boolean(data.declaration && data.declaration.trim().length > 0) };
      default:
        return { isAdded: false };
    }
  }

  function handleAddSection(id: string) {
    switch (id) {
      case "education":
        if ((data.education ?? []).length === 0) addEducation();
        break;
      case "internships":
        if ((data.internships ?? []).length === 0) addInternship();
        break;
      case "academicProjects":
        if ((data.academicProjects ?? []).length === 0) addAcademicProject();
        break;
      case "certifications":
        if ((data.certifications ?? []).length === 0) addCertification();
        break;
      case "academicInterests":
        if ((data.academicInterests ?? []).length === 0) addAcademicInterest();
        break;
      case "achievements":
        if ((data.achievements ?? []).length === 0) addAchievement();
        break;
      case "leadershipActivities":
        if ((data.leadershipActivities ?? []).length === 0) addLeadershipActivity();
        break;
      case "volunteering":
        if ((data.volunteering ?? []).length === 0) addVolunteering();
        break;
      case "languages":
        if ((data.languages ?? []).length === 0) addLanguage();
        break;
      case "skills":
        if ((data.skills ?? []).length === 0) addSkill();
        break;
      case "hobbies":
        if ((data.hobbies ?? []).length === 0) addHobby();
        break;
      case "recommendations":
        if ((data.recommendations ?? []).length === 0) addRecommendation();
        break;
    }
    onSelectSection(id);
    onClose();
  }

  function handleAddAnotherEntry(id: string) {
    switch (id) {
      case "education":
        addEducation();
        break;
      case "internships":
        addInternship();
        break;
      case "academicProjects":
        addAcademicProject();
        break;
      case "certifications":
        addCertification();
        break;
      case "academicInterests":
        addAcademicInterest();
        break;
      case "achievements":
        addAchievement();
        break;
      case "leadershipActivities":
        addLeadershipActivity();
        break;
      case "volunteering":
        addVolunteering();
        break;
      case "languages":
        addLanguage();
        break;
      case "skills":
        addSkill();
        break;
      case "hobbies":
        addHobby();
        break;
      case "recommendations":
        addRecommendation();
        break;
    }
    onSelectSection(id);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-content-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-shrink-0">
            <div>
              <h3 id="add-content-modal-title" className="text-base font-semibold text-slate-900">
                Add Content to Resume
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select sections to include in the student&apos;s CV.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Import Banner Shortcut */}
          {onOpenImport && (
            <div className="px-6 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between text-xs text-sky-900 flex-shrink-0">
              <span className="flex items-center gap-2">
                <span>💡</span>
                <span>Already have a resume file (.pdf, .docx)?</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="font-semibold text-[#096491] hover:underline cursor-pointer"
              >
                Import Existing Resume →
              </button>
            </div>
          )}

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {SECTION_OPTIONS.map((opt) => {
              const status = getSectionStatus(opt.id);
              const priority = guidanceMap.get(opt.id);

              return (
                <div
                  key={opt.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    status.isAdded
                      ? "bg-slate-50/60 border-slate-200/90"
                      : "bg-white hover:bg-slate-50/40 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-2.5 mb-3">
                    <span className="text-lg flex-shrink-0" aria-hidden="true">
                      {opt.icon}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-semibold text-slate-900">
                          {opt.title}
                        </h4>
                        {priority === "highly-relevant" && (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.2 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </div>

                  {/* Action area */}
                  <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between">
                    {status.isAdded ? (
                      <>
                        <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                          <span>✓</span>
                          <span>Added {status.count ? `(${status.count})` : ""}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {opt.isRepeatable && (
                            <button
                              type="button"
                              onClick={() => handleAddAnotherEntry(opt.id)}
                              className="text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              + Add another
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSection(opt.id);
                              onClose();
                            }}
                            className="text-[11px] font-semibold text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                          >
                            Edit
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAddSection(opt.id)}
                          className="h-7 px-3 rounded-lg bg-[#096491] hover:bg-[#074f74] text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <span>+</span>
                          <span>Add to CV</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
