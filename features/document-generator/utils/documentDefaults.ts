import type { DocumentData } from "@/types";

/**
 * Returns a completely blank DocumentData so the editor starts empty,
 * and resetting/clearing returns to a clean slate.
 */
export function createEmptyDocumentData(): DocumentData {
  return {};
}
