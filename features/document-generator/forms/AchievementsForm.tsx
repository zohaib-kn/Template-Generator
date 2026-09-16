"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryCardHeader } from "./shared";

export function AchievementsForm() {
  const {
    data,
    addAchievement,
    updateAchievement,
    removeAchievement,
  } = useDocumentState();
  const entries = data.achievements ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No achievements yet. Click "Add Achievement" below.' />
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <EntryCardHeader
            index={idx}
            onRemove={() => removeAchievement(entry.id)}
          />

          <div>
            <Label htmlFor={`ach-title-${entry.id}`}>Title</Label>
            <Input
              id={`ach-title-${entry.id}`}
              value={entry.title ?? ""}
              onChange={(e) =>
                updateAchievement(entry.id, { title: e.target.value })
              }
              placeholder="e.g. Academic award, Olympiad, Scholarship"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`ach-org-${entry.id}`}>
                Organisation (optional)
              </Label>
              <Input
                id={`ach-org-${entry.id}`}
                value={entry.organisation ?? ""}
                onChange={(e) =>
                  updateAchievement(entry.id, { organisation: e.target.value })
                }
                placeholder="School, university, body…"
              />
            </div>
            <div>
              <Label htmlFor={`ach-date-${entry.id}`}>Year (optional)</Label>
              <Input
                id={`ach-date-${entry.id}`}
                value={entry.dateYear ?? ""}
                onChange={(e) =>
                  updateAchievement(entry.id, { dateYear: e.target.value })
                }
                placeholder="e.g. 2023"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`ach-desc-${entry.id}`}>
              Description (optional)
            </Label>
            <Textarea
              id={`ach-desc-${entry.id}`}
              rows={2}
              value={entry.description ?? ""}
              onChange={(e) =>
                updateAchievement(entry.id, { description: e.target.value })
              }
              placeholder="Brief context about the award or recognition…"
            />
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addAchievement}
        className="w-full"
      >
        + Add Achievement
      </Button>
    </div>
  );
}
