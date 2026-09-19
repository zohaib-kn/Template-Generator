"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  LorDocument,
  LorMetadata,
  LorInstitution,
  LorRecommender,
  LorStudent,
  LorNarrative,
  LorPresetId,
} from "../types/lor-generator";
import { DEFAULT_LOR_DATA } from "../data/defaultLorData";
import { LOR_PRESETS } from "../data/presets";

const STORAGE_KEY = "templete_generator_lor_v1";

export type LorEditorTab = "metadata" | "student" | "recommender" | "narrative";

interface LorContextValue {
  document: LorDocument;
  activePreset: LorPresetId;
  activeTab: LorEditorTab;
  isDirty: boolean;
  setActiveTab: (tab: LorEditorTab) => void;
  updateMetadata: (fields: Partial<LorMetadata>) => void;
  updateInstitution: (fields: Partial<LorInstitution>) => void;
  updateRecommender: (fields: Partial<LorRecommender>) => void;
  updateStudent: (fields: Partial<LorStudent>) => void;
  updateNarrative: (fields: Partial<LorNarrative>) => void;
  loadPreset: (presetId: LorPresetId) => void;
  resetToDefault: () => void;
}

const LorContext = createContext<LorContextValue | null>(null);

export function LorProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<LorDocument>(DEFAULT_LOR_DATA);
  const [activePreset, setActivePreset] = useState<LorPresetId>("academic_hod");
  const [activeTab, setActiveTab] = useState<LorEditorTab>("metadata");
  const [isDirty, setIsDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.metadata && parsed.institution) {
          setDocument(parsed);
          setIsDirty(true);
        }
      }
    } catch {
      // ignore parse errors
    } finally {
      setHydrated(true);
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    } catch {
      // storage quota or private mode
    }
  }, [document, hydrated]);

  const updateMetadata = useCallback((fields: Partial<LorMetadata>) => {
    setDocument((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, ...fields },
    }));
    setIsDirty(true);
  }, []);

  const updateInstitution = useCallback((fields: Partial<LorInstitution>) => {
    setDocument((prev) => ({
      ...prev,
      institution: { ...prev.institution, ...fields },
    }));
    setIsDirty(true);
  }, []);

  const updateRecommender = useCallback((fields: Partial<LorRecommender>) => {
    setDocument((prev) => ({
      ...prev,
      recommender: { ...prev.recommender, ...fields },
    }));
    setIsDirty(true);
  }, []);

  const updateStudent = useCallback((fields: Partial<LorStudent>) => {
    setDocument((prev) => ({
      ...prev,
      student: { ...prev.student, ...fields },
    }));
    setIsDirty(true);
  }, []);

  const updateNarrative = useCallback((fields: Partial<LorNarrative>) => {
    setDocument((prev) => ({
      ...prev,
      narrative: { ...prev.narrative, ...fields },
    }));
    setIsDirty(true);
  }, []);

  const loadPreset = useCallback((presetId: LorPresetId) => {
    const preset = LOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDocument({
      id: `lor-${presetId}-${Date.now()}`,
      metadata: { ...preset.data.metadata },
      institution: { ...preset.data.institution },
      recommender: { ...preset.data.recommender },
      student: { ...preset.data.student },
      narrative: { ...preset.data.narrative },
    });
    setActivePreset(presetId);
    setIsDirty(true);
  }, []);

  const resetToDefault = useCallback(() => {
    setDocument(DEFAULT_LOR_DATA);
    setActivePreset("academic_hod");
    setIsDirty(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <LorContext.Provider
      value={{
        document,
        activePreset,
        activeTab,
        isDirty,
        setActiveTab,
        updateMetadata,
        updateInstitution,
        updateRecommender,
        updateStudent,
        updateNarrative,
        loadPreset,
        resetToDefault,
      }}
    >
      {children}
    </LorContext.Provider>
  );
}

export function useLorContext(): LorContextValue {
  const ctx = useContext(LorContext);
  if (!ctx) {
    throw new Error("useLorContext must be used within a LorProvider");
  }
  return ctx;
}
