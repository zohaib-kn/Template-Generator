"use client";

import { useState, useEffect, useRef } from "react";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";

interface StudentSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent: (studentId: string) => void;
  selectedStudentId?: string | null;
  onClearStudent?: () => void;
}

export function StudentSelectModal({
  isOpen,
  onClose,
  onSelectStudent,
  selectedStudentId,
  onClearStudent,
}: StudentSelectModalProps) {
  const { students, listStatus, refreshStudentList } = useGlobalStudent();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = listStatus.kind === "loading";
  const hasError = listStatus.kind === "error";

  function handleSelect(id: string) {
    onSelectStudent(id);
    onClose();
  }

  function handleClear() {
    onClearStudent?.();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-select-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden my-auto flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div>
              <h3 id="student-select-modal-title" className="text-sm font-semibold text-slate-900 leading-none">
                Select Student from CRM
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Load their academic profile, target destination, and application records
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 bg-white flex-shrink-0">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search across ${students.length} students…`}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/60"
              />
            </div>
          </div>

          {/* Result count & refresh */}
          <div className="px-5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-shrink-0">
            <span>
              {filtered.length} student{filtered.length !== 1 ? "s" : ""} found
            </span>
            <button
              type="button"
              onClick={() => refreshStudentList()}
              className="text-[#096491] hover:underline font-medium flex items-center gap-1"
            >
              <span>Refresh list</span>
            </button>
          </div>

          {/* Student list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-2" />
                <span>Loading students from CRM…</span>
              </div>
            ) : hasError ? (
              <div className="p-8 text-center text-xs text-rose-600">
                <p className="font-semibold mb-1">Failed to load student list</p>
                <p className="text-slate-500 mb-3">{(listStatus as { kind: "error"; message: string }).message}</p>
                <button
                  onClick={() => refreshStudentList()}
                  className="px-3 py-1 rounded bg-slate-100 text-slate-800 hover:bg-slate-200 text-xs font-medium"
                >
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {search ? `No students found matching "${search}"` : "No student records available"}
              </div>
            ) : (
              filtered.map((student) => {
                const isSelected = student.id === selectedStudentId;
                const initials = student.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelect(student.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-colors duration-100 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200"
                        : "hover:bg-slate-100/80 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "bg-[#096491] text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSelected ? "text-[#096491]" : "text-slate-900"}`}>
                        {student.name}
                      </p>
                      {student.email && (
                        <p className="text-[11px] text-slate-400 truncate">{student.email}</p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[#096491] text-xs font-bold flex-shrink-0">
                        ✓ Selected
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
            {selectedStudentId && onClearStudent ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-medium"
              >
                Clear student (reset)
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
