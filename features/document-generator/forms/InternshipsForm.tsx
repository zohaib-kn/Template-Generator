"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryCardHeader } from "./shared";

export function InternshipsForm() {
  const { data, addInternship, updateInternship, removeInternship } =
    useDocumentState();
  const entries = data.internships ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No internship entries yet. Click "Add Internship" below.' />
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <EntryCardHeader
            index={idx}
            onRemove={() => removeInternship(entry.id)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`intern-role-${entry.id}`}>Role / Job Title</Label>
              <Input
                id={`intern-role-${entry.id}`}
                value={entry.role ?? ""}
                onChange={(e) =>
                  updateInternship(entry.id, { role: e.target.value })
                }
                placeholder="e.g. Data Analytics Intern"
              />
            </div>
            <div>
              <Label htmlFor={`intern-company-${entry.id}`}>Company / Employer</Label>
              <Input
                id={`intern-company-${entry.id}`}
                value={entry.company ?? ""}
                onChange={(e) =>
                  updateInternship(entry.id, { company: e.target.value })
                }
                placeholder="e.g. Deloitte, KPMG"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`intern-loc-${entry.id}`}>Location (optional)</Label>
            <Input
              id={`intern-loc-${entry.id}`}
              value={entry.location ?? ""}
              onChange={(e) =>
                updateInternship(entry.id, { location: e.target.value })
              }
              placeholder="e.g. Mumbai, India / Remote"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`intern-start-${entry.id}`}>Start Date</Label>
              <Input
                id={`intern-start-${entry.id}`}
                type="date"
                value={entry.startDate ?? ""}
                onChange={(e) =>
                  updateInternship(entry.id, { startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor={`intern-end-${entry.id}`}>End Date</Label>
              <Input
                id={`intern-end-${entry.id}`}
                type="date"
                value={entry.endDate ?? ""}
                onChange={(e) =>
                  updateInternship(entry.id, { endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`intern-desc-${entry.id}`}>
              Responsibilities & Key Contributions
            </Label>
            <Textarea
              id={`intern-desc-${entry.id}`}
              rows={3}
              value={entry.description ?? ""}
              onChange={(e) =>
                updateInternship(entry.id, { description: e.target.value })
              }
              placeholder="Tasks, projects delivered, tools utilised, measurable outcomes…"
            />
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addInternship}
        className="w-full"
      >
        + Add Internship Entry
      </Button>
    </div>
  );
}
