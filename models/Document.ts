/**
 * models/Document.ts
 *
 * Mongoose model for generated documents (SOP, RESUME, LOR).
 * Strictly mapped to DocumentRecord interface with production indexing
 * and safe PDF base64 isolation.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { DocumentRecord } from "@/services/webhook/types";

export interface DocumentDocument extends Omit<DocumentRecord, "id">, mongoose.Document {
  id: string;
}

const DocumentSchema = new Schema<DocumentRecord>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    externalReferenceId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ["SOP", "RESUME", "LOR"],
      index: true,
    },
    templateId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["GENERATED", "NEEDS_REVIEW", "FAILED", "VALIDATION_FAILED", "FINALIZED"],
      default: "GENERATED",
      index: true,
    },
    reviewUrl: {
      type: String,
      required: true,
    },
    createdAt: {
      type: String,
      required: true,
    },
    updatedAt: {
      type: String,
      required: true,
    },
    sectionContents: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sectionStatuses: {
      type: Schema.Types.Mixed,
      default: {},
    },
    validationIssues: {
      type: [Schema.Types.Mixed],
      default: [],
    } as any,
    normalizedProfile: {
      type: Schema.Types.Mixed,
      required: true,
    },
    sopContext: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    // Exclude PDF Base64 payload from standard document queries to prevent 16MB BSON and memory bloat
    pdfBase64: {
      type: String,
      select: false,
    },
    pdfFileName: {
      type: String,
    },
    pdfGeneratedAt: {
      type: String,
    },
  },
  {
    collection: "documents",
    timestamps: false, // We maintain createdAt and updatedAt explicitly as ISO-8601 strings to preserve existing API contracts
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        const copy: Record<string, unknown> & { _id?: unknown } = { ...ret };
        delete copy._id;
        return copy;
      },
    },
  }
);

// Prevent model recompilation errors in Next.js development hot-reloading
export const DocumentModel: Model<DocumentRecord> =
  (mongoose.models.Document as Model<DocumentRecord>) ||
  mongoose.model<DocumentRecord>("Document", DocumentSchema);

export default DocumentModel;
