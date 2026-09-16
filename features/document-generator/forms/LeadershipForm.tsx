"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryCardHeader } from "./shared";

export function LeadershipForm() {
  const {
    data,
    addLeadershipActivity,
    updateLeadershipActivity,
    removeLeadershipActivity,
  } = useDocumentState();
  const entries = data.leadershipActivities ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No activities yet. Click "Add Activity" below.' />
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <EntryCardHeader
            index={idx}
            onRemove={() => removeLeadershipActivity(entry.id)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`lead-activity-${entry.id}`}>
                Activity / Role
              </Label>
              <Input
                id={`lead-activity-${entry.id}`}
                value={entry.activity ?? ""}
                onChange={(e) =>
                  updateLeadershipActivity(entry.id, {
                    activity: e.target.value,
                  })
                }
                placeholder="e.g. Debate Club President, MUN delegate"
              />
            </div>
            <div>
              <Label htmlFor={`lead-org-${entry.id}`}>
                Organisation (optional)
              </Label>
              <Input
                id={`lead-org-${entry.id}`}
                value={entry.organisation ?? ""}
                onChange={(e) =>
                  updateLeadershipActivity(entry.id, {
                    organisation: e.target.value,
                  })
                }
                placeholder="School, club, council…"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`lead-duration-${entry.id}`}>
              Duration / Date (optional)
            </Label>
            <Input
              id={`lead-duration-${entry.id}`}
              value={entry.duration ?? ""}
              onChange={(e) =>
                updateLeadershipActivity(entry.id, {
                  duration: e.target.value,
                })
              }
              placeholder="e.g. 2022–2024"
            />
          </div>

          <div>
            <Label htmlFor={`lead-desc-${entry.id}`}>Description</Label>
            <Textarea
              id={`lead-desc-${entry.id}`}
              rows={2}
              value={entry.description ?? ""}
              onChange={(e) =>
                updateLeadershipActivity(entry.id, {
                  description: e.target.value,
                })
              }
              placeholder="What responsibility did you have?"
            />
          </div>

          <div>
            <Label htmlFor={`lead-impact-${entry.id}`}>
              Impact / Outcome (optional)
            </Label>
            <Input
              id={`lead-impact-${entry.id}`}
              value={entry.impact ?? ""}
              onChange={(e) =>
                updateLeadershipActivity(entry.id, { impact: e.target.value })
              }
              placeholder="Key result or contribution…"
            />
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addLeadershipActivity}
        className="w-full"
      >
        + Add Activity
      </Button>
    </div>
  );
}
