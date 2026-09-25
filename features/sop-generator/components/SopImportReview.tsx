/**
 * features/sop-generator/components/SopImportReview.tsx
 *
 * Interactive SOP Import Review Workstation.
 *
 * Capabilities:
 * 1. Overview of 16 template sections and paragraph assignments.
 * 2. Inline editing of extracted paragraph text.
 * 3. Re-assigning paragraphs between sections.
 * 4. Handling ambiguous matches and unmapped narrative blocks.
 * 5. Side-by-side CRM conflict resolution.
 * 6. Committing confirmed content and approved facts to SopWorkspace.
 */

"use client";

import React, { useState } from "react";
import type {
  SopImportResult,
  SopSectionSummary,
  SopParagraphBlock,
  SopCrmConflictItem,
} from "../types/import";
import { italyTypeDCoverLetter } from "../templates/italy-type-d-cover-letter";

interface SopImportReviewProps {
  importResult: SopImportResult;
  onApply: (
    confirmedSectionContents: Record<string, string>,
    approvedFacts: Record<string, string>
  ) => void;
  onCancel: () => void;
}

export function SopImportReview({
  importResult,
  onApply,
  onCancel,
}: SopImportReviewProps) {
  const [sectionContents, setSectionContents] = useState<Record<string, string>>(
    () => ({ ...importResult.sectionContents })
  );

  const [sectionsSummary, setSectionsSummary] = useState<SopSectionSummary[]>(
    () => [...importResult.sectionsSummary]
  );

  const [ambiguousItems, setAmbiguousItems] = useState<SopParagraphBlock[]>(
    () => [...importResult.ambiguousItems]
  );

  const [unmappedParagraphs, setUnmappedParagraphs] = useState<SopParagraphBlock[]>(
    () => [...importResult.unmappedParagraphs]
  );

  const [crmConflicts, setCrmConflicts] = useState<SopCrmConflictItem[]>(
    () => [...importResult.crmConflicts]
  );

  const [activeTab, setActiveTab] = useState<"overview" | "sections" | "ambiguous" | "unmapped" | "conflicts">(
    importResult.crmConflicts.length > 0 ? "conflicts" : "overview"
  );

  const [selectedSectionId, setSelectedSectionId] = useState<string>("student-introduction");
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const allTemplateSections = italyTypeDCoverLetter.sections;

  // Re-calculate sectionContents string from paragraphs
  function rebuildSectionContent(sectionId: string, updatedSummaries: SopSectionSummary[]) {
    const summary = updatedSummaries.find((s) => s.sectionId === sectionId);
    if (!summary || summary.paragraphs.length === 0) {
      setSectionContents((prev) => {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
    } else {
      const text = summary.paragraphs.map((p) => p.originalText).join("\n\n");
      setSectionContents((prev) => ({
        ...prev,
        [sectionId]: text,
      }));
    }
  }

  // Handle re-assigning a paragraph to a different section
  function handleReassignParagraph(
    paragraph: SopParagraphBlock,
    targetSectionId: string
  ) {
    if (paragraph.assignedSectionId === targetSectionId) return;

    const sourceSectionId = paragraph.assignedSectionId;
    const updatedParagraph: SopParagraphBlock = {
      ...paragraph,
      assignedSectionId: targetSectionId,
      isAmbiguous: false,
    };

    const nextSummaries = sectionsSummary.map((sec) => {
      let nextParas = [...sec.paragraphs];

      // Remove from source if it was in a template section
      if (sec.sectionId === sourceSectionId) {
        nextParas = nextParas.filter((p) => p.id !== paragraph.id);
      }

      // Add to target if this is target
      if (sec.sectionId === targetSectionId) {
        nextParas = [...nextParas, updatedParagraph];
      }

      const count = nextParas.length;
      const hasAmbiguous = nextParas.some((p) => p.isAmbiguous);
      const status: SopSectionSummary["status"] =
        count === 0 ? "NOT_FOUND" : hasAmbiguous ? "AMBIGUOUS" : "DETECTED";

      return {
        ...sec,
        paragraphCount: count,
        status,
        paragraphs: nextParas,
      };
    });

    // Also update unmapped list if moving out of or into unmapped
    if (sourceSectionId === "unmapped") {
      setUnmappedParagraphs((prev) => prev.filter((p) => p.id !== paragraph.id));
    }
    if (targetSectionId === "unmapped") {
      setUnmappedParagraphs((prev) => [...prev, updatedParagraph]);
    }

    // Remove from ambiguous list
    setAmbiguousItems((prev) => prev.filter((p) => p.id !== paragraph.id));

    setSectionsSummary(nextSummaries);
    rebuildSectionContent(sourceSectionId, nextSummaries);
    rebuildSectionContent(targetSectionId, nextSummaries);
  }

  // Start inline editing of paragraph text
  function handleStartEditParagraph(p: SopParagraphBlock) {
    setEditingParagraphId(p.id);
    setEditingText(p.originalText);
  }

  // Save inline editing
  function handleSaveEditParagraph(paragraphId: string) {
    const nextSummaries = sectionsSummary.map((sec) => {
      const nextParas = sec.paragraphs.map((p) => {
        if (p.id === paragraphId) {
          return { ...p, originalText: editingText };
        }
        return p;
      });
      return {
        ...sec,
        paragraphs: nextParas,
      };
    });

    setSectionsSummary(nextSummaries);

    // Also update in ambiguous or unmapped lists if present
    setAmbiguousItems((prev) =>
      prev.map((p) => (p.id === paragraphId ? { ...p, originalText: editingText } : p))
    );
    setUnmappedParagraphs((prev) =>
      prev.map((p) => (p.id === paragraphId ? { ...p, originalText: editingText } : p))
    );

    // Rebuild contents for all sections
    const nextContents: Record<string, string> = {};
    for (const sec of nextSummaries) {
      if (sec.paragraphs.length > 0) {
        nextContents[sec.sectionId] = sec.paragraphs.map((p) => p.originalText).join("\n\n");
      }
    }
    setSectionContents(nextContents);
    setEditingParagraphId(null);
  }

  // CRM Conflict toggle handler
  function handleConflictToggle(
    field: string,
    resolution: "USE_CRM" | "USE_UPLOADED" | "CUSTOM",
    customVal?: string
  ) {
    setCrmConflicts((prev) =>
      prev.map((c) =>
        c.field === field ? { ...c, resolution, customValue: customVal } : c
      )
    );
  }

  // Handle final apply
  function handleApply() {
    // 1. Start with all candidate facts extracted from the document by AI
    const approvedFacts: Record<string, string> = {
      fullName: importResult.studentName || importResult.extractedFacts?.fullName || "",
      ...(importResult.extractedFacts || {}),
    };

    // 2. Overlay resolved CRM conflict choices if conflicts exist
    for (const conflict of crmConflicts) {
      if (conflict.resolution === "USE_CRM") {
        approvedFacts[conflict.field] = conflict.crmValue;
      } else if (conflict.resolution === "USE_UPLOADED") {
        approvedFacts[conflict.field] = conflict.uploadedValue;
      } else if (conflict.resolution === "CUSTOM" && conflict.customValue) {
        approvedFacts[conflict.field] = conflict.customValue;
      }
    }

    onApply(sectionContents, approvedFacts);
  }

  const detectedCount = sectionsSummary.filter((s) => s.status === "DETECTED" || s.status === "AMBIGUOUS" || s.status === "CONFLICT").length;
  const missingCount = sectionsSummary.filter((s) => s.status === "NOT_FOUND").length;

  return (
    <div className="flex flex-col h-[85vh] max-h-[750px] bg-white text-slate-800">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Review Imported Statement of Purpose
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              {importResult.fileName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Candidate: <strong className="text-slate-700">{importResult.studentName}</strong> ·{" "}
            {detectedCount} sections matched, {missingCount} using template default, {crmConflicts.length} conflicts
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* ── Sub Navigation Tabs ──────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white text-xs select-none">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "overview"
              ? "border-[#096491] text-[#096491]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>📋</span>
          <span>Section Overview</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px]">
            {detectedCount}/16
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sections")}
          className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "sections"
              ? "border-[#096491] text-[#096491]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>✍️</span>
          <span>Detailed Paragraph Editor</span>
        </button>

        {ambiguousItems.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("ambiguous")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ambiguous"
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>⚠️</span>
            <span>Ambiguous Matches</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {ambiguousItems.length}
            </span>
          </button>
        )}

        {unmappedParagraphs.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("unmapped")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "unmapped"
                ? "border-purple-500 text-purple-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🧩</span>
            <span>Unmapped Text</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
              {unmappedParagraphs.length}
            </span>
          </button>
        )}

        {crmConflicts.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("conflicts")}
            className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "conflicts"
                ? "border-rose-500 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>⚡</span>
            <span>CRM Conflicts</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold animate-pulse">
              {crmConflicts.length}
            </span>
          </button>
        )}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
        {/* TAB 1: SECTION OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3.5 text-xs text-sky-900 leading-relaxed flex items-center gap-3">
              <span className="text-xl">ℹ️</span>
              <p>
                <strong>Text Preservation Guarantee:</strong> The paragraphs below represent verbatim content extracted from your uploaded file. You can review mappings, adjust section assignments, or edit wording before loading into the SOP workspace.
              </p>
            </div>

            {/* Extracted Candidate Identity Preview */}
            {(importResult.studentName || importResult.extractedFacts?.targetUniversity || importResult.extractedFacts?.institution) && (
              <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>👤</span>
                    <span>Detected Candidate Identity</span>
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Extracted from document</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Candidate Name</span>
                    <strong className="text-slate-800">{importResult.studentName || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Target University</span>
                    <strong className="text-slate-800">{importResult.extractedFacts?.targetUniversity || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Target Course</span>
                    <strong className="text-slate-800">{importResult.extractedFacts?.targetCourse || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Previous College / GPA</span>
                    <strong className="text-slate-800">
                      {[importResult.extractedFacts?.institution, importResult.extractedFacts?.percentage].filter(Boolean).join(" · ") || "Not specified"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sectionsSummary.map((summary) => {
                const isDetected = summary.status === "DETECTED";
                const isAmbiguous = summary.status === "AMBIGUOUS";
                const isConflict = summary.status === "CONFLICT";
                const isNotFound = summary.status === "NOT_FOUND";

                return (
                  <div
                    key={summary.sectionId}
                    className={`p-4 rounded-xl border transition-all ${
                      isConflict
                        ? "bg-rose-50/40 border-rose-200"
                        : isAmbiguous
                        ? "bg-amber-50/40 border-amber-200"
                        : isDetected
                        ? "bg-white border-slate-200 shadow-2xs"
                        : "bg-slate-100/60 border-slate-200/60 opacity-85"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isConflict ? (
                          <span className="text-rose-600 font-bold text-sm">⚠️</span>
                        ) : isAmbiguous ? (
                          <span className="text-amber-500 font-bold text-sm">⚠️</span>
                        ) : isDetected ? (
                          <span className="text-emerald-600 font-bold text-sm">✓</span>
                        ) : (
                          <span className="text-slate-400 font-bold text-sm">○</span>
                        )}
                        <h4 className="text-xs font-bold text-slate-800 truncate">
                          {summary.title}
                        </h4>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                          isConflict
                            ? "bg-rose-100 text-rose-800"
                            : isAmbiguous
                            ? "bg-amber-100 text-amber-800"
                            : isDetected
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isNotFound ? "Template Default" : `${summary.paragraphCount} paragraph${summary.paragraphCount > 1 ? "s" : ""}`}
                      </span>
                    </div>

                    {summary.paragraphs.length > 0 ? (
                      <div className="mt-2.5 text-xs text-slate-600 line-clamp-3 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 font-sans">
                        {summary.paragraphs.map((p) => p.originalText).join("\n\n")}
                      </div>
                    ) : (
                      <p className="mt-2 text-[11px] text-slate-400 italic">
                        No uploaded paragraph mapped. Workspace will initialize with standard template text.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED PARAGRAPH EDITOR */}
        {activeTab === "sections" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Left: Section Selector */}
            <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-200 h-[480px] overflow-y-auto">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Template Sections
              </p>
              {sectionsSummary.map((s) => (
                <button
                  key={s.sectionId}
                  type="button"
                  onClick={() => setSelectedSectionId(s.sectionId)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    selectedSectionId === s.sectionId
                      ? "bg-[#096491] text-white shadow-xs"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedSectionId === s.sectionId
                        ? "bg-white/20 text-white"
                        : s.paragraphCount > 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.paragraphCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Right: Paragraphs in selected section */}
            <div className="md:col-span-2 space-y-4">
              {(() => {
                const currentSec = sectionsSummary.find((s) => s.sectionId === selectedSectionId);
                if (!currentSec) return null;

                return (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 min-h-[480px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{currentSec.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {currentSec.paragraphs.length} paragraph(s) mapped from uploaded document
                        </p>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                          currentSec.paragraphs.length > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {currentSec.paragraphs.length > 0 ? "Mapped" : "Template Default"}
                      </span>
                    </div>

                    {currentSec.paragraphs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <p className="text-sm">No uploaded paragraphs assigned to this section.</p>
                        <p className="text-xs text-slate-400">
                          Standard template wording will be loaded in the workspace.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentSec.paragraphs.map((p, pIndex) => {
                          const isEditingThis = editingParagraphId === p.id;

                          return (
                            <div
                              key={p.id}
                              className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                  Paragraph #{pIndex + 1}
                                </span>

                                <div className="flex items-center gap-2">
                                  {/* Re-assign dropdown */}
                                  <select
                                    value={p.assignedSectionId}
                                    onChange={(e) => handleReassignParagraph(p, e.target.value)}
                                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium cursor-pointer shadow-2xs"
                                  >
                                    <option value="unmapped">Move to Unmapped</option>
                                    {allTemplateSections.map((sec) => (
                                      <option key={sec.id} value={sec.id}>
                                        {sec.title}
                                      </option>
                                    ))}
                                  </select>

                                  {!isEditingThis && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditParagraph(p)}
                                      className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isEditingThis ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    rows={5}
                                    className="w-full text-xs font-sans p-3 rounded-lg border border-[#096491] bg-white focus:outline-none focus:ring-1 focus:ring-[#096491]"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingParagraphId(null)}
                                      className="text-xs px-3 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditParagraph(p.id)}
                                      className="text-xs px-3 py-1 bg-slate-900 text-white rounded-lg font-medium cursor-pointer"
                                    >
                                      Save Text
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                                  {p.originalText}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 3: AMBIGUOUS MATCHES */}
        {activeTab === "ambiguous" && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
              <strong className="font-semibold text-amber-950">Ambiguous Content Flagged:</strong> These paragraphs could belong to multiple sections (for example, academic motivation vs why course). Please verify where they should be placed.
            </div>

            {ambiguousItems.map((p) => (
              <div key={p.id} className="p-4 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-bold">⚠️</span>
                    <span className="text-xs font-bold text-slate-800">
                      Currently Assigned:{" "}
                      <strong className="text-[#096491]">
                        {allTemplateSections.find((s) => s.id === p.assignedSectionId)?.title || p.assignedSectionId}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">Reassign to:</span>
                    <select
                      value={p.assignedSectionId}
                      onChange={(e) => handleReassignParagraph(p, e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium cursor-pointer"
                    >
                      {allTemplateSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.title}
                        </option>
                      ))}
                      <option value="unmapped">Discard / Unmapped</option>
                    </select>
                  </div>
                </div>

                {p.reason && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                    Reason: {p.reason}
                  </p>
                )}

                <p className="text-xs text-slate-800 font-sans leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {p.originalText}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: UNMAPPED CONTENT */}
        {activeTab === "unmapped" && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 leading-relaxed">
              <strong className="font-semibold text-purple-950">Unmapped Paragraphs:</strong> These blocks from the uploaded document did not match any standard template section. You can assign them to a section or leave them unmapped.
            </div>

            {unmappedParagraphs.map((p) => (
              <div key={p.id} className="p-4 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Unmapped Block</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">Assign to Section:</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleReassignParagraph(p, e.target.value);
                      }}
                      className="text-xs bg-white border border-purple-300 rounded-lg px-2.5 py-1 text-purple-900 font-medium cursor-pointer"
                    >
                      <option value="" disabled>Select section...</option>
                      {allTemplateSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-slate-800 font-sans leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {p.originalText}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: CRM CONFLICTS */}
        {activeTab === "conflicts" && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 leading-relaxed flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <strong className="font-semibold text-rose-950">Factual Discrepancy Detected:</strong> The uploaded document contains values that differ from the student profile in CRM. Choose which value to adopt.
              </div>
            </div>

            {crmConflicts.map((c) => (
              <div key={c.field} className="p-5 bg-white rounded-2xl border border-rose-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-bold text-slate-900">{c.label}</h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    Conflict
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Verified CRM Record
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{c.crmValue}</p>
                  </div>

                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-1">
                    <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                      Uploaded SOP Claim
                    </span>
                    <p className="font-bold text-sky-950 text-sm">{c.uploadedValue}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleConflictToggle(c.field, "USE_CRM")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      c.resolution === "USE_CRM"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Use CRM ({c.crmValue})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConflictToggle(c.field, "USE_UPLOADED")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      c.resolution === "USE_UPLOADED"
                        ? "bg-[#096491] text-white border-[#096491] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Use Uploaded ({c.uploadedValue})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl bg-[#096491] hover:bg-[#074f74] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>✓</span>
            <span>Apply to SOP Generator</span>
          </button>
        </div>
      </div>
    </div>
  );
}
