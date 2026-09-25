/**
 * models/SopDraft.ts
 *
 * Mongoose model for persisted editable SOP Generator drafts in MongoDB Atlas.
 * Stored in collection "sop_drafts".
 */

import mongoose, { Schema, Model } from "mongoose";
import type { SopDraftRecord } from "@/features/sop-generator/types/sop-generator";

export interface SopDraftDocument extends Omit<SopDraftRecord, "id">, mongoose.Document {
  id: string;
}

const SopDraftSchema = new Schema<SopDraftRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    documentType: {
      type: String,
      enum: ["VISA_COVER_LETTER", "UNIVERSITY_SOP"],
      default: "VISA_COVER_LETTER",
    },
    studentName: { type: String, required: true },
    course: { type: String },
    university: { type: String },
    templateId: { type: String, required: true },
    savedAt: { type: String, required: true },
    sectionContents: { type: Schema.Types.Mixed, required: true },
    sectionStatuses: { type: Schema.Types.Mixed, required: true },
    docApproved: { type: Boolean, default: false },
    ctx: { type: Schema.Types.Mixed, required: true },
    currentSource: { type: String, default: "live-crm" },
    loadedStudentName: { type: String },
    origin: {
      type: String,
      enum: ["MANUAL", "CRM", "IMPORTED"],
      default: "MANUAL",
    },
    sourceFileName: { type: String },
    importId: { type: String, sparse: true, index: true },
  },
  {
    collection: "sop_drafts",
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

export const SopDraftModel: Model<SopDraftRecord> =
  (mongoose.models.SopDraft as Model<SopDraftRecord>) ||
  mongoose.model<SopDraftRecord>("SopDraft", SopDraftSchema);

export default SopDraftModel;
