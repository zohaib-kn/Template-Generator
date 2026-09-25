/**
 * services/import/sopImportService.ts
 *
 * Central SOP Document Import Engine.
 *
 * Orchestration pipeline:
 * 1. File buffer extraction (PDF / DOCX) with timeouts and error safeguards.
 * 2. Deterministic paragraph segmentation.
 * 3. Gemini AI semantic paragraph classification and entity extraction.
 * 4. Section mapping against the 16 standard template sections.
 * 5. CRM conflict detection against verified student profile.
 * 6. MongoDB persistence (GridFS original file storage + SopImportModel).
 */

import type {
  SopImportResult,
  SopSectionSummary,
  SopParagraphBlock,
} from "@/features/sop-generator/types/import";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import { parsePdfBuffer } from "./parsers/pdfParser";
import { parseDocxBuffer } from "./parsers/docxParser";
import { segmentSopParagraphs } from "./normalizers/sopParagraphSegmenter";
import { classifySopWithGemini } from "./normalizers/geminiSopClassifier";
import { detectSopCrmConflicts } from "./normalizers/sopConflictDetector";
import { saveFileToGridFS } from "./storage/gridfsStorage";
import { SopImportModel } from "@/models/SopImport";
import { connectToDatabase } from "@/lib/db";
import { generateId } from "@/lib/generateId";
import { italyTypeDCoverLetter } from "@/features/sop-generator/templates/italy-type-d-cover-letter";
import mongoose from "mongoose";

export interface ProcessSopUploadOptions {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  crmProfile?: NormalizedStudentProfile | null;
  studentId?: string;
  studentName?: string;
}

export function computeSopSectionsSummary(
  paragraphs: SopParagraphBlock[]
): {
  sectionsSummary: SopSectionSummary[];
  sectionContents: Record<string, string>;
  unmappedParagraphs: SopParagraphBlock[];
  ambiguousItems: SopParagraphBlock[];
} {
  const templateSections = italyTypeDCoverLetter.sections;
  const sectionContents: Record<string, string> = {};
  const unmappedParagraphs: SopParagraphBlock[] = [];
  const ambiguousItems: SopParagraphBlock[] = [];

  // Group paragraphs by assigned section
  const paragraphsBySection = new Map<string, SopParagraphBlock[]>();

  for (const p of paragraphs) {
    if (p.assignedSectionId === "unmapped") {
      unmappedParagraphs.push(p);
    } else {
      const existing = paragraphsBySection.get(p.assignedSectionId) || [];
      existing.push(p);
      paragraphsBySection.set(p.assignedSectionId, existing);
    }

    if (p.isAmbiguous) {
      ambiguousItems.push(p);
    }
  }

  const sectionsSummary: SopSectionSummary[] = templateSections.map((sec) => {
    const assigned = paragraphsBySection.get(sec.id) || [];
    const count = assigned.length;
    const hasAmbiguous = assigned.some((p) => p.isAmbiguous);

    let status: "DETECTED" | "AMBIGUOUS" | "NOT_FOUND" | "CONFLICT" = "NOT_FOUND";
    if (count > 0) {
      status = hasAmbiguous ? "AMBIGUOUS" : "DETECTED";
      sectionContents[sec.id] = assigned.map((p) => p.originalText).join("\n\n");
    }

    return {
      sectionId: sec.id,
      title: sec.title,
      paragraphCount: count,
      status,
      paragraphs: assigned,
    };
  });

  return {
    sectionsSummary,
    sectionContents,
    unmappedParagraphs,
    ambiguousItems,
  };
}

export async function processSopUpload(
  options: ProcessSopUploadOptions
): Promise<SopImportResult> {
  const { buffer, fileName, mimeType, crmProfile, studentId, studentName } = options;
  const importId = `IMP-SOP-${generateId()}`;
  const now = new Date().toISOString();

  // 1. Store file in MongoDB GridFS (bucket: "document_files")
  let gridfsFileId: string | undefined;
  try {
    gridfsFileId = await saveFileToGridFS(buffer, fileName, mimeType, "document_files");
  } catch (err) {
    console.warn("[sopImportService] GridFS storage warning:", err);
  }

  // 2. Extract raw text from PDF or DOCX
  let rawText = "";
  const isDocx =
    fileName.toLowerCase().endsWith(".docx") ||
    mimeType.includes("wordprocessingml");

  if (isDocx) {
    const docxResult = await parseDocxBuffer(buffer);
    rawText = docxResult.rawText;
  } else {
    const pdfResult = await parsePdfBuffer(buffer);
    rawText = pdfResult.text;
  }

  // 3. Segment raw text into paragraph blocks
  const blocks = segmentSopParagraphs(rawText);

  // 4. Gemini Semantic Paragraph Classification & Shared Fact Extraction
  const aiResult = await classifySopWithGemini(blocks);

  // 5. Build section summary and structured sectionContents map
  const {
    sectionsSummary,
    sectionContents,
    unmappedParagraphs,
    ambiguousItems,
  } = computeSopSectionsSummary(aiResult.classifiedParagraphs);

  // 6. Detect CRM Conflicts against verified profile
  const crmConflicts = detectSopCrmConflicts(aiResult.extractedFacts, crmProfile);
  if (crmConflicts.length > 0) {
    for (const conf of crmConflicts) {
      if (conf.field === "fullName" || conf.field === "nationality" || conf.field === "passportNumber") {
        const sec = sectionsSummary.find((s) => s.sectionId === "student-introduction");
        if (sec) sec.status = "CONFLICT";
      } else if (conf.field === "ieltsScore" || conf.field === "institution" || conf.field === "percentage") {
        const sec = sectionsSummary.find((s) => s.sectionId === "academic-background");
        if (sec) sec.status = "CONFLICT";
      } else if (conf.field === "targetUniversity") {
        const sec = sectionsSummary.find((s) => s.sectionId === "why-university");
        if (sec) sec.status = "CONFLICT";
      } else if (conf.field === "targetCourse") {
        const sec = sectionsSummary.find((s) => s.sectionId === "why-course");
        if (sec) sec.status = "CONFLICT";
      }
    }
  }

  // 7. Determine canonical student name
  const resolvedStudentName =
    studentName ||
    aiResult.extractedFacts.fullName ||
    crmProfile?.personal?.fullName ||
    "Student";

  const result: SopImportResult = {
    importId,
    fileName,
    fileSizeBytes: buffer.length,
    extractedAt: now,
    status: "NEEDS_REVIEW",
    studentId: studentId || crmProfile?.meta?.studentId,
    studentName: resolvedStudentName,
    rawTextSnippet: rawText.slice(0, 1500),
    sectionContents,
    sectionsSummary,
    ambiguousItems,
    unmappedParagraphs,
    crmConflicts,
    extractedFacts: aiResult.extractedFacts,
    gridfsFileId,
  };

  // 8. Persist in MongoDB sop_imports collection
  try {
    await connectToDatabase();
    await SopImportModel.create({
      id: importId,
      studentId: studentId || crmProfile?.meta?.studentId,
      studentName: resolvedStudentName,
      fileName,
      fileSizeBytes: buffer.length,
      mimeType,
      gridfsFileId: gridfsFileId ? new mongoose.Types.ObjectId(gridfsFileId) : undefined,
      status: "NEEDS_REVIEW",
      rawTextSnippet: rawText.slice(0, 1500),
      sectionContents,
      sectionsSummary,
      ambiguousItems,
      unmappedParagraphs,
      crmConflicts,
      extractedFacts: aiResult.extractedFacts as Record<string, string>,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    console.error("[sopImportService] MongoDB SopImport save error:", err);
  }

  return result;
}
