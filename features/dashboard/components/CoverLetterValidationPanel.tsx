"use client";

import React, { useEffect, useRef } from "react";
import type {
  ValidationCategoryGroup,
  ValidationFieldDefinition,
} from "../utils/coverLetterCleaner";

interface CoverLetterValidationPanelProps {
  groups: ValidationCategoryGroup[];
  totalMissingCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelectField: (field: ValidationFieldDefinition) => void;
}

export function CoverLetterValidationPanel({
  groups,
  totalMissingCount,
  isOpen,
  onToggle,
  onClose,
  onSelectField,
}: CoverLetterValidationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the panel
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={panelRef}
      className="fixed sm:absolute right-3 sm:right-6 top-3 sm:top-4 z-30 select-none no-print"
    >
      {/* ── Compact Trigger Pill Button ──────────────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border transition cursor-pointer backdrop-blur-sm ${
          totalMissingCount > 0
            ? "bg-amber-50/95 text-amber-900 border-amber-200/90 hover:bg-amber-100 hover:border-amber-300"
            : "bg-emerald-50/95 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300"
        }`}
        title="Toggle Missing Details Panel"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            totalMissingCount > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
          }`}
        />
        <span>
          {totalMissingCount > 0 ? `${totalMissingCount} Missing Details` : "All Details Verified"}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Dropdown Panel (Top-Right Workspace) ─────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 max-h-[75vh] bg-white border border-slate-200/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span className="font-bold text-slate-800 text-xs">Missing Details</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  totalMissingCount > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {totalMissingCount > 0 ? `${totalMissingCount} missing` : "Complete"}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
              title="Close panel"
            >
              ✕
            </button>
          </div>

          {/* Subheader Instruction */}
          <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-100/60 flex items-center gap-2">
            <span className="text-xs">💡</span>
            <p className="text-[11px] text-amber-900 leading-tight">
              Click any detail below to prompt the AI Assistant to fill it directly.
            </p>
          </div>

          {/* Grouped Field List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
            {totalMissingCount === 0 ? (
              <div className="p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 text-base font-bold">
                  ✓
                </div>
                <p className="text-xs font-bold text-slate-800">All Details Verified!</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Every required field is cleanly populated in this Cover Letter.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.category} className="pt-2 first:pt-0">
                  {/* Category Header */}
                  <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <span>{group.icon}</span>
                      <span>{group.category}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {group.fields.length}
                    </span>
                  </div>

                  {/* Category Field Items */}
                  <div className="mt-1 space-y-1">
                    {group.fields.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        onClick={() => onSelectField(field)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg border border-transparent hover:border-indigo-200 hover:bg-indigo-50/70 transition flex items-center justify-between group cursor-pointer"
                        title={`Click to supply ${field.label}`}
                      >
                        <div className="truncate pr-2">
                          <span className="text-xs font-medium text-slate-800 group-hover:text-indigo-900 block truncate">
                            {field.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {field.key}
                          </span>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-indigo-600 bg-white border border-indigo-200 px-2 py-0.5 rounded-md shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition">
                          + Add
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

