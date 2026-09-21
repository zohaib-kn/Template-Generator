/**
 * features/document-generator/lib/resumeDraftStorage.ts
 *
 * LocalStorage persistence service for Resume Builder (Europass CV) drafts.
 * Handles saving, retrieving, updating, and deleting draft sessions locally.
 * Safe for Next.js SSR / client boundary.
 */

import type { ResumeDraftRecord } from "../types/draft";

const RESUME_DRAFTS_STORAGE_KEY = "resume_saved_drafts_v1";

/**
 * Returns all saved resume drafts ordered by most recently saved first.
 */
export function getAllResumeDrafts(): ResumeDraftRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RESUME_DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return (parsed as ResumeDraftRecord[]).sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
  } catch (err) {
    console.error("[resumeDraftStorage] Error reading drafts from localStorage:", err);
    return [];
  }
}

/**
 * Retrieves a single resume draft by its unique ID.
 */
export function getResumeDraftById(id: string): ResumeDraftRecord | null {
  const drafts = getAllResumeDrafts();
  return drafts.find((d) => d.id === id) ?? null;
}

/**
 * Retrieves the most recently saved resume draft, or null if none exist.
 */
export function getLatestResumeDraft(): ResumeDraftRecord | null {
  const drafts = getAllResumeDrafts();
  return drafts.length > 0 ? drafts[0] : null;
}

/**
 * Saves a new resume draft or updates an existing draft.
 * Returns the saved ResumeDraftRecord.
 */
export function saveResumeDraft(
  draftInput: Omit<ResumeDraftRecord, "id" | "savedAt"> & { id?: string }
): ResumeDraftRecord {
  if (typeof window === "undefined") {
    throw new Error("Cannot save resume draft outside of browser environment");
  }

  const drafts = getAllResumeDrafts();
  const now = new Date().toISOString();

  // If ID not provided, generate a stable slug-based or timestamped ID
  const id =
    draftInput.id ||
    `resume-${(draftInput.studentName || "student")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

  const record: ResumeDraftRecord = {
    ...draftInput,
    id,
    savedAt: now,
  };

  // Replace existing if id matches, otherwise insert at top
  const existingIndex = drafts.findIndex((d) => d.id === id);
  let updatedDrafts: ResumeDraftRecord[];

  if (existingIndex >= 0) {
    updatedDrafts = [...drafts];
    updatedDrafts[existingIndex] = record;
  } else {
    updatedDrafts = [record, ...drafts];
  }

  try {
    window.localStorage.setItem(
      RESUME_DRAFTS_STORAGE_KEY,
      JSON.stringify(updatedDrafts)
    );
  } catch (err) {
    console.error("[resumeDraftStorage] Error saving draft to localStorage:", err);
    throw err;
  }

  return record;
}

/**
 * Deletes a resume draft by ID.
 */
export function deleteResumeDraft(id: string): void {
  if (typeof window === "undefined") return;

  try {
    const drafts = getAllResumeDrafts().filter((d) => d.id !== id);
    window.localStorage.setItem(
      RESUME_DRAFTS_STORAGE_KEY,
      JSON.stringify(drafts)
    );
  } catch (err) {
    console.error("[resumeDraftStorage] Error deleting draft from localStorage:", err);
  }
}

/**
 * Clears all resume drafts from localStorage.
 */
export function clearAllResumeDrafts(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(RESUME_DRAFTS_STORAGE_KEY);
  } catch (err) {
    console.error("[resumeDraftStorage] Error clearing drafts from localStorage:", err);
  }
}
