/**
 * models/ResumeDraft.ts
 *
 * Mongoose model for persisted editable Resume Builder drafts in MongoDB Atlas.
 * Stored in collection "resume_drafts".
 */

import mongoose, { Schema, Model } from "mongoose";
import type { ResumeDraftRecord } from "@/features/document-generator/types/draft";

export interface ResumeDraftDocument extends Omit<ResumeDraftRecord, "id">, mongoose.Document {
  id: string;
}

const ResumeDraftSchema = new Schema<ResumeDraftRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentName: { type: String, required: true },
    targetUniversity: { type: String },
    intendedCourse: { type: String },
    destinationCountry: { type: String },
    savedAt: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    applicationTarget: { type: Schema.Types.Mixed },
    origin: {
      type: String,
      enum: ["MANUAL", "CRM", "IMPORTED"],
      default: "MANUAL",
    },
    sourceFileName: { type: String },
    importId: { type: String, sparse: true, index: true },
    dbId: { type: String },
  },
  {
    collection: "resume_drafts",
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

export const ResumeDraftModel: Model<ResumeDraftRecord> =
  (mongoose.models.ResumeDraft as Model<ResumeDraftRecord>) ||
  mongoose.model<ResumeDraftRecord>("ResumeDraft", ResumeDraftSchema);

export default ResumeDraftModel;
