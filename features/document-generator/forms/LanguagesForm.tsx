"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const LEVEL_OPTIONS = [
  "Native",
  "C2 – Mastery",
  "C1 – Advanced",
  "B2 – Upper Intermediate",
  "B1 – Intermediate",
  "A2 – Elementary",
  "A1 – Beginner",
];

export function LanguagesForm() {
  const { data, addLanguage, updateLanguage, removeLanguage } =
    useDocumentState();
  const entries = data.languages ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No languages yet. Click "Add Language" below.' />
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="flex items-end gap-3 bg-slate-50 rounded-xl border border-slate-200 p-3"
        >
          <div className="flex-1">
            <Label htmlFor={`lang-name-${entry.id}`}>Language</Label>
            <Input
              id={`lang-name-${entry.id}`}
              value={entry.language ?? ""}
              onChange={(e) =>
                updateLanguage(entry.id, { language: e.target.value })
              }
              placeholder={idx === 0 ? "English" : "Arabic, French…"}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor={`lang-level-${entry.id}`}>Level</Label>
            <select
              id={`lang-level-${entry.id}`}
              value={entry.level ?? ""}
              onChange={(e) =>
                updateLanguage(entry.id, { level: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/40 focus:border-transparent transition-all duration-150"
            >
              <option value="">Select level…</option>
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => removeLanguage(entry.id)}
            className="mb-0.5"
          >
            ✕
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addLanguage} className="w-full">
        + Add Language
      </Button>
    </div>
  );
}
