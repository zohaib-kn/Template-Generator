"use client";

import { useState, useEffect } from "react";
import type {
  StudentDocumentContext,
  ValidationIssue,
  SopDocumentType,
} from "../types/sop-generator";
import type {
  AcademicAlignmentResult,
  TransitionContext,
} from "@/services/academicAlignment/types";
import { AlignmentStatusBadge } from "@/features/academic-alignment/components/AlignmentStatusBadge";
import type { ApplicationTarget } from "@/features/document-generator/guidance/types";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import { ApplicationTargetForm } from "@/features/document-generator/forms/ApplicationTargetForm";

export type PanelTab = "student" | "destination" | "validation" | "alignment";

interface ContextPanelProps {
  ctx: StudentDocumentContext;
  validationIssues: ValidationIssue[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenStudentDetails?: () => void;
  onSelectSection?: (sectionId: string) => void;
  onRefreshValidation?: () => void;
  showLogistics?: boolean;
  activeDocumentType?: SopDocumentType;
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
  activeTab?: PanelTab;
  onTabChange?: (tab: PanelTab) => void;
  applicationTarget?: ApplicationTarget;
  onTargetChange?: (target: ApplicationTarget) => void;
  availablePrograms?: NormalizedAppliedProgram[];
  selectedProgramId?: string;
  onProgramChange?: (programId: string) => void;
  onOpenJustifyModal?: () => void;
}

interface TargetSectionInfo {
  sectionId: string;
  sectionTitle: string;
  sectionNumber: string;
}

function getSectionForIssue(issue: ValidationIssue, isUniversitySop?: boolean): TargetSectionInfo {
  const field = issue.field?.toLowerCase() || "";
  const id = issue.id?.toLowerCase() || "";

  if (isUniversitySop) {
    if (field.startsWith("student.")) {
      return { sectionId: "student-introduction", sectionTitle: "Student Introduction", sectionNumber: "01" };
    }
    if (field === "destination.course" || id.includes("course")) {
      return { sectionId: "why-course", sectionTitle: "Academic Motivation & Course Choice", sectionNumber: "04" };
    }
    if (field === "destination.university" || id.includes("university")) {
      return { sectionId: "why-university", sectionTitle: "Why This University", sectionNumber: "05" };
    }
    if (field.startsWith("academics.") || field.startsWith("tests.") || id.includes("academic") || id.includes("ielts")) {
      return { sectionId: "academic-background", sectionTitle: "Academic Background & Preparedness", sectionNumber: "02" };
    }
    return { sectionId: "student-introduction", sectionTitle: "Student Introduction", sectionNumber: "01" };
  }

  if (field.startsWith("student.")) {
    return { sectionId: "student-introduction", sectionTitle: "Student Introduction", sectionNumber: "03" };
  }
  if (field.startsWith("destination.consulate") || id.includes("consulate")) {
    return { sectionId: "recipient", sectionTitle: "Recipient / Consulate", sectionNumber: "01" };
  }
  if (field === "destination.course" || id.includes("course")) {
    return { sectionId: "why-course", sectionTitle: "Why This Course", sectionNumber: "05" };
  }
  if (field === "destination.university" || id.includes("university")) {
    return { sectionId: "why-university", sectionTitle: "Why This University", sectionNumber: "06" };
  }
  if (field === "destination.country" || id.includes("country")) {
    return { sectionId: "why-italy", sectionTitle: "Why Italy", sectionNumber: "07" };
  }
  if (field.startsWith("destination.")) {
    return { sectionId: "subject", sectionTitle: "Subject Line", sectionNumber: "02" };
  }
  if (field.startsWith("sponsor.") || field.startsWith("finance.") || id.includes("sponsor") || id.includes("finance")) {
    return { sectionId: "financial-sponsorship", sectionTitle: "Financial Sponsorship", sectionNumber: "11" };
  }
  if (field.startsWith("accommodation.") || id.includes("accommodation")) {
    return { sectionId: "accommodation", sectionTitle: "Accommodation", sectionNumber: "12" };
  }
  if (field.startsWith("insurance.") || id.includes("insurance")) {
    return { sectionId: "insurance", sectionTitle: "Travel & Health Insurance", sectionNumber: "13" };
  }
  if (field.startsWith("travel.") || id.includes("travel")) {
    return { sectionId: "travel", sectionTitle: "Travel Arrangements", sectionNumber: "14" };
  }
  if (field.startsWith("academics.") || field.startsWith("tests.") || id.includes("academic") || id.includes("ielts")) {
    return { sectionId: "academic-background", sectionTitle: "Academic Background", sectionNumber: "04" };
  }

  // Fallback by ID
  if (id.includes("student") || id.includes("dob") || id.includes("passport")) {
    return { sectionId: "student-introduction", sectionTitle: "Student Introduction", sectionNumber: "03" };
  }

  return { sectionId: "recipient", sectionTitle: "Recipient / Consulate", sectionNumber: "01" };
}

export function ContextPanel({
  ctx,
  validationIssues,
  isCollapsed = false,
  onToggleCollapse,
  onOpenStudentDetails,
  onSelectSection,
  onRefreshValidation,
  showLogistics = true,
  activeDocumentType = "VISA_COVER_LETTER",
  alignmentResult,
  isStale = false,
  staleReason,
  onConfirmIntentionalTransition,
  onResetResolution,
  isConfirmingTransition = false,
  availableCertifications = [],
  availableProjects = [],
  availableSkills = [],
  availableInternships = [],
  activeTab: activeTabProp,
  onTabChange,
  applicationTarget,
  onTargetChange,
  availablePrograms = [],
  selectedProgramId,
  onProgramChange,
  onOpenJustifyModal,
}: ContextPanelProps) {
  const isUniversitySop = activeDocumentType === "UNIVERSITY_SOP";
  const [internalTab, setInternalTab] = useState<PanelTab>(activeTabProp || "student");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);

  useEffect(() => {
    if (activeTabProp !== undefined) {
      setInternalTab(activeTabProp);
    }
  }, [activeTabProp]);

  const activeTab = activeTabProp !== undefined ? activeTabProp : internalTab;

  function handleTabChange(tab: PanelTab) {
    setInternalTab(tab);
    if (tab === "destination") {
      setIsEditingTarget(true);
    }
    onTabChange?.(tab);
  }

  function handleRerender() {
    setIsRefreshing(true);
    onRefreshValidation?.();
    setTimeout(() => {
      setIsRefreshing(false);
      setShowRefreshSuccess(true);
      setTimeout(() => setShowRefreshSuccess(false), 2000);
    }, 350);
  }

  const errors = validationIssues.filter((i) => i.severity === "error");
  const warnings = validationIssues.filter((i) => i.severity === "warning");

  if (isCollapsed) {
    return (
      <div className="w-10 border-l border-slate-200/90 bg-[#FAFBFD] flex flex-col items-center py-4 select-none">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          title="Expand context panel"
          aria-label="Expand context panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-8 [writing-mode:vertical-rl] rotate-180">
          Context
        </span>
      </div>
    );
  }

  const hasAlignmentAttention = Boolean(
    alignmentResult &&
      (alignmentResult.status === "ACADEMIC_MISMATCH" ||
        alignmentResult.status === "UNKNOWN" ||
        isStale ||
        alignmentResult.isStale)
  );

  const tabs: { id: PanelTab; label: string; count?: number; countColor?: string }[] = [
    { id: "student", label: "Student" },
    { id: "destination", label: "Destination" },
    {
      id: "validation",
      label: "Validation",
      count: errors.length + warnings.length,
      countColor: errors.length > 0 ? "bg-rose-500 text-white" : "bg-amber-500 text-white",
    },
    {
      id: "alignment",
      label: "Alignment",
      count: hasAlignmentAttention ? 1 : undefined,
      countColor:
        alignmentResult?.status === "ACADEMIC_MISMATCH" || alignmentResult?.status === "UNKNOWN"
          ? "bg-rose-500 text-white"
          : "bg-amber-500 text-white",
    },
  ];

  return (
    <aside
      className="w-80 xl:w-96 flex-shrink-0 flex flex-col border-l border-slate-200/90 bg-[#FAFBFD] overflow-hidden select-none"
      aria-label="Student and destination context"
    >
      {/* Top bar with Rerender and Collapse buttons */}
      <div className="px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Story Context
          </span>
          {showRefreshSuccess && (
            <span className="text-[10px] text-emerald-600 font-medium animate-fade-in">
              ✓ Updated
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Re-render / Re-check button */}
          <button
            type="button"
            id="sop-context-rerender-btn"
            onClick={handleRerender}
            disabled={isRefreshing}
            className="h-6 px-2 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 text-[11px] font-medium transition-all flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-60"
            title="Re-render & re-evaluate story validation"
          >
            <span className={`text-[10px] ${isRefreshing ? "animate-spin" : ""}`}>↺</span>
            <span>{isRefreshing ? "Checking…" : "Re-check"}</span>
          </button>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors ml-1 cursor-pointer"
              title="Collapse context sidebar"
            >
              <span>Hide</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 px-2 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`context-tab-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-2.5 text-xs transition-colors relative flex items-center justify-center gap-1.5
              ${
                activeTab === tab.id
                  ? "text-slate-900 font-semibold border-b-2 border-slate-900"
                  : "text-slate-400 hover:text-slate-700 font-medium border-b-2 border-transparent"
              }`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] font-bold ${tab.countColor}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="tabpanel">
        {/* ── Student Tab ── */}
        {activeTab === "student" && (
          <div className="space-y-4">
            {/* Person Profile Card */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Applicant
              </span>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {ctx.student.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "ST"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {ctx.student.fullName || "Student"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {ctx.student.city}, {ctx.student.country}
                  </p>
                </div>
              </div>
            </div>

            {/* Academic Highlights */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Academic Background
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {ctx.academics.latestQualification || ctx.academics.institution || "Academic background not specified"}
                </p>
                {ctx.academics.institution && ctx.academics.latestQualification && (
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    {ctx.academics.institution}
                  </p>
                )}
                {([ctx.academics.board, ctx.academics.completionYear, ctx.academics.percentage].filter(Boolean).length > 0) && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {[ctx.academics.board, ctx.academics.completionYear, ctx.academics.percentage].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {ctx.academics.subjects && (
                <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
                  <span className="text-slate-400">Key Subjects: </span>
                  <span>{ctx.academics.subjects}</span>
                </div>
              )}
            </div>

            {/* IELTS Score */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  English Language (IELTS)
                </span>
                {ctx.tests.ielts.overall ? (
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    Band {ctx.tests.ielts.overall}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Not specified</span>
                )}
              </div>
              {ctx.tests.ielts.overall ? (
                <div className="grid grid-cols-4 gap-1 pt-1 text-center">
                  <div className="p-1 rounded bg-slate-50">
                    <span className="block text-[9px] text-slate-400">L</span>
                    <span className="text-xs font-semibold text-slate-700">{ctx.tests.ielts.listening || "—"}</span>
                  </div>
                  <div className="p-1 rounded bg-slate-50">
                    <span className="block text-[9px] text-slate-400">R</span>
                    <span className="text-xs font-semibold text-slate-700">{ctx.tests.ielts.reading || "—"}</span>
                  </div>
                  <div className="p-1 rounded bg-slate-50">
                    <span className="block text-[9px] text-slate-400">W</span>
                    <span className="text-xs font-semibold text-slate-700">{ctx.tests.ielts.writing || "—"}</span>
                  </div>
                  <div className="p-1 rounded bg-slate-50">
                    <span className="block text-[9px] text-slate-400">S</span>
                    <span className="text-xs font-semibold text-slate-700">{ctx.tests.ielts.speaking || "—"}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* View Full Profile CTA */}
            {onOpenStudentDetails && (
              <button
                type="button"
                onClick={onOpenStudentDetails}
                className="w-full py-2 px-3 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>View complete student record</span>
                <span>→</span>
              </button>
            )}
          </div>
        )}

        {/* ── Destination Tab ── */}
        {activeTab === "destination" && (
          <div className="space-y-4">
            {/* Multiple programs selector if CRM has multiple */}
            {availablePrograms.length > 1 && onProgramChange && (
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1.5">
                <label
                  htmlFor="sop-context-prog-switcher"
                  className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block"
                >
                  Switch Applied Program ({availablePrograms.length} applied):
                </label>
                <select
                  id="sop-context-prog-switcher"
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

            {/* Institution Card */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Destination
                </span>
                {applicationTarget?.intendedCourse || ctx.destination.course ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200/80">
                    ✓ Active Target
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium border border-amber-200/80">
                    Needs Target Course
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {applicationTarget?.destinationCountry || ctx.destination.country || "Country not selected"}
                </p>
                <p className="text-xs font-semibold text-slate-800 mt-1">
                  {applicationTarget?.universityName || ctx.destination.university || "University not selected"}
                </p>
                {ctx.destination.city && (
                  <p className="text-[11px] text-slate-500">
                    {ctx.destination.city}
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                  Course
                </span>
                {applicationTarget?.intendedCourse || ctx.destination.course ? (
                  <>
                    <p className="text-xs font-medium text-slate-800 mt-0.5">
                      {applicationTarget?.intendedCourse || ctx.destination.course}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {[
                        applicationTarget?.degreeLevel || ctx.destination.degreeLevel,
                        ctx.destination.duration,
                        ctx.destination.intakeMonth || ctx.destination.intakeYear
                          ? `Intake ${[ctx.destination.intakeMonth, ctx.destination.intakeYear].filter(Boolean).join(" ")}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-0.5">
                    No target course specified. Please enter target course details below to enable academic alignment review.
                  </p>
                )}
              </div>
            </div>

            {/* Configure Application Target Form Toggle */}
            {onTargetChange && applicationTarget && (
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Configure Application Target
                  </span>
                  <button
                    type="button"
                    id="sop-edit-target-toggle-btn"
                    onClick={() => setIsEditingTarget((v) => !v)}
                    className="text-xs text-[#096491] hover:underline font-semibold cursor-pointer"
                  >
                    {isEditingTarget ? "Hide Form" : "Edit Target"}
                  </button>
                </div>

                {isEditingTarget && (
                  <div className="pt-2 border-t border-slate-100">
                    <ApplicationTargetForm
                      value={applicationTarget}
                      onChange={onTargetChange}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Financial Sponsorship Card & Logistics (Visa letters only) */}
            {showLogistics && (
              <>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sponsorship & Funds
                  </span>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sponsor</span>
                      <span className="font-medium text-slate-800">{ctx.sponsor.name} ({ctx.sponsor.relationship})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Funds</span>
                      <span className="font-semibold text-slate-900">{ctx.finance.totalFundsAvailable}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Bank Balance</span>
                      <span className="text-slate-600">{ctx.finance.availableBalance}</span>
                    </div>
                  </div>
                </div>

                {/* Logistics Summary */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Accommodation & Flight
                  </span>
                  <div className="space-y-1 text-[11px]">
                    <p className="text-slate-700">
                      <strong className="font-medium text-slate-800">Stay: </strong>
                      {ctx.accommodation.name} ({ctx.accommodation.bookingReference})
                    </p>
                    <p className="text-slate-700">
                      <strong className="font-medium text-slate-800">Flight: </strong>
                      {ctx.travel.airline} {ctx.travel.flightNumber} on {ctx.travel.travelDate}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Validation Tab ── */}
        {activeTab === "validation" && (
          <div className="space-y-3">
            {/* Header info & re-render bar */}
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <span className="text-[11px] font-medium text-slate-500">
                {validationIssues.length} check{validationIssues.length === 1 ? "" : "s"} evaluated
              </span>
              <button
                type="button"
                id="sop-validation-rerun-btn"
                onClick={handleRerender}
                disabled={isRefreshing}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium hover:underline cursor-pointer disabled:opacity-50"
              >
                <span className={isRefreshing ? "animate-spin" : ""}>↺</span>
                <span>Re-render Checks</span>
              </button>
            </div>

            {validationIssues.length === 0 ? (
              <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center space-y-1">
                <p className="text-base text-emerald-600">✓</p>
                <p className="text-xs font-semibold text-emerald-900">All checks passed</p>
                <p className="text-[11px] text-emerald-700">
                  Student record and destination data are verified for submission.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Click any error or warning below to jump directly to that section for changes:
                </p>

                <div className="space-y-2">
                  {validationIssues.map((issue) => {
                    const isError = issue.severity === "error";
                    const target = getSectionForIssue(issue, isUniversitySop);

                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => onSelectSection?.(target.sectionId)}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-150 group cursor-pointer shadow-2xs hover:shadow-xs block ${
                          isError
                            ? "bg-rose-50/70 hover:bg-rose-50 border-rose-200 hover:border-rose-300 text-rose-900"
                            : "bg-amber-50/70 hover:bg-amber-50 border-amber-200 hover:border-amber-300 text-amber-900"
                        }`}
                        title={`Click to jump to section: ${target.sectionTitle}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                              isError ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                            }`}
                          >
                            {isError ? "✕" : "!"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-snug">{issue.message}</p>
                            {issue.field && (
                              <p className="text-[10px] opacity-75 font-mono mt-0.5 truncate">
                                Field: {issue.field}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 rounded-lg bg-slate-100/70 text-[11px] text-slate-600 border border-slate-200/60">
                  {errors.length > 0 ? (
                    <p className="font-medium text-rose-700">
                      Resolve {errors.length} error{errors.length > 1 ? "s" : ""} before approving document.
                    </p>
                  ) : (
                    <p className="font-medium text-amber-700">
                      {warnings.length} warning{warnings.length > 1 ? "s" : ""} to review.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Alignment Tab ── */}
        {activeTab === "alignment" && (
          <div className="space-y-4">
            {alignmentResult ? (
              <>
                {/* 1. Status Overview & Vertical Stream Transition Card */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Academic Field Match
                    </span>
                    <AlignmentStatusBadge
                      status={alignmentResult.status}
                      isStale={Boolean(isStale || alignmentResult.isStale)}
                      size="sm"
                    />
                  </div>

                  {/* Vertical Transition Timeline Card */}
                  <div className="space-y-2">
                    {/* Past Study Card */}
                    <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🎓</span>
                          <span>Past Study</span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.2 rounded bg-slate-200/70">
                          Source
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-snug break-words">
                        {alignmentResult.sourceField.domain.replace(/_/g, " ")}
                      </p>
                      {alignmentResult.sourceField.subDomain && (
                        <p className="text-[11px] text-slate-500 font-medium break-words">
                          {alignmentResult.sourceField.subDomain.replace(/_/g, " ")}
                        </p>
                      )}
                      {alignmentResult.sourceField.rawSource && (
                        <p className="text-[11px] text-slate-500/80 truncate pt-0.5" title={alignmentResult.sourceField.rawSource}>
                          {alignmentResult.sourceField.rawSource}
                        </p>
                      )}
                    </div>

                    {/* Transition Direction Indicator */}
                    <div className="flex items-center justify-center gap-2 py-0.5">
                      <div className="h-px bg-slate-200 flex-1" />
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        alignmentResult.status === "ALIGNED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : alignmentResult.status === "RELATED_TRANSITION"
                          ? "bg-sky-50 text-sky-800 border-sky-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>
                          {alignmentResult.status === "ALIGNED"
                            ? "Aligned Track"
                            : alignmentResult.status === "RELATED_TRANSITION"
                            ? "Cognate Track"
                            : "Stream Switch"}
                        </span>
                      </span>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>

                    {/* Applying For Card */}
                    <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/90 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🎯</span>
                          <span>Applying For</span>
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-700 px-1.5 py-0.2 rounded bg-indigo-100/80">
                          Target
                        </span>
                      </div>
                      <p className="text-xs font-bold text-indigo-950 leading-snug break-words">
                        {alignmentResult.targetField.domain.replace(/_/g, " ")}
                      </p>
                      {alignmentResult.targetField.subDomain && (
                        <p className="text-[11px] text-indigo-700 font-medium break-words">
                          {alignmentResult.targetField.subDomain.replace(/_/g, " ")}
                        </p>
                      )}
                      {alignmentResult.targetField.rawSource && (
                        <p className="text-[11px] text-indigo-600/80 truncate pt-0.5" title={alignmentResult.targetField.rawSource}>
                          {alignmentResult.targetField.rawSource}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 pt-2 border-t border-slate-100 leading-relaxed font-normal break-words">
                    {alignmentResult.explanation}
                  </p>
                </div>

                {/* 2. Safeguard & Action Callout Card */}
                {(alignmentResult.status === "ACADEMIC_MISMATCH" ||
                  alignmentResult.status === "UNKNOWN" ||
                  isStale ||
                  alignmentResult.isStale) && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 shadow-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">⚠️</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-amber-950 leading-snug">
                          {alignmentResult.status === "UNKNOWN" ? "Target Review Required" : "Stream Change Detected"}
                        </h4>
                        <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                          {alignmentResult.blockingReason ||
                            "AI generation for sensitive sections (Why Course, Career Plan) is paused until a transition justification is recorded."}
                        </p>
                      </div>
                    </div>

                    {/* Sensitive Sections Paused Status */}
                    <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200/70 space-y-1.5 text-[11px]">
                      <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                        Protected Document Sections
                      </span>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span>🔒</span>
                          <span>Why This Course</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                          Paused
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span>🔒</span>
                          <span>Career Plan</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                          Paused
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-1 flex flex-col gap-2">
                      {onOpenJustifyModal && (
                        <button
                          type="button"
                          onClick={onOpenJustifyModal}
                          className="w-full py-2.5 px-3 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                        >
                          <span>Justify Transition in Studio</span>
                          <span>↗</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTabChange("destination")}
                        className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer text-center"
                      >
                        Review Target Course
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. When Confirmed Transition */}
                {alignmentResult.status === "CONFIRMED_TRANSITION" && (
                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 shadow-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">🛡️</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-emerald-950 leading-snug">
                            Transition Verified & Active
                          </h4>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                            ✓ Unlocked
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-900 mt-1 leading-relaxed">
                          A verified transition rationale is active. Sensitive sections (Why Course, Career Plan) are unlocked for AI generation.
                        </p>
                      </div>
                    </div>

                    {alignmentResult.safeEvidencePacket && (
                      <div className="bg-white/90 rounded-lg p-2.5 border border-emerald-200/70 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                            Verified Rationale
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                            {alignmentResult.safeEvidencePacket.bridgeItems.length} verified credentials
                          </span>
                        </div>
                        <p className="text-slate-600 italic line-clamp-3 leading-relaxed">
                          &ldquo;{alignmentResult.safeEvidencePacket.justification}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="pt-1 flex items-center gap-2">
                      {onOpenJustifyModal && (
                        <button
                          type="button"
                          onClick={onOpenJustifyModal}
                          className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer text-center"
                        >
                          Edit Justification ↗
                        </button>
                      )}
                      {onResetResolution && (
                        <button
                          type="button"
                          onClick={() => onResetResolution()}
                          className="py-2 px-3 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                No academic alignment data available for current student.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
