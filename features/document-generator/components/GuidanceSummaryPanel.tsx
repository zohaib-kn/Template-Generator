"use client";

import type { ApplicationTarget, GuidanceResult, SectionPriority } from "../guidance/types";

interface GuidanceSummaryPanelProps {
  target: ApplicationTarget;
  guidance: GuidanceResult | null;
}

function PriorityBadge({ priority }: { priority: SectionPriority }) {
  if (priority === "highly-relevant") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
        Highly Relevant
      </span>
    );
  }
  if (priority === "recommended") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700 uppercase tracking-wide">
        Recommended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 uppercase tracking-wide">
      Optional
    </span>
  );
}

function buildComboTag(target: ApplicationTarget): string {
  const parts: string[] = [];
  if (target.destinationCountry) parts.push(target.destinationCountry);
  if (target.degreeLevel) parts.push(target.degreeLevel);
  if (target.courseCategory) parts.push(target.courseCategory);
  else if (target.intendedCourse) parts.push(target.intendedCourse);
  return parts.join(" · ");
}

/**
 * GuidanceSummaryPanel — editor-only component.
 *
 * Renders a compact admissions guidance summary based on the computed
 * GuidanceResult. Returns null if no guidance is available yet.
 *
 * This component is NEVER rendered inside any PDF template.
 */
export function GuidanceSummaryPanel({
  target,
  guidance,
}: GuidanceSummaryPanelProps) {
  if (!guidance) return null;

  const highlyRelevant = guidance.sections.filter(
    (s) => s.priority === "highly-relevant"
  );
  const recommended = guidance.sections.filter(
    (s) => s.priority === "recommended"
  );
  const optional = guidance.sections.filter((s) => s.priority === "optional");

  const comboTag = buildComboTag(target);

  return (
    <div className="rounded-xl border border-navy/20 bg-gradient-to-br from-slate-50 to-blue-50 p-4 space-y-3">
      {/* Header */}
      <div>
        <p className="text-[9px] font-bold text-navy/60 uppercase tracking-widest mb-0.5">
          Admissions CV Guidance
        </p>
        {comboTag && (
          <p className="text-[11px] font-semibold text-slate-700">{comboTag}</p>
        )}
      </div>

      {/* Highly Relevant */}
      {highlyRelevant.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Focus strongly on
          </p>
          <div className="space-y-1.5">
            {highlyRelevant.map((s) => (
              <div key={s.sectionKey}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-700 flex-1">
                    {s.label}
                  </span>
                  <PriorityBadge priority={s.priority} />
                </div>
                {s.hint && (
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                    {s.hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Also useful
          </p>
          <div className="space-y-1.5">
            {recommended.map((s) => (
              <div key={s.sectionKey}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-700 flex-1">
                    {s.label}
                  </span>
                  <PriorityBadge priority={s.priority} />
                </div>
                {s.hint && (
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                    {s.hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional */}
      {optional.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Lower priority
          </p>
          <div className="flex flex-wrap gap-1.5">
            {optional.map((s) => (
              <span
                key={s.sectionKey}
                className="text-[10px] text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5"
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* General suggestions */}
      {guidance.suggestions.length > 0 && (
        <div className="border-t border-slate-200 pt-2.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            General guidance
          </p>
          <ul className="space-y-1">
            {guidance.suggestions.map((s, i) => (
              <li
                key={i}
                className="text-[10px] text-slate-500 leading-snug flex gap-1.5"
              >
                <span className="text-slate-300 flex-shrink-0 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings / disclaimers */}
      {guidance.warnings.length > 0 && (
        <div className="border-t border-amber-100 pt-2.5 space-y-1">
          {guidance.warnings.map((w, i) => (
            <p
              key={i}
              className="text-[10px] text-amber-600 leading-snug italic"
            >
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
