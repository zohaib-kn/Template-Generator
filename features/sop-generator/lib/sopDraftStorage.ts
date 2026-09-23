/**
 * features/sop-generator/lib/sopDraftStorage.ts
 *
 * LocalStorage persistence service for SOP Generator drafts.
 * Handles saving, retrieving, updating, and deleting draft sessions locally.
 * Safe for Next.js SSR / client boundary.
 */

import { SopDraftRecord, SopDocumentType } from "../types/sop-generator";

const DRAFTS_STORAGE_KEY = "sop_saved_drafts_v1";

/**
 * Returns all saved drafts ordered by most recently saved first.
 * Backwards compatibility: drafts without documentType are assigned a default
 * based on templateId ("UNIVERSITY_SOP" if templateId indicates SOP, else "VISA_COVER_LETTER").
 */
export function getAllDrafts(): SopDraftRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return (parsed as SopDraftRecord[])
      .map((draft) => {
        if (!draft.documentType) {
          const isSop =
            draft.templateId === "university-statement-of-purpose" ||
            draft.templateId?.includes("sop");
          return {
            ...draft,
            documentType: (isSop ? "UNIVERSITY_SOP" : "VISA_COVER_LETTER") as SopDocumentType,
          };
        }
        return draft;
      })
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch (err) {
    console.error("[sopDraftStorage] Error reading drafts from localStorage:", err);
    return [];
  }
}

/**
 * Returns drafts filtered by a specific document type.
 */
export function getDraftsByDocumentType(docType: SopDocumentType): SopDraftRecord[] {
  return getAllDrafts().filter((d) => d.documentType === docType);
}

/**
 * Retrieves a single draft by its unique ID.
 */
export function getDraftById(id: string): SopDraftRecord | null {
  const drafts = getAllDrafts();
  return drafts.find((d) => d.id === id) ?? null;
}

/**
 * Retrieves the most recently saved draft, or null if none exist.
 */
export function getLatestDraft(): SopDraftRecord | null {
  const drafts = getAllDrafts();
  return drafts.length > 0 ? drafts[0] : null;
}

/**
 * Saves a new draft or updates an existing draft.
 * Returns the saved SopDraftRecord.
 */
export function saveDraft(
  draftInput: Omit<SopDraftRecord, "id" | "savedAt"> & { id?: string }
): SopDraftRecord {
  if (typeof window === "undefined") {
    throw new Error("Cannot save draft outside of browser environment");
  }

  const drafts = getAllDrafts();
  const now = new Date().toISOString();

  // If ID not provided, generate a stable slug-based or timestamped ID
  const id =
    draftInput.id ||
    `draft-${(draftInput.studentName || "student")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

  const documentType: SopDocumentType =
    draftInput.documentType ||
    (draftInput.templateId === "university-statement-of-purpose" || draftInput.templateId?.includes("sop")
      ? "UNIVERSITY_SOP"
      : "VISA_COVER_LETTER");

  const record: SopDraftRecord = {
    ...draftInput,
    documentType,
    id,
    savedAt: now,
  };

  // Replace existing if id matches, otherwise insert at top
  const existingIndex = drafts.findIndex((d) => d.id === id);
  let updatedDrafts: SopDraftRecord[];

  if (existingIndex >= 0) {
    updatedDrafts = [...drafts];
    updatedDrafts[existingIndex] = record;
  } else {
    updatedDrafts = [record, ...drafts];
  }

  try {
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
  } catch (err) {
    console.error("[sopDraftStorage] Error saving draft to localStorage:", err);
    throw err;
  }

  return record;
}

/**
 * Deletes a draft by ID.
 */
export function deleteDraft(id: string): void {
  if (typeof window === "undefined") return;

  try {
    const drafts = getAllDrafts().filter((d) => d.id !== id);
    window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (err) {
    console.error("[sopDraftStorage] Error deleting draft from localStorage:", err);
  }
}

/**
 * Clears all drafts from localStorage.
 */
export function clearAllDrafts(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(DRAFTS_STORAGE_KEY);
  } catch (err) {
    console.error("[sopDraftStorage] Error clearing drafts from localStorage:", err);
  }
}
