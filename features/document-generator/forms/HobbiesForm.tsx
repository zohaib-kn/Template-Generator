"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function HobbiesForm() {
  const { data, addHobby, updateHobby, removeHobby } = useDocumentState();
  const entries = data.hobbies ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No hobbies yet. Click &ldquo;Add Hobby&rdquo; below.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 px-2 py-1"
          >
            <Input
              value={entry.name ?? ""}
              onChange={(e) => updateHobby(entry.id, { name: e.target.value })}
              placeholder="e.g. Reading"
              className="border-none shadow-none p-0 h-auto text-sm w-28 focus:ring-0"
              aria-label="Hobby name"
            />
            <button
              type="button"
              onClick={() => removeHobby(entry.id)}
              className="text-slate-400 hover:text-red-500 transition-colors text-xs"
              aria-label="Remove hobby"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addHobby} className="w-full">
        + Add Hobby
      </Button>

      {entries.length > 0 && (
        <p className="text-[11px] text-slate-400">
          Click a hobby name to edit it.
        </p>
      )}
    </div>
  );
}
