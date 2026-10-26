"use client";

import { useState } from "react";

interface ExportSection {
  title: string;
  content: string;
}

interface DualExportDropdownProps {
  title: string;
  studentName: string;
  documentType: string;
  sections: ExportSection[];
  maxPages?: number;
}

export function DualExportDropdown({
  title,
  studentName,
  documentType,
  sections,
  maxPages = 1,
}: DualExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<"PDF" | "DOCX" | null>(null);

  const handleExport = async (format: "PDF" | "DOCX") => {
    setIsExporting(format);
    setIsOpen(false);

    const endpoint = format === "PDF" ? "/api/export/pdf" : "/api/export/docx";
    const payload = {
      title,
      studentName,
      documentType,
      sections,
      maxPages,
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const safeName = (studentName || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${safeName}_${documentType}.${format === "PDF" ? "pdf" : "docx"}`;

      // Trigger native browser file download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      alert(`Export error: ${message}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={isExporting !== null}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 disabled:opacity-50 transition"
      >
        {isExporting ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Exporting {isExporting}...</span>
          </>
        ) : (
          <>
            <span>Export Document</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
          <button
            type="button"
            onClick={() => handleExport("PDF")}
            className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
          >
            <span className="text-red-500 font-bold text-sm">PDF</span>
            <div>
              <div className="font-semibold text-slate-900">Official Vector PDF</div>
              <div className="text-[10px] text-slate-400">Crisp, selectable, A4 print ready</div>
            </div>
          </button>

          <div className="h-[1px] bg-slate-100 my-1" />

          <button
            type="button"
            onClick={() => handleExport("DOCX")}
            className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
          >
            <span className="text-blue-600 font-bold text-sm">DOCX</span>
            <div>
              <div className="font-semibold text-slate-900">Editable Word Document</div>
              <div className="text-[10px] text-slate-400">Microsoft Word formatted</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
