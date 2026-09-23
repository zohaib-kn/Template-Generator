/**
 * models/ResumeImport.ts
 *
 * Mongoose model for Resume Import records in MongoDB Atlas.
 * Stores processing status, extracted DocumentData, section counts,
 * ambiguous items, CRM conflicts, and GridFS original file reference.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { DocumentData } from "@/types";

export interface ResumeImportRecord {
  id: string;
  studentId?: string;
  studentName: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  gridfsFileId?: mongoose.Types.ObjectId;
  status: "UPLOADING" | "PROCESSING" | "NEEDS_REVIEW" | "APPLIED" | "FAILED";
  rawTextSnippet?: string;
  extractedData: DocumentData;
  sectionsSummary: {
    sectionKey: string;
    title: string;
    itemCount: number;
    status: "DETECTED" | "NEEDS_REVIEW" | "NOT_FOUND" | "CONFLICT";
  }[];
  ambiguousItems: {
    id: string;
    originalText: string;
    suggestedSection: string;
    candidateSections: string[];
    reason: string;
  }[];
  crmConflicts: {
    field: string;
    label: string;
    crmValue: string;
    uploadedValue: string;
    resolution: "USE_CRM" | "USE_UPLOADED" | "CUSTOM";
    customValue?: string;
  }[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeImportDocument extends Omit<ResumeImportRecord, "id">, mongoose.Document {
  id: string;
}

const ResumeImportSchema = new Schema<ResumeImportRecord>(
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
    extractedData: { type: Schema.Types.Mixed, default: {} },
    sectionsSummary: { type: [Schema.Types.Mixed], default: [] } as any,
    ambiguousItems: { type: [Schema.Types.Mixed], default: [] } as any,
    crmConflicts: { type: [Schema.Types.Mixed], default: [] } as any,
    errorMessage: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "resume_imports",
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

export const ResumeImportModel: Model<ResumeImportRecord> =
  (mongoose.models.ResumeImport as Model<ResumeImportRecord>) ||
  mongoose.model<ResumeImportRecord>("ResumeImport", ResumeImportSchema);

export default ResumeImportModel;
