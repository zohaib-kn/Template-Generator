"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import type { DocumentData } from "@/types";
import { documentReducer, type DocumentAction } from "./documentReducer";
import { createEmptyDocumentData } from "../utils/documentDefaults";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import { mapCrmToNormalizedStudent } from "@/services/normalization/mapCrmToNormalizedStudent";
import { mapNormalizedToResume, looksLikeSubjectsList } from "@/services/normalization/mapNormalizedToResume";

// ---------------------------------------------------------------------------
// Constants & Storage Helpers
// ---------------------------------------------------------------------------

export const RESUME_STORAGE_KEY_PREFIX = "template_gen_active_resume";

export function getResumeSessionStorageKey(studentId?: string | null): string {
  if (studentId && studentId.trim().length > 0) {
    return `${RESUME_STORAGE_KEY_PREFIX}_${studentId.trim()}`;
  }
  return `${RESUME_STORAGE_KEY_PREFIX}_data`;
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface DocumentContextValue {
  data: DocumentData;
  dispatch: Dispatch<DocumentAction>;
}

const DocumentContext = createContext<DocumentContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Auto-heals cached session drafts if education qualification was previously
 * saved with a raw subjects list instead of the structured school title.
 */
function sanitizeCachedEducation(doc: DocumentData): DocumentData {
  if (!doc.education || !Array.isArray(doc.education)) return doc;
  let hasChange = false;
  const newEducation = doc.education.map((edu) => {
    const rawQual = edu.qualification ?? "";
    if (looksLikeSubjectsList(rawQual)) {
      hasChange = true;
      const is12th = /\b(physics|chemistry|biology|accountancy|economics|computer\s*science)\b/i.test(rawQual);
      const cleanTitle = is12th
        ? "Higher Secondary Education (12th)"
        : "Secondary Education (10th)";

      const existingDesc = edu.description ?? "";
      const subjectsText = `Subjects: ${rawQual}`;
      const newDesc = existingDesc.includes("Subjects:")
        ? existingDesc
        : existingDesc
        ? `${existingDesc} | ${subjectsText}`
        : subjectsText;

      return {
        ...edu,
        qualification: cleanTitle,
        description: newDesc,
      };
    }
    return edu;
  });

  return hasChange ? { ...doc, education: newEducation } : doc;
}

export function DocumentProvider({ children }: { children: ReactNode }) {
  const { selectedStudentData, selectedStudentId } = useGlobalStudent();
  const currentLoadedIdRef = useRef<string | null>(null);

  const [data, dispatch] = useReducer(
    documentReducer,
    undefined,
    () => {
      if (typeof window !== "undefined") {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const initialStudentId = urlParams.get("studentId");
          const storageKey = getResumeSessionStorageKey(initialStudentId);
          const saved = sessionStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === "object") {
              return sanitizeCachedEducation(parsed);
            }
          }
        } catch {
          // ignore parsing error
        }
      }
      return createEmptyDocumentData();
    }
  );

  // Automatically load fresh resume data whenever a new student is selected from CRM
  useEffect(() => {
    if (selectedStudentData && selectedStudentId && selectedStudentId !== currentLoadedIdRef.current) {
      currentLoadedIdRef.current = selectedStudentId;

      // 1. Check if there is an active session draft for THIS specific student in sessionStorage
      if (typeof window !== "undefined") {
        try {
          const studentStorageKey = getResumeSessionStorageKey(selectedStudentId);
          const saved = sessionStorage.getItem(studentStorageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === "object") {
              dispatch({ type: "LOAD_STUDENT", payload: sanitizeCachedEducation(parsed) });
              return;
            }
          }
        } catch (err) {
          console.warn("[DocumentProvider] Error reading student session storage:", err);
        }
      }

      // 2. If it's sample Aarav Mehta, load full testStudentData fixture
      if (selectedStudentId === "sample-aarav-mehta") {
        dispatch({ type: "LOAD_TEST_STUDENT" });
        return;
      }

      // 3. Otherwise load fresh normalized data from CRM
      try {
        const normalized = mapCrmToNormalizedStudent(selectedStudentData, { source: "senior-crm-api" });
        const { student } = mapNormalizedToResume(normalized);
        dispatch({ type: "LOAD_STUDENT", payload: student });
      } catch (err) {
        console.warn("[DocumentProvider] Failed to load selected student into resume:", err);
      }
    } else if (!selectedStudentId && currentLoadedIdRef.current !== null) {
      currentLoadedIdRef.current = null;
      if (typeof window !== "undefined") {
        try {
          const anonKey = getResumeSessionStorageKey(null);
          const saved = sessionStorage.getItem(anonKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === "object") {
              dispatch({ type: "LOAD_STUDENT", payload: parsed });
              return;
            }
          }
        } catch {}
      }
      dispatch({ type: "RESET" });
    }
  }, [selectedStudentData, selectedStudentId]);

  // Keep sessionStorage in sync for the active student
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const activeKey = getResumeSessionStorageKey(selectedStudentId);
        sessionStorage.setItem(activeKey, JSON.stringify(data));
      } catch {
        // ignore storage error
      }
    }
  }, [data, selectedStudentId]);

  const value = useMemo(() => ({ data, dispatch }), [data]);

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Raw context hook (used by useDocumentState)
// ---------------------------------------------------------------------------

export function useDocumentContext(): DocumentContextValue {
  const ctx = useContext(DocumentContext);
  if (!ctx) {
    throw new Error(
      "useDocumentContext must be called inside a <DocumentProvider>. " +
        "Ensure the component tree includes <DocumentProvider> at the root."
    );
  }
  return ctx;
}
