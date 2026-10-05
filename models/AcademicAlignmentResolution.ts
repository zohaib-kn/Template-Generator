/**
 * models/AcademicAlignmentResolution.ts
 *
 * Mongoose model for persistent counsellor academic mismatch resolutions.
 * Stored in collection "academic_alignment_resolutions".
 *
 * Scoped by (studentId, programId) compound unique index so resolutions are
 * strictly per-application and shared seamlessly across Resume Builder and SOP Generator.
 *
 * SECURITY TODO: When user/counsellor authentication is introduced, add counsellorId / tenantId
 * to track who confirmed the resolution. Currently inherits single-tenant trusted model.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { MismatchResolution } from "@/services/academicAlignment/types";

export interface AcademicAlignmentResolutionRecord {
  id: string;
  studentId: string;
  programId: string;
  sourceQualificationSnapshot: string;
  targetCourseSnapshot: string;
  resolution: MismatchResolution;
  transitionContext?: {
    reason: string;
    selectedCertifications?: string[];
    selectedProjects?: string[];
    selectedSkills?: string[];
    selectedInternships?: string[];
    relevantSubjects?: string[];
    counsellorNote?: string;
  };
  confirmedAt: string;
  updatedAt?: string;
}

export interface AcademicAlignmentResolutionDocument
  extends Omit<AcademicAlignmentResolutionRecord, "id">,
    mongoose.Document {
  id: string;
}

const AcademicAlignmentResolutionSchema = new Schema<AcademicAlignmentResolutionRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    programId: { type: String, required: true, index: true },
    sourceQualificationSnapshot: { type: String, required: true },
    targetCourseSnapshot: { type: String, required: true },
    resolution: {
      type: String,
      enum: ["INTENTIONAL_CONFIRMED", "TARGET_CORRECTED", "UNRESOLVED"],
      required: true,
      default: "UNRESOLVED",
    },
    transitionContext: {
      reason: { type: String },
      selectedCertifications: [{ type: String }],
      selectedProjects: [{ type: String }],
      selectedSkills: [{ type: String }],
      selectedInternships: [{ type: String }],
      relevantSubjects: [{ type: String }],
      counsellorNote: { type: String },
    },
    confirmedAt: { type: String, required: true },
    updatedAt: { type: String },
  },
  {
    collection: "academic_alignment_resolutions",
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

// Compound unique index ensuring one resolution per (studentId, programId) pair
AcademicAlignmentResolutionSchema.index({ studentId: 1, programId: 1 }, { unique: true });

export const AcademicAlignmentResolutionModel: Model<AcademicAlignmentResolutionRecord> =
  (mongoose.models.AcademicAlignmentResolution as Model<AcademicAlignmentResolutionRecord>) ||
  mongoose.model<AcademicAlignmentResolutionRecord>(
    "AcademicAlignmentResolution",
    AcademicAlignmentResolutionSchema
  );

export default AcademicAlignmentResolutionModel;
