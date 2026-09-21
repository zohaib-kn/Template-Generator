/**
 * services/ai/examples/exampleTypes.ts
 *
 * Types for senior-approved reference documents and counsellor revision learning loops.
 */

import { DocumentType } from "../config/documentTypes";

export interface ApprovedDocumentExample {
  id: string;
  documentType: DocumentType;
  destinationCountry: string;
  studyArea: string;
  educationLevel?: string;
  title: string;
  description: string;
  inputSnapshot: Record<string, unknown>;
  aiDraft?: string;
  approvedFinal: string;
  reviewerNotes: string[];
  status: "APPROVED" | "DRAFT" | "NEEDS_REVISION";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExampleRetrievalQuery {
  documentType: DocumentType;
  destinationCountry?: string;
  studyArea?: string;
  educationLevel?: string;
  limit?: number;
}
