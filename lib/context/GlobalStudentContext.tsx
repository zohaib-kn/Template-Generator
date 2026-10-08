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
import { getSampleAaravMehtaSnapshot, getSampleAafiaAmeenSnapshot } from "@/lib/sampleStudents";

// ---------------------------------------------------------------------------
// Constants & Storage Helpers
// ---------------------------------------------------------------------------

export const TARGET_STORAGE_KEY_PREFIX = "template_gen_active_target";

export function getAppTargetSessionStorageKey(studentId?: string | null): string {
  if (studentId && studentId.trim().length > 0) {
    return `${TARGET_STORAGE_KEY_PREFIX}_${studentId.trim()}`;
  }
  return `${TARGET_STORAGE_KEY_PREFIX}_general`;
}

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
  loadSampleStudent: (key: "aarav-mehta" | "aafia-ameen") => void;
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

  // Application Target — persisted in sessionStorage scoped to the active student
  const [applicationTarget, setApplicationTarget] = useState<ApplicationTarget>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlStudentId = urlParams.get("studentId");
        const key = getAppTargetSessionStorageKey(urlStudentId);
        const saved = sessionStorage.getItem(key);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Keep sessionStorage in sync with applicationTarget changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const key = getAppTargetSessionStorageKey(selectedStudentId);
        sessionStorage.setItem(key, JSON.stringify(applicationTarget));
      } catch {}
    }
  }, [applicationTarget, selectedStudentId]);

  const updateApplicationTarget = useCallback((patch: Partial<ApplicationTarget>) => {
    setApplicationTarget((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Load Sample Student (Aarav Mehta or Aafia Ameen) ─────────────────────
  const loadSampleStudent = useCallback((key: "aarav-mehta" | "aafia-ameen") => {
    const isAarav = key === "aarav-mehta";
    const studentId = isAarav ? "sample-aarav-mehta" : "sample-aafia-ameen";
    const studentName = isAarav ? "Aarav Mehta" : "Aafia Ameen";
    const snapshot = isAarav ? getSampleAaravMehtaSnapshot() : getSampleAafiaAmeenSnapshot();

    // Update URL query param for consistency
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("studentId") !== studentId) {
          url.searchParams.set("studentId", studentId);
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}
    }

    // Determine target scoped to this sample student
    let targetToSet: ApplicationTarget = {};
    if (typeof window !== "undefined") {
      try {
        const savedKey = getAppTargetSessionStorageKey(studentId);
        const saved = sessionStorage.getItem(savedKey);
        if (saved) {
          targetToSet = JSON.parse(saved);
        }
      } catch {}
    }

    if (Object.keys(targetToSet).length === 0) {
      try {
        const normalized = mapCrmToNormalizedStudent(snapshot, { source: "cached-snapshot" });
        const { target } = mapNormalizedToResume(normalized);
        targetToSet = target || {};
      } catch {
        targetToSet = {};
      }
    }

    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setSelectedStudentData(snapshot);
    setLoadStatus({ kind: "success" });
    setApplicationTarget(targetToSet);

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          getAppTargetSessionStorageKey(studentId),
          JSON.stringify(targetToSet)
        );
      } catch {}
    }
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
    queueMicrotask(() => {
      fetchStudentList();
    });
  }, [fetchStudentList]);

  // ── Select a student — fetches their full CRM data ───────────────────────
  const selectStudent = useCallback(async (id: string) => {
    if (!id) return;

    if (id === "sample-aarav-mehta") {
      loadSampleStudent("aarav-mehta");
      return;
    }
    if (id === "sample-aafia-ameen") {
      loadSampleStudent("aafia-ameen");
      return;
    }

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

    // Check if there is an existing saved target for this student in sessionStorage
    let savedTarget: ApplicationTarget | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(getAppTargetSessionStorageKey(id));
        if (raw) savedTarget = JSON.parse(raw);
      } catch {}
    }

    // Find the name from our list immediately for instant UI feedback
    const found = students.find((s) => s.id === id);
    setSelectedStudentId(id);
    setSelectedStudentName(found?.name ?? null);
    setSelectedStudentData(null);
    setLoadStatus({ kind: "loading" });
    setApplicationTarget(savedTarget || {});

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

      // Auto-extract application target from CRM snapshot if not already saved in sessionStorage
      if (!savedTarget || Object.keys(savedTarget).length === 0) {
        try {
          const normalized = mapCrmToNormalizedStudent(snapshot, { source: "senior-crm-api" });
          const { target } = mapNormalizedToResume(normalized);
          const derived = target || {};
          setApplicationTarget(derived);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(getAppTargetSessionStorageKey(id), JSON.stringify(derived));
          }
        } catch (err) {
          console.warn("[GlobalStudentContext] Could not derive target from snapshot:", err);
          setApplicationTarget({});
        }
      }

      setLoadStatus({ kind: "success" });
    } catch {
      setLoadStatus({ kind: "error", message: "Network error loading student data." });
    }
  }, [students, loadSampleStudent]);

  const clearStudent = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        if (selectedStudentId) {
          sessionStorage.removeItem(getAppTargetSessionStorageKey(selectedStudentId));
          sessionStorage.removeItem(`template_gen_active_resume_${selectedStudentId}`);
        }
        sessionStorage.removeItem(getAppTargetSessionStorageKey(null));
        sessionStorage.removeItem("template_gen_active_target");
        sessionStorage.removeItem("template_gen_active_resume_data");
        const url = new URL(window.location.href);
        if (url.searchParams.has("studentId")) {
          url.searchParams.delete("studentId");
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}
    }
    setSelectedStudentId(null);
    setSelectedStudentName(null);
    setSelectedStudentData(null);
    setLoadStatus({ kind: "idle" });
    setApplicationTarget({});
    setLastLoadedStudentId(null);
  }, [selectedStudentId]);

  // ── Auto-select student if studentId is present in URL search params on mount ─
  const hasInitializedFromUrlRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || hasInitializedFromUrlRef.current) return;
    hasInitializedFromUrlRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    const urlStudentId = urlParams.get("studentId");
    if (urlStudentId) {
      queueMicrotask(() => {
        selectStudent(urlStudentId);
      });
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
        loadSampleStudent,
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
