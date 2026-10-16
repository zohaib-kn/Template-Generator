"use client";

import React, { useMemo, useState } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { useStudentAcademicProfile } from "../context/AcademicProfileContext";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import { HinglishRewriteControl } from "@/components/ui/HinglishRewriteControl";
import { buildAcademicProfileSummary } from "../utils/buildAcademicProfileSummary";

export function AboutMeForm() {
  const { data, setAboutMe } = useDocumentState();
  const { selectedStudentData, applicationTarget } = useGlobalStudent();
  const {
    primaryDegree,
    sourceCatalog,
    targetCourse,
    isTransition,
    targetCatalog,
  } = useStudentAcademicProfile();

  const [showTemplateWhenFilled, setShowTemplateWhenFilled] = useState(false);
  const currentText = data.aboutMe ?? "";

  const suggestedTemplate = useMemo(() => {
    const s = selectedStudentData?.student;
    const pd = s?.personalDetails;
    const passport = s?.passportInfo;
    const mailing = s?.mailingAddress;
    const permanent = s?.permanentAddress;

    // 1. Student Name
    const fullName =
      data.personal?.fullName ||
      [pd?.firstName, pd?.middleName, pd?.lastName].filter(Boolean).join(" ") ||
      "The applicant";

    // 2. City & Country
    const city =
      passport?.cityOfBirth ||
      mailing?.city ||
      permanent?.city ||
      data.personal?.placeOfBirth?.split(",")[0]?.trim() ||
      data.personal?.address?.split(",")[0]?.trim() ||
      undefined;

    const country =
      passport?.countryOfBirth ||
      (data.personal?.nationality === "Indian" ? "India" : data.personal?.nationality) ||
      "India";

    // 3. Parents / Family details
    const parents =
      (s?.parents as {
        father?: { name?: string; occupation?: string; department?: string; employmentType?: string };
        mother?: { name?: string; occupation?: string; department?: string; employmentType?: string };
      }) || undefined;

    // 4. Target course & degree level
    const targetCourseName = applicationTarget?.intendedCourse || targetCourse || "";
    const degreeLevel =
      applicationTarget?.degreeLevel ||
      (s?.courseDetails as { preferredCourseType?: string })?.preferredCourseType ||
      (s?.masterInfo as { targetProgram?: { degreeLevel?: string } })?.targetProgram?.degreeLevel ||
      "Bachelor's";

    // 5. Strengths
    const strengths = isTransition
      ? [...sourceCatalog.skills.transferable, ...sourceCatalog.skills.domain]
      : [...sourceCatalog.skills.domain, ...sourceCatalog.skills.transferable];

    return buildAcademicProfileSummary({
      studentName: fullName,
      city,
      country,
      parents,
      familyProfile: s?.familyProfile as Record<string, unknown> | undefined,
      primaryDegree,
      domainName: sourceCatalog.displayName,
      strengths,
      targetCourse: targetCourseName,
      degreeLevel,
      targetDomainName: targetCatalog.displayName,
      destinationCountry: applicationTarget?.destinationCountry,
    });
  }, [
    data.personal,
    selectedStudentData,
    applicationTarget,
    primaryDegree,
    sourceCatalog,
    targetCourse,
    isTransition,
    targetCatalog,
  ]);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="about-me-text" className="mb-0">
            Brief introduction about yourself
          </Label>
          <button
            type="button"
            onClick={() => setAboutMe(suggestedTemplate)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md transition-all border text-indigo-700 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100/90 border-indigo-200/90 shadow-2xs cursor-pointer active:scale-98"
            title="Auto-generate a complete academic profile with student's background, family values, and target degree"
          >
            <span>✨</span>
            <span>Generate Academic Profile</span>
          </button>
        </div>

        <Textarea
          id="about-me-text"
          rows={10}
          className="min-h-[220px] resize-y"
          value={currentText}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="Write a short paragraph about your background, goals, and what makes you stand out…"
        />

        <div className="flex items-center justify-between mt-1.5 gap-2">
          <HinglishRewriteControl
            value={currentText}
            onApply={(newText) => setAboutMe(newText)}
            fieldName="aboutMe"
          />
          <p className="text-[11px] text-slate-400 text-right shrink-0">
            {currentText.length} chars
          </p>
        </div>
      </div>

      {/* ── Degree & Profile Opening Template ── */}
      {!currentText ? (
        <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700">
              Suggested Profile Summary ({primaryDegree}):
            </span>
            <button
              type="button"
              onClick={() => setAboutMe(suggestedTemplate)}
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
            >
              Use Template ↵
            </button>
          </div>
          <p className="text-xs text-slate-600 italic leading-relaxed">
            "{suggestedTemplate}"
          </p>
        </div>
      ) : (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowTemplateWhenFilled((v) => !v)}
            className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
          >
            {showTemplateWhenFilled ? "Hide Suggested Template" : "View AI-Suggested Profile Template"}
          </button>

          {showTemplateWhenFilled && (
            <div className="mt-2 p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700">
                  AI-Suggested Template:
                </span>
                <button
                  type="button"
                  onClick={() => setAboutMe(suggestedTemplate)}
                  className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                >
                  Replace with Template ↵
                </button>
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "{suggestedTemplate}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
