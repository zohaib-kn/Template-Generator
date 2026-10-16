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

export const DocumentContext = createContext<DocumentContextValue | null>(null);

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

      // Normalize fresh CRM student data
      let freshResumeData: DocumentData | null = null;
      try {
        const normalized = mapCrmToNormalizedStudent(selectedStudentData, { source: "senior-crm-api" });
        const { student } = mapNormalizedToResume(normalized);
        freshResumeData = student;
      } catch (err) {
        console.warn("[DocumentProvider] Error normalizing fresh student CRM data:", err);
      }

      // 1. Check if there is an active session draft for THIS specific student in sessionStorage
      if (typeof window !== "undefined") {
        try {
          const studentStorageKey = getResumeSessionStorageKey(selectedStudentId);
          const saved = sessionStorage.getItem(studentStorageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === "object") {
              const sanitized = sanitizeCachedEducation(parsed);

              // Backfill fresh CRM English certificate (IELTS scores & sub-scores) if cached draft is incomplete
              if (freshResumeData?.englishCertificate) {
                const freshCert = freshResumeData.englishCertificate;
                const cachedCert = sanitized.englishCertificate || {};

                sanitized.englishCertificate = {
                  ...cachedCert,
                  examName: cachedCert.examName || freshCert.examName,
                  score: cachedCert.score || freshCert.score,
                  dateTaken: cachedCert.dateTaken || freshCert.dateTaken,
                  listening: cachedCert.listening || freshCert.listening,
                  reading: cachedCert.reading || freshCert.reading,
                  writing: cachedCert.writing || freshCert.writing,
                  speaking: cachedCert.speaking || freshCert.speaking,
                  trfNumber: cachedCert.trfNumber || freshCert.trfNumber,
                };
              }

              // Backfill fresh CRM achievements if cached draft does not have them
              if (
                freshResumeData?.achievements &&
                freshResumeData.achievements.length > 0 &&
                (!sanitized.achievements || sanitized.achievements.length === 0)
              ) {
                sanitized.achievements = freshResumeData.achievements;
              }

              dispatch({ type: "LOAD_STUDENT", payload: sanitized });
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
      if (freshResumeData) {
        dispatch({ type: "LOAD_STUDENT", payload: freshResumeData });
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

  // Synchronize incoming CRM IELTS subscores if active resume state is missing them
  useEffect(() => {
    if (!selectedStudentData) return;
    try {
      const normalized = mapCrmToNormalizedStudent(selectedStudentData, { source: "senior-crm-api" });
      const freshCert = normalized.tests.english;
      if (!freshCert) return;

      const currentCert = data.englishCertificate;
      const needsSync = Boolean(
        (freshCert.subscores?.listening && !currentCert?.listening) ||
        (freshCert.subscores?.reading && !currentCert?.reading) ||
        (freshCert.subscores?.writing && !currentCert?.writing) ||
        (freshCert.subscores?.speaking && !currentCert?.speaking) ||
        (freshCert.trfNumber && !currentCert?.trfNumber)
      );

      if (needsSync) {
        dispatch({
          type: "SET_ENGLISH_CERTIFICATE",
          payload: {
            ...currentCert,
            examName: currentCert?.examName || freshCert.type || "IELTS",
            score: currentCert?.score || freshCert.overallScore,
            dateTaken: currentCert?.dateTaken || freshCert.testDate,
            listening: currentCert?.listening || freshCert.subscores?.listening,
            reading: currentCert?.reading || freshCert.subscores?.reading,
            writing: currentCert?.writing || freshCert.subscores?.writing,
            speaking: currentCert?.speaking || freshCert.subscores?.speaking,
            trfNumber: currentCert?.trfNumber || freshCert.trfNumber,
          },
        });
      }
    } catch {
      // ignore sync error
    }
  }, [selectedStudentData, data.englishCertificate]);

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
