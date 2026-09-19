"use client";

/**
 * StudentDropdown
 *
 * A searchable dropdown that reads from GlobalStudentContext.
 * Drop this anywhere in the app — it automatically shows the live student
 * list fetched from the CRM and fires selectStudent() on pick.
 *
 * Props:
 *   onStudentSelected  — called after the user picks AND the CRM data is loaded
 *   compact            — smaller variant for toolbars
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";

interface StudentDropdownProps {
  /** Fired after the full CrmSnapshot has been loaded for the selected student */
  onStudentSelected?: (studentId: string) => void;
  /** Smaller UI for embedding in toolbars */
  compact?: boolean;
  /** Optional CSS class on the wrapper */
  className?: string;
}

export function StudentDropdown({
  onStudentSelected,
  compact = false,
  className = "",
}: StudentDropdownProps) {
  const {
    students,
    listStatus,
    refreshStudentList,
    selectedStudentId,
    selectedStudentName,
    loadStatus,
    selectStudent,
    clearStudent,
  } = useGlobalStudent();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keep a ref to onStudentSelected so the "call parent" effect below
  // never needs it in its dependency array — avoids infinite re-render
  // when the parent re-renders and passes a new function reference.
  const onStudentSelectedRef = useRef(onStudentSelected);
  useEffect(() => {
    onStudentSelectedRef.current = onStudentSelected;
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Call parent when CRM data load completes.
  // Deps: only loadStatus and selectedStudentId — NOT onStudentSelected.
  // The callback is read from a ref so it's always current without being
  // a reactive dependency (prevents the parent re-render → new fn ref → loop).
  useEffect(() => {
    if (loadStatus.kind === "success" && selectedStudentId) {
      onStudentSelectedRef.current?.(selectedStudentId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStatus.kind, selectedStudentId]);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback(
    (id: string) => {
      selectStudent(id);
      setIsOpen(false);
    },
    [selectStudent]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      clearStudent();
      setIsOpen(false);
    },
    [clearStudent]
  );

  // ── Render helpers ────────────────────────────────────────────────────────

  const isLoading = listStatus.kind === "loading";
  const isDataLoading = loadStatus.kind === "loading";
  const hasError = listStatus.kind === "error";
  const isDataLoaded = loadStatus.kind === "success";

  const buttonHeight = compact ? "h-8 text-xs" : "h-10 text-sm";

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* ── Trigger Button ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => !isLoading && setIsOpen((v) => !v)}
        className={`
          flex items-center gap-2 w-full px-3 rounded-lg border transition-all duration-150
          ${buttonHeight}
          ${hasError
            ? "border-red-300 bg-red-50 text-red-700"
            : isDataLoaded
            ? "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm"
            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:shadow-sm"
          }
        `}
        title={hasError ? (listStatus as { kind: "error"; message: string }).message : undefined}
      >
        {/* Icon / Spinner */}
        {isLoading || isDataLoading ? (
          <svg className="w-4 h-4 animate-spin text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : isDataLoaded ? (
          <span className="text-emerald-500 shrink-0">✓</span>
        ) : hasError ? (
          <span className="shrink-0">⚠️</span>
        ) : (
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}

        {/* Label */}
        <span className="flex-1 text-left truncate font-medium">
          {isDataLoading
            ? "Loading student data…"
            : isLoading
            ? "Loading students…"
            : selectedStudentName
            ? selectedStudentName
            : hasError
            ? "Failed to load — click to retry"
            : "Select a Student"}
        </span>

        {/* Right side: clear or chevron — use div to avoid button-in-button */}
        {selectedStudentId && !isDataLoading ? (
          <div
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
            className="ml-1 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 transition-colors cursor-pointer"
            title="Clear selection"
            aria-label="Clear student selection"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : (
          <svg
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* ── Dropdown Panel ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${students.length} students…`}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
              />
            </div>
          </div>

          {/* Refresh + count row */}
          <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-100">
            <span className="text-[10px] text-slate-500 font-medium">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => { refreshStudentList(); setIsOpen(false); }}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Student list */}
          <div className="max-h-64 overflow-y-auto">
            {hasError ? (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-red-600 mb-2">{(listStatus as { kind: "error"; message: string }).message}</p>
                <button
                  onClick={() => { refreshStudentList(); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-5 text-center text-xs text-slate-400">
                {search ? `No students match "${search}"` : "No students available"}
              </div>
            ) : (
              filtered.map((student) => {
                const isSelected = student.id === selectedStudentId;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelect(student.id)}
                    className={`
                      w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors duration-100
                      hover:bg-blue-50 cursor-pointer
                      ${isSelected ? "bg-blue-50 border-l-2 border-blue-500" : "border-l-2 border-transparent"}
                    `}
                  >
                    {/* Avatar circle */}
                    <div className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${isSelected ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}
                    `}>
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                        {student.name}
                      </p>
                      {student.email && (
                        <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
                      )}
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
