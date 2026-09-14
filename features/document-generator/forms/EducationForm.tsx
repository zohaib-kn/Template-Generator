"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export function EducationForm() {
  const { data, addEducation, updateEducation, removeEducation } =
    useDocumentState();
  const entries = data.education ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No education entries yet. Click &ldquo;Add Entry&rdquo; below.
        </p>
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Entry {idx + 1}
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => removeEducation(entry.id)}
            >
              Remove
            </Button>
          </div>

          <div>
            <Label htmlFor={`edu-institution-${entry.id}`}>Institution</Label>
            <Input
              id={`edu-institution-${entry.id}`}
              value={entry.institution ?? ""}
              onChange={(e) =>
                updateEducation(entry.id, { institution: e.target.value })
              }
              placeholder="University / School name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`edu-qual-${entry.id}`}>Qualification</Label>
              <Input
                id={`edu-qual-${entry.id}`}
                value={entry.qualification ?? ""}
                onChange={(e) =>
                  updateEducation(entry.id, { qualification: e.target.value })
                }
                placeholder="e.g. BSc, A-Levels"
              />
            </div>
            <div>
              <Label htmlFor={`edu-field-${entry.id}`}>Field of Study</Label>
              <Input
                id={`edu-field-${entry.id}`}
                value={entry.fieldOfStudy ?? ""}
                onChange={(e) =>
                  updateEducation(entry.id, { fieldOfStudy: e.target.value })
                }
                placeholder="e.g. Computer Science"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`edu-start-${entry.id}`}>Start Date</Label>
              <Input
                id={`edu-start-${entry.id}`}
                type="date"
                value={entry.startDate ?? ""}
                onChange={(e) =>
                  updateEducation(entry.id, { startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor={`edu-end-${entry.id}`}>End Date</Label>
              <Input
                id={`edu-end-${entry.id}`}
                type="date"
                value={entry.endDate ?? ""}
                onChange={(e) =>
                  updateEducation(entry.id, { endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`edu-desc-${entry.id}`}>Description</Label>
            <Textarea
              id={`edu-desc-${entry.id}`}
              rows={3}
              value={entry.description ?? ""}
              onChange={(e) =>
                updateEducation(entry.id, { description: e.target.value })
              }
              placeholder="Key achievements, grades, activities…"
            />
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addEducation} className="w-full">
        + Add Education Entry
      </Button>
    </div>
  );
}
