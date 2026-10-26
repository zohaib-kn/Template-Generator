"use client";

import { useState } from "react";

interface CanvaFloatingToolbarProps {
  currentWordCount: number;
  maxWords: number;
  currentPage: number;
  maxPages: number;
  onAskAi: (instruction: string) => void;
  onBold?: () => void;
  onItalic?: () => void;
  isAiLoading?: boolean;
}

export function CanvaFloatingToolbar({
  currentWordCount,
  maxWords,
  currentPage,
  maxPages,
  onAskAi,
  onBold,
  onItalic,
  isAiLoading = false,
}: CanvaFloatingToolbarProps) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const isOverBudget = maxWords > 0 && currentWordCount > maxWords;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    onAskAi(customPrompt.trim());
    setCustomPrompt("");
    setIsPromptOpen(false);
  };

  return (
    <div className="sticky top-4 z-30 mx-auto flex flex-col items-center pointer-events-none mb-6">
      <div className="canva-floating-bar pointer-events-auto px-4 py-2 flex items-center gap-3 shadow-lg">
        {/* Ask AI Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPromptOpen(!isPromptOpen)}
            className="ai-magic-btn px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <span>✨</span>
            <span>Ask AI</span>
          </button>

          {/* Quick Prompt Dropdown */}
          {isPromptOpen && (
            <div className="absolute top-11 left-0 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
              <form onSubmit={handleSubmit} className="space-y-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Make opening more academic, emphasize lab..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:bg-white"
                  autoFocus
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">Press Enter to run</span>
                  <button
                    type="submit"
                    disabled={isAiLoading || !customPrompt.trim()}
                    className="ai-magic-btn px-3 py-1 rounded-md text-[11px] font-semibold disabled:opacity-50"
                  >
                    {isAiLoading ? "Processing..." : "Generate"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-slate-200" />

        {/* Basic Rich Text Formatting */}
        <div className="flex items-center gap-1 text-slate-600">
          <button
            type="button"
            onClick={onBold}
            className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center font-bold text-xs"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={onItalic}
            className="w-7 h-7 rounded hover:bg-slate-100 flex items-center justify-center italic font-serif text-xs"
            title="Italic"
          >
            I
          </button>
        </div>

        <div className="h-4 w-[1px] bg-slate-200" />

        {/* Word Budget Tracker */}
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              isOverBudget ? "text-amber-600 font-bold" : "text-slate-600"
            }`}
          >
            {currentWordCount}
            {maxWords > 0 && <span className="text-slate-400">/{maxWords} w</span>}
          </span>
          {isOverBudget && (
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
              Near Limit
            </span>
          )}
        </div>

        <div className="h-4 w-[1px] bg-slate-200" />

        {/* A4 Page Indicator */}
        <div className="text-xs font-medium text-slate-500">
          Page {currentPage} of {maxPages}
        </div>
      </div>
    </div>
  );
}
