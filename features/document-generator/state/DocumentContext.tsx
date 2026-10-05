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
import { mapNormalizedToResume } from "@/services/normalization/mapNormalizedToResume";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESUME_STORAGE_KEY = "template_gen_active_resume_data";

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

export function DocumentProvider({ children }: { children: ReactNode }) {
  const { selectedStudentData, selectedStudentId } = useGlobalStudent();
  const currentLoadedIdRef = useRef<string | null>(null);

  const [data, dispatch] = useReducer(
    documentReducer,
    undefined,
    () => {
      if (typeof window !== "undefined") {
        try {
          const saved = sessionStorage.getItem(RESUME_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === "object") {
              return parsed;
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
      try {
        const normalized = mapCrmToNormalizedStudent(selectedStudentData, { source: "senior-crm-api" });
        const { student } = mapNormalizedToResume(normalized);
        dispatch({ type: "LOAD_STUDENT", payload: student });
      } catch (err) {
        console.warn("[DocumentProvider] Failed to load selected student into resume:", err);
      }
    } else if (!selectedStudentId && currentLoadedIdRef.current !== null) {
      currentLoadedIdRef.current = null;
    }
  }, [selectedStudentData, selectedStudentId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(data));
      } catch {
        // ignore storage error
      }
    }
  }, [data]);

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
