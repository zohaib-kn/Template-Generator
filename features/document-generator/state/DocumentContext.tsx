"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { DocumentData } from "@/types";
import { documentReducer, type DocumentAction } from "./documentReducer";
import { createEmptyDocumentData } from "../utils/documentDefaults";

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
  const [data, dispatch] = useReducer(
    documentReducer,
    undefined,
    createEmptyDocumentData
  );
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
