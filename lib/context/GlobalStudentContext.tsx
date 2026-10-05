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
  useRef,
  ReactNode,
} from "react";
import type { StudentListItem } from "@/app/api/students/list/route";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import type { ApplicationTarget } from "@/features/document-generator/guidance/types";
import { mapCrmToNormalizedStudent } from "@/services/normalization/mapCrmToNormalizedStudent";
import { mapNormalizedToResume } from "@/services/normalization/mapNormalizedToResume";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_STORAGE_KEY = "template_gen_active_target";

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
  lastLoadedStudentId: string | null;
  setLastLoadedStudentId: (id: string | null) => void;

  // Application Target (shared between Resume Builder, SOP, and LOR)
  applicationTarget: ApplicationTarget;
  setApplicationTarget: React.Dispatch<React.SetStateAction<ApplicationTarget>>;
  updateApplicationTarget: (patch: Partial<ApplicationTarget>) => void;

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
  const [lastLoadedStudentId, setLastLoadedStudentId] = useState<string | null>(null);

  // Application Target — persisted in sessionStorage so tab switches and refreshes retain target
  const [applicationTarget, setApplicationTarget] = useState<ApplicationTarget>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(TARGET_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Keep sessionStorage in sync with applicationTarget changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(applicationTarget));
      } catch {}
    }
  }, [applicationTarget]);

  const updateApplicationTarget = useCallback((patch: Partial<ApplicationTarget>) => {
    setApplicationTarget((prev) => ({ ...prev, ...patch }));
  }, []);

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

    // Update URL query parameter so browser URL stays in sync without page reloads
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("studentId") !== id) {
          url.searchParams.set("studentId", id);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}
    }

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

      const snapshot = json.data as CrmSnapshot;
      setSelectedStudentData(snapshot);
      const personal = snapshot.student?.personalDetails;
      const fullName = personal ? [personal.firstName, personal.lastName].filter(Boolean).join(" ") : null;
      if (fullName) {
        setSelectedStudentName(fullName);
      }

      // Auto-extract application target from CRM snapshot — clean replacement for the new student
      try {
        const normalized = mapCrmToNormalizedStudent(snapshot, { source: "senior-crm-api" });
        const { target } = mapNormalizedToResume(normalized);
        setApplicationTarget(target || {});
      } catch (err) {
        console.warn("[GlobalStudentContext] Could not derive target from snapshot:", err);
        setApplicationTarget({});
      }

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
    setApplicationTarget({});
    setLastLoadedStudentId(null);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(TARGET_STORAGE_KEY);
        sessionStorage.removeItem("template_gen_active_resume_data");
        const url = new URL(window.location.href);
        if (url.searchParams.has("studentId")) {
          url.searchParams.delete("studentId");
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}
    }
  }, []);

  // ── Auto-select student if studentId is present in URL search params on mount ─
  const hasInitializedFromUrlRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || hasInitializedFromUrlRef.current) return;
    hasInitializedFromUrlRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const urlStudentId = urlParams.get("studentId");
    if (urlStudentId) {
      selectStudent(urlStudentId);
    }
  }, [selectStudent]);

  // ── Sync with browser Back/Forward navigation ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStudentId = urlParams.get("studentId");
      if (urlStudentId && urlStudentId !== selectedStudentId) {
        selectStudent(urlStudentId);
      } else if (!urlStudentId && selectedStudentId) {
        clearStudent();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectStudent, clearStudent, selectedStudentId]);

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
        lastLoadedStudentId,
        setLastLoadedStudentId,
        applicationTarget,
        setApplicationTarget,
        updateApplicationTarget,
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
