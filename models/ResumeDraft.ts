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
    /**
     * CRM student _id — populated from Phase 0 onwards.
     * sparse: true preserves compatibility with pre-Phase-0 drafts that
     * have no studentId. Such drafts are excluded from alignment evidence
     * queries but continue to load/render normally in the Resume Builder.
     */
    studentId: { type: String, sparse: true, index: true },
    /**
     * NormalizedAppliedProgram.id for the target application at save time.
     * sparse: true preserves compatibility with pre-Phase-0 drafts.
     * Combined with studentId via the compound index to scope evidence
     * retrieval to a single student + application pair.
     */
    programId: { type: String, sparse: true, index: true },
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

// Compound index for backend alignment evidence retrieval:
//   ResumeDraftModel.findOne({ studentId, programId }).sort({ savedAt: -1 })
// Powers: "get the most recent resume draft for this student + this specific application"
// Prevents: Business Analytics resume evidence leaking into Mechanical Engineering SOP
ResumeDraftSchema.index({ studentId: 1, programId: 1, savedAt: -1 });

export const ResumeDraftModel: Model<ResumeDraftRecord> =
  (mongoose.models.ResumeDraft as Model<ResumeDraftRecord>) ||
  mongoose.model<ResumeDraftRecord>("ResumeDraft", ResumeDraftSchema);

export default ResumeDraftModel;
