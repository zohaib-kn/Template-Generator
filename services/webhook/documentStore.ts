/**
 * services/webhook/documentStore.ts
 *
 * In-memory document store for generated documents (Phase 2).
 *
 * Architecture note:
 * - Module-level / global singleton Map<string, DocumentRecord>.
 * - Persisted across HMR reloads in Next.js dev server via globalThis.
 * - Idempotency lookup by externalReferenceId.
 * - When upgrading to an external database (e.g. Postgres / MongoDB),
 *   only this file needs to be replaced.
 */

import type { DocumentRecord } from "./types";
import { generateId } from "@/lib/generateId";

const globalForStore = globalThis as unknown as {
  __documentStoreMap?: Map<string, DocumentRecord>;
  __externalRefIndex?: Map<string, string>; // externalReferenceId -> documentId
};

const store: Map<string, DocumentRecord> =
  globalForStore.__documentStoreMap ?? new Map<string, DocumentRecord>();
const refIndex: Map<string, string> =
  globalForStore.__externalRefIndex ?? new Map<string, string>();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__documentStoreMap = store;
  globalForStore.__externalRefIndex = refIndex;
}

export function generateDocumentId(): string {
  return `DOC-${generateId()}`;
}

export function saveDocument(record: DocumentRecord): DocumentRecord {
  store.set(record.id, record);
  if (record.externalReferenceId?.trim()) {
    refIndex.set(record.externalReferenceId.trim(), record.id);
  }
  return record;
}

export function findById(id: string): DocumentRecord | null {
  if (!id) return null;
  return store.get(id.trim()) ?? null;
}

export function findByExternalRef(externalRefId: string): DocumentRecord | null {
  if (!externalRefId?.trim()) return null;
  const docId = refIndex.get(externalRefId.trim());
  if (!docId) return null;
  return store.get(docId) ?? null;
}

export function getAllDocuments(): DocumentRecord[] {
  return Array.from(store.values());
}

export function updateDocument(
  id: string,
  updates: Partial<DocumentRecord>
): DocumentRecord | null {
  const existing = findById(id);
  if (!existing) return null;

  const updated: DocumentRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  store.set(existing.id, updated);
  return updated;
}

export function savePdf(
  documentId: string,
  pdfBase64: string,
  fileName?: string
): DocumentRecord | null {
  const existing = findById(documentId);
  if (!existing) return null;

  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

  const updated: DocumentRecord = {
    ...existing,
    status: "FINALIZED",
    pdfBase64: cleanBase64,
    pdfFileName: fileName || `${existing.studentName || "Document"}_Final.pdf`,
    pdfGeneratedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.set(existing.id, updated);
  return updated;
}

export function getPdf(
  documentId: string
): { buffer: Buffer; fileName: string; status: string } | null {
  const doc = findById(documentId);
  if (!doc || !doc.pdfBase64) return null;

  const cleanBase64 = doc.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  const fileName = doc.pdfFileName || `${doc.studentName || "Document"}_Final.pdf`;

  return {
    buffer,
    fileName,
    status: doc.status,
  };
}

/** Clears all stored documents (primarily used for test cleanup). */
export function clearAllDocuments(): void {
  store.clear();
  refIndex.clear();
}
