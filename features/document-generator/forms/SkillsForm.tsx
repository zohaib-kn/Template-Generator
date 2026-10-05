"use client";

import React, { useMemo } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStudentAcademicProfile } from "../context/AcademicProfileContext";
import { AcademicSuggestInput } from "../components/domain";

export function SkillsForm() {
  const { data, addSkill, addSkillWithData, updateSkill, removeSkill } =
    useDocumentState();
  const {
    sourceCatalog,
    targetCatalog,
    primaryDegree,
    isTransition,
    targetCourse,
  } = useStudentAcademicProfile();

  const entries = data.skills ?? [];

  const existingSkills = useMemo(
    () => new Set(entries.map((s) => (s.name ?? "").trim().toLowerCase())),
    [entries]
  );

  const domainSkills = useMemo(() => {
    return sourceCatalog.skills.domain.filter(
      (s) => !existingSkills.has(s.toLowerCase())
    );
  }, [sourceCatalog, existingSkills]);

  const transferableSkills = useMemo(() => {
    return sourceCatalog.skills.transferable.filter(
      (s) => !existingSkills.has(s.toLowerCase())
    );
  }, [sourceCatalog, existingSkills]);

  const bridgeSkills = useMemo(() => {
    if (!isTransition) return [];
    return targetCatalog.skills.domain.filter(
      (s) => !existingSkills.has(s.toLowerCase())
    );
  }, [isTransition, targetCatalog, existingSkills]);

  return (
    <div className="space-y-4 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No skills yet. Click a suggested skill below or "Add Skill".' />
      )}

      {/* ── Active Skill Entries ── */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 bg-slate-50 rounded-xl border border-slate-200 p-3"
          >
            <div className="flex-1">
              <Label htmlFor={`skill-name-${entry.id}`}>Skill</Label>
              <AcademicSuggestInput
                id={`skill-name-${entry.id}`}
                value={entry.name ?? ""}
                onChange={(val) => updateSkill(entry.id, { name: val })}
                fieldType="skills"
                placeholder="e.g. Primary Source Analysis, Archival Research"
                showQuickPills={false}
              />
            </div>
            <div className="w-36">
              <Label htmlFor={`skill-prof-${entry.id}`}>Proficiency</Label>
              <Input
                id={`skill-prof-${entry.id}`}
                value={entry.proficiency ?? ""}
                onChange={(e) =>
                  updateSkill(entry.id, { proficiency: e.target.value })
                }
                placeholder="Intermediate, Advanced"
              />
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => removeSkill(entry.id)}
              className="mt-6"
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addSkill} className="w-full">
        + Add Skill
      </Button>

      {/* ── Domain & Discipline Skills (e.g. History/Arts) ── */}
      {domainSkills.length > 0 && (
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700">
              Discipline Skills for {primaryDegree}:
            </span>
            <span className="text-[10px] text-slate-500">
              {sourceCatalog.displayName}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {domainSkills.slice(0, 6).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() =>
                  addSkillWithData({ name: skill, proficiency: "Intermediate" })
                }
                className="inline-flex items-center text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 transition-colors shadow-2xs"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Transferable Academic Skills ── */}
      {transferableSkills.length > 0 && (
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
          <div className="text-[11px] font-semibold text-slate-700">
            Transferable Research & Analytical Skills:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {transferableSkills.slice(0, 5).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() =>
                  addSkillWithData({ name: skill, proficiency: "Advanced" })
                }
                className="inline-flex items-center text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md px-2 py-1 transition-colors shadow-2xs"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Transition Target Bridge Skills ── */}
      {isTransition && bridgeSkills.length > 0 && (
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-900">
              Bridge Skills for {targetCourse || targetCatalog.displayName}:
            </span>
            <span className="text-[10px] text-amber-700">
              Transition Bridge ⚡︎
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bridgeSkills.slice(0, 4).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() =>
                  addSkillWithData({ name: skill, proficiency: "Intermediate" })
                }
                className="inline-flex items-center text-xs text-amber-950 bg-white hover:bg-amber-100/70 border border-amber-200/90 rounded-md px-2 py-1 transition-colors shadow-2xs"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
