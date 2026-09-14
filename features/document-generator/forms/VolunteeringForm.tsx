"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export function VolunteeringForm() {
  const { data, addVolunteering, updateVolunteering, removeVolunteering } =
    useDocumentState();
  const entries = data.volunteering ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No volunteering entries yet. Click &ldquo;Add Entry&rdquo; below.
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
              onClick={() => removeVolunteering(entry.id)}
            >
              Remove
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`vol-org-${entry.id}`}>Organisation</Label>
              <Input
                id={`vol-org-${entry.id}`}
                value={entry.organization ?? ""}
                onChange={(e) =>
                  updateVolunteering(entry.id, { organization: e.target.value })
                }
                placeholder="Red Cross, local charity…"
              />
            </div>
            <div>
              <Label htmlFor={`vol-role-${entry.id}`}>Role</Label>
              <Input
                id={`vol-role-${entry.id}`}
                value={entry.role ?? ""}
                onChange={(e) =>
                  updateVolunteering(entry.id, { role: e.target.value })
                }
                placeholder="Coordinator, Tutor…"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`vol-start-${entry.id}`}>Start Date</Label>
              <Input
                id={`vol-start-${entry.id}`}
                type="date"
                value={entry.startDate ?? ""}
                onChange={(e) =>
                  updateVolunteering(entry.id, { startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor={`vol-end-${entry.id}`}>End Date</Label>
              <Input
                id={`vol-end-${entry.id}`}
                type="date"
                value={entry.endDate ?? ""}
                onChange={(e) =>
                  updateVolunteering(entry.id, { endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`vol-desc-${entry.id}`}>Description</Label>
            <Textarea
              id={`vol-desc-${entry.id}`}
              rows={3}
              value={entry.description ?? ""}
              onChange={(e) =>
                updateVolunteering(entry.id, { description: e.target.value })
              }
              placeholder="What you did and what you achieved…"
            />
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addVolunteering}
        className="w-full"
      >
        + Add Volunteering Entry
      </Button>
    </div>
  );
}
