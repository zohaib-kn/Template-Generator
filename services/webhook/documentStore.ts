/**
 * services/webhook/documentStore.ts
 *
 * Production Document Storage Layer backed by MongoDB Atlas (Mongoose).
 *
 * Architecture:
 * - Backed by MongoDB Atlas via DocumentModel.
 * - Idempotency handled via unique index on externalReferenceId and findByExternalRef.
 * - PDF Base64 isolation: excluded from standard document lookups, loaded only in getPdf.
 * - Safe PDF size limits (10MB binary threshold) to prevent BSON document size overflows.
 * - Safe unit test mode: when running under test runner (NODE_ENV=test or --test),
 *   operates in-memory to prevent mutating the live production Atlas database.
 */

import type { DocumentRecord } from "./types";
import { generateId } from "@/lib/generateId";
import { connectToDatabase } from "@/lib/db";
import { DocumentModel } from "@/models/Document";

/** Maximum allowed PDF binary size: 10 MB (safe below 16MB BSON limit) */
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export class PdfSizeLimitError extends Error {
  constructor(message: string = "PDF file exceeds the maximum allowed size limit of 10MB.") {
    super(message);
    this.name = "PdfSizeLimitError";
  }
}

/**
 * Strips internal MongoDB metadata (_id, __v) and returns a clean DocumentRecord.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripMongoMeta(doc: any): DocumentRecord {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.__v;
  return obj as DocumentRecord;
}

// ---------------------------------------------------------------------------
// In-Memory Test Mode Store (isolated for unit tests only)
// ---------------------------------------------------------------------------

function isTestEnvironment(): boolean {
  if (process.env.FORCE_MONGO === "true") return false;
  return (
    process.env.NODE_ENV === "test" ||
    process.argv.some(
      (arg) =>
        arg.includes("--test") ||
        arg.includes("__tests__") ||
        arg.includes(".test.ts") ||
        arg.includes(".test.js")
    ) ||
    process.execArgv.some((arg) => arg.includes("--test"))
  );
}

const memoryStore: Map<string, DocumentRecord> = new Map<string, DocumentRecord>();
const memoryRefIndex: Map<string, string> = new Map<string, string>();

// ---------------------------------------------------------------------------
// Public Store API
// ---------------------------------------------------------------------------

export function generateDocumentId(): string {
  return `DOC-${generateId()}`;
}

/**
 * Saves a new DocumentRecord.
 * In MongoDB, if a concurrent request attempts to insert the same externalReferenceId,
 * handles duplicate key errors gracefully by returning the existing document.
 */
export async function saveDocument(record: DocumentRecord): Promise<DocumentRecord> {
  if (isTestEnvironment()) {
    memoryStore.set(record.id, record);
    if (record.externalReferenceId?.trim()) {
      memoryRefIndex.set(record.externalReferenceId.trim(), record.id);
    }
    return record;
  }

  await connectToDatabase();

  try {
    const created = await DocumentModel.create(record);
    return stripMongoMeta(created);
  } catch (err: unknown) {
    // Handle concurrent duplicate externalReferenceId (E11000)
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      if (record.externalReferenceId) {
        const existing = await findByExternalRef(record.externalReferenceId);
        if (existing) return existing;
      }
    }
    throw err;
  }
}

/**
 * Retrieves a document by its DOC-* identifier.
 * Note: pdfBase64 is excluded by default for performance.
 */
export async function findById(id: string): Promise<DocumentRecord | null> {
  if (!id) return null;
  const trimmed = id.trim();

  if (isTestEnvironment()) {
    return memoryStore.get(trimmed) ?? null;
  }

  await connectToDatabase();
  const doc = await DocumentModel.findOne({ id: trimmed }).lean();
  if (!doc) return null;

  return stripMongoMeta(doc);
}

/**
 * Retrieves a document by upstream CRM externalReferenceId (for idempotency).
 */
export async function findByExternalRef(externalRefId: string): Promise<DocumentRecord | null> {
  if (!externalRefId?.trim()) return null;
  const trimmed = externalRefId.trim();

  if (isTestEnvironment()) {
    const docId = memoryRefIndex.get(trimmed);
    if (!docId) return null;
    return memoryStore.get(docId) ?? null;
  }

  await connectToDatabase();
  const doc = await DocumentModel.findOne({ externalReferenceId: trimmed }).lean();
  if (!doc) return null;

  return stripMongoMeta(doc);
}

/**
 * Retrieves all documents ordered by creation date descending.
 */
export async function getAllDocuments(): Promise<DocumentRecord[]> {
  if (isTestEnvironment()) {
    return Array.from(memoryStore.values());
  }

  await connectToDatabase();
  const docs = await DocumentModel.find({}).sort({ createdAt: -1 }).lean();
  return docs.map(stripMongoMeta);
}

/**
 * Updates an existing document with partial fields.
 */
export async function updateDocument(
  id: string,
  updates: Partial<DocumentRecord>
): Promise<DocumentRecord | null> {
  if (!id) return null;
  const trimmed = id.trim();

  if (isTestEnvironment()) {
    const existing = memoryStore.get(trimmed);
    if (!existing) return null;

    const updated: DocumentRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    memoryStore.set(trimmed, updated);
    return updated;
  }

  await connectToDatabase();
  const updated = await DocumentModel.findOneAndUpdate(
    { id: trimmed },
    {
      $set: {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
    },
    { returnDocument: "after" }
  ).lean();

  if (!updated) return null;
  return stripMongoMeta(updated);
}

/**
 * Persists finalized PDF base64 binary and marks document as FINALIZED.
 * Validates and enforces maximum PDF size limit (10MB).
 */
export async function savePdf(
  documentId: string,
  pdfBase64: string,
  fileName?: string
): Promise<DocumentRecord | null> {
  if (!documentId || !pdfBase64) return null;
  const trimmedId = documentId.trim();

  const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

  // Enforce binary size limit: Base64 length * (3/4) = approximate byte size
  const estimatedBytes = Math.ceil((cleanBase64.length * 3) / 4);
  if (estimatedBytes > MAX_PDF_SIZE_BYTES) {
    throw new PdfSizeLimitError(
      `PDF size of ${(estimatedBytes / (1024 * 1024)).toFixed(
        2
      )}MB exceeds maximum allowed limit of 10MB.`
    );
  }

  const now = new Date().toISOString();

  if (isTestEnvironment()) {
    const existing = memoryStore.get(trimmedId);
    if (!existing) return null;

    const updated: DocumentRecord = {
      ...existing,
      status: "FINALIZED",
      pdfBase64: cleanBase64,
      pdfFileName: fileName || `${existing.studentName || "Document"}_Final.pdf`,
      pdfGeneratedAt: now,
      updatedAt: now,
    };
    memoryStore.set(trimmedId, updated);
    return updated;
  }

  await connectToDatabase();
  const existing = await DocumentModel.findOne({ id: trimmedId }).lean();
  if (!existing) return null;

  const pdfFileName = fileName || `${existing.studentName || "Document"}_Final.pdf`;

  const updated = await DocumentModel.findOneAndUpdate(
    { id: trimmedId },
    {
      $set: {
        status: "FINALIZED",
        pdfBase64: cleanBase64,
        pdfFileName,
        pdfGeneratedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  ).lean();

  if (!updated) return null;
  return stripMongoMeta(updated);
}

/**
 * Retrieves the raw PDF binary buffer and metadata.
 * Explicitly includes the pdfBase64 field which is omitted by default.
 */
export async function getPdf(
  documentId: string
): Promise<{ buffer: Buffer; fileName: string; status: string; pdfBase64: string } | null> {
  if (!documentId) return null;
  const trimmedId = documentId.trim();

  if (isTestEnvironment()) {
    const doc = memoryStore.get(trimmedId);
    if (!doc || !doc.pdfBase64) return null;

    const cleanBase64 = doc.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const fileName = doc.pdfFileName || `${doc.studentName || "Document"}_Final.pdf`;

    return {
      buffer,
      fileName,
      status: doc.status,
      pdfBase64: cleanBase64,
    };
  }

  await connectToDatabase();
  const doc = await DocumentModel.findOne({ id: trimmedId })
    .select("+pdfBase64")
    .lean();

  if (!doc || !doc.pdfBase64) return null;

  const cleanBase64 = doc.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  const fileName = doc.pdfFileName || `${doc.studentName || "Document"}_Final.pdf`;

  return {
    buffer,
    fileName,
    status: doc.status,
    pdfBase64: cleanBase64,
  };
}

/**
 * Clears stored documents.
 * Safeguard: NEVER drops or deletes from live MongoDB Atlas database.
 * Only clears the in-memory test store during automated test runs.
 */
export async function clearAllDocuments(): Promise<void> {
  memoryStore.clear();
  memoryRefIndex.clear();
}
