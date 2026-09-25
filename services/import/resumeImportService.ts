/**
 * services/import/resumeImportService.ts
 *
 * Central Resume Import Engine.
 *
 * Orchestration pipeline:
 * 1. File buffer extraction (PDF / DOCX) with timeouts and error safeguards.
 * 2. Deterministic parsing (contacts, headers, regex dates).
 * 3. Gemini AI semantic classification (with retry & fallback degradation).
 * 4. Section completeness summary generation.
 * 5. CRM conflict detection against verified student profile.
 * 6. MongoDB persistence (GridFS original file storage + ResumeImportModel).
 */

import type { DocumentData } from "@/types";
import type {
  ResumeImportResult,
  DetectedSectionSummary,
} from "@/features/document-generator/types/import";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import { parsePdfBuffer } from "./parsers/pdfParser";
import { parseDocxBuffer } from "./parsers/docxParser";
import { extractPdfProfilePhoto } from "./parsers/pdfImageExtractor";
import { parseDocumentDeterministically } from "./normalizers/deterministicParser";
import { classifyResumeWithGemini } from "./normalizers/geminiResumeClassifier";
import { detectCrmConflicts } from "./normalizers/crmConflictDetector";
import { saveFileToGridFS } from "./storage/gridfsStorage";
import { ResumeImportModel } from "@/models/ResumeImport";
import { connectToDatabase } from "@/lib/db";
import { generateId } from "@/lib/generateId";
import mongoose from "mongoose";

export interface ProcessResumeUploadOptions {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  crmProfile?: NormalizedStudentProfile | null;
  studentId?: string;
  studentName?: string;
}

export function computeSectionsSummary(data: DocumentData): DetectedSectionSummary[] {
  const p = data.personal;
  const isPersonalFilled = Boolean(p?.fullName && (p.email || p.phone || p.nationality || p.photoUrl));
  const isAboutMeFilled = Boolean(data.aboutMe && data.aboutMe.trim().length > 0);
  const isEnglishFilled = Boolean(data.englishCertificate?.score);
  const isDeclarationFilled = Boolean(data.declaration && data.declaration.trim().length > 0);

  const entries: { key: keyof DocumentData; title: string; count: number; isFilled: boolean }[] = [
    { key: "personal", title: "Personal Details", count: isPersonalFilled ? 1 : 0, isFilled: isPersonalFilled },
    { key: "aboutMe", title: "Academic Profile", count: isAboutMeFilled ? 1 : 0, isFilled: isAboutMeFilled },
    { key: "education", title: "Education & Training", count: (data.education ?? []).length, isFilled: (data.education ?? []).length > 0 },
    { key: "internships", title: "Internships & Work Experience", count: (data.internships ?? []).length, isFilled: (data.internships ?? []).length > 0 },
    { key: "academicProjects", title: "Academic Projects", count: (data.academicProjects ?? []).length, isFilled: (data.academicProjects ?? []).length > 0 },
    { key: "certifications", title: "Certifications", count: (data.certifications ?? []).length, isFilled: (data.certifications ?? []).length > 0 },
    { key: "academicInterests", title: "Academic Interests", count: (data.academicInterests ?? []).length, isFilled: (data.academicInterests ?? []).length > 0 },
    { key: "achievements", title: "Achievements & Awards", count: (data.achievements ?? []).length, isFilled: (data.achievements ?? []).length > 0 },
    { key: "leadershipActivities", title: "Leadership & Extracurricular", count: (data.leadershipActivities ?? []).length, isFilled: (data.leadershipActivities ?? []).length > 0 },
    { key: "volunteering", title: "Volunteering", count: (data.volunteering ?? []).length, isFilled: (data.volunteering ?? []).length > 0 },
    { key: "languages", title: "Language Skills", count: (data.languages ?? []).length, isFilled: (data.languages ?? []).length > 0 },
    { key: "englishCertificate", title: "English Certificate / IELTS", count: isEnglishFilled ? 1 : 0, isFilled: isEnglishFilled },
    { key: "skills", title: "Academic & Transferable Skills", count: (data.skills ?? []).length, isFilled: (data.skills ?? []).length > 0 },
    { key: "hobbies", title: "Hobbies & Personal Interests", count: (data.hobbies ?? []).length, isFilled: (data.hobbies ?? []).length > 0 },
    { key: "recommendations", title: "Recommendations", count: (data.recommendations ?? []).length, isFilled: (data.recommendations ?? []).length > 0 },
    { key: "declaration", title: "Declaration", count: isDeclarationFilled ? 1 : 0, isFilled: isDeclarationFilled },
  ];

  return entries.map((entry) => ({
    sectionKey: entry.key,
    title: entry.title,
    itemCount: entry.count,
    status: entry.isFilled ? "DETECTED" : "NOT_FOUND",
  }));
}

export async function processResumeUpload(
  options: ProcessResumeUploadOptions
): Promise<ResumeImportResult> {
  const { buffer, fileName, mimeType, crmProfile, studentId, studentName } = options;
  const importId = `IMP-${generateId()}`;
  const now = new Date().toISOString();

  // 1. Store file in MongoDB GridFS
  let gridfsFileId: string | undefined;
  try {
    gridfsFileId = await saveFileToGridFS(buffer, fileName, mimeType);
  } catch (err) {
    console.warn("[resumeImportService] GridFS storage warning:", err);
  }

  // 2. Extract raw text & embedded candidate photo & structured data
  let rawText = "";
  let extractedPhotoUrl: string | undefined;
  let embeddedDocumentData: DocumentData | null = null;
  const isDocx =
    fileName.toLowerCase().endsWith(".docx") ||
    mimeType.includes("wordprocessingml");

  if (isDocx) {
    const docxResult = await parseDocxBuffer(buffer);
    rawText = docxResult.rawText;
    if (docxResult.photoDataUrl) {
      extractedPhotoUrl = docxResult.photoDataUrl;
    }
  } else {
    const [pdfResult, pdfPhoto] = await Promise.all([
      parsePdfBuffer(buffer),
      extractPdfProfilePhoto(buffer),
    ]);
    rawText = pdfResult.text;
    if (pdfPhoto) {
      extractedPhotoUrl = pdfPhoto;
    }
    if (pdfResult.embeddedData) {
      embeddedDocumentData = pdfResult.embeddedData as DocumentData;
    }
  }

  let mergedData: DocumentData;
  let ambiguousItems: import("@/features/document-generator/types/import").AmbiguousItem[] = [];
  let unmappedSnippets: string[] = [];

  if (embeddedDocumentData) {
    mergedData = {
      ...embeddedDocumentData,
      personal: {
        ...(embeddedDocumentData.personal || {}),
        photoUrl:
          extractedPhotoUrl ||
          embeddedDocumentData.personal?.photoUrl ||
          crmProfile?.personal?.photoUrl,
      },
    };
  } else {
    // 3. Deterministic Extraction
    const deterministic = parseDocumentDeterministically(rawText);

    // 4. Gemini Semantic Classification (with retries & fallback)
    const aiResult = await classifyResumeWithGemini(rawText);

    // 5. Merge Deterministic + AI Results (AI takes precedence for lists, deterministic for contacts)
    mergedData = {
      personal: {
        ...deterministic.personal,
        ...(aiResult.data.personal || {}),
        // Prefer deterministic non-empty email/phone if AI missed them
        email: deterministic.personal.email || aiResult.data.personal?.email,
        phone: deterministic.personal.phone || aiResult.data.personal?.phone,
        photoUrl:
          extractedPhotoUrl ||
          aiResult.data.personal?.photoUrl ||
          crmProfile?.personal?.photoUrl,
      },
      aboutMe: aiResult.data.aboutMe || deterministic.candidateData.aboutMe,
      education:
        aiResult.data.education && aiResult.data.education.length > 0
          ? aiResult.data.education
          : deterministic.candidateData.education,
      internships:
        aiResult.data.internships && aiResult.data.internships.length > 0
          ? aiResult.data.internships
          : deterministic.candidateData.internships,
      academicProjects: aiResult.data.academicProjects,
      certifications: aiResult.data.certifications,
      achievements: aiResult.data.achievements,
      leadershipActivities: aiResult.data.leadershipActivities,
      volunteering: aiResult.data.volunteering,
      languages:
        aiResult.data.languages && aiResult.data.languages.length > 0
          ? aiResult.data.languages
          : deterministic.candidateData.languages,
      skills:
        aiResult.data.skills && aiResult.data.skills.length > 0
          ? aiResult.data.skills
          : deterministic.candidateData.skills,
      englishCertificate: aiResult.data.englishCertificate,
      declaration: deterministic.candidateData.declaration,
    };
    ambiguousItems = aiResult.ambiguousItems;
    unmappedSnippets = deterministic.unmappedLines.slice(0, 10);
  }

  // 6. Section summaries
  const sectionsSummary = computeSectionsSummary(mergedData);

  // 7. CRM Conflicts
  const crmConflicts = detectCrmConflicts(mergedData, crmProfile);
  if (crmConflicts.length > 0) {
    // Flag conflicted sections in summary
    for (const conf of crmConflicts) {
      if (conf.field === "englishScore") {
        const sec = sectionsSummary.find((s) => s.sectionKey === "englishCertificate");
        if (sec) sec.status = "CONFLICT";
      } else {
        const sec = sectionsSummary.find((s) => s.sectionKey === "personal");
        if (sec) sec.status = "CONFLICT";
      }
    }
  }

  // 8. Build Result
  const resolvedStudentName =
    studentName ||
    mergedData.personal?.fullName ||
    crmProfile?.personal?.fullName ||
    "Student";

  const result: ResumeImportResult = {
    importId,
    fileName,
    fileSizeBytes: buffer.length,
    extractedAt: now,
    status: "NEEDS_REVIEW",
    data: mergedData,
    sectionsSummary,
    ambiguousItems,
    crmConflicts,
    unmappedSnippets,
    gridfsFileId,
  };

  // 9. Save to MongoDB in resume_imports collection
  try {
    await connectToDatabase();
    await ResumeImportModel.create({
      id: importId,
      studentId: studentId || crmProfile?.meta?.studentId,
      studentName: resolvedStudentName,
      fileName,
      fileSizeBytes: buffer.length,
      mimeType,
      gridfsFileId: gridfsFileId ? new mongoose.Types.ObjectId(gridfsFileId) : undefined,
      status: "NEEDS_REVIEW",
      rawTextSnippet: rawText.slice(0, 1500),
      extractedData: mergedData,
      sectionsSummary,
      ambiguousItems,
      crmConflicts,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    console.error("[resumeImportService] MongoDB ResumeImport record save error:", err);
  }

  return result;
}
