"use client";

/**
 * GlobalStudentContext
 *
 * Shared React context that lives at the app root (layout.tsx).
 * Provides:
 *   - students         : full list fetched from /api/students/list
 *   - selectedStudentId: currently picked student _id
 *   - selectedStudentData: full CRM snapshot for the selected student
 *   - selectStudent(id) : picks a student and fetches their full data
 *   - clearStudent()    : resets selection
 *
 * This context is the single source of truth that all three modules
 * (Resume Builder, SOP Generator, LOR Generator) read from.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { StudentListItem } from "@/app/api/students/list/route";
import type { CrmSnapshot } from "@/types/crmSnapshot";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StudentLoadStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export type StudentListStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

interface GlobalStudentContextValue {
  // Student list
  students: StudentListItem[];
  listStatus: StudentListStatus;
  refreshStudentList: () => void;

  // Selected student
  selectedStudentId: string | null;
  selectedStudentName: string | null;
  selectedStudentData: CrmSnapshot | null;
  loadStatus: StudentLoadStatus;

  // Actions
  selectStudent: (id: string) => void;
  clearStudent: () => void;
}

const GlobalStudentContext = createContext<GlobalStudentContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GlobalStudentProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [listStatus, setListStatus] = useState<StudentListStatus>({ kind: "loading" });

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [selectedStudentData, setSelectedStudentData] = useState<CrmSnapshot | null>(null);
  const [loadStatus, setLoadStatus] = useState<StudentLoadStatus>({ kind: "idle" });

  // ── Fetch the student list on mount ──────────────────────────────────────
  const fetchStudentList = useCallback(async () => {
    setListStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/students/list", {
        headers: { Accept: "application/json" },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setListStatus({ kind: "error", message: json.error ?? "Failed to load students." });
        return;
      }

      setStudents(json.students as StudentListItem[]);
      setListStatus({ kind: "success" });
    } catch {
      setListStatus({ kind: "error", message: "Network error loading students." });
    }
  }, []);

  useEffect(() => {
    fetchStudentList();
  }, [fetchStudentList]);

  // ── Select a student — fetches their full CRM data ───────────────────────
  const selectStudent = useCallback(async (id: string) => {
    if (!id) return;

    // Find the name from our list immediately for instant UI feedback
    const found = students.find((s) => s.id === id);
    setSelectedStudentId(id);
    setSelectedStudentName(found?.name ?? null);
    setSelectedStudentData(null);
    setLoadStatus({ kind: "loading" });

    try {
      const res = await fetch(`/api/student/${id}`, {
        headers: { Accept: "application/json" },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setLoadStatus({
          kind: "error",
          message: json.error?.message ?? `Failed to load student data (HTTP ${res.status}).`,
        });
        return;
      }

      setSelectedStudentData(json.data as CrmSnapshot);
      setLoadStatus({ kind: "success" });
    } catch {
      setLoadStatus({ kind: "error", message: "Network error loading student data." });
    }
  }, [students]);

  const clearStudent = useCallback(() => {
    setSelectedStudentId(null);
    setSelectedStudentName(null);
    setSelectedStudentData(null);
    setLoadStatus({ kind: "idle" });
  }, []);

  return (
    <GlobalStudentContext.Provider
      value={{
        students,
        listStatus,
        refreshStudentList: fetchStudentList,
        selectedStudentId,
        selectedStudentName,
        selectedStudentData,
        loadStatus,
        selectStudent,
        clearStudent,
      }}
    >
      {children}
    </GlobalStudentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGlobalStudent(): GlobalStudentContextValue {
  const ctx = useContext(GlobalStudentContext);
  if (!ctx) {
    throw new Error("useGlobalStudent must be used within a GlobalStudentProvider");
  }
  return ctx;
}
