"use client";

import React, { useRef, useState, useEffect } from "react";
import { AppHeader } from "@/components/common/AppHeader";
import { LorProvider, useLorContext, LorEditorTab } from "../state/LorContext";
import { LorDocumentPreview } from "./LorDocumentPreview";
import { LorHeaderEditor } from "./LorHeaderEditor";
import { LorStudentForm } from "./LorStudentForm";
import { LorRecommenderForm } from "./LorRecommenderForm";
import { LorContentEditor } from "./LorContentEditor";
import { LOR_PRESETS } from "../data/presets";
import { LorPresetId } from "../types/lor-generator";
import { exportLorPdf, printLorDocument } from "../pdf/exportLorPdf";
import { StudentDropdown } from "@/components/common/StudentDropdown";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import { mapCrmToNormalizedStudent } from "@/services/normalization";

function WorkspaceInner() {
  const {
    document: doc,
    activePreset,
    activeTab,
    setActiveTab,
    loadPreset,
    resetToDefault,
    updateStudent,
  } = useLorContext();

  const { selectedStudentData } = useGlobalStudent();

  const previewRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(0.92);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Auto-fill student name when a student is selected from the global dropdown
  useEffect(() => {
    if (!selectedStudentData) return;
    const normalized = mapCrmToNormalizedStudent(selectedStudentData, { source: "senior-crm-api" });
    const fullName = normalized.personal.fullName;
    if (fullName) {
      updateStudent({ fullName });
    }
  }, [selectedStudentData, updateStudent]);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await exportLorPdf("lor-a4-preview-page", doc);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate PDF";
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs: { id: LorEditorTab; label: string; icon: string }[] = [
    { id: "metadata", label: "Letterhead", icon: "🏛️" },
    { id: "student", label: "Student", icon: "🎓" },
    { id: "recommender", label: "Recommender", icon: "✍️" },
    { id: "narrative", label: "Narrative", icon: "📝" },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 print:bg-white print:h-auto print:overflow-visible">
      {/* App Header (hidden on print) */}
      <div className="print:hidden">
        <AppHeader />
      </div>

      {/* ── Sub-header / LOR Toolbar (hidden on print) ───────────────── */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-200 z-10 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Template:
          </span>
          <div className="flex items-center gap-1.5">
            {LOR_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset.id as LorPresetId)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#1b2f6b] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  title={preset.description}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={resetToDefault}
            className="text-xs text-slate-500 hover:text-slate-800 ml-2 font-medium cursor-pointer"
            title="Reset document to the sample Poornima LOR"
          >
            ↺ Reset to Sample
          </button>
        </div>

        {/* Center: Student Dropdown */}
        <div className="flex-1 max-w-xs">
          <StudentDropdown compact className="w-full" />
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.08))}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 rounded font-bold cursor-pointer"
              title="Zoom out"
            >
              −
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.2, z + 0.08))}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 rounded font-bold cursor-pointer"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom(0.92)}
              className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 border-l border-slate-200 cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Print / Vector PDF Button */}
          <button
            type="button"
            onClick={printLorDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold border border-slate-300 cursor-pointer transition-colors"
            title="Open browser print dialog for 100% vector-sharp PDF"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print / Vector PDF</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            id="download-lor-pdf-btn"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#1b2f6b] hover:bg-[#13224e] text-white rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isExporting ? "animate-spin" : ""}
            >
              {isExporting ? (
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              ) : (
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </>
              )}
            </svg>
            <span>{isExporting ? "Exporting PDF…" : "Download A4 PDF"}</span>
          </button>
        </div>
      </div>

      {/* Error alert if export failed */}
      {exportError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-xs text-red-700 font-medium print:hidden">
          PDF Generation error: {exportError}
        </div>
      )}

      {/* ── Main Workspace Body ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden print:overflow-visible">
        {/* ── Left Side: Editor Sidebar (hidden on print) ── */}
        <aside className="w-[440px] xl:w-[480px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200 shadow-sm print:hidden">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-[#1b2f6b] shadow-xs font-semibold border border-slate-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "metadata" && <LorHeaderEditor />}
            {activeTab === "student" && <LorStudentForm />}
            {activeTab === "recommender" && <LorRecommenderForm />}
            {activeTab === "narrative" && <LorContentEditor />}
          </div>
        </aside>

        {/* ── Right Side: Live A4 Preview Canvas ── */}
        <main className="flex-1 overflow-auto bg-slate-200/80 flex items-start justify-center p-6 print:p-0 print:m-0 print:bg-white print:overflow-visible">
          <div
            className="print:transform-none"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
          >
            <LorDocumentPreview ref={previewRef} document={doc} />
          </div>
        </main>
      </div>

      {/* Scoped print stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #lor-a4-preview-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

export function LorWorkspace() {
  return (
    <LorProvider>
      <WorkspaceInner />
    </LorProvider>
  );
}
