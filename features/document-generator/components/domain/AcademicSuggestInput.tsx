/**
 * features/document-generator/components/domain/AcademicSuggestInput.tsx
 *
 * Integrated Degree-Aware Input Component:
 * - Searchable autocomplete dropdown while typing
 * - Quick-click recommendation pills based on student's degree
 * - Real-time FieldAlignmentBadge indicator
 */

"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { useStudentAcademicProfile } from "../../context/AcademicProfileContext";
import { FieldAlignmentBadge } from "./FieldAlignmentBadge";

interface AcademicSuggestInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fieldType: "roles" | "projects" | "skills" | "certifications" | "interests";
  showQuickPills?: boolean;
  showAlignmentBadge?: boolean;
  disabled?: boolean;
  className?: string;
}

export function AcademicSuggestInput({
  id,
  value,
  onChange,
  placeholder,
  fieldType,
  showQuickPills = true,
  showAlignmentBadge = true,
  disabled = false,
  className = "",
}: AcademicSuggestInputProps) {
  const {
    sourceCatalog,
    targetCatalog,
    primaryDegree,
    targetCourse,
    isTransition,
    evaluateField,
    getSuggestedItems,
  } = useStudentAcademicProfile();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Suggestions derived from user input
  const suggestions = useMemo(() => {
    return getSuggestedItems(fieldType, value);
  }, [getSuggestedItems, fieldType, value]);

  // Real-time alignment evaluation
  const evaluation = useMemo(() => {
    return evaluateField(value);
  }, [evaluateField, value]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasSuggestions =
    suggestions.degreeRecommendations.length > 0 ||
    suggestions.bridgeRecommendations.length > 0;

  function handleSelectSuggestion(item: string) {
    onChange(item);
    setIsOpen(false);
  }

  // Quick pills (take top 3 degree recommendations when input is empty or custom)
  const quickPills = useMemo(() => {
    return getSuggestedItems(fieldType, "").degreeRecommendations.slice(0, 3);
  }, [getSuggestedItems, fieldType]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* ── Main Text Input ── */}
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={
            placeholder ||
            (quickPills[0] ? `e.g. ${quickPills[0]}` : "Enter title…")
          }
          disabled={disabled}
          autoComplete="off"
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-xs px-1"
            title="Clear input"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Autocomplete Suggestions Popover ── */}
      {isOpen && hasSuggestions && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {/* Degree Recommendations */}
          {suggestions.degreeRecommendations.length > 0 && (
            <div className="p-1.5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>Recommended for {primaryDegree}</span>
                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {sourceCatalog.displayName}
                </span>
              </div>
              <ul className="space-y-0.5">
                {suggestions.degreeRecommendations.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <span className="font-medium text-slate-800 group-hover:text-primary-600">
                        {item}
                      </span>
                      <span className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 font-medium">
                        Select ↵
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Transition Bridge Recommendations */}
          {isTransition && suggestions.bridgeRecommendations.length > 0 && (
            <div className="p-1.5 bg-amber-50/40">
              <div className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>Transition Bridge ({targetCourse || targetCatalog.displayName})</span>
                <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                  Target Field
                </span>
              </div>
              <ul className="space-y-0.5">
                {suggestions.bridgeRecommendations.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-amber-950 hover:bg-amber-100/70 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <span className="font-medium">{item}</span>
                      <span className="text-[10px] text-amber-700 font-medium">
                        Bridge ⚡︎
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Quick-Click Suggestion Pills (Shown when input is empty or for easy discovery) ── */}
      {showQuickPills && !value && quickPills.length > 0 && !disabled && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium text-slate-400">
            Suggested:
          </span>
          {quickPills.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => onChange(pill)}
              className="inline-flex items-center text-[11px] text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/70 rounded-md px-2 py-0.5 transition-colors"
            >
              + {pill}
            </button>
          ))}
        </div>
      )}

      {/* ── Real-Time Alignment Status Badge ── */}
      {showAlignmentBadge && value && (
        <FieldAlignmentBadge evaluation={evaluation} />
      )}
    </div>
  );
}
