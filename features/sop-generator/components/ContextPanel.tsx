"use client";

import { useState } from "react";
import type {
  StudentDocumentContext,
  ValidationIssue,
} from "../types/sop-generator";

interface ContextPanelProps {
  ctx: StudentDocumentContext;
  validationIssues: ValidationIssue[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenStudentDetails?: () => void;
  onSelectSection?: (sectionId: string) => void;
  onRefreshValidation?: () => void;
}

interface TargetSectionInfo {
  sectionId: string;
  sectionTitle: string;
  sectionNumber: string;
}

function getSectionForIssue(issue: ValidationIssue): TargetSectionInfo {
  const field = issue.field?.toLowerCase() || "";
  const id = issue.id?.toLowerCase() || "";

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

type PanelTab = "student" | "destination" | "validation";

export function ContextPanel({
  ctx,
  validationIssues,
  isCollapsed = false,
  onToggleCollapse,
  onOpenStudentDetails,
  onSelectSection,
  onRefreshValidation,
}: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("student");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);

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

  const tabs: { id: PanelTab; label: string; count?: number; countColor?: string }[] = [
    { id: "student", label: "Student" },
    { id: "destination", label: "Destination" },
    {
      id: "validation",
      label: "Validation",
      count: errors.length + warnings.length,
      countColor: errors.length > 0 ? "bg-rose-500 text-white" : "bg-amber-500 text-white",
    },
  ];

  return (
    <aside
      className="w-72 xl:w-80 flex-shrink-0 flex flex-col border-l border-slate-200/90 bg-[#FAFBFD] overflow-hidden select-none"
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
            onClick={() => setActiveTab(tab.id)}
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
                  {ctx.academics.latestQualification}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {ctx.academics.board} · {ctx.academics.completionYear} · {ctx.academics.percentage}
                </p>
              </div>
              <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
                <span className="text-slate-400">Key Subjects: </span>
                <span>{ctx.academics.subjects}</span>
              </div>
            </div>

            {/* IELTS Score */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  English Language (IELTS)
                </span>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  Band {ctx.tests.ielts.overall}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-1 text-center">
                <div className="p-1 rounded bg-slate-50">
                  <span className="block text-[9px] text-slate-400">L</span>
                  <span className="text-xs font-semibold text-slate-700">{ctx.tests.ielts.listening}</span>
                </div>
                <div className="p-1 rounded bg-slate-50">
                  <span className="block text-[9px] text-slate-400">R</span>
                  <span className="text-xs font-semibold text-slate-700">{ctx.tests.ielts.reading}</span>
                </div>
                <div className="p-1 rounded bg-slate-50">
                  <span className="block text-[9px] text-slate-400">W</span>
                  <span className="text-xs font-semibold text-slate-700">{ctx.tests.ielts.writing}</span>
                </div>
                <div className="p-1 rounded bg-slate-50">
                  <span className="block text-[9px] text-slate-400">S</span>
                  <span className="text-xs font-semibold text-slate-700">{ctx.tests.ielts.speaking}</span>
                </div>
              </div>
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
            {/* Institution Card */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Destination
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200/80">
                  ✓ Verified Data
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {ctx.destination.country}
                </p>
                <p className="text-xs font-semibold text-slate-800 mt-1">
                  {ctx.destination.university}
                </p>
                <p className="text-[11px] text-slate-500">
                  {ctx.destination.city}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                  Course
                </span>
                <p className="text-xs font-medium text-slate-800 mt-0.5">
                  {ctx.destination.course}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {ctx.destination.degreeLevel} · {ctx.destination.duration} · Intake {ctx.destination.intakeMonth} {ctx.destination.intakeYear}
                </p>
              </div>
            </div>

            {/* Financial Sponsorship Card */}
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
                  Student record and destination data are verified for visa submission.
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
                    const target = getSectionForIssue(issue);

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
      </div>
    </aside>
  );
}
