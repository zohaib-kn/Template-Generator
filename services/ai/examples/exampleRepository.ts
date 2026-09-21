/**
 * services/ai/examples/exampleRepository.ts
 *
 * Repository abstraction for storing and retrieving approved document examples and drafts.
 * Supports the counsellor revision learning loop:
 *   AI Draft -> Senior Edits -> Approved Final -> Saved for future retrieval
 */

import { ApprovedDocumentExample } from "./exampleTypes";
import { SEED_APPROVED_EXAMPLES } from "./seedExamples";
import { DocumentType } from "../config/documentTypes";

class ExampleRepository {
  private examples: Map<string, ApprovedDocumentExample> = new Map();

  constructor() {
    // Initialize repository with seed approved documents
    for (const ex of SEED_APPROVED_EXAMPLES) {
      this.examples.set(ex.id, { ...ex });
    }
  }

  /**
   * Retrieves all active approved examples, optionally filtered by document type.
   */
  async getApprovedExamples(documentType?: DocumentType): Promise<ApprovedDocumentExample[]> {
    const list = Array.from(this.examples.values()).filter(
      (ex) => ex.active && ex.status === "APPROVED"
    );

    if (documentType) {
      return list.filter((ex) => ex.documentType === documentType);
    }
    return list;
  }

  /**
   * Saves or registers an AI draft before counsellor edits.
   */
  async saveAIDraft(params: {
    id?: string;
    documentType: DocumentType;
    destinationCountry: string;
    studyArea: string;
    educationLevel?: string;
    title: string;
    inputSnapshot: Record<string, unknown>;
    aiDraft: string;
  }): Promise<ApprovedDocumentExample> {
    const id = params.id || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const record: ApprovedDocumentExample = {
      id,
      documentType: params.documentType,
      destinationCountry: params.destinationCountry,
      studyArea: params.studyArea,
      educationLevel: params.educationLevel,
      title: params.title,
      description: "AI draft awaiting counsellor review and approval.",
      inputSnapshot: params.inputSnapshot,
      aiDraft: params.aiDraft,
      approvedFinal: "",
      reviewerNotes: [],
      status: "DRAFT",
      active: false,
      createdAt: now,
      updatedAt: now,
    };

    this.examples.set(id, record);
    return record;
  }

  /**
   * Saves a counsellor-approved final document into the learning pool.
   */
  async saveApprovedFinal(params: {
    id?: string;
    documentType: DocumentType;
    destinationCountry: string;
    studyArea: string;
    educationLevel?: string;
    title: string;
    description?: string;
    inputSnapshot?: Record<string, unknown>;
    aiDraft?: string;
    approvedFinal: string;
    reviewerNotes?: string[];
  }): Promise<ApprovedDocumentExample> {
    const id = params.id || `approved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const existing = params.id ? this.examples.get(params.id) : undefined;

    const record: ApprovedDocumentExample = {
      id,
      documentType: params.documentType,
      destinationCountry: params.destinationCountry,
      studyArea: params.studyArea,
      educationLevel: params.educationLevel || existing?.educationLevel,
      title: params.title || existing?.title || `Approved ${params.documentType}`,
      description: params.description || existing?.description || "Senior-approved exemplar.",
      inputSnapshot: params.inputSnapshot || existing?.inputSnapshot || {},
      aiDraft: params.aiDraft || existing?.aiDraft,
      approvedFinal: params.approvedFinal,
      reviewerNotes: params.reviewerNotes || existing?.reviewerNotes || [],
      status: "APPROVED",
      active: true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.examples.set(id, record);
    return record;
  }

  /**
   * Appends reviewer notes or feedback to an existing example.
   */
  async saveReviewerFeedback(id: string, notes: string[]): Promise<boolean> {
    const existing = this.examples.get(id);
    if (!existing) return false;

    existing.reviewerNotes.push(...notes);
    existing.updatedAt = new Date().toISOString();
    return true;
  }
}

export const exampleRepository = new ExampleRepository();
