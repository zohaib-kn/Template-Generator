/**
 * services/ai/config/documentTypes.ts
 *
 * Supported document types for the AI Document Generation Architecture.
 */

export const DOCUMENT_TYPES = {
  VISA_COVER_LETTER: "VISA_COVER_LETTER",
  SOP: "SOP",
  LOR: "LOR",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const SUPPORTED_DOCUMENT_TYPES: DocumentType[] = [
  DOCUMENT_TYPES.VISA_COVER_LETTER,
  DOCUMENT_TYPES.SOP,
  DOCUMENT_TYPES.LOR,
];

export function isValidDocumentType(type: unknown): type is DocumentType {
  return (
    typeof type === "string" &&
    SUPPORTED_DOCUMENT_TYPES.includes(type as DocumentType)
  );
}
