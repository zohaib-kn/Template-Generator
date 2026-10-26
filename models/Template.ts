/**
 * models/Template.ts
 *
 * Mongoose model for approved, immutable document templates.
 * Enforces strict 3-tier slot classifications:
 * 1. STATIC_BOILERPLATE: Invariant text (e.g. consulate address headers).
 * 2. CRM_VARIABLE: Deterministic data fields interpolated from student profiles.
 * 3. AI_NARRATIVE: Contextual student narratives synthesized by Gemini under strict token & word limits.
 */

import mongoose, { Schema, Model } from "mongoose";

export type SlotType = "STATIC_BOILERPLATE" | "CRM_VARIABLE" | "AI_NARRATIVE";

export interface TemplateSectionSlot {
  slotId: string;
  title: string;
  slotType: SlotType;
  order: number;
  required: boolean;
  
  // Tier 1: Static Boilerplate
  staticContent?: string;

  // Tier 2: CRM Interpolations
  variableMapping?: string[]; // e.g. ["student.fullName", "destination.course"]
  rawTemplateString?: string;  // e.g. "To the Respected Visa Officer, {{destination.consulate}}..."

  // Tier 3: AI Narrative Constraints
  aiPromptInstruction?: string;
  minWords?: number;
  maxWords?: number;
  prohibitedWords?: string[];
  requiredCitations?: string[];
}

export interface TemplateRecord {
  id: string; // e.g. "italy-type-d-student-visa-cover-letter"
  name: string;
  description?: string;
  documentType: "SOP" | "RESUME" | "LOR" | "VISA_COVER_LETTER";
  targetCountry?: string; // e.g. "Italy", "United Kingdom", "Global"
  targetDegreeLevel?: "BACHELORS" | "MASTERS" | "PHD";
  status: "DRAFT" | "APPROVED" | "ARCHIVED";
  version: number;
  sections: TemplateSectionSlot[];
  printLayout: {
    maxPages: number;
    marginMm: number;
    fontFamily: string;
    fontSizePt: number;
  };
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

const TemplateSectionSlotSchema = new Schema<TemplateSectionSlot>(
  {
    slotId: { type: String, required: true },
    title: { type: String, required: true },
    slotType: {
      type: String,
      required: true,
      enum: ["STATIC_BOILERPLATE", "CRM_VARIABLE", "AI_NARRATIVE"],
    },
    order: { type: Number, required: true },
    required: { type: Boolean, default: true },
    staticContent: { type: String },
    variableMapping: { type: [String], default: [] },
    rawTemplateString: { type: String },
    aiPromptInstruction: { type: String },
    minWords: { type: Number },
    maxWords: { type: Number },
    prohibitedWords: { type: [String], default: [] },
    requiredCitations: { type: [String], default: [] },
  },
  { _id: false }
);

const TemplateSchema = new Schema<TemplateRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    documentType: {
      type: String,
      required: true,
      enum: ["SOP", "RESUME", "LOR", "VISA_COVER_LETTER"],
      index: true,
    },
    targetCountry: { type: String, index: true },
    targetDegreeLevel: {
      type: String,
      enum: ["BACHELORS", "MASTERS", "PHD"],
    },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "APPROVED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    version: { type: Number, default: 1 },
    sections: { type: [TemplateSectionSlotSchema], default: [] },
    printLayout: {
      maxPages: { type: Number, default: 1 },
      marginMm: { type: Number, default: 20 },
      fontFamily: { type: String, default: "Georgia" },
      fontSizePt: { type: Number, default: 11 },
    },
    approvedAt: { type: String },
    approvedBy: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "templates",
    timestamps: false,
    versionKey: false,
  }
);

export const TemplateModel: Model<TemplateRecord> =
  (mongoose.models.Template as Model<TemplateRecord>) ||
  mongoose.model<TemplateRecord>("Template", TemplateSchema);

export default TemplateModel;
