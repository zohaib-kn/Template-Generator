"use client";

import { useState, useEffect } from "react";
import type { DocumentData } from "@/types";
import type { ApplicationTarget, GuidanceResult } from "../guidance/types";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import { ProfileSuggestionsPanel } from "./ProfileSuggestionsPanel";
import { ApplicationTargetForm } from "../forms/ApplicationTargetForm";

interface ResumeContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: DocumentData;
  target: ApplicationTarget;
  onTargetChange: (target: ApplicationTarget) => void;
  guidance: GuidanceResult | null;
  availablePrograms?: NormalizedAppliedProgram[];
  selectedProgramId?: string;
  onProgramChange?: (programId: string) => void;
  onOpenStudentDetails?: () => void;
  onOpenStudentSelect?: () => void;
}

type ContextTab = "student" | "target" | "guidance";

export function ResumeContextPanel({
  isOpen,
  onClose,
  data,
  target,
  onTargetChange,
  guidance,
  availablePrograms = [],
  selectedProgramId,
  onProgramChange,
  onOpenStudentDetails,
  onOpenStudentSelect,
}: ResumeContextPanelProps) {
  const [activeTab, setActiveTab] = useState<ContextTab>("student");
  const [isEditingTarget, setIsEditingTarget] = useState(false);

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

  if (!isOpen) {
    return null;
  }

  // Derived applicant info
  const p = data.personal ?? {};
  const studentName = p.fullName || "Student";
  const initials =
    studentName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ST";

  const location = [p.placeOfBirth, p.nationality].filter(Boolean).join(" · ") || "Applicant profile";

  // Academic summary from data
  const latestEdu = (data.education ?? [])[0];
  const englishTest = data.englishCertificate;

  const tabs: { id: ContextTab; label: string }[] = [
    { id: "student", label: "Student" },
    { id: "target", label: "Target" },
    { id: "guidance", label: "Guidance" },
  ];

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
        className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 select-none"
        role="dialog"
        aria-label="Profile and application context"
        aria-modal="true"
      >
        {/* ── Drawer Header ── */}
        <div className="px-4 py-3.5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Profile & Target Context
            </h2>
          </div>

          <button
            type="button"
            id="resume-context-close-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer text-sm font-medium"
            aria-label="Close context drawer"
            title="Close drawer (Esc)"
          >
            ✕
          </button>
        </div>

        {/* ── Tabs (Student | Target | Guidance) ── */}
        <div className="flex border-b border-slate-200/80 px-2 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`resume-context-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-xs transition-colors relative flex items-center justify-center cursor-pointer ${
                activeTab === tab.id
                  ? "text-slate-900 font-semibold border-b-2 border-slate-900"
                  : "text-slate-400 hover:text-slate-700 font-medium border-b-2 border-transparent"
              }`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" role="tabpanel">
          {/* ── Student Tab ── */}
          {activeTab === "student" && (
            <div className="space-y-3.5">
              {/* Applicant Persona Card */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Applicant
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {studentName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {location}
                    </p>
                  </div>
                </div>

                {(p.email || p.phone) && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    {p.email && <p className="truncate">✉ {p.email}</p>}
                    {p.phone && <p className="truncate">📞 {p.phone}</p>}
                  </div>
                )}
              </div>

              {/* Academic Highlight */}
              {latestEdu ? (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Academic Background
                  </span>
                  <p className="text-xs font-semibold text-slate-900 leading-snug">
                    {latestEdu.qualification || "Degree"} {latestEdu.fieldOfStudy ? `in ${latestEdu.fieldOfStudy}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {latestEdu.institution}
                  </p>
                  {(latestEdu.startDate || latestEdu.endDate) && (
                    <p className="text-[10px] text-slate-400">
                      {latestEdu.startDate} → {latestEdu.endDate}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs text-[11px] text-slate-400 italic">
                  No education history added yet.
                </div>
              )}

              {/* English Language / IELTS */}
              {englishTest && (englishTest.examName || englishTest.score) ? (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Language Certificate
                    </span>
                    {englishTest.score && (
                      <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        Score: {englishTest.score}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-800">
                    {englishTest.examName || "English Test"}
                  </p>
                </div>
              ) : null}

              {/* View Full Raw Data CTA */}
              {onOpenStudentDetails && (
                <button
                  type="button"
                  id="resume-view-complete-record-btn"
                  onClick={onOpenStudentDetails}
                  className="w-full py-2 px-3 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View complete student record</span>
                  <span>→</span>
                </button>
              )}

              {/* Switch student shortcut */}
              {onOpenStudentSelect && (
                <button
                  type="button"
                  onClick={onOpenStudentSelect}
                  className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors text-center cursor-pointer"
                >
                  Load different student from CRM
                </button>
              )}
            </div>
          )}

          {/* ── Target Tab ── */}
          {activeTab === "target" && (
            <div className="space-y-3.5">
              {/* Target Destination Card */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Application
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200/80">
                    Active
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {target.destinationCountry || "Country not selected"}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {target.universityName || "University not selected"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {target.intendedCourse || "Intended course"}
                  </p>
                  {target.degreeLevel && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Level: {target.degreeLevel} {target.courseCategory ? `· ${target.courseCategory}` : ""}
                    </p>
                  )}
                </div>

                {/* Multiple programs selector if CRM has multiple */}
                {availablePrograms.length > 1 && onProgramChange && (
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <label htmlFor="context-prog-switcher" className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Switch Program ({availablePrograms.length} applied):
                    </label>
                    <select
                      id="context-prog-switcher"
                      value={selectedProgramId}
                      onChange={(e) => onProgramChange(e.target.value)}
                      className="w-full text-[11px] font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-slate-800 cursor-pointer shadow-2xs"
                    >
                      {availablePrograms.map((prog) => (
                        <option key={prog.id} value={prog.id}>
                          {prog.university} — {prog.course}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Edit Target Form Toggle */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Configure Application Target
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTarget((v) => !v)}
                    className="text-[11px] text-[#096491] hover:underline font-medium cursor-pointer"
                  >
                    {isEditingTarget ? "Hide" : "Edit Target"}
                  </button>
                </div>

                {isEditingTarget && (
                  <div className="pt-2 border-t border-slate-100">
                    <ApplicationTargetForm
                      value={target}
                      onChange={onTargetChange}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Guidance Tab ── */}
          {activeTab === "guidance" && (
            <div className="space-y-4">
              {/* Admissions CV Guidance */}
              {guidance && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Admissions CV Guidance
                  </span>

                  {guidance.sections.filter((s) => s.priority === "highly-relevant").length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Focus Strongly On
                      </p>
                      <div className="space-y-1">
                        {guidance.sections
                          .filter((s) => s.priority === "highly-relevant")
                          .map((s) => (
                            <div key={s.sectionKey} className="text-[11px] flex items-baseline justify-between gap-1">
                              <span className="font-semibold text-slate-800">{s.label}</span>
                              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">Priority</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {guidance.suggestions.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        General Advice
                      </p>
                      <ul className="space-y-1">
                        {guidance.suggestions.map((s, idx) => (
                          <li key={idx} className="text-[11px] text-slate-600 leading-snug flex gap-1.5">
                            <span className="text-slate-300">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Suggestion Chips with Add Dialog */}
              <ProfileSuggestionsPanel target={target} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
