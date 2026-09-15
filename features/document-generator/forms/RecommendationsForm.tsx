"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryCardHeader } from "./shared";

export function RecommendationsForm() {
  const {
    data,
    addRecommendation,
    updateRecommendation,
    removeRecommendation,
  } = useDocumentState();
  const entries = data.recommendations ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No recommendations yet. Click "Add Entry" below.' />
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <EntryCardHeader
            index={idx}
            onRemove={() => removeRecommendation(entry.id)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`rec-name-${entry.id}`}>Recommender Name</Label>
              <Input
                id={`rec-name-${entry.id}`}
                value={entry.recommenderName ?? ""}
                onChange={(e) =>
                  updateRecommendation(entry.id, {
                    recommenderName: e.target.value,
                  })
                }
                placeholder="Dr. Jane Doe"
              />
            </div>
            <div>
              <Label htmlFor={`rec-title-${entry.id}`}>Title / Role</Label>
              <Input
                id={`rec-title-${entry.id}`}
                value={entry.recommenderTitle ?? ""}
                onChange={(e) =>
                  updateRecommendation(entry.id, {
                    recommenderTitle: e.target.value,
                  })
                }
                placeholder="Professor of Economics"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`rec-org-${entry.id}`}>Organisation</Label>
            <Input
              id={`rec-org-${entry.id}`}
              value={entry.organization ?? ""}
              onChange={(e) =>
                updateRecommendation(entry.id, {
                  organization: e.target.value,
                })
              }
              placeholder="University of Oxford"
            />
          </div>

          <div>
            <Label htmlFor={`rec-text-${entry.id}`}>Recommendation</Label>
            <Textarea
              id={`rec-text-${entry.id}`}
              rows={4}
              value={entry.text ?? ""}
              onChange={(e) =>
                updateRecommendation(entry.id, { text: e.target.value })
              }
              placeholder="I have known [name] for… and can recommend them for…"
            />
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addRecommendation}
        className="w-full"
      >
        + Add Recommendation
      </Button>
    </div>
  );
}
