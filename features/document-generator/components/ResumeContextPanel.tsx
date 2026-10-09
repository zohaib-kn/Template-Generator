"use client";

import { useState, useEffect } from "react";
import type { DocumentData } from "@/types";
import type { ApplicationTarget, GuidanceResult } from "../guidance/types";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import type {
  AcademicAlignmentResult,
  TransitionContext,
} from "@/services/academicAlignment/types";
import { AlignmentStatusBadge } from "@/features/academic-alignment/components/AlignmentStatusBadge";
import { TransitionContextPanel } from "@/features/academic-alignment/components/TransitionContextPanel";
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
  alignmentResult?: AcademicAlignmentResult;
  isStale?: boolean;
  staleReason?: string;
  onConfirmIntentionalTransition?: (context: TransitionContext) => Promise<boolean> | void;
  onResetResolution?: () => Promise<boolean> | void;
  isConfirmingTransition?: boolean;
  availableCertifications?: Array<{ id: string; name: string; issuer?: string }>;
  availableProjects?: Array<{ id: string; title: string; description?: string }>;
  availableSkills?: Array<{ id: string; name: string }>;
  availableInternships?: Array<{ id: string; role: string; organization?: string; description?: string }>;
}

type ContextTab = "student" | "target" | "guidance" | "alignment";

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
  alignmentResult,
  isStale = false,
  staleReason,
  onConfirmIntentionalTransition,
  onResetResolution,
  isConfirmingTransition = false,
  availableCertifications,
  availableProjects,
  availableSkills,
  availableInternships,
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

  // Sanitized evidence arrays for transition evaluation
  const safeCertifications =
    availableCertifications ||
    (data.certifications ?? [])
      .filter((c): c is typeof c & { name: string } => Boolean(c.name))
      .map((c) => ({ id: c.id, name: c.name, issuer: c.provider }));

  const safeProjects =
    availableProjects ||
    (data.academicProjects ?? [])
      .filter((p): p is typeof p & { title: string } => Boolean(p.title))
      .map((p) => ({ id: p.id, title: p.title, description: p.description }));

  const safeSkills =
    availableSkills ||
    (data.skills ?? [])
      .filter((s): s is typeof s & { name: string } => Boolean(s.name))
      .map((s) => ({ id: s.id, name: s.name }));

  const safeInternships =
    availableInternships ||
    (data.internships ?? [])
      .filter((i): i is typeof i & { role: string } => Boolean(i.role))
      .map((i) => ({
        id: i.id,
        role: i.role,
        organization: i.company,
        description: i.description,
      }));

  // Informational notice string
  const targetCourseName =
    target.intendedCourse || alignmentResult?.targetField?.rawSource || "the target course";
  const targetDomainName =
    alignmentResult?.targetField?.domain?.replace(/_/g, " ") || "Target Domain";
  const sourceDomainName =
    alignmentResult?.sourceField?.domain?.replace(/_/g, " ") || "Previous Discipline";

  const resumeMismatchNotice = `Field Change Detected: The student previously studied ${sourceDomainName} and is now applying for ${targetCourseName} (${targetDomainName}). We recommend highlighting connected skills, coursework, or projects in the resume to explain this switch.`;

  const tabs: { id: ContextTab; label: string; badge?: string }[] = [
    { id: "student", label: "Student" },
    { id: "target", label: "Target" },
    { id: "guidance", label: "Guidance" },
    {
      id: "alignment",
      label: "Alignment",
      badge:
        isStale ||
        alignmentResult?.status === "ACADEMIC_MISMATCH" ||
        alignmentResult?.status === "UNKNOWN"
          ? "!"
          : undefined,
    },
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
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[500px] lg:w-[520px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 select-none"
        role="dialog"
        aria-label="Profile and application context"
        aria-modal="true"
      >
        {/* ── Drawer Header ── */}
        <div className="px-5 py-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
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

        {/* ── Tabs (Student | Target | Guidance | Alignment) ── */}
        <div className="flex border-b border-slate-200/80 px-3 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`resume-context-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-xs transition-colors relative flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? "text-slate-900 font-bold border-b-2 border-slate-900"
                  : "text-slate-400 hover:text-slate-700 font-medium border-b-2 border-transparent"
              }`}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center border border-amber-300">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/40" role="tabpanel">
          {/* ── Student Tab ── */}
          {activeTab === "student" && (
            <div className="space-y-4">
              {/* Applicant Persona Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Applicant Profile
                </span>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 break-words leading-tight">
                      {studentName}
                    </p>
                    <p className="text-xs text-slate-500 break-words mt-1 leading-normal">
                      {location}
                    </p>
                  </div>
                </div>

                {(p.email || p.phone) && (
                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                    {p.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 shrink-0">✉</span>
                        <span className="break-all font-medium text-slate-700">{p.email}</span>
                      </div>
                    )}
                    {p.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 shrink-0">📞</span>
                        <span className="break-words font-medium text-slate-700">{p.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Academic Highlight */}
              {latestEdu ? (
                <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Academic Background
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 leading-snug break-words">
                      {latestEdu.qualification || "Degree"} {latestEdu.fieldOfStudy ? `in ${latestEdu.fieldOfStudy}` : ""}
                    </p>
                    <p className="text-xs text-slate-600 font-medium break-words leading-normal">
                      {latestEdu.institution}
                    </p>
                  </div>
                  {(latestEdu.startDate || latestEdu.endDate) && (
                    <p className="text-[11px] text-slate-400 font-medium pt-1">
                      {latestEdu.startDate} → {latestEdu.endDate}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs text-xs text-slate-400 italic">
                  No education history added yet.
                </div>
              )}

              {/* English Language / IELTS */}
              {englishTest && (englishTest.examName || englishTest.score) ? (
                <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Language Certificate
                    </span>
                    {englishTest.score && (
                      <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80">
                        Score: {englishTest.score}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 break-words leading-normal">
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
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-xs text-slate-500 hover:text-slate-800 transition-colors text-center cursor-pointer bg-transparent hover:bg-slate-50/60"
                >
                  Load different student from CRM
                </button>
              )}
            </div>
          )}

          {/* ── Target Tab ── */}
          {activeTab === "target" && (
            <div className="space-y-4">
              {/* Target Destination Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Application
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200 shrink-0">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p className="text-base font-bold text-slate-900 break-words leading-snug">
                    {target.destinationCountry || "Country not selected"}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 break-words leading-normal">
                    {target.universityName || "University not selected"}
                  </p>
                  <p className="text-xs text-slate-600 break-words leading-normal">
                    {target.intendedCourse || "Intended course not specified"}
                  </p>
                  {target.degreeLevel && (
                    <div className="pt-2 border-t border-slate-100 mt-2">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Level: <span className="font-semibold text-slate-700">{target.degreeLevel}</span> {target.courseCategory ? `· ${target.courseCategory}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                {/* Multiple programs selector if CRM has multiple */}
                {availablePrograms.length > 1 && onProgramChange && (
                  <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                    <label htmlFor="context-prog-switcher" className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Switch Program ({availablePrograms.length} applied):
                    </label>
                    <select
                      id="context-prog-switcher"
                      value={selectedProgramId}
                      onChange={(e) => onProgramChange(e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-800 cursor-pointer shadow-2xs"
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

              {/* Informational Academic Mismatch Notice (Resume Non-blocking) */}
              {alignmentResult && alignmentResult.status === "ACADEMIC_MISMATCH" && (
                <div
                  id="resume-informational-mismatch-banner"
                  className="p-4 rounded-xl bg-amber-50/90 border border-amber-300/80 shadow-xs space-y-2.5"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-amber-700">ℹ</span>
                      <span>Helpful Advice: Changing Fields</span>
                    </span>
                    <AlignmentStatusBadge
                      status={alignmentResult.status}
                      isStale={Boolean(isStale || alignmentResult.isStale)}
                      size="sm"
                    />
                  </div>

                  <p className="text-xs text-amber-950 leading-relaxed font-normal break-words">
                    {resumeMismatchNotice}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-[11px] border-t border-amber-200/70">
                    <span className="text-amber-800 font-medium">
                      ✓ Note: You can still edit and download the Resume anytime — nothing is blocked.
                    </span>
                    <button
                      type="button"
                      id="resume-view-alignment-tab-btn"
                      onClick={() => setActiveTab("alignment")}
                      className="text-amber-900 hover:text-amber-950 font-semibold underline cursor-pointer"
                    >
                      Alignment details →
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Target Form Toggle */}
              <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Configure Application Target
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTarget((v) => !v)}
                    className="text-xs text-[#096491] hover:underline font-semibold cursor-pointer"
                  >
                    {isEditingTarget ? "Hide Form" : "Edit Target"}
                  </button>
                </div>

                {isEditingTarget && (
                  <div className="pt-3 border-t border-slate-100">
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

          {/* ── Alignment Tab ── */}
          {activeTab === "alignment" && (
            <div className="space-y-4" id="resume-alignment-tab-panel">
              {alignmentResult ? (
                <>
                  {/* Status overview card */}
                  <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Academic Field Match
                      </span>
                      <AlignmentStatusBadge
                        status={alignmentResult.status}
                        isStale={Boolean(isStale || alignmentResult.isStale)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Past Study (Degree Completed)
                        </span>
                        <span className="text-xs font-bold text-slate-900 block break-words leading-relaxed">
                          {alignmentResult.sourceField.domain === "UNKNOWN"
                            ? "Not Specified"
                            : alignmentResult.sourceField.domain.replace(/_/g, " ")}
                          {alignmentResult.sourceField.subDomain &&
                          (alignmentResult.sourceField.subDomain as string) !== "UNKNOWN_SUBDOMAIN" &&
                          (alignmentResult.sourceField.subDomain as string) !== "UNKNOWN"
                            ? ` (${alignmentResult.sourceField.subDomain.replace(/_/g, " ")})`
                            : ""}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Applying For (New Course)
                        </span>
                        <span className="text-xs font-bold text-slate-900 block break-words leading-relaxed">
                          {alignmentResult.targetField.domain === "UNKNOWN"
                            ? "Not Specified"
                            : alignmentResult.targetField.domain.replace(/_/g, " ")}
                          {alignmentResult.targetField.subDomain &&
                          (alignmentResult.targetField.subDomain as string) !== "UNKNOWN_SUBDOMAIN" &&
                          (alignmentResult.targetField.subDomain as string) !== "UNKNOWN"
                            ? ` (${alignmentResult.targetField.subDomain.replace(/_/g, " ")})`
                            : ""}
                        </span>
                      </div>
                    </div>

                    {alignmentResult.explanation && (
                      <p className="text-xs text-slate-600 pt-2.5 border-t border-slate-100 leading-relaxed font-normal break-words">
                        {alignmentResult.explanation}
                      </p>
                    )}

                    {/* Integrated Unknown Advisory if degree could not be identified */}
                    {alignmentResult.status === "UNKNOWN" && (
                      <div
                        id="resume-unknown-alignment-notice"
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5 shadow-2xs"
                        role="status"
                      >
                        <span className="text-slate-500 font-bold text-sm shrink-0 mt-0.5">ℹ</span>
                        <div>
                          <strong className="text-slate-900 block mb-0.5">Verification Recommended</strong>
                          We could not automatically match this degree with the target course. You can verify the student&apos;s education details in the Student tab or choose a standard course category.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Informational Mismatch Advisory Notice */}
                  {alignmentResult.status === "ACADEMIC_MISMATCH" && (
                    <div
                      id="resume-informational-mismatch-notice"
                      className="p-4 rounded-xl bg-amber-50 border border-amber-300 shadow-xs space-y-2.5 text-amber-950"
                      role="status"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 text-sm">ℹ</span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                          Helpful Advice: Changing Fields
                        </h4>
                      </div>
                      <p className="text-xs leading-relaxed font-medium break-words">
                        {resumeMismatchNotice}
                      </p>
                      <p className="text-[11px] text-amber-800 pt-1.5 border-t border-amber-200">
                        💡 <strong>Note:</strong> You can continue editing and download the Resume anytime.
                      </p>
                    </div>
                  )}

                  {/* Stale warning if target course changed */}
                  {(isStale || alignmentResult.isStale) && (
                    <div
                      id="resume-stale-alignment-notice"
                      className="p-4 rounded-xl bg-orange-50 border border-orange-300 shadow-xs space-y-2.5 text-orange-950"
                      role="status"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-orange-700 text-sm">⚠️</span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-orange-900">
                          Target Program Changed
                        </h4>
                      </div>
                      <p className="text-xs leading-relaxed text-orange-900 break-words">
                        {staleReason ||
                          alignmentResult.staleReason ||
                          "The target course changed since this transition was previously reviewed. Please verify whether the transition evidence still applies."}
                      </p>
                      {onResetResolution && (
                        <button
                          type="button"
                          id="resume-reset-resolution-btn"
                          onClick={() => onResetResolution()}
                          className="text-[11px] font-semibold text-orange-900 underline cursor-pointer"
                        >
                          Reset Transition Rationale
                        </button>
                      )}
                    </div>
                  )}

                  {/* Transferable Skills & Bridging Recommendations */}
                  <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Tips to Strengthen this Resume
                    </span>
                    <ul className="text-xs text-slate-600 space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                        <span className="leading-relaxed break-words">
                          <strong className="text-slate-800">Show Connected Subjects:</strong> Mention college subjects that connect to the new course (like Math, Logic, or Programming).
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                        <span className="leading-relaxed break-words">
                          <strong className="text-slate-800">Highlight Hands-on Projects:</strong> Showcase college or personal projects where the student built things in{" "}
                          <span className="font-semibold text-slate-800">
                            {alignmentResult.targetField.domain === "UNKNOWN"
                              ? "the target field"
                              : alignmentResult.targetField.domain.replace(/_/g, " ")}
                          </span>.
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                        <span className="leading-relaxed break-words">
                          <strong className="text-slate-800">Add Online Courses & Certificates:</strong> Include certificates (Coursera, Udemy, etc.) to prove recent learning and interest in{" "}
                          <span className="font-semibold text-slate-800">{target.intendedCourse || "the target discipline"}</span>.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Transition Confirmation Panel */}
                  <TransitionContextPanel
                    result={alignmentResult}
                    layoutMode="stacked"
                    initialContext={
                      alignmentResult.safeEvidencePacket
                        ? {
                            reason: alignmentResult.safeEvidencePacket.justification,
                          }
                        : undefined
                    }
                    availableCertifications={safeCertifications}
                    availableProjects={safeProjects}
                    availableSkills={safeSkills}
                    availableInternships={safeInternships}
                    onSave={onConfirmIntentionalTransition || (() => {})}
                    isLoading={isConfirmingTransition}
                  />
                </>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No academic alignment data available for current resume.
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
