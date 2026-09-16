"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryCardHeader } from "./shared";

export function AcademicProjectsForm() {
  const {
    data,
    addAcademicProject,
    updateAcademicProject,
    removeAcademicProject,
  } = useDocumentState();
  const entries = data.academicProjects ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No projects yet. Click "Add Project" below.' />
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <EntryCardHeader
            index={idx}
            onRemove={() => removeAcademicProject(entry.id)}
          />

          <div>
            <Label htmlFor={`proj-title-${entry.id}`}>Project Title</Label>
            <Input
              id={`proj-title-${entry.id}`}
              value={entry.title ?? ""}
              onChange={(e) =>
                updateAcademicProject(entry.id, { title: e.target.value })
              }
              placeholder="e.g. Research paper on climate policy"
            />
          </div>

          <div>
            <Label htmlFor={`proj-desc-${entry.id}`}>Description</Label>
            <Textarea
              id={`proj-desc-${entry.id}`}
              rows={3}
              value={entry.description ?? ""}
              onChange={(e) =>
                updateAcademicProject(entry.id, { description: e.target.value })
              }
              placeholder="What did you work on and what did you learn?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`proj-role-${entry.id}`}>Role (optional)</Label>
              <Input
                id={`proj-role-${entry.id}`}
                value={entry.role ?? ""}
                onChange={(e) =>
                  updateAcademicProject(entry.id, { role: e.target.value })
                }
                placeholder="Lead researcher, Team member…"
              />
            </div>
            <div>
              <Label htmlFor={`proj-date-${entry.id}`}>
                Date / Year (optional)
              </Label>
              <Input
                id={`proj-date-${entry.id}`}
                value={entry.dateYear ?? ""}
                onChange={(e) =>
                  updateAcademicProject(entry.id, { dateYear: e.target.value })
                }
                placeholder="e.g. 2024"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`proj-skills-${entry.id}`}>
              Skills / Learning (optional)
            </Label>
            <Input
              id={`proj-skills-${entry.id}`}
              value={entry.skills ?? ""}
              onChange={(e) =>
                updateAcademicProject(entry.id, { skills: e.target.value })
              }
              placeholder="e.g. Data analysis, Python, teamwork"
            />
          </div>

          <div>
            <Label htmlFor={`proj-link-${entry.id}`}>Link (optional)</Label>
            <Input
              id={`proj-link-${entry.id}`}
              value={entry.link ?? ""}
              onChange={(e) =>
                updateAcademicProject(entry.id, { link: e.target.value })
              }
              placeholder="https://github.com/…"
            />
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addAcademicProject}
        className="w-full"
      >
        + Add Project
      </Button>
    </div>
  );
}
