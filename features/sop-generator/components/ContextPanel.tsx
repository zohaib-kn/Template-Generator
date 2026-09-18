"use client";

import { useState } from "react";
import type {
  StudentDocumentContext,
  ValidationIssue,
} from "../types/sop-generator";

interface ContextPanelProps {
  ctx: StudentDocumentContext;
  validationIssues: ValidationIssue[];
}

type PanelTab = "student" | "destination" | "validation";

const SEVERITY_CONFIG: Record<
  ValidationIssue["severity"],
  { icon: string; color: string; bg: string }
> = {
  error:   { icon: "✕", color: "text-red-700",    bg: "bg-red-50 border-red-200" },
  warning: { icon: "!",  color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  info:    { icon: "✓",  color: "text-green-700",  bg: "bg-green-50 border-green-200" },
};

/**
 * Right context panel — Student / Destination / Validation tabs.
 *
 * Provides quick reference for the counsellor without needing to open
 * external systems.
 */
export function ContextPanel({ ctx, validationIssues }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("student");

  const errorCount = validationIssues.filter((i) => i.severity === "error").length;
  const warnCount = validationIssues.filter((i) => i.severity === "warning").length;

  const tabs: { id: PanelTab; label: string; count?: number; countColor?: string }[] = [
    { id: "student",     label: "Student" },
    { id: "destination", label: "Destination" },
    {
      id: "validation",
      label: "Validation",
      count: errorCount + warnCount,
      countColor: errorCount > 0 ? "bg-red-500" : "bg-amber-500",
    },
  ];

  return (
    <aside
      className="w-80 xl:w-84 flex-shrink-0 flex flex-col border-l border-slate-200 bg-white overflow-hidden"
      aria-label="Context panel"
    >
      {/* Tab bar */}
      <div className="flex border-b border-slate-200 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`context-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide
                        transition-colors relative
                        ${
                          activeTab === tab.id
                            ? "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-b-2 border-transparent"
                        }`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1.5 inline-flex items-center justify-center
                             w-4 h-4 rounded-full text-white text-[9px] font-bold
                             ${tab.countColor}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" role="tabpanel">

        {/* ── Student tab ── */}
        {activeTab === "student" && (
          <>
            <ContextSection title="Personal Details">
              <ContextRow label="Name"        value={ctx.student.fullName} />
              <ContextRow label="Date of Birth" value={ctx.student.dateOfBirth} />
              <ContextRow label="Nationality"  value={ctx.student.nationality} />
              <ContextRow label="City"         value={ctx.student.city} />
              <ContextRow label="Country"      value={ctx.student.country} />
              <ContextRow label="Passport"     value={ctx.student.passportNumber} />
              <ContextRow label="Email"        value={ctx.student.email} />
              <ContextRow label="Phone"        value={ctx.student.phone} />
            </ContextSection>

            <ContextSection title="Academic Background">
              <ContextRow label="Qualification" value={ctx.academics.latestQualification} />
              <ContextRow label="Board"          value={ctx.academics.board} />
              <ContextRow label="Year"           value={ctx.academics.completionYear} />
              <ContextRow label="Subjects"       value={ctx.academics.subjects} />
              <ContextRow label="Result"         value={ctx.academics.percentage} />
            </ContextSection>

            <ContextSection title="IELTS Score">
              <ContextRow label="Overall"   value={ctx.tests.ielts.overall} highlight />
              <ContextRow label="Listening" value={ctx.tests.ielts.listening} />
              <ContextRow label="Reading"   value={ctx.tests.ielts.reading} />
              <ContextRow label="Writing"   value={ctx.tests.ielts.writing} />
              <ContextRow label="Speaking"  value={ctx.tests.ielts.speaking} />
              <ContextRow label="Date"      value={ctx.tests.ielts.dateTaken} />
            </ContextSection>

            <ContextSection title="Languages">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {ctx.student.languages}
              </p>
            </ContextSection>
          </>
        )}

        {/* ── Destination tab ── */}
        {activeTab === "destination" && (
          <>
            <ContextSection title="Destination">
              <ContextRow label="Country"      value={ctx.destination.country} highlight />
              <ContextRow label="City"         value={ctx.destination.city} />
              <ContextRow label="University"   value={ctx.destination.university} />
              <ContextRow label="Course"       value={ctx.destination.course} />
              <ContextRow label="Level"        value={ctx.destination.degreeLevel} />
              <ContextRow label="Duration"     value={ctx.destination.duration} />
              <ContextRow label="Intake"       value={`${ctx.destination.intakeMonth} ${ctx.destination.intakeYear}`} />
            </ContextSection>

            <ContextSection title="Sponsor & Finance">
              <ContextRow label="Sponsor"    value={ctx.sponsor.name} />
              <ContextRow label="Relation"   value={ctx.sponsor.relationship} />
              <ContextRow label="Loan"       value={ctx.finance.educationLoanAmount} />
              <ContextRow label="Bank Balance" value={ctx.finance.availableBalance} />
              <ContextRow label="Total Funds" value={ctx.finance.totalFundsAvailable} highlight />
            </ContextSection>

            <ContextSection title="Accommodation">
              <ContextRow label="Name"      value={ctx.accommodation.name} />
              <ContextRow label="From"      value={ctx.accommodation.fromDate} />
              <ContextRow label="To"        value={ctx.accommodation.toDate} />
              <ContextRow label="Ref"       value={ctx.accommodation.bookingReference} />
            </ContextSection>

            <ContextSection title="Travel">
              <ContextRow label="Airline"   value={ctx.travel.airline} />
              <ContextRow label="Flight"    value={ctx.travel.flightNumber} />
              <ContextRow label="Date"      value={ctx.travel.travelDate} />
              <ContextRow label="PNR"       value={ctx.travel.pnr} />
            </ContextSection>
          </>
        )}

        {/* ── Validation tab ── */}
        {activeTab === "validation" && (
          <>
            {validationIssues.length === 0 ? (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-5 text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="text-[12px] font-semibold text-green-700">
                  All checks passed
                </p>
                <p className="text-[11px] text-green-600 mt-0.5">
                  No validation issues found.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {validationIssues.map((issue) => {
                  const cfg = SEVERITY_CONFIG[issue.severity];
                  return (
                    <div
                      key={issue.id}
                      className={`rounded-lg border px-3 py-2 ${cfg.bg}`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`font-bold text-[12px] flex-shrink-0 mt-0.5 ${cfg.color}`}
                          aria-hidden="true"
                        >
                          {cfg.icon}
                        </span>
                        <div>
                          <p className={`text-[11px] leading-relaxed font-medium ${cfg.color}`}>
                            {issue.message}
                          </p>
                          {issue.field && (
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {issue.field}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Summary */}
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mt-3">
                  <p className="text-[10px] text-slate-500">
                    {errorCount > 0 && (
                      <span className="text-red-600 font-semibold">
                        {errorCount} error{errorCount !== 1 ? "s" : ""}{" "}
                      </span>
                    )}
                    {warnCount > 0 && (
                      <span className="text-amber-600 font-semibold">
                        {warnCount} warning{warnCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {" "}found. Errors must be resolved before approving.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

// ── Small sub-components ────────────────────────────────────────────────────

function ContextSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
      <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-100">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          {title}
        </p>
      </div>
      <div className="px-3 py-2.5 space-y-1.5">{children}</div>
    </div>
  );
}

function ContextRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const isEmpty = !value?.trim();
  return (
    <div className="flex gap-2 items-start">
      <span className="text-[10px] text-slate-400 w-24 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-[11px] font-medium leading-snug flex-1 ${
          isEmpty
            ? "text-red-400 italic"
            : highlight
            ? "text-indigo-700 font-semibold"
            : "text-slate-700"
        }`}
      >
        {isEmpty ? "Not provided" : value}
      </span>
    </div>
  );
}
