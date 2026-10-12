"use client";

import React, { useState, useEffect } from "react";
import type { DocumentData } from "@/types";
import { DEFAULT_MOVABLE_SECTION_ORDER } from "@/types";
import { RESUME_SECTION_METADATA } from "./ResumeSectionSidebar";
import { useDocumentState } from "../hooks/useDocumentState";

interface RearrangeSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DocumentData;
}

export function RearrangeSectionsModal({
  isOpen,
  onClose,
  data,
}: RearrangeSectionsModalProps) {
  const { setSectionOrder, resetSectionOrder } = useDocumentState();

  // Local draft state for ordering — not persisted until "Save Order" is clicked
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const custom = data.sectionOrder ?? DEFAULT_MOVABLE_SECTION_ORDER;
      const complete = [
        ...custom,
        ...DEFAULT_MOVABLE_SECTION_ORDER.filter((id) => !custom.includes(id)),
      ];
      setDraftOrder(complete);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [isOpen, data.sectionOrder]);

  if (!isOpen) return null;

  // Check which sections have content on the CV
  const activeSectionSet = new Set<string>();
  if (data.aboutMe?.trim()) activeSectionSet.add("aboutMe");
  if ((data.education ?? []).length > 0) activeSectionSet.add("education");
  if ((data.internships ?? []).length > 0) activeSectionSet.add("internships");
  if ((data.academicProjects ?? []).length > 0) activeSectionSet.add("academicProjects");
  if ((data.certifications ?? []).length > 0) activeSectionSet.add("certifications");
  if ((data.academicInterests ?? []).length > 0) activeSectionSet.add("academicInterests");
  if ((data.achievements ?? []).length > 0) activeSectionSet.add("achievements");
  if ((data.leadershipActivities ?? []).length > 0) activeSectionSet.add("leadershipActivities");
  if ((data.volunteering ?? []).length > 0) activeSectionSet.add("volunteering");
  if ((data.languages ?? []).length > 0 || data.motherTongue?.trim()) activeSectionSet.add("languages");
  if (data.englishCertificate?.examName || data.englishCertificate?.score) activeSectionSet.add("englishCertificate");
  if ((data.skills ?? []).length > 0) activeSectionSet.add("skills");
  if ((data.hobbies ?? []).length > 0) activeSectionSet.add("hobbies");
  if ((data.recommendations ?? []).length > 0) activeSectionSet.add("recommendations");
  if (data.declaration?.trim()) activeSectionSet.add("declaration");

  // Move helpers
  function moveItem(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= draftOrder.length) return;
    const next = [...draftOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDraftOrder(next);
  }

  // HTML5 Drag and Drop handlers
  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Set transparent drag image or standard ghost
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveItem(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleSave() {
    setSectionOrder(draftOrder);
    onClose();
  }

  function handleReset() {
    setDraftOrder([...DEFAULT_MOVABLE_SECTION_ORDER]);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rearrange-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden my-auto flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-shrink-0">
            <div>
              <h3 id="rearrange-modal-title" className="text-base font-semibold text-slate-900">
                Rearrange Resume Sections
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Drag sections to reorder how they appear in the CV flow and PDF.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* List of sections */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2 select-none">
            {/* ── 1. Locked Personal Details Header ── */}
            <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200/90 flex items-center justify-between text-slate-600">
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-mono text-xs w-5 text-center">01</span>
                <div>
                  <span className="text-xs font-semibold text-slate-900">Personal Details</span>
                  <p className="text-[10px] text-slate-400">Header block (Name, Contact, Photo, Passport)</p>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs flex items-center gap-1">
                <span>🔒</span>
                <span>Fixed Header</span>
              </span>
            </div>

            {/* ── 2. Movable Sections List ── */}
            {draftOrder.map((secId, idx) => {
              const meta = RESUME_SECTION_METADATA[secId] ?? { title: secId };
              const isActive = activeSectionSet.has(secId);
              const isDragging = draggedIndex === idx;
              const isOver = dragOverIndex === idx;
              const displayOrder = String(idx + 2).padStart(2, "0");

              return (
                <div
                  key={secId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? "opacity-40 bg-slate-100 border-dashed border-slate-400"
                      : isOver
                      ? "border-t-2 border-t-[#096491] bg-sky-50/40"
                      : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Drag Handle */}
                    <div
                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-grab"
                      title="Drag to reposition"
                      aria-label="Drag handle"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5" />
                        <circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" />
                        <circle cx="15" cy="18" r="1.5" />
                      </svg>
                    </div>

                    <span className="text-slate-400 font-mono text-xs w-5 text-center flex-shrink-0">
                      {displayOrder}
                    </span>

                    <div className="min-w-0 truncate">
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        {meta.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isActive ? (
                          <span className="text-emerald-700 font-medium">✓ Active on CV</span>
                        ) : (
                          "Empty / Hidden"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Keyboard Move Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, idx - 1)}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                      aria-label={`Move ${meta.title} up`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === draftOrder.length - 1}
                      onClick={() => moveItem(idx, idx + 1)}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                      aria-label={`Move ${meta.title} down`}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
            >
              Reset to Default Order
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="rearrange-save-order-btn"
                onClick={handleSave}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Save Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
