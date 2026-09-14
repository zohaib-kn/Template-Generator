import type { DocumentData } from "@/types";
import { referenceCvData } from "../data/sampleCvData";

/**
 * Returns initial DocumentData populated with the reference sample fixture.
 * This guarantees the live preview renders faithfully matching the provided PDF
 * while remaining 100% reactive to form changes.
 */
export function createEmptyDocumentData(): DocumentData {
  return JSON.parse(JSON.stringify(referenceCvData));
}
