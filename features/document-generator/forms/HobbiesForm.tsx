"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryCardHeader } from "./shared";

export function HobbiesForm() {
  const { data, addHobby, updateHobby, removeHobby } = useDocumentState();
  const entries = data.hobbies ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No interests yet. Click "Add Interest" below.' />
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <EntryCardHeader
            index={idx}
            onRemove={() => removeHobby(entry.id)}
          />

          <div>
            <Label htmlFor={`hobby-name-${entry.id}`}>Interest / Hobby</Label>
            <Input
              id={`hobby-name-${entry.id}`}
              value={entry.name ?? ""}
              onChange={(e) => updateHobby(entry.id, { name: e.target.value })}
              placeholder="e.g. Cinematography"
            />
          </div>

          <div>
            <Label htmlFor={`hobby-desc-${entry.id}`}>
              Short Description (optional)
            </Label>
            <Textarea
              id={`hobby-desc-${entry.id}`}
              rows={2}
              value={entry.description ?? ""}
              onChange={(e) =>
                updateHobby(entry.id, { description: e.target.value })
              }
              placeholder="e.g. Creates and edits short films, enjoys visual storytelling."
            />
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addHobby} className="w-full">
        + Add Interest
      </Button>
    </div>
  );
}
