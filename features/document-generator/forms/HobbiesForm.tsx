"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Parses user input containing one or multiple hobbies separated by
 * newlines, commas, semicolons, or bullet symbols.
 */
export function parseHobbiesInput(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(/[\n,;•·]+/g)
    .map((item) => item.replace(/^[•*\-\s]+/, "").trim())
    .filter((item) => item.length > 0);
}

export function HobbiesForm() {
  const { data, addHobbyWithData, removeHobby } = useDocumentState();
  const entries = data.hobbies ?? [];
  const [inputValue, setInputValue] = useState("");

  const handleAdd = useCallback(() => {
    const parsed = parseHobbiesInput(inputValue);
    if (parsed.length === 0) return;

    const existingNames = new Set(
      entries.map((e) => (e.name ?? "").trim().toLowerCase())
    );

    for (const hobby of parsed) {
      if (!existingNames.has(hobby.toLowerCase())) {
        addHobbyWithData({ name: hobby });
        existingNames.add(hobby.toLowerCase());
      }
    }

    setInputValue("");
  }, [inputValue, entries, addHobbyWithData]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to quickly submit
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleClearAll = useCallback(() => {
    entries.forEach((e) => removeHobby(e.id));
  }, [entries, removeHobby]);

  return (
    <div className="space-y-4 pt-2">
      {/* ── Multi-line Entry Box with Add Button ── */}
      <div className="space-y-2">
        <label
          htmlFor="hobbies-input"
          className="text-xs font-semibold text-slate-700 block"
        >
          Add Hobbies or Personal Interests
        </label>
        <p className="text-[11px] text-slate-500">
          Write each hobby on a new line (e.g. reading, gym, writing) or separate by commas.
        </p>

        <div className="space-y-2">
          <Textarea
            id="hobbies-input"
            rows={5}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"reading\ngym\nwriting"}
            className="w-full bg-white resize-y min-h-[120px]"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              Press Enter for a new line · Ctrl+Enter to Add
            </span>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!inputValue.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 h-8 text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* ── Empty state or List of Added Bullet Items ── */}
      {entries.length === 0 ? (
        <EmptyState message="No hobbies added yet. Type your hobbies above (one per line) and click Add." />
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Current Hobbies ({entries.length})
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-red-500 hover:text-red-700 hover:underline cursor-pointer transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 py-1.5 px-3 bg-white border border-slate-200/70 rounded-lg text-xs text-slate-800 shadow-2xs group hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-400 font-bold select-none">•</span>
                  <span className="font-medium truncate">{entry.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeHobby(entry.id)}
                  className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer transition-colors"
                  title={`Remove ${entry.name}`}
                  aria-label={`Remove ${entry.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
