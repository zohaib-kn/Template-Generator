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

/** Clears all stored documents (primarily used for test cleanup). */
export function clearAllDocuments(): void {
  store.clear();
  refIndex.clear();
}
