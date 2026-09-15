"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function SkillsForm() {
  const { data, addSkill, updateSkill, removeSkill } = useDocumentState();
  const entries = data.skills ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No skills yet. Click "Add Skill" below.' />
      )}

      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-end gap-3 bg-slate-50 rounded-xl border border-slate-200 p-3"
        >
          <div className="flex-1">
            <Label htmlFor={`skill-name-${entry.id}`}>Skill</Label>
            <Input
              id={`skill-name-${entry.id}`}
              value={entry.name ?? ""}
              onChange={(e) => updateSkill(entry.id, { name: e.target.value })}
              placeholder="e.g. Python, Public Speaking"
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
              placeholder="Expert, Intermediate"
            />
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => removeSkill(entry.id)}
            className="mb-0.5"
          >
            ✕
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addSkill} className="w-full">
        + Add Skill
      </Button>
    </div>
  );
}
