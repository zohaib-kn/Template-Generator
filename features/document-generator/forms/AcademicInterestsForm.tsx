"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function AcademicInterestsForm() {
  const { data, addAcademicInterest, updateAcademicInterest, removeAcademicInterest } =
    useDocumentState();
  const entries = data.academicInterests ?? [];

  return (
    <div className="space-y-3 pt-2">
      <p className="text-[11px] text-slate-500">
        Add subjects or fields you are genuinely interested in studying.
      </p>

      {entries.length === 0 && (
        <EmptyState message='No interests added yet. Click "Add Interest" below.' />
      )}

      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-1.5 bg-slate-50 rounded-lg border border-slate-200 px-2 py-1"
          >
            <Input
              value={entry.name ?? ""}
              onChange={(e) =>
                updateAcademicInterest(entry.id, { name: e.target.value })
              }
              placeholder="e.g. International Relations"
              className="border-none shadow-none p-0 h-auto text-sm w-44 focus:ring-0"
              aria-label="Academic interest"
            />
            <button
              type="button"
              onClick={() => removeAcademicInterest(entry.id)}
              className="text-slate-400 hover:text-red-500 transition-colors text-xs"
              aria-label="Remove interest"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addAcademicInterest}
        className="w-full"
      >
        + Add Interest
      </Button>

      {entries.length > 0 && (
        <p className="text-[11px] text-slate-400">
          Click an interest to edit it.
        </p>
      )}
    </div>
  );
}
