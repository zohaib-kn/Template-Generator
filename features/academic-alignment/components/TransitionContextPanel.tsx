"use client";

/**
 * features/academic-alignment/components/TransitionContextPanel.tsx
 *
 * Interactive second-stage counsellor workflow panel for evaluating,
 * selecting, and confirming bridging evidence for an intentional academic transition.
 *
 * Live-scores selected evidence against the target academic domain using
 * weighted relevance criteria (target score >= 3 pts AND reason >= 30 chars).
 */

import React, { useState, useMemo } from "react";
import type {
  AcademicAlignmentResult,
  TransitionContext,
} from "@/services/academicAlignment/types";
import {
  evaluateSingleItem,
  REQUIRED_EVIDENCE_SCORE,
  MIN_REASON_LENGTH,
} from "@/services/academicAlignment/evidenceEvaluator";
import { getTransitionRationaleTemplate } from "@/features/sop-generator/guidance/sopAcademicCatalog";
import { HinglishRewriteControl } from "@/components/ui/HinglishRewriteControl";

interface TransitionContextPanelProps {
  result: AcademicAlignmentResult;
  initialContext?: TransitionContext | null;
  availableCertifications?: Array<{ id: string; name: string; issuer?: string }>;
  availableProjects?: Array<{ id: string; title: string; description?: string }>;
  availableSkills?: Array<{ id: string; name: string }>;
  availableInternships?: Array<{ id: string; role: string; organization?: string; description?: string }>;
  onSave: (context: TransitionContext) => Promise<boolean> | void;
  onCancel?: () => void;
  isLoading?: boolean;
  layoutMode?: "stacked" | "columns";
}

export function TransitionContextPanel({
  result,
  initialContext,
  availableCertifications = [],
  availableProjects = [],
  availableSkills = [],
  availableInternships = [],
  onSave,
  onCancel,
  isLoading = false,
  layoutMode = "stacked",
}: TransitionContextPanelProps) {
  const [reason, setReason] = useState<string>(initialContext?.reason || "");
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>(
    initialContext?.selectedCertifications || []
  );
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    initialContext?.selectedProjects || []
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    initialContext?.selectedSkills || []
  );
  const [selectedInternships, setSelectedInternships] = useState<string[]>(
    initialContext?.selectedInternships || []
  );
  const [counsellorNote, setCounsellorNote] = useState<string>(
    initialContext?.counsellorNote || ""
  );
  const [attestWithoutResumeItems, setAttestWithoutResumeItems] = useState<boolean>(() => {
    return Boolean(initialContext?.counsellorNote?.includes("[Counsellor Attestation Verified]"));
  });

  const targetDomain = result.targetField.domain;

  // -------------------------------------------------------------------------
  // Item Evaluation & Live Scoring
  // -------------------------------------------------------------------------
  const evaluatedCertifications = useMemo(() => {
    return availableCertifications.map((c) => ({
      item: c,
      eval: evaluateSingleItem(c.id, c.name, "CERTIFICATION", targetDomain, c.issuer),
    }));
  }, [availableCertifications, targetDomain]);

  const evaluatedProjects = useMemo(() => {
    return availableProjects.map((p) => ({
      item: p,
      eval: evaluateSingleItem(p.id, p.title, "PROJECT", targetDomain, p.description),
    }));
  }, [availableProjects, targetDomain]);

  const evaluatedSkills = useMemo(() => {
    return availableSkills.map((s) => ({
      item: s,
      eval: evaluateSingleItem(s.id, s.name, "SKILL", targetDomain),
    }));
  }, [availableSkills, targetDomain]);

  const evaluatedInternships = useMemo(() => {
    return availableInternships.map((i) => ({
      item: i,
      eval: evaluateSingleItem(
        i.id,
        i.role,
        "INTERNSHIP",
        targetDomain,
        `${i.organization || ""} ${i.description || ""}`
      ),
    }));
  }, [availableInternships, targetDomain]);

  // Total Score of currently checked items
  const currentEvidenceScore = useMemo(() => {
    let score = 0;
    for (const ec of evaluatedCertifications) {
      if (selectedCertifications.includes(ec.item.id)) score += ec.eval.relevanceScore;
    }
    for (const ep of evaluatedProjects) {
      if (selectedProjects.includes(ep.item.id)) score += ep.eval.relevanceScore;
    }
    for (const es of evaluatedSkills) {
      if (selectedSkills.includes(es.item.id)) score += es.eval.relevanceScore;
    }
    for (const ei of evaluatedInternships) {
      if (selectedInternships.includes(ei.item.id)) score += ei.eval.relevanceScore;
    }
    if (attestWithoutResumeItems) {
      score = Math.max(score, REQUIRED_EVIDENCE_SCORE);
    }
    return score;
  }, [
    evaluatedCertifications,
    evaluatedProjects,
    evaluatedSkills,
    evaluatedInternships,
    selectedCertifications,
    selectedProjects,
    selectedSkills,
    selectedInternships,
    attestWithoutResumeItems,
  ]);

  const cleanReason = reason.trim();
  const isReasonValid = cleanReason.length >= MIN_REASON_LENGTH;
  const isScoreSufficient = currentEvidenceScore >= REQUIRED_EVIDENCE_SCORE;
  const canSubmit = isReasonValid && isScoreSufficient && !isLoading;

  const suggestedTemplate = useMemo(() => {
    const selectedInternshipTitles = availableInternships
      .filter((i) => selectedInternships.includes(i.id))
      .map((i) => i.role);
    const selectedCertTitles = availableCertifications
      .filter((c) => selectedCertifications.includes(c.id))
      .map((c) => c.name);

    const highlights = [...selectedInternshipTitles, ...selectedCertTitles].slice(0, 2).join(" and ");

    return getTransitionRationaleTemplate(
      result.sourceField.domain,
      result.targetField.domain,
      result.sourceField.rawSource || "undergraduate degree",
      result.targetField.rawSource || "postgraduate program",
      highlights
    );
  }, [
    result.sourceField,
    result.targetField,
    availableInternships,
    availableCertifications,
    selectedInternships,
    selectedCertifications,
  ]);

  const toggleSelection = (
    id: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(id)) {
      setter(list.filter((x) => x !== id));
    } else {
      setter([...list, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const finalCounsellorNote = attestWithoutResumeItems
      ? `[Counsellor Attestation Verified] ${counsellorNote.trim()}`.trim()
      : counsellorNote.trim() || undefined;

    onSave({
      reason: cleanReason,
      selectedCertifications,
      selectedProjects,
      selectedSkills,
      selectedInternships,
      counsellorNote: finalCounsellorNote,
    });
  };

  return (
    <form
      id="transition-context-form"
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-5"
    >
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              Support the Student&apos;s Field Change
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Select the student&apos;s projects, certificates, or job experience to prove to universities and embassies that they are ready.
            </p>
          </div>
          <div className="self-start sm:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              New Field: {targetDomain.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Layout: Stacked (Default for Drawers) vs Columns (Wide Dialogs) */}
      {layoutMode === "stacked" ? (
        <div className="space-y-5">
          {/* Live Readiness Meter */}
          <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200/90 space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Profile Strength Score
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-3xl font-black ${isScoreSufficient ? "text-emerald-600" : "text-amber-600"}`}>
                    {currentEvidenceScore}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">/ {REQUIRED_EVIDENCE_SCORE} pts needed</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isScoreSufficient ? "bg-emerald-100/80 text-emerald-800 border border-emerald-200" : "bg-amber-100/80 text-amber-800 border border-amber-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isScoreSufficient ? "bg-emerald-600" : "bg-amber-500"}`} />
                  {isScoreSufficient ? "✓ Proof sufficient" : "Needs 3 points"}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isReasonValid ? "bg-emerald-100/80 text-emerald-800 border border-emerald-200" : "bg-amber-100/80 text-amber-800 border border-amber-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isReasonValid ? "bg-emerald-600" : "bg-amber-500"}`} />
                  {isReasonValid ? "✓ Rationale ready" : "Min. 30 chars"}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${isScoreSufficient ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, (currentEvidenceScore / REQUIRED_EVIDENCE_SCORE) * 100)}%` }}
              />
            </div>
          </div>

          {/* Counsellor Justification Textarea */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800">
                Why is the student switching fields? <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] font-mono whitespace-nowrap shrink-0 ${cleanReason.length >= MIN_REASON_LENGTH ? "text-emerald-600 font-bold" : "text-slate-500"}`}>
                {cleanReason.length} / {MIN_REASON_LENGTH} characters min
              </span>
            </div>

            {/* Pre-Formulated Rationale Auto-Template */}
            {!cleanReason && (
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/80 space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-indigo-900">
                    Pre-written reason (Ready to use):
                  </span>
                  <button
                    type="button"
                    onClick={() => setReason(suggestedTemplate)}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2.5 py-1 rounded-md transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    Use This Text ↵
                  </button>
                </div>
                <p className="text-[11px] text-slate-700 italic leading-relaxed break-words">
                  &ldquo;{suggestedTemplate}&rdquo;
                </p>
              </div>
            )}

            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the student is changing fields (e.g. Candidate completed 1 year of programming self-study and completed online certifications)..."
              className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 bg-white p-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed resize-none min-h-[105px]"
            />
            <HinglishRewriteControl
              value={reason}
              onApply={(newText) => setReason(newText)}
              fieldName="counsellor_transition_rationale"
              label="Convert Rationale to Natural English"
            />
          </div>

          {/* Evidence Checklist */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pick Supporting Proof from Student Profile
            </h4>

            {/* Certifications */}
            {evaluatedCertifications.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Certificates & Online Courses</span>
                <div className="flex flex-col gap-2">
                  {evaluatedCertifications.map(({ item, eval: e }) => {
                    const checked = selectedCertifications.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                          checked
                            ? "border-indigo-500 bg-indigo-50/60 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelection(item.id, selectedCertifications, setSelectedCertifications)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-slate-900 block break-words leading-snug">
                            {item.name}
                          </span>
                          {item.issuer && (
                            <span className="text-[11px] text-slate-500 block mt-0.5 break-words">
                              {item.issuer}
                            </span>
                          )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md ${
                          e.relevanceScore >= 3
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : e.relevanceScore >= 2
                            ? "bg-sky-100 text-sky-800 border border-sky-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          +{e.relevanceScore} pts
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Projects */}
            {evaluatedProjects.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">College & Personal Projects</span>
                <div className="flex flex-col gap-2">
                  {evaluatedProjects.map(({ item, eval: e }) => {
                    const checked = selectedProjects.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                          checked
                            ? "border-indigo-500 bg-indigo-50/60 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelection(item.id, selectedProjects, setSelectedProjects)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-slate-900 block break-words leading-snug">
                            {item.title}
                          </span>
                          {item.description && (
                            <span className="text-[11px] text-slate-500 block mt-1 leading-normal break-words">
                              {item.description}
                            </span>
                          )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md ${
                          e.relevanceScore >= 3
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : e.relevanceScore >= 2
                            ? "bg-sky-100 text-sky-800 border border-sky-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          +{e.relevanceScore} pts
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skills */}
            {evaluatedSkills.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Key Skills</span>
                <div className="flex flex-wrap gap-2">
                  {evaluatedSkills.map(({ item, eval: e }) => {
                    const checked = selectedSkills.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => toggleSelection(item.id, selectedSkills, setSelectedSkills)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          checked
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="break-words">{item.name}</span>
                        <span className={`text-[10px] font-bold rounded px-1.5 py-0.2 ${checked ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-600"}`}>
                          +{e.relevanceScore}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Internships */}
            {evaluatedInternships.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Work Experience & Internships</span>
                <div className="flex flex-col gap-2">
                  {evaluatedInternships.map(({ item, eval: e }) => {
                    const checked = selectedInternships.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                          checked
                            ? "border-indigo-500 bg-indigo-50/60 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelection(item.id, selectedInternships, setSelectedInternships)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-slate-900 block break-words leading-snug">
                            {item.role}
                          </span>
                          {item.organization && (
                            <span className="text-[11px] text-slate-500 block mt-0.5 break-words">
                              {item.organization}
                            </span>
                          )}
                          {item.description && (
                            <span className="text-[11px] text-slate-500 block mt-1 leading-normal break-words">
                              {item.description}
                            </span>
                          )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md ${
                          e.relevanceScore >= 3
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : e.relevanceScore >= 2
                            ? "bg-sky-100 text-sky-800 border border-sky-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          +{e.relevanceScore} pts
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If no evidence items exist */}
            {evaluatedCertifications.length === 0 &&
              evaluatedProjects.length === 0 &&
              evaluatedSkills.length === 0 &&
              evaluatedInternships.length === 0 && (
                <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 leading-relaxed">
                  No certificates, projects, or work experience found in student records yet. Add them in the Resume Builder or check the Counsellor Readiness Attestation below.
                </div>
              )}

            {/* Counsellor Readiness Attestation */}
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={attestWithoutResumeItems}
                  onChange={(e) => setAttestWithoutResumeItems(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-amber-950 block">
                    Counsellor Readiness Attestation
                  </span>
                  <span className="text-[11px] text-amber-900 leading-relaxed block mt-0.5">
                    Check this if the student has completed foundational coursework, self-study, or career preparation not yet entered in their Resume profile.
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                  +3 pts
                </span>
              </label>
            </div>
          </div>

          {/* Counsellor Note (Optional) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-slate-700">
              Private Counsellor Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={counsellorNote}
              onChange={(e) => setCounsellorNote(e.target.value)}
              placeholder="e.g. Spoke with student/parent, student has completed independent coursework"
              className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-normal"
            />
          </div>

          {/* Reviewer Criteria & Sections Unlocked Accordion */}
          <details className="group rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-all text-xs">
            <summary className="flex items-center justify-between cursor-pointer select-none font-bold text-slate-700 hover:text-slate-900 list-none">
              <span className="flex items-center gap-2">
                <span>🏛️</span>
                <span>Reviewer Criteria & Unlocked Document Sections</span>
              </span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform text-xs">
                ▼
              </span>
            </summary>
            <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Reviewer Evaluation Criteria
                </span>
                <ul className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold shrink-0 mt-0.5">•</span>
                    <span><strong>Factual Motivation:</strong> Clear, logical explanation of why the student is transitioning streams.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold shrink-0 mt-0.5">•</span>
                    <span><strong>Bridging Proof:</strong> Relevant coursework, projects, certifications, or self-directed study in the target discipline.</span>
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 block flex items-center gap-1.5">
                  <span>🔓</span> Document Sections Unlocked Upon Save
                </span>
                <div className="space-y-1.5 text-[11px] text-emerald-900">
                  <div className="flex items-center justify-between gap-2">
                    <span>✓ Academic Motivation (Why This Course)</span>
                    <span className="font-semibold text-emerald-700 whitespace-nowrap shrink-0">AI Enabled</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>✓ Career & Future Academic Progression</span>
                    <span className="font-semibold text-emerald-700 whitespace-nowrap shrink-0">AI Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </details>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-slate-100">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3 px-5 text-xs font-bold rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                canSubmit
                  ? "bg-slate-900 hover:bg-black text-white focus:ring-slate-900 cursor-pointer shadow-sm active:scale-[0.99]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
              title={!canSubmit ? "Requires at least 3 points of supporting evidence and a 30-character explanation" : "Save and confirm field change"}
            >
              {isLoading ? "Saving..." : "Save & Confirm Field Change"}
            </button>
          </div>
        </div>
      ) : (
        /* Legacy Columns Mode (Only for Wide Modals If Specified) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (lg:col-span-5): Score Meter, Guidance & Safeguards */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Readiness Meter */}
            <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200/90 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Profile Strength Score
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className={`text-3xl font-black ${isScoreSufficient ? "text-emerald-600" : "text-amber-600"}`}>
                      {currentEvidenceScore}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ {REQUIRED_EVIDENCE_SCORE} pts needed</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-right shrink-0 text-xs">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isScoreSufficient ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <span className={`font-semibold ${isScoreSufficient ? "text-emerald-800" : "text-amber-800"}`}>
                      {isScoreSufficient ? "✓ Proof sufficient" : "Needs 3 points"}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isReasonValid ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <span className={`font-semibold ${isReasonValid ? "text-emerald-800" : "text-amber-800"}`}>
                      {isReasonValid ? "✓ Rationale ready" : "Min. 30 chars"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isScoreSufficient ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(100, (currentEvidenceScore / REQUIRED_EVIDENCE_SCORE) * 100)}%` }}
                />
              </div>
            </div>

            {/* Embassy & University Reviewer Evaluation Criteria */}
            <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100/90 space-y-2 text-xs shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block flex items-center gap-1.5">
                <span>🏛️</span> Reviewer Evaluation Criteria
              </span>
              <ul className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>Factual Motivation:</strong> Clear, logical explanation of why the student is transitioning streams.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>Bridging Proof:</strong> Relevant coursework, projects, certifications, or self-directed study in the target discipline.</span>
                </li>
              </ul>
            </div>

            {/* Section Unlocking Safeguards */}
            <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200/80 space-y-2 text-xs shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 block flex items-center gap-1.5">
                <span>🔓</span> Document Sections Unlocked Upon Save
              </span>
              <div className="space-y-1.5 text-[11px] text-emerald-900">
                <div className="flex items-center justify-between">
                  <span>✓ Academic Motivation (Why This Course)</span>
                  <span className="font-semibold text-emerald-700 whitespace-nowrap shrink-0">AI Enabled</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>✓ Career & Future Academic Progression</span>
                  <span className="font-semibold text-emerald-700 whitespace-nowrap shrink-0">AI Enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (lg:col-span-7): Rationale, Evidence Selection & Submit */}
          <div className="lg:col-span-7 space-y-5">
            {/* Counsellor Justification Textarea */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800">
                  Why is the student switching fields? <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[11px] font-mono whitespace-nowrap shrink-0 ${cleanReason.length >= MIN_REASON_LENGTH ? "text-emerald-600 font-bold" : "text-slate-500"}`}>
                  {cleanReason.length} / {MIN_REASON_LENGTH} characters min
                </span>
              </div>

              {/* Pre-Formulated Rationale Auto-Template */}
              {!cleanReason && (
                <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-indigo-900">
                      Pre-written reason (Ready to use):
                    </span>
                    <button
                      type="button"
                      onClick={() => setReason(suggestedTemplate)}
                      className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2.5 py-1 rounded-md transition-all shadow-2xs cursor-pointer shrink-0"
                    >
                      Use This Text ↵
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-700 italic leading-relaxed break-words">
                    &ldquo;{suggestedTemplate}&rdquo;
                  </p>
                </div>
              )}

              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why the student is changing fields (e.g. Candidate completed 1 year of programming self-study and completed online certifications)..."
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 bg-white p-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed resize-none min-h-[105px]"
              />
              <HinglishRewriteControl
                value={reason}
                onApply={(newText) => setReason(newText)}
                fieldName="counsellor_transition_rationale"
                label="Convert Rationale to Natural English"
              />
            </div>

            {/* Evidence Checklist Grid */}
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pick Supporting Proof from Student Profile
              </h4>

              {/* Certifications */}
              {evaluatedCertifications.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Certificates & Online Courses</span>
                  <div className="flex flex-col gap-2">
                    {evaluatedCertifications.map(({ item, eval: e }) => {
                      const checked = selectedCertifications.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                            checked
                              ? "border-indigo-500 bg-indigo-50/60 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelection(item.id, selectedCertifications, setSelectedCertifications)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-900 block break-words leading-snug">
                              {item.name}
                            </span>
                            {item.issuer && (
                              <span className="text-[11px] text-slate-500 block mt-0.5 break-words">
                                {item.issuer}
                              </span>
                            )}
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md ${
                            e.relevanceScore >= 3
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : e.relevanceScore >= 2
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            +{e.relevanceScore} pts
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Projects */}
              {evaluatedProjects.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">College & Personal Projects</span>
                  <div className="flex flex-col gap-2">
                    {evaluatedProjects.map(({ item, eval: e }) => {
                      const checked = selectedProjects.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                            checked
                              ? "border-indigo-500 bg-indigo-50/60 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelection(item.id, selectedProjects, setSelectedProjects)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-900 block break-words leading-snug">
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="text-[11px] text-slate-500 block mt-1 leading-normal break-words">
                                {item.description}
                              </span>
                            )}
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md ${
                            e.relevanceScore >= 3
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : e.relevanceScore >= 2
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            +{e.relevanceScore} pts
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skills */}
              {evaluatedSkills.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Key Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {evaluatedSkills.map(({ item, eval: e }) => {
                      const checked = selectedSkills.includes(item.id);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => toggleSelection(item.id, selectedSkills, setSelectedSkills)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            checked
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="break-words">{item.name}</span>
                          <span className={`text-[10px] font-bold rounded px-1.5 py-0.2 ${checked ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-600"}`}>
                            +{e.relevanceScore}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Internships */}
              {evaluatedInternships.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Work Experience & Internships</span>
                  <div className="flex flex-col gap-2">
                    {evaluatedInternships.map(({ item, eval: e }) => {
                      const checked = selectedInternships.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                            checked
                              ? "border-indigo-500 bg-indigo-50/60 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelection(item.id, selectedInternships, setSelectedInternships)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-900 block break-words leading-snug">
                              {item.role}
                            </span>
                            {item.organization && (
                              <span className="text-[11px] text-slate-500 block mt-0.5 break-words">
                                {item.organization}
                              </span>
                            )}
                            {item.description && (
                              <span className="text-[11px] text-slate-500 block mt-1 leading-normal break-words">
                                {item.description}
                              </span>
                            )}
                          </div>
                          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md ${
                            e.relevanceScore >= 3
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : e.relevanceScore >= 2
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            +{e.relevanceScore} pts
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* If no evidence items exist */}
              {evaluatedCertifications.length === 0 &&
                evaluatedProjects.length === 0 &&
                evaluatedSkills.length === 0 &&
                evaluatedInternships.length === 0 && (
                  <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 leading-relaxed">
                    No certificates, projects, or work experience found in student records yet. Add them in the Resume Builder or check the Counsellor Readiness Attestation below.
                  </div>
                )}

              {/* Counsellor Readiness Attestation */}
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/90 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={attestWithoutResumeItems}
                    onChange={(e) => setAttestWithoutResumeItems(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-amber-950 block">
                      Counsellor Readiness Attestation
                    </span>
                    <span className="text-[11px] text-amber-900 leading-relaxed block mt-0.5">
                      Check this if the student has completed foundational coursework, self-study, or career preparation not yet entered in their Resume profile.
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                    +3 pts
                  </span>
                </label>
              </div>
            </div>

            {/* Counsellor Note (Optional) */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700">
                Private Counsellor Note <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={counsellorNote}
                onChange={(e) => setCounsellorNote(e.target.value)}
                placeholder="e.g. Spoke with student/parent, student has completed independent coursework"
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-normal"
              />
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-slate-100">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className={`flex-1 sm:flex-initial sm:min-w-[220px] py-3 px-5 text-xs font-bold rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  canSubmit
                    ? "bg-slate-900 hover:bg-black text-white focus:ring-slate-900 cursor-pointer shadow-sm active:scale-[0.99]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                title={!canSubmit ? "Requires at least 3 points of supporting evidence and a 30-character explanation" : "Save and confirm field change"}
              >
                {isLoading ? "Saving..." : "Save & Confirm Field Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default TransitionContextPanel;
