/**
 * features/sop-generator/components/SopImportDropzone.tsx
 *
 * Drag-and-drop file upload component for SOP / Cover Letter documents (.pdf, .docx).
 */

"use client";

import React, { useState, useRef } from "react";

interface SopImportDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export function SopImportDropzone({ onFileSelect, disabled = false }: SopImportDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateAndSelect(file: File) {
    setErrorMessage(null);
    const name = file.name.toLowerCase();
    const isPdf = name.endsWith(".pdf");
    const isDocx = name.endsWith(".docx");

    if (!isPdf && !isDocx) {
      setErrorMessage("Unsupported file type. Please upload a PDF or DOCX statement of purpose.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 8MB.`
      );
      return;
    }

    if (file.size === 0) {
      setErrorMessage("The uploaded file is empty (0 bytes).");
      return;
    }

    onFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled) fileInputRef.current?.click();
        }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-3 ${
          isDragOver
            ? "border-[#096491] bg-sky-50/60 scale-[0.99]"
            : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="w-12 h-12 rounded-full bg-sky-100 text-[#096491] flex items-center justify-center text-xl font-bold">
          📜
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Click to upload or drag & drop
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Upload an existing SOP or Visa Cover Letter in PDF or DOCX format
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
            PDF
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
            DOCX
          </span>
          <span className="text-[11px] text-slate-400 font-medium ml-1">
            · Max 8 MB
          </span>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
        >
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
