"use client";

import React, { useMemo } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { useStudentAcademicProfile } from "../context/AcademicProfileContext";
import { HinglishRewriteControl } from "@/components/ui/HinglishRewriteControl";

export function AboutMeForm() {
  const { data, setAboutMe } = useDocumentState();
  const {
    primaryDegree,
    sourceCatalog,
    targetCourse,
    isTransition,
    targetCatalog,
  } = useStudentAcademicProfile();

  const currentText = data.aboutMe ?? "";

  const suggestedTemplate = useMemo(() => {
    if (isTransition && targetCourse) {
      return `Motivated graduate with a solid academic foundation in ${primaryDegree} (${sourceCatalog.displayName}), bringing strong skills in ${sourceCatalog.skills.transferable.slice(0, 2).join(" and ")}. Pursuing postgraduate specialization in ${targetCourse} (${targetCatalog.displayName}) to combine qualitative inquiry with advanced modern methodologies.`;
    }
    return `Dedicated graduate with an academic background in ${primaryDegree} (${sourceCatalog.displayName}), with demonstrated strengths in ${sourceCatalog.skills.domain.slice(0, 2).join(", ")}, and ${sourceCatalog.skills.transferable[0]}. Seeking to deepen academic expertise and research contribution in postgraduate studies.`;
  }, [primaryDegree, sourceCatalog, isTransition, targetCourse, targetCatalog]);

  // NOTE: Domain evaluation is intentionally excluded from this free-text biography field.
  // evaluateField() is designed for short structured entries (roles, skills, project titles).
  // Running it on AI-generated prose causes false DIVERGENT alerts when subjects like
  // "Social Science" are mentioned in passing. See: Approach 3 fix.

  return (
    <div className="space-y-4 pt-2">
      <div>
        <Label htmlFor="about-me-text">
          Brief introduction about yourself
        </Label>
        <Textarea
          id="about-me-text"
          rows={6}
          value={currentText}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="Write a short paragraph about your background, goals, and what makes you stand out…"
        />
        <HinglishRewriteControl
          value={currentText}
          onApply={(newText) => setAboutMe(newText)}
          fieldName="aboutMe"
        />
        <div className="flex items-center justify-between mt-1">
          <div />
          <p className="text-[11px] text-slate-400 text-right">
            {currentText.length} chars
          </p>
        </div>
      </div>

      {/* ── Degree-Tailored Profile Opening Template ── */}
      {!currentText && (
        <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700">
              Suggested Profile Summary ({primaryDegree}):
            </span>
            <button
              type="button"
              onClick={() => setAboutMe(suggestedTemplate)}
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors"
            >
              Use Template ↵
            </button>
          </div>
          <p className="text-xs text-slate-600 italic leading-relaxed">
            "{suggestedTemplate}"
          </p>
        </div>
      )}
    </div>
  );
}
