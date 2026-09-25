/**
 * models/SopImport.ts
 *
 * Mongoose model for SOP Import records in MongoDB Atlas.
 * Stores processing status, extracted section contents, paragraph blocks,
 * ambiguous items, CRM conflicts, and GridFS original file reference.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { SopImportResult } from "@/features/sop-generator/types/import";

export interface SopImportRecord {
  id: string;
  studentId?: string;
  studentName: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  gridfsFileId?: mongoose.Types.ObjectId;
  status: "UPLOADING" | "PROCESSING" | "NEEDS_REVIEW" | "APPLIED" | "FAILED";
  rawTextSnippet?: string;
  sectionContents: Record<string, string>;
  sectionsSummary: {
    sectionId: string;
    title: string;
    paragraphCount: number;
    status: "DETECTED" | "AMBIGUOUS" | "NOT_FOUND" | "CONFLICT";
    paragraphs: Array<{
      id: string;
      originalText: string;
      assignedSectionId: string;
      isAmbiguous: boolean;
      candidateSections: string[];
      reason?: string;
      sourceIndex: number;
    }>;
  }[];
  ambiguousItems: Array<{
    id: string;
    originalText: string;
    assignedSectionId: string;
    isAmbiguous: boolean;
    candidateSections: string[];
    reason?: string;
    sourceIndex: number;
  }>;
  unmappedParagraphs: Array<{
    id: string;
    originalText: string;
    assignedSectionId: string;
    isAmbiguous: boolean;
    candidateSections: string[];
    reason?: string;
    sourceIndex: number;
  }>;
  crmConflicts: Array<{
    field: string;
    label: string;
    crmValue: string;
    uploadedValue: string;
    resolution: "USE_CRM" | "USE_UPLOADED" | "CUSTOM";
    customValue?: string;
  }>;
  extractedFacts: Record<string, string>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SopImportDocument extends Omit<SopImportRecord, "id">, mongoose.Document {
  id: string;
}

const SopImportSchema = new Schema<SopImportRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, sparse: true, index: true },
    studentName: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    mimeType: { type: String, required: true },
    gridfsFileId: { type: Schema.Types.ObjectId },
    status: {
      type: String,
      required: true,
      enum: ["UPLOADING", "PROCESSING", "NEEDS_REVIEW", "APPLIED", "FAILED"],
      default: "PROCESSING",
      index: true,
    },
    rawTextSnippet: { type: String },
    sectionContents: { type: Schema.Types.Mixed, default: {} },
    sectionsSummary: { type: [Schema.Types.Mixed], default: [] } as any,
    ambiguousItems: { type: [Schema.Types.Mixed], default: [] } as any,
    unmappedParagraphs: { type: [Schema.Types.Mixed], default: [] } as any,
    crmConflicts: { type: [Schema.Types.Mixed], default: [] } as any,
    extractedFacts: { type: Schema.Types.Mixed, default: {} },
    errorMessage: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "sop_imports",
    timestamps: false,
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

export const SopImportModel: Model<SopImportRecord> =
  (mongoose.models.SopImport as Model<SopImportRecord>) ||
  mongoose.model<SopImportRecord>("SopImport", SopImportSchema);

export default SopImportModel;
