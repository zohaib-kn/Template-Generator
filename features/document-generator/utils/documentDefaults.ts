import type { DocumentData } from "@/types";

/**
 * Returns a completely blank DocumentData so the editor starts empty,
 * ready for the editor to fill in a new student's details.
 */
export function createEmptyDocumentData(): DocumentData {
  return {};
}
