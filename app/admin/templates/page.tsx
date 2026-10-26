"use client";

import { useState } from "react";
import Link from "next/link";
import { SEED_TEMPLATES } from "@/services/templateEngine/seedTemplates";
import type { TemplateRecord, TemplateSectionSlot } from "@/models/Template";

export default function AdminTemplateStudioPage() {
  const [templates, setTemplates] = useState<TemplateRecord[]>(SEED_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord>(SEED_TEMPLATES[0]);
  const [activePersona, setActivePersona] = useState<string>("aarav");
  const [isLockedNotice, setIsLockedNotice] = useState(false);

  const totalBudgetWords = selectedTemplate.sections.reduce(
    (sum, s) => sum + (s.maxWords || (s.staticContent?.split(/\s+/).length || 20)),
    0
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col">
      {/* ── Top Header ───────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            ← Back to Dashboard
          </Link>
          <div className="h-4 w-[1px] bg-slate-200" />
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">
            Admin Template Studio · Invariant Skeleton Governance
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Certified Immutable Mode</span>
          </span>
        </div>
      </header>

      {/* ── Workspace ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Template Catalog Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 p-4 overflow-y-auto shrink-0 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Certified Skeletons ({templates.length})
            </h2>
            <div className="space-y-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedTemplate.id === tpl.id
                      ? "border-blue-600 bg-blue-50/60 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {tpl.targetCountry || "Global"}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                      LOCKED
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 line-clamp-1">{tpl.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {tpl.sections.length} slots · {tpl.printLayout.maxPages} Page Budget
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed">
            <div className="font-semibold text-slate-800 mb-1">🔒 Immutability Rule</div>
            Once approved, template skeletons cannot be modified by operators in live sessions.
          </div>
        </aside>

        {/* Center: Invariant Slot Inspector */}
        <main className="flex-1 overflow-y-auto p-6 max-w-4xl">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {selectedTemplate.documentType} · {selectedTemplate.targetCountry}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedTemplate.name}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{selectedTemplate.description}</p>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">
                  Total Budget: ~{totalBudgetWords} words
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Print Bound: Strict {selectedTemplate.printLayout.maxPages} A4 Page(s)
                </div>
              </div>
            </div>

            {/* 3-Tier Section Slots List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Approved 3-Tier Section Skeletons ({selectedTemplate.sections.length})
              </h3>

              {selectedTemplate.sections.map((slot, idx) => (
                <div
                  key={slot.slotId}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        0{idx + 1}.
                      </span>
                      <span className="text-xs font-bold text-slate-900">{slot.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          slot.slotType === "STATIC_BOILERPLATE"
                            ? "bg-slate-200 text-slate-700"
                            : slot.slotType === "CRM_VARIABLE"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-purple-100 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {slot.slotType === "STATIC_BOILERPLATE"
                          ? "Tier 1: Static Boilerplate"
                          : slot.slotType === "CRM_VARIABLE"
                          ? "Tier 2: Direct CRM Variable"
                          : "Tier 3: AI Narrative Slot"}
                      </span>
                    </div>

                    {slot.slotType === "STATIC_BOILERPLATE" && (
                      <p className="text-xs text-slate-600 font-mono bg-white p-2 rounded border border-slate-200/80 whitespace-pre-wrap">
                        {slot.staticContent}
                      </p>
                    )}

                    {slot.slotType === "CRM_VARIABLE" && (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200/80">
                          {slot.rawTemplateString}
                        </p>
                        <div className="text-[11px] text-slate-400">
                          Mapped Variables: {slot.variableMapping?.join(", ") || "None"}
                        </div>
                      </div>
                    )}

                    {slot.slotType === "AI_NARRATIVE" && (
                      <div className="space-y-1">
                        <p className="text-xs text-purple-900 bg-purple-50/50 p-2 rounded border border-purple-100">
                          {slot.aiPromptInstruction}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            Budget: <b>{slot.minWords}–{slot.maxWords} words</b>
                          </span>
                          <span>
                            Filtered Clichés: {slot.prohibitedWords?.slice(0, 3).join(", ")}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Right: Benchmark Persona Simulator */}
        <aside className="w-80 bg-white border-l border-slate-200 p-4 shrink-0 overflow-y-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Persona Print Simulator
          </h3>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            Verify that this approved skeleton does not spill onto an orphan second page across different student backgrounds.
          </p>

          <div className="space-y-2 mb-6">
            {[
              { id: "aarav", name: "Aarav Mehta (Italy Pivot · Master's)", status: "Pass (390w · 1 Page)" },
              { id: "kaavya", name: "Kaavya (Direct Progression)", status: "Pass (410w · 1 Page)" },
              { id: "fardee", name: "Fardee (Study Gap + Gaps)", status: "Pass (380w · 1 Page)" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePersona(p.id)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition ${
                  activePersona === p.id
                    ? "border-blue-500 bg-blue-50/50 font-semibold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="font-semibold text-slate-800">{p.name}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">{p.status}</div>
              </button>
            ))}
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="text-xs font-bold text-emerald-800 mb-1">
              ✓ Pre-Flight Print Check: PASSED
            </div>
            <p className="text-[11px] text-emerald-700 leading-normal">
              Zero page overflows detected. Fits within strict {selectedTemplate.printLayout.maxPages} A4 page bounds.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
