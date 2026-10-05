"use client";

import React, { useMemo } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStudentAcademicProfile } from "../context/AcademicProfileContext";
import { FieldAlignmentBadge } from "../components/domain";

export function AcademicInterestsForm() {
  const {
    data,
    addAcademicInterest,
    addAcademicInterestWithData,
    updateAcademicInterest,
    removeAcademicInterest,
  } = useDocumentState();

  const {
    sourceCatalog,
    primaryDegree,
    isTransition,
    targetCatalog,
    targetCourse,
    evaluateField,
  } = useStudentAcademicProfile();

  const entries = data.academicInterests ?? [];

  // Filter out interests already added
  const existingNames = useMemo(
    () => new Set(entries.map((e) => (e.name ?? "").trim().toLowerCase())),
    [entries]
  );

  const suggestedInterests = useMemo(() => {
    return sourceCatalog.academicInterests.filter(
      (interest) => !existingNames.has(interest.toLowerCase())
    );
  }, [sourceCatalog, existingNames]);

  const targetSuggestedInterests = useMemo(() => {
    if (!isTransition) return [];
    return targetCatalog.academicInterests.filter(
      (interest) => !existingNames.has(interest.toLowerCase())
    );
  }, [isTransition, targetCatalog, existingNames]);

  return (
    <div className="space-y-4 pt-2">
      <p className="text-[11px] text-slate-500">
        Add subjects or fields you are genuinely interested in studying.
      </p>

      {/* ── Active Interests ── */}
      {entries.length === 0 && (
        <EmptyState message='No interests added yet. Click a suggestion below or "Add Interest".' />
      )}

      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => {
          const evalResult = evaluateField(entry.name ?? "");
          return (
            <div key={entry.id} className="flex flex-col">
              <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 px-2 py-1">
                <Input
                  value={entry.name ?? ""}
                  onChange={(e) =>
                    updateAcademicInterest(entry.id, { name: e.target.value })
                  }
                  placeholder="e.g. Modern World History"
                  className="border-none shadow-none p-0 h-auto text-sm w-44 focus:ring-0"
                  aria-label="Academic interest"
                />
                <button
                  type="button"
                  onClick={() => removeAcademicInterest(entry.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors text-xs"
                  aria-label="Remove interest"
                >
                  ✕
                </button>
              </div>
              {entry.name && evalResult.status === "DIVERGENT" && (
                <div className="mt-1">
                  <FieldAlignmentBadge evaluation={evalResult} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addAcademicInterest}
        className="w-full"
      >
        + Add Interest
      </Button>

      {/* ── Degree-Specific Quick-Add Suggestions ── */}
      {suggestedInterests.length > 0 && (
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700">
              Recommended for {primaryDegree}:
            </span>
            <span className="text-[10px] text-slate-500">
              {sourceCatalog.displayName}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedInterests.slice(0, 6).map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() =>
                  addAcademicInterestWithData({ name: interest })
                }
                className="inline-flex items-center text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 transition-colors shadow-2xs"
              >
                + {interest}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Transition Target Bridge Interests ── */}
      {isTransition && targetSuggestedInterests.length > 0 && (
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-900">
              Bridge Topics for {targetCourse || targetCatalog.displayName}:
            </span>
            <span className="text-[10px] text-amber-700">
              Transition Bridge ⚡︎
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {targetSuggestedInterests.slice(0, 4).map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() =>
                  addAcademicInterestWithData({ name: interest })
                }
                className="inline-flex items-center text-xs text-amber-950 bg-white hover:bg-amber-100/70 border border-amber-200/90 rounded-md px-2 py-1 transition-colors shadow-2xs"
              >
                + {interest}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
