"use client";

import { useState } from "react";

interface AdmissionsAiAssistantProps {
  onRunAction: (actionKey: string, customInstruction?: string) => void;
  isAiLoading?: boolean;
}

export function AdmissionsAiAssistant({
  onRunAction,
  isAiLoading = false,
}: AdmissionsAiAssistantProps) {
  const [customIdea, setCustomIdea] = useState("");

  const quickPills = [
    {
      key: "HINGLISH_ELEVATE",
      label: "⚡ Fix Hinglish & Tone",
      desc: "Polishes informal or conversational phrasing into authentic academic English.",
    },
    {
      key: "ALIGN_SYLLABUS",
      label: "🎯 Align with Syllabus",
      desc: "Bridges student's undergraduate foundation to target master's modules.",
    },
    {
      key: "STUDY_GAP",
      label: "⏳ Justify Pivot / Gap",
      desc: "Synthesizes career transition rationale without sounding defensive.",
    },
    {
      key: "TRIM_BUDGET",
      label: "✂ Trim to 1-Page Budget",
      desc: "Condenses paragraph strictly to eliminate orphan lines on Page 2.",
    },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIdea.trim()) return;
    onRunAction("CUSTOM", customIdea.trim());
    setCustomIdea("");
  };

  return (
    <aside className="w-80 bg-white border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
            Admissions AI
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Targeted AI refinements for the active section. Skeleton structure remains locked.
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="space-y-2.5">
          {quickPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              disabled={isAiLoading}
              onClick={() => onRunAction(pill.key)}
              className="w-full text-left p-3 rounded-xl border border-slate-200/80 hover:border-purple-400 hover:bg-purple-50/50 transition group disabled:opacity-50"
            >
              <div className="text-xs font-semibold text-slate-800 group-hover:text-purple-700 transition">
                {pill.label}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {pill.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Custom Prompt Box (matching Canva screenshot) */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <form onSubmit={handleCustomSubmit} className="relative">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 focus-within:border-purple-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100 transition">
            <textarea
              rows={2}
              value={customIdea}
              onChange={(e) => setCustomIdea(e.target.value)}
              placeholder="Describe your idea or instruction..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none resize-none"
            />
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400">Targeted prompt</span>
              <button
                type="submit"
                disabled={isAiLoading || !customIdea.trim()}
                className="w-7 h-7 rounded-full ai-magic-btn flex items-center justify-center text-xs disabled:opacity-40 shadow-xs"
                title="Send instruction"
              >
                {isAiLoading ? "..." : "↑"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </aside>
  );
}
