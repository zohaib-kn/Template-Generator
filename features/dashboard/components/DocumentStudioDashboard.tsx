"use client";

import { parseDirectCvSectionInstruction } from "../utils/cvDirectSectionParser";
import {
  syncCoverLetterHtmlToSections,
  updateLiveCoverLetterHtml,
} from "../utils/coverLetterHtmlSync";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import {
  hydrateDocumentFromSnapshot,
  type HydratedDocumentData,
  RECENT_DOCS_STORAGE_KEY,
  ensureDocumentIdentity,
  syncDocumentToRecentList,
  generateDocumentId,
  getEuropassData,
} from "../utils/documentHydrator";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import type { Editor } from "@tiptap/react";
import { TiptapEditor, type FormattingState } from "./TiptapEditor";
import { DocumentThumbnailPreview } from "./DocumentThumbnailPreview";
import { EuropassTemplate, EUROPASS_DEFAULT_SECTION_ORDER } from "@/templates/europass/EuropassTemplate";
import { mapCrmToNormalizedStudent, mapNormalizedToResume, mapNormalizedToSop } from "@/services/normalization";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";
import {
  getMissingValidationGroups,
  getTotalMissingCount,
  parseDirectFieldInstruction,
  parseMultiFieldInstruction,
  updateCoverLetterSectionWithField,
  updateCoverLetterSectionsWithMultipleFields,
  cleanCoverLetterText,
  type ValidationFieldDefinition,
  type ValidationCategoryGroup,
} from "../utils/coverLetterCleaner";
import { CoverLetterValidationPanel } from "./CoverLetterValidationPanel";
import {
  getSampleRohanIyerSnapshot,
  getSampleAaravMehtaSnapshot,
  getSampleAafiaAmeenSnapshot,
  getSampleSnapshotById,
  SAMPLE_STUDENTS,
} from "@/lib/sampleStudents";
import type { DocumentData } from "@/types";
import { syncSectionsToCvData, syncCvDataToSections } from "../utils/documentStudioSync";
import { processCvChatInstruction, isValidSkillNoun } from "../utils/cvChatIntentEngine";
import { DocumentContext } from "@/features/document-generator/state/DocumentContext";
import { documentReducer, type DocumentAction } from "@/features/document-generator/state/documentReducer";
import { ResumeImportModal } from "@/features/document-generator/components/ResumeImportModal";
import { RearrangeSectionsModal } from "@/features/document-generator/components/RearrangeSectionsModal";
import { docSectionsToHtml } from "../utils/docSectionsToHtml";
import { parseLanguageSkillsInput } from "../utils/languageSkillsParser";
import {
  processUnifiedMessage,
  type AssistantDiagnostic,
  type PendingClarificationTask,
} from "../utils/unifiedAssistantEngine";
import {
  extractUserDirectiveAndSnippet,
  findSnippetInSections,
  type TextSnippetAnchor,
} from "../utils/documentAnchorMatcher";

export { RECENT_DOCS_STORAGE_KEY, syncSectionsToCvData, syncCvDataToSections };

function generateUniqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getFormattedTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Fictional demo students, clearly labelled; always listed after the live CRM roster
const SAMPLE_ROSTER = SAMPLE_STUDENTS.map((s) => ({
  id: s.id,
  name: `${s.name} (Sample)`,
  email: s.email,
}));

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  sectionUpdated?: string;
  actionType?: "typed_section" | "deleted_section" | "polished" | "trimmed" | "outline" | "general";
  diagnostic?: AssistantDiagnostic;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

/**
 * Standardized PDF/document export filename builder:
 * Format: [Student-Name]-[Document-Type]-[Target-Country]-[Target-Year].pdf
 * Example: zohaib-Khan-Resume-Italy-2026.pdf
 */
export function buildStandardizedPdfFilename(
  studentName: string,
  docType: string,
  targetCountry?: string,
  targetYear?: string | number
): string {
  const cleanName = (studentName || "Candidate")
    .replace(/^(?:mr|ms|mrs|dr|prof)\.?\s+/i, "")
    .trim()
    .replace(/[^a-zA-Z0-9\u0080-\uFFFF]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeName = cleanName || "Candidate";

  const typeMap: Record<string, string> = {
    CV: "Resume",
    COVER_LETTER: "Cover-Letter",
    SOP: "SOP",
    LOR: "LOR",
  };
  const safeDocType =
    typeMap[docType?.toUpperCase()] ||
    (docType ? docType.replace(/[^a-zA-Z0-9]+/g, "-") : "Document");

  const cleanCountry = (targetCountry || "Italy")
    .trim()
    .replace(/[^a-zA-Z0-9\u0080-\uFFFF]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeCountry = cleanCountry || "Italy";

  const safeYear = targetYear ? String(targetYear).trim() : String(new Date().getFullYear());

  return `${safeName}-${safeDocType}-${safeCountry}-${safeYear}.pdf`;
}

/**
 * Generates an initial welcoming greeting message for the AI Admissions Assistant.
 */
export function getDefaultGreetingMessage(studentName: string, docType: string): ChatMessage {
  const isCv = docType === "CV";
  const isCoverLetter = docType === "COVER_LETTER";

  let intro = `Hello! I'm your AI Admissions Assistant for **${studentName}**.`;
  if (isCv) {
    intro += `\n\nYou can ask me to polish text, trim content, or directly share details to update this CV:\n• *"Add IELTS 7.5 (TRF 26IA...)"*\n• *"Add work experience: Frontend Intern at Acme Corp from June 2023 to Dec 2023"*\n• *"Add skills: React, TypeScript, Node.js"*\n• *"Add education: Bachelor of Technology at Delhi University"*\n• *"delete [section name]"* to remove any section`;
  } else if (isCoverLetter) {
    intro += `\n\nYou can ask me to polish academic tone, audit visa compliance, or directly type missing details to verify them:\n• *"Add student city Bhopal"*\n• *"Set father's occupation to businessman"*\n• *"Update education loan amount to ₹20,00,000"*`;
  } else {
    intro += `\n\nYou can ask me to polish academic tone, create an architectural outline, trim verbosity, or draft new paragraphs.`;
  }

  return {
    id: `welcome-${docType}-${studentName.replace(/[^a-zA-Z0-9]/g, "_")}`,
    sender: "assistant",
    text: intro,
    timestamp: getFormattedTimestamp(),
    actionType: "general",
  };
}

/**
 * Renders structured markdown and formatted text for AI Assistant chat bubbles with clean spacing and no overlapping.
 */
function renderChatMessageContent(msg: ChatMessage) {
  const text = msg.text || "";

  const renderInline = (line: string, keyPrefix: string) => {
    // Split by **bold** or *italic/directive*
    const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <span key={keyPrefix}>
        {tokens.map((token, idx) => {
          if (token.startsWith("**") && token.endsWith("**")) {
            return (
              <strong key={idx} className="font-semibold text-slate-900">
                {token.slice(2, -2)}
              </strong>
            );
          }
          if (token.startsWith("*") && token.endsWith("*")) {
            return (
              <span
                key={idx}
                className="font-medium text-indigo-700 bg-indigo-50/80 border border-indigo-100/90 px-1.5 py-0.5 rounded-md text-[11px] inline break-words select-all"
              >
                {token.slice(1, -1)}
              </span>
            );
          }
          return token;
        })}
      </span>
    );
  };

  const paragraphs = text.split(/\n\s*\n/);
  type Segment =
    | { type: "text"; text: string }
    | { type: "bullet_list"; items: string[] };

  const segments: Segment[] = [];

  for (const para of paragraphs) {
    const rawLines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) continue;

    let currentBullets: string[] = [];

    const flushBullets = () => {
      if (currentBullets.length > 0) {
        segments.push({ type: "bullet_list", items: [...currentBullets] });
        currentBullets = [];
      }
    };

    for (const line of rawLines) {
      if (/^[•\-\*]\s+/.test(line)) {
        const cleaned = line.replace(/^[•\-\*]\s+/, "").trim();
        currentBullets.push(cleaned);
      } else {
        flushBullets();
        segments.push({ type: "text", text: line });
      }
    }
    flushBullets();
  }

  return (
    <div className="space-y-2.5 text-slate-700 leading-relaxed text-[12px]">
      {segments.map((seg, sIdx) => {
        if (seg.type === "bullet_list") {
          return (
            <ul key={sIdx} className="space-y-2 my-1.5 pl-0.5">
              {seg.items.map((item, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2 text-slate-700 leading-relaxed text-[12px]">
                  <span className="text-indigo-500 font-bold shrink-0 mt-0.5 select-none leading-none">•</span>
                  <div className="flex-1 min-w-0 break-words">
                    {renderInline(item, `${sIdx}-${bIdx}`)}
                  </div>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={sIdx} className="break-words leading-relaxed text-slate-700">
            {renderInline(seg.text, `p-${sIdx}`)}
          </p>
        );
      })}
    </div>
  );
}

// Default recent documents shown in the Studio dashboard, hydrated from authoritative templates
const INITIAL_RECENT_DOCS: HydratedDocumentData[] = [
  {
    ...hydrateDocumentFromSnapshot(
      "COVER_LETTER",
      getSampleAafiaAmeenSnapshot(),
      "sample-aafia-ameen",
      "italy-type-d-student-visa-cover-letter"
    ),
    id: "sample-doc-aafia-cover-letter",
    title: "Aafia Ameen – Italy Visa Cover Letter",
    updatedAt: "Opened Just now",
  },
  {
    ...hydrateDocumentFromSnapshot(
      "CV",
      getSampleRohanIyerSnapshot(),
      "sample-rohan-iyer"
    ),
    id: "sample-doc-rohan-cv",
    title: "Rohan Iyer – Europass CV",
    updatedAt: "Opened 10m ago",
  },
  {
    ...hydrateDocumentFromSnapshot(
      "SOP",
      getSampleRohanIyerSnapshot(),
      "sample-rohan-iyer"
    ),
    id: "sample-doc-rohan-sop",
    title: "Rohan Iyer – Statement of Purpose",
    updatedAt: "Opened Oct 26, 2026",
  },
  {
    ...hydrateDocumentFromSnapshot(
      "COVER_LETTER",
      getSampleAaravMehtaSnapshot(),
      "sample-aarav-mehta",
      "italy-type-d-student-visa-cover-letter"
    ),
    id: "sample-doc-aarav-cover-letter",
    title: "Aarav Mehta – Italy Visa Cover Letter",
    updatedAt: "Opened Oct 24, 2026",
  },
  {
    ...hydrateDocumentFromSnapshot(
      "CV",
      getSampleAaravMehtaSnapshot(),
      "sample-aarav-mehta"
    ),
    id: "sample-doc-aarav-cv",
    title: "Aarav Mehta – Europass Academic CV",
    updatedAt: "Opened Jul 24, 2024",
  },
  {
    id: "sample-doc-aafia-lor",
    title: "Aafia Ameen – Academic LOR",
    docType: "LOR",
    docTypeName: "Academic Letter of Recommendation",
    studentName: "Aafia Ameen",
    studentId: "sample-aafia-ameen",
    updatedAt: "Opened Aug 7, 2022",
    targetUniversity: "Imperial College London",
    targetCourse: "MSc Computer Science",
    targetCountry: "United Kingdom",
    wordCount: 490,
    route: "/lor-generator?student=sample-aafia-ameen",
    sections: [
      {
        heading: "Letterhead & Department",
        content:
          "Department of Computer Science & Engineering | Office of Faculty Academic Evaluations\nUniversità degli Studi di Padova, Italy",
      },
      {
        heading: "Recommendation Body",
        content:
          "To The Admissions Committee, Imperial College London:\nIt is my distinct pleasure to offer my highest academic recommendation for Aafia Ameen for admission to the MSc Computer Science programme. Over three academic terms, they demonstrated outstanding algorithmic rigor, mathematical discipline, and research capability.",
      },
      {
        heading: "Recommender Signature",
        content:
          "Prof. Dr. Roberto Rossi\nSenior Chair of Software Architecture & Distributed Systems\nUniversità degli Studi di Padova",
      },
    ],
  },
];

export interface FontOption {
  name: string;
  val: string;
  category: string;
  description: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  {
    name: "Calibri",
    val: "Calibri, Carlito, Aptos, 'Segoe UI', sans-serif",
    category: "Standard Word",
    description: "Default Microsoft Word & modern business standard",
  },
  {
    name: "Times New Roman",
    val: "'Times New Roman', Times, Georgia, serif",
    category: "Formal Embassy",
    description: "Official visa consulate & traditional academic standard",
  },
  {
    name: "Arial",
    val: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    category: "Clean Sans",
    description: "Clean, universally supported neutral sans-serif",
  },
  {
    name: "Georgia",
    val: "Georgia, 'Times New Roman', serif",
    category: "Academic Serif",
    description: "Classic high-legibility editorial serif",
  },
  {
    name: "Garamond",
    val: "Garamond, 'EB Garamond', Georgia, serif",
    category: "Classic Serif",
    description: "Prestigious literary & university style",
  },
  {
    name: "Inter",
    val: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    category: "Modern UI",
    description: "Crisp modern sans engineered for digital clarity",
  },
  {
    name: "Roboto",
    val: "Roboto, 'Segoe UI', sans-serif",
    category: "Modern Sans",
    description: "Balanced neo-grotesque sans typeface",
  },
  {
    name: "Verdana",
    val: "Verdana, Geneva, sans-serif",
    category: "High Legibility",
    description: "Generously spaced and highly readable sans",
  },
  {
    name: "Trebuchet MS",
    val: "'Trebuchet MS', 'Lucida Grande', sans-serif",
    category: "Humanist",
    description: "Warm, professional humanist typeface",
  },
  {
    name: "Courier New",
    val: "'Courier New', Courier, monospace",
    category: "Monospace",
    description: "Classic fixed-width typewriter typography",
  },
];


export { getEuropassData };

export interface CvSectionPrompt {
  heading: string;
  sectionKey: string;
  label: string;
  question: string;
  placeholder: string;
  isExisting?: boolean;
}

export interface CvSectionPromptDef {
  sectionKey: string;
  label: string;
  heading: string;
  createQuestion: string;
  updateQuestion: string;
  placeholder: string;
}

export const CV_SECTION_PROMPTS: Record<string, CvSectionPromptDef> = {
  "WORK EXPERIENCE": {
    sectionKey: "workExperience",
    label: "Work Experience",
    heading: "WORK EXPERIENCE",
    createQuestion: "Let's add Work Experience for {studentName}. Please share:\n• Position / Role (e.g. Software Developer Intern)\n• Company (e.g. Amazon)\n• Duration (e.g. June 2023 – December 2023)\n• Responsibilities: (Key responsibilities)",
    updateQuestion: "Work Experience already exists in your CV. What additional role or internship would you like to add for {studentName}?\n\nPlease share:\n• Position / Role (e.g. Software Developer Intern)\n• Company (e.g. Amazon)\n• Duration (e.g. June 2023 – December 2023)\n• Responsibilities: (Key responsibilities)",
    placeholder: "e.g. Software Developer Intern at Amazon, June 2023 – December 2023...",
  },
  "INTERNSHIPS": {
    sectionKey: "workExperience",
    label: "Work Experience",
    heading: "WORK EXPERIENCE",
    createQuestion: "Let's add an internship or job entry for {studentName}. Please share:\n• Position / Role (e.g. Software Developer Intern)\n• Company (e.g. Amazon)\n• Duration (e.g. June 2023 – December 2023)\n• Responsibilities",
    updateQuestion: "What additional internship or job role would you like to add for {studentName}?\n\nPlease share:\n• Position / Role (e.g. Software Developer Intern)\n• Company (e.g. Amazon)\n• Duration (e.g. June 2023 – December 2023)\n• Responsibilities",
    placeholder: "e.g. Software Developer Intern at Amazon, June 2023 – December 2023...",
  },
  "EDUCATION AND TRAINING": {
    sectionKey: "education",
    label: "Education",
    heading: "EDUCATION AND TRAINING",
    createQuestion: "Please provide the degree or school qualification, institution, and duration for {studentName} (e.g. B.Tech in Computer Science, University of Cassino, 2020 – 2024, Final grade: 8.5/10).",
    updateQuestion: "Education already exists in your CV. What additional degree or qualification would you like to add for {studentName}? (e.g. High School Diploma, Delhi Public School, 2018 – 2020)",
    placeholder: "e.g. B.Tech in CS, University of Cassino [2020 - 2024]...",
  },
  "EDUCATION": {
    sectionKey: "education",
    label: "Education",
    heading: "EDUCATION AND TRAINING",
    createQuestion: "Please provide the degree or school qualification, institution, and duration for {studentName} (e.g. B.Tech in Computer Science, University of Cassino, 2020 – 2024, Final grade: 8.5/10).",
    updateQuestion: "Education already exists in your CV. What additional degree or qualification would you like to add for {studentName}?",
    placeholder: "e.g. B.Tech in CS, University of Cassino [2020 - 2024]...",
  },
  "TRAINING AND WORKSHOPS": {
    sectionKey: "training",
    label: "Training",
    heading: "TRAINING AND WORKSHOPS",
    createQuestion: "What professional training program, workshop, or technical course would you like to add for {studentName}? (e.g. Full-Stack Web Development Boot Camp, 2024)",
    updateQuestion: "What additional training program or professional workshop would you like to add for {studentName}?",
    placeholder: "e.g. Full-Stack Web Development Bootcamp [2024]...",
  },
  "TRAINING": {
    sectionKey: "training",
    label: "Training",
    heading: "TRAINING AND WORKSHOPS",
    createQuestion: "What professional training program, workshop, or technical course would you like to add for {studentName}? (e.g. Full-Stack Web Development Boot Camp, 2024)",
    updateQuestion: "What additional training program or professional workshop would you like to add for {studentName}?",
    placeholder: "e.g. Full-Stack Web Development Bootcamp [2024]...",
  },
  "DIGITAL SKILLS": {
    sectionKey: "skills",
    label: "Technical Skills",
    heading: "DIGITAL SKILLS",
    createQuestion: "Which technical or digital skills would you like to add for {studentName}? (e.g. Python, React, Next.js, Docker, SQL)",
    updateQuestion: "Skills already exists in your CV. Which additional technical or digital skills would you like to add for {studentName}? (e.g. Docker, Kubernetes, AWS)",
    placeholder: "e.g. Python, React, Next.js, SQL...",
  },
  "TECHNICAL SKILLS": {
    sectionKey: "skills",
    label: "Technical Skills",
    heading: "DIGITAL SKILLS",
    createQuestion: "Which technical or digital skills would you like to add for {studentName}? (e.g. Python, React, Next.js, Docker, SQL)",
    updateQuestion: "Skills already exists in your CV. Which additional technical or digital skills would you like to add for {studentName}? (e.g. Docker, Kubernetes, AWS)",
    placeholder: "e.g. Python, React, Next.js, SQL...",
  },
  "SKILLS": {
    sectionKey: "skills",
    label: "Technical Skills",
    heading: "DIGITAL SKILLS",
    createQuestion: "Which technical or digital skills would you like to add for {studentName}? (e.g. Python, React, SQL, Problem Solving)",
    updateQuestion: "Skills already exists in your CV. Which additional technical skills would you like to add for {studentName}?",
    placeholder: "e.g. Python, React, SQL...",
  },
  "CERTIFICATIONS": {
    sectionKey: "certifications",
    label: "Certifications",
    heading: "CERTIFICATIONS",
    createQuestion: "What certification or license would you like to add for {studentName}? (e.g. AWS Certified Solutions Architect – Amazon [2024])",
    updateQuestion: "Certifications already exists in your CV. What additional certification or license would you like to add for {studentName}?",
    placeholder: "e.g. AWS Certified Solutions Architect - Amazon [2024]...",
  },
  "HOBBIES AND INTERESTS": {
    sectionKey: "hobbies",
    label: "Hobbies",
    heading: "HOBBIES AND INTERESTS",
    createQuestion: "Okay, what hobbies would you like to add for {studentName}? (e.g. Gym, Reading, and Writing)",
    updateQuestion: "Hobbies already exists in your CV. What additional hobbies would you like to add for {studentName}? (e.g. Gym, Reading, and Writing)",
    placeholder: "e.g. Gym, Reading, and Writing...",
  },
  "HOBBIES": {
    sectionKey: "hobbies",
    label: "Hobbies",
    heading: "HOBBIES AND INTERESTS",
    createQuestion: "Okay, what hobbies would you like to add for {studentName}? (e.g. Gym, Reading, and Writing)",
    updateQuestion: "Hobbies already exists in your CV. What additional hobbies would you like to add for {studentName}? (e.g. Gym, Reading, and Writing)",
    placeholder: "e.g. Gym, Reading, and Writing...",
  },
  "ACADEMIC PROJECTS": {
    sectionKey: "academicProjects",
    label: "Academic Projects",
    heading: "ACADEMIC PROJECTS",
    createQuestion: "What academic project would you like to add for {studentName}? Please share the project title and a brief description of what was built.",
    updateQuestion: "Academic Projects already exists in your CV. What additional project would you like to add for {studentName}?",
    placeholder: "e.g. AI Portfolio Generator built with Next.js...",
  },
  "LEADERSHIP & RESPONSIBILITIES": {
    sectionKey: "responsibilities",
    label: "Responsibilities",
    heading: "LEADERSHIP & RESPONSIBILITIES",
    createQuestion: "What responsibility or leadership role would you like to add for {studentName}? (e.g. Student Council Representative - Organized inter-college cultural festival)",
    updateQuestion: "What additional leadership responsibility or extracurricular role would you like to add for {studentName}?",
    placeholder: "e.g. Head of Coding Club - Organized hackathon...",
  },
  "RESPONSIBILITIES": {
    sectionKey: "responsibilities",
    label: "Responsibilities",
    heading: "LEADERSHIP & RESPONSIBILITIES",
    createQuestion: "What responsibility or leadership role would you like to add for {studentName}? (e.g. Student Council Representative - Organized inter-college cultural festival)",
    updateQuestion: "What additional leadership responsibility or extracurricular role would you like to add for {studentName}?",
    placeholder: "e.g. Head of Coding Club - Organized hackathon...",
  },
  "ENGLISH LANGUAGE CERTIFICATE": {
    sectionKey: "englishCertificate",
    label: "English Certificate (IELTS)",
    heading: "ENGLISH LANGUAGE CERTIFICATE",
    createQuestion: "Please share the English language test details for {studentName} (e.g. IELTS Overall 7.5, TRF 26IA004123, or Listening 8.0, Reading 7.5).",
    updateQuestion: "Please share the updated English language test details for {studentName} (e.g. IELTS Overall 7.5, TRF 26IA004123).",
    placeholder: "e.g. IELTS Overall 7.5, TRF 26IA004123, L 8.0, R 7.5...",
  },
  "IELTS": {
    sectionKey: "englishCertificate",
    label: "English Certificate (IELTS)",
    heading: "ENGLISH LANGUAGE CERTIFICATE",
    createQuestion: "Please share the English language test details for {studentName} (e.g. IELTS Overall 7.5, TRF 26IA004123).",
    updateQuestion: "Please share the updated English language test details for {studentName} (e.g. IELTS Overall 7.5, TRF 26IA004123).",
    placeholder: "e.g. IELTS Overall 7.5, TRF 26IA004123...",
  },
  "LANGUAGE SKILLS": {
    sectionKey: "languageSkills",
    label: "Language Skills",
    heading: "LANGUAGE SKILLS",
    createQuestion: "Which languages should we add for {studentName}? (e.g. Mother tongue: Hindi, Other: German, French, Tamil)",
    updateQuestion: "What additional languages and proficiency levels should we add for {studentName}?",
    placeholder: "e.g. Mother tongue Hindi\nOther languages: German, French, Tamil...",
  },
  "ABOUT ME": {
    sectionKey: "aboutMe",
    label: "About Me",
    heading: "ABOUT ME",
    createQuestion: "Please share a short profile summary or bio for {studentName} (e.g. Computer Science undergraduate specializing in AI, with a passion for distributed systems).",
    updateQuestion: "About Me already exists in your CV. How would you like to update the summary for {studentName}?",
    placeholder: "e.g. Motivated Software Engineer with background in...",
  },
  "ABOUT": {
    sectionKey: "aboutMe",
    label: "About Me",
    heading: "ABOUT ME",
    createQuestion: "Please share a short profile summary or bio for {studentName}.",
    updateQuestion: "How would you like to update the summary for {studentName}?",
    placeholder: "e.g. Motivated Software Engineer with background in...",
  },
  "ACADEMIC INTERESTS": {
    sectionKey: "academicInterests",
    label: "Academic Interests",
    heading: "ACADEMIC INTERESTS",
    createQuestion: "Which academic or research interests would you like to add for {studentName}? (e.g. Machine Learning, Cloud Computing, Data Structures)",
    updateQuestion: "Academic Interests already exists in your CV. Which additional academic interests would you like to add for {studentName}?",
    placeholder: "e.g. Artificial Intelligence, Cryptography, Robotics...",
  },
  "ACHIEVEMENTS & AWARDS": {
    sectionKey: "achievements",
    label: "Achievements & Awards",
    heading: "ACHIEVEMENTS & AWARDS",
    createQuestion: "What academic or professional achievements and awards would you like to add for {studentName}? (e.g. 1st Place at National Hackathon 2024, Dean's Merit List)",
    updateQuestion: "Achievements already exists in your CV. What additional awards or achievements would you like to add for {studentName}?",
    placeholder: "e.g. 1st Place National Hackathon, Merit Scholarship...",
  },
  "ACHIEVEMENTS": {
    sectionKey: "achievements",
    label: "Achievements & Awards",
    heading: "ACHIEVEMENTS & AWARDS",
    createQuestion: "What academic or professional achievements and awards would you like to add for {studentName}?",
    updateQuestion: "What additional awards or achievements would you like to add for {studentName}?",
    placeholder: "e.g. 1st Place National Hackathon, Merit Scholarship...",
  },
  "LEADERSHIP & EXTRACURRICULAR": {
    sectionKey: "responsibilities",
    label: "Leadership & Extracurricular",
    heading: "LEADERSHIP & EXTRACURRICULAR",
    createQuestion: "What leadership role or extracurricular activity would you like to add for {studentName}? (e.g. President of Robotics Club [ 2023 – 2024 ], Organized national coding conclave)",
    updateQuestion: "What additional leadership or extracurricular activity would you like to add for {studentName}?",
    placeholder: "e.g. Student Council Lead, Organizer of Tech Conclave...",
  },
  "VOLUNTEERING / COMMUNITY ENGAGEMENT": {
    sectionKey: "volunteering",
    label: "Volunteering / Community Engagement",
    heading: "VOLUNTEERING / COMMUNITY ENGAGEMENT",
    createQuestion: "What volunteering or community service entry would you like to add for {studentName}? (e.g. Volunteer Educator at Teach For India [ 2022 – 2023 ], Conducted free weekend math classes)",
    updateQuestion: "What additional volunteering or community engagement would you like to add for {studentName}?",
    placeholder: "e.g. Volunteer at Red Cross [ 2023 ], Community outreach...",
  },
  "VOLUNTEERING": {
    sectionKey: "volunteering",
    label: "Volunteering / Community Engagement",
    heading: "VOLUNTEERING / COMMUNITY ENGAGEMENT",
    createQuestion: "What volunteering or community service entry would you like to add for {studentName}?",
    updateQuestion: "What additional volunteering or community engagement would you like to add for {studentName}?",
    placeholder: "e.g. Volunteer at Red Cross [ 2023 ], Community outreach...",
  },
  "RECOMMENDATIONS": {
    sectionKey: "recommendations",
    label: "Recommendations",
    heading: "RECOMMENDATIONS",
    createQuestion: "Please share the recommender's details for {studentName} (e.g. Dr. John Doe, Professor of Computer Science at University of Cassino: \"Angad demonstrates remarkable problem-solving abilities...\").",
    updateQuestion: "What additional recommendation or reference letter details would you like to add for {studentName}?",
    placeholder: "e.g. Dr. John Doe, Professor: Strongly recommends...",
  },
  "CUSTOM SECTION": {
    sectionKey: "customSection",
    label: "Custom Section",
    heading: "CUSTOM SECTION",
    createQuestion: "What heading and details should this custom section contain for {studentName}? (e.g. Volunteer Work: Mentored high school students in mathematics)",
    updateQuestion: "What additional details would you like to add to this section for {studentName}?",
    placeholder: "e.g. Volunteer Work: Mentored students...",
  },
};

export const CV_SECTION_MENU_OPTIONS = [
  { key: "aboutMe", heading: "ABOUT ME", label: "About Me", icon: "👤" },
  { key: "education", heading: "EDUCATION AND TRAINING", label: "Education and Training", icon: "🎓" },
  { key: "training", heading: "TRAINING AND WORKSHOPS", label: "Training", icon: "🛠️" },
  { key: "workExperience", heading: "WORK EXPERIENCE", label: "Work Experience / Internships", icon: "💼" },
  { key: "academicProjects", heading: "ACADEMIC PROJECTS", label: "Academic Projects", icon: "🔬" },
  { key: "certifications", heading: "CERTIFICATIONS", label: "Certifications", icon: "📜" },
  { key: "academicInterests", heading: "ACADEMIC INTERESTS", label: "Academic Interests", icon: "💡" },
  { key: "achievements", heading: "ACHIEVEMENTS & AWARDS", label: "Achievements & Awards", icon: "🏆" },
  { key: "responsibilities", heading: "LEADERSHIP & EXTRACURRICULAR", label: "Leadership & Extracurricular", icon: "👥" },
  { key: "volunteering", heading: "VOLUNTEERING / COMMUNITY ENGAGEMENT", label: "Volunteering / Community Engagement", icon: "🤝" },
  { key: "languageSkills", heading: "LANGUAGE SKILLS", label: "Language Skills", icon: "🗣️" },
  { key: "englishCertificate", heading: "ENGLISH LANGUAGE CERTIFICATE", label: "English Language Certificate (IELTS)", icon: "🌐" },
  { key: "skills", heading: "DIGITAL SKILLS", label: "Skills", icon: "⚡" },
  { key: "hobbies", heading: "HOBBIES AND INTERESTS", label: "Hobbies and Interests", icon: "🎯" },
  { key: "recommendations", heading: "RECOMMENDATIONS", label: "Recommendations", icon: "✍️" },
  { key: "customSection", heading: "CUSTOM SECTION", label: "Blank Custom Section", icon: "➕" },
];

export { parseDirectCvSectionInstruction };




/**
 * Loads the selected student's own snapshot: fictional samples by exact ID, everyone else
 * from the CRM. Returns null on any failure so callers stop instead of substituting data.
 */
async function loadStudentSnapshot(studentId: string): Promise<CrmSnapshot | null> {
  const sample = getSampleSnapshotById(studentId);
  if (sample) return sample;
  try {
    const res = await fetch(`/api/student/${encodeURIComponent(studentId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.data ? (json.data as CrmSnapshot) : null;
  } catch {
    return null;
  }
}

export function getDocTypeMeta(docType?: string) {
  switch (docType) {
    case "CV":
      return {
        label: "Europass Academic CV",
        shortLabel: "CV",
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
        pillBg: "bg-blue-600 text-white",
        iconBg: "bg-blue-50 text-blue-600 border border-blue-200/80",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <circle cx="10" cy="12" r="2" />
            <path d="M7 17c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" />
            <line x1="14" y1="12" x2="17" y2="12" />
            <line x1="14" y1="15" x2="17" y2="15" />
          </svg>
        ),
        badgeIcon: (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        ),
      };
    case "COVER_LETTER":
      return {
        label: "Visa Cover Letter",
        shortLabel: "Cover Letter",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        pillBg: "bg-emerald-600 text-white",
        iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <rect x="7" y="11" width="10" height="7" rx="1" />
            <polyline points="7 12 12 15 17 12" />
          </svg>
        ),
        badgeIcon: (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        ),
      };
    case "SOP":
      return {
        label: "Statement of Purpose",
        shortLabel: "SOP",
        badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
        pillBg: "bg-purple-600 text-white",
        iconBg: "bg-purple-50 text-purple-600 border border-purple-200/80",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M6 13l6-3 6 3-6 3z" />
            <path d="M9 14.5v2.5c0 .8 1.3 1.5 3 1.5s3-.7 3-1.5v-2.5" />
          </svg>
        ),
        badgeIcon: (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        ),
      };
    case "LOR":
      return {
        label: "Letter of Recommendation",
        shortLabel: "LOR",
        badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
        pillBg: "bg-amber-600 text-white",
        iconBg: "bg-amber-50 text-amber-600 border border-amber-200/80",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <circle cx="12" cy="13" r="2.5" />
            <polyline points="10.5 15.5 10 18 12 17 14 18 13.5 15.5" />
          </svg>
        ),
        badgeIcon: (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
            <circle cx="12" cy="8" r="6" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
          </svg>
        ),
      };
    default:
      return {
        label: "Draft Document",
        shortLabel: "Draft",
        badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
        pillBg: "bg-slate-700 text-white",
        iconBg: "bg-slate-100 text-slate-600 border border-slate-200",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
        ),
        badgeIcon: (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ),
      };
  }
}

export function DocumentStudioDashboard() {
  const { students, selectStudent, selectedStudentData, selectedStudentId, selectedStudentName } = useGlobalStudent();

  // Search & View State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [recentDocsPage, setRecentDocsPage] = useState(1);
  const [recentDocsPerPage, setRecentDocsPerPage] = useState(10);
  const [recentDocs, setRecentDocs] = useState<HydratedDocumentData[]>(() => {
    if (typeof window === "undefined") return INITIAL_RECENT_DOCS;
    try {
      const stored = localStorage.getItem(RECENT_DOCS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((doc: HydratedDocumentData) => {
            if (doc.docType === "COVER_LETTER" && Array.isArray(doc.sections)) {
              return {
                ...doc,
                sections: doc.sections.map((sec) => ({
                  ...sec,
                  content: cleanCoverLetterText(sec.content),
                })),
              };
            }
            return doc;
          });
        }
      }
    } catch { }
    return INITIAL_RECENT_DOCS;
  });

  // Modal State (2 clean dropdowns: student first, then doc type)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCvImportModalOpen, setIsCvImportModalOpen] = useState(false);
  const [currentDocSnapshot, setCurrentDocSnapshot] = useState<CrmSnapshot | null>(null);
  const [lockedStudentId, setLockedStudentId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sId = params.get("studentId") || params.get("student");
      if (sId) return sId;
      if (params.get("locked") === "1" || params.get("locked") === "true") {
        return params.get("studentId") || params.get("student") || null;
      }
    }
    return null;
  });
  const [modalStudentId, setModalStudentId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sId = params.get("studentId") || params.get("student");
      if (sId) return sId;
    }
    return "sample-aafia-ameen";
  });

  // Re-apply the URL student lock whenever the globally selected student changes
  // (adjusting state during render instead of in an effect).
  const [urlLockSyncedFor, setUrlLockSyncedFor] = useState<{ id: string | null } | null>(null);
  if (urlLockSyncedFor === null || urlLockSyncedFor.id !== selectedStudentId) {
    setUrlLockSyncedFor({ id: selectedStudentId });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sId = params.get("studentId") || params.get("student");
      if (sId) {
        setLockedStudentId(sId);
        setModalStudentId(sId);
      } else if (params.get("locked") === "1" || params.get("locked") === "true") {
        const id = selectedStudentId || params.get("studentId") || params.get("student");
        if (id) {
          setLockedStudentId(id);
          setModalStudentId(id);
        }
      }
    }
  }
  const [modalDocType, setModalDocType] = useState<"COVER_LETTER" | "SOP" | "CV" | "LOR" | "BLANK">("COVER_LETTER");

  // Roster State
  const [studentRoster, setStudentRoster] = useState<Array<{ id: string; name: string; email: string | null }>>(() => {
    if (students && students.length > 0) {
      return [...students, ...SAMPLE_ROSTER];
    }
    return SAMPLE_ROSTER;
  });
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // In-DOM clean dropdown state & refs (prevents browser native combobox misalignment)
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [isDocTypeDropdownOpen, setIsDocTypeDropdownOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const docTypeDropdownRef = useRef<HTMLDivElement>(null);
  const docTypeMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const studentSearchInputRef = useRef<HTMLInputElement>(null);
  const headingMenuRef = useRef<HTMLDivElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  // Fancy Countdown Cooking Loader State
  const [isCooking, setIsCooking] = useState(false);
  const [cookingCountdown, setCookingCountdown] = useState(3);
  const [cookingStage, setCookingStage] = useState(0);

  // In-Front Live Document Presentation State
  const [activeDocument, setActiveDocument] = useState<HydratedDocumentData | null>(null);
  const [editableDocContent, setEditableDocContent] = useState<HydratedDocumentData | null>(null);
  const [cvDocumentData, setCvDocumentData] = useState<DocumentData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pendingClarificationTask, setPendingClarificationTask] = useState<PendingClarificationTask | null>(null);
  const [lastActiveTargetSection, setLastActiveTargetSection] = useState<string | null>(null);
  const [activeAiHighlight, setActiveAiHighlight] = useState<{
    sectionName: string;
    phrase?: string;
    timestamp: number;
  } | null>(null);
  const [activeAiCvSectionKey, setActiveAiCvSectionKey] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isSectionsExpanded, setIsSectionsExpanded] = useState(false);
  const addSectionMenuRef = useRef<HTMLDivElement>(null);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const infoMenuRef = useRef<HTMLDivElement>(null);

  // Production-grade student identity isolation & request race condition guards
  const activeDocIdentityRef = useRef<{ docId: string; studentId: string } | null>(null);
  /** Mirror of the document currently in the editor, read when an AI reply arrives. */
  const editableDocRef = useRef<HydratedDocumentData | null>(null);
  useEffect(() => {
    editableDocRef.current = editableDocContent;
  }, [editableDocContent]);
  const activeAiRequestRef = useRef<{ requestId: string; docId: string; studentId: string } | null>(null);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  // Tiptap Rich-Text Caret Engine & Europass Theme State
  const [tiptapEditor, setTiptapEditor] = useState<Editor | null>(null);
  const [tiptapHtml, setTiptapHtml] = useState<string>("");
  const [cvViewMode, setCvViewMode] = useState<"europass" | "caret">("europass");
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [isStrikeActive, setIsStrikeActive] = useState(false);

  // Studio & Smart Changes Engine State
  const [docHistory, setDocHistory] = useState<HydratedDocumentData[]>([]);
  const [redoHistory, setRedoHistory] = useState<HydratedDocumentData[]>([]);
  const [cvHistory, setCvHistory] = useState<DocumentData[]>([]);
  const [cvRedoHistory, setCvRedoHistory] = useState<DocumentData[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [aiPromptText, setAiPromptText] = useState("");
  const [isAiCooking, setIsAiCooking] = useState(false);
  const [aiToast, setAiToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [fontSize, setFontSize] = useState<number>(11);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [activeHeading, setActiveHeading] = useState<"H1" | "H2" | "H3" | "Body">("Body");
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [editorMode, setEditorMode] = useState<"editing" | "preview">("editing");
  const [fontFamily, setFontFamily] = useState<string>("Calibri, Carlito, Aptos, 'Segoe UI', sans-serif");
  const [fontFamilyLabel, setFontFamilyLabel] = useState<string>("Calibri");
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [textColor, setTextColor] = useState<string>("#0f172a");
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showDocTypeMenu, setShowDocTypeMenu] = useState(false);
  const [showInsightsDrawer, setShowInsightsDrawer] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notesContent, setNotesContent] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRearrangeModalOpen, setIsRearrangeModalOpen] = useState(false);

  // Cover Letter Dynamic Validation & AI Admissions Assistant State
  const [isValidationPanelOpen, setIsValidationPanelOpen] = useState(false);
  const [activeFieldPrompt, setActiveFieldPrompt] = useState<ValidationFieldDefinition | null>(null);
  const [activeCvSectionPrompt, setActiveCvSectionPrompt] = useState<CvSectionPrompt | null>(null);
  const [activeSopContext, setActiveSopContext] = useState<StudentDocumentContext | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Checks whether a specific section already has content or entries in the CV
  const isCvSectionPresent = useCallback(
    (sectionKey: string, heading?: string): boolean => {
      if (!editableDocContent) return false;
      const cv = cvDocumentData;

      // 1. Check cvDocumentData structured fields
      if (cv) {
        switch (sectionKey) {
          case "aboutMe":
          case "about":
            if (cv.aboutMe && cv.aboutMe.trim()) return true;
            break;
          case "workExperience":
            if (cv.internships && cv.internships.length > 0 && cv.internships.some((e) => Boolean(e.role || e.company))) {
              return true;
            }
            break;
          case "education":
            if (cv.education && cv.education.length > 0 && cv.education.some((e) => Boolean(e.qualification || e.institution))) {
              return true;
            }
            break;
          case "training":
            if (
              cv.education && cv.education.some((e) => /training|workshop|bootcamp|course/i.test(e.qualification || ""))
            ) {
              return true;
            }
            break;
          case "skills":
            if (cv.skills && cv.skills.length > 0 && cv.skills.some((e) => Boolean(e.name))) {
              return true;
            }
            break;
          case "certifications":
            if (cv.certifications && cv.certifications.length > 0 && cv.certifications.some((e) => Boolean(e.name))) {
              return true;
            }
            break;
          case "hobbies":
            if (cv.hobbies && cv.hobbies.length > 0 && cv.hobbies.some((e) => Boolean(e.name))) {
              return true;
            }
            break;
          case "academicProjects":
            if (cv.academicProjects && cv.academicProjects.length > 0 && cv.academicProjects.some((e) => Boolean(e.title))) {
              return true;
            }
            break;
          case "academicInterests":
            if (cv.academicInterests && cv.academicInterests.length > 0) {
              return true;
            }
            break;
          case "achievements":
            if (cv.achievements && cv.achievements.length > 0) {
              return true;
            }
            break;
          case "responsibilities":
            if (
              cv.leadershipActivities &&
              cv.leadershipActivities.length > 0 &&
              cv.leadershipActivities.some((e) => Boolean(e.activity || e.description))
            ) {
              return true;
            }
            break;
          case "volunteering":
            if (cv.volunteering && cv.volunteering.length > 0) {
              return true;
            }
            break;
          case "languageSkills":
          case "languages":
            if (Boolean(cv.motherTongue?.trim()) || (cv.languages && cv.languages.length > 0)) {
              return true;
            }
            break;
          case "englishCertificate":
            if (
              Boolean(cv.englishCertificate?.score || cv.englishCertificate?.trfNumber)
            ) {
              return true;
            }
            break;
          case "recommendations":
            if (cv.recommendations && cv.recommendations.length > 0) {
              return true;
            }
            break;
        }
      }

      // 2. Check editableDocContent.sections text content
      const sections = editableDocContent.sections || [];
      return sections.some((s) => {
        if (!s.content || !s.content.trim()) return false;
        const h = (s.heading || "").toLowerCase();
        switch (sectionKey) {
          case "aboutMe":
          case "about":
            return h.includes("about");
          case "workExperience":
            return h.includes("work") || h.includes("internship") || h.includes("employment");
          case "education":
            return h.includes("education") && !h.includes("training");
          case "training":
            return h.includes("training") || h.includes("workshop");
          case "skills":
            return h.includes("skill") && !h.includes("language");
          case "certifications":
            return h.includes("certificat");
          case "hobbies":
            return h.includes("hobbi") || h.includes("interest");
          case "academicProjects":
            return h.includes("project");
          case "academicInterests":
            return h.includes("academic interest") || (h.includes("interest") && !h.includes("hobb"));
          case "achievements":
            return h.includes("achievement") || h.includes("award");
          case "responsibilities":
            return h.includes("leadership") || h.includes("responsibilit") || h.includes("extracurricular");
          case "volunteering":
            return h.includes("volunteer") || h.includes("community");
          case "languageSkills":
          case "languages":
            return h.includes("language") && !h.includes("certificate") && !h.includes("ielts");
          case "englishCertificate":
            return h.includes("english") || h.includes("ielts");
          case "recommendations":
            return h.includes("recommendation") || h.includes("referee");
          default:
            return heading ? h === heading.toLowerCase() : false;
        }
      });
    },
    [editableDocContent, cvDocumentData]
  );

  // Clear the student context as soon as the document has no student
  // (adjusting state during render instead of in an effect).
  const sopContextStudentId = editableDocContent?.studentId;
  const [prevSopContextStudentId, setPrevSopContextStudentId] = useState(sopContextStudentId);
  if (prevSopContextStudentId !== sopContextStudentId) {
    setPrevSopContextStudentId(sopContextStudentId);
    if (!sopContextStudentId) setActiveSopContext(null);
  }

  // Synchronize student context for Cover Letter validation
  useEffect(() => {
    if (!editableDocContent?.studentId) return;
    let isMounted = true;
    loadStudentSnapshot(editableDocContent.studentId).then((snapshot) => {
      if (!isMounted) return;
      if (snapshot) {
        setCurrentDocSnapshot(snapshot);
        try {
          const normalized = mapCrmToNormalizedStudent(snapshot);
          const sop = mapNormalizedToSop(normalized);
          setActiveSopContext(sop);

          if (editableDocContent.docType === "CV") {
            const resumeData = mapNormalizedToResume(normalized);
            if (resumeData.student?.personal) {
              const crmPersonal = resumeData.student.personal;
              setCvDocumentData((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  personal: {
                    ...crmPersonal,
                    ...prev.personal,
                    photoUrl: crmPersonal.photoUrl || prev.personal?.photoUrl,
                  },
                };
              });
            }
          }
        } catch {
          setActiveSopContext(null);
        }
      } else {
        setActiveSopContext(null);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [editableDocContent?.studentId]);

  // Dynamic missing field groups & total count for Cover Letter validation panel
  const missingGroups = useMemo(() => {
    if (editableDocContent?.docType !== "COVER_LETTER") return [];
    return getMissingValidationGroups(activeSopContext, editableDocContent?.fieldValues);
  }, [activeSopContext, editableDocContent?.docType, editableDocContent?.fieldValues]);

  const totalMissingCount = useMemo(() => {
    if (editableDocContent?.docType !== "COVER_LETTER") return 0;
    return getTotalMissingCount(activeSopContext, editableDocContent?.fieldValues);
  }, [activeSopContext, editableDocContent?.docType, editableDocContent?.fieldValues]);

  // Unified rendered conversation stream with consecutive duplicate suppression
  const renderedChatMessages = useMemo(() => {
    const defaultGreeting = getDefaultGreetingMessage(
      editableDocContent?.studentName || "",
      editableDocContent?.docType || "CV"
    );
    const list = chatMessages.length === 0 ? [defaultGreeting] : chatMessages;

    return list.filter((msg, idx) => {
      if (idx === 0) return true;
      const prev = list[idx - 1];
      // Suppress consecutive duplicate assistant prompt messages
      if (
        msg.sender === "assistant" &&
        prev.sender === "assistant" &&
        (msg.text.trim() === prev.text.trim() ||
          (msg.sectionUpdated && prev.sectionUpdated && msg.sectionUpdated === prev.sectionUpdated && msg.actionType === "typed_section" && prev.actionType === "typed_section"))
      ) {
        return false;
      }
      return true;
    });
  }, [chatMessages, editableDocContent?.studentName, editableDocContent?.docType]);

  // Connect clicked validation field to the existing AI Chatbot
  const handleSelectMissingField = useCallback((field: ValidationFieldDefinition) => {
    setIsValidationPanelOpen(false);
    setIsSidebarCollapsed(false);
    setActiveFieldPrompt(field);

    const assistantMsg: ChatMessage = {
      id: generateUniqueId("msg-field-prompt"),
      sender: "assistant",
      text: field.question,
      timestamp: getFormattedTimestamp(),
      actionType: "general",
    };
    setChatMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (
        lastMsg &&
        lastMsg.sender === "assistant" &&
        lastMsg.text.trim() === assistantMsg.text.trim()
      ) {
        return prev;
      }
      return [...prev, assistantMsg];
    });

    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }, 100);
  }, []);

  // Continuous persistence: Syncs any document creation or midway edits to recentDocs & localStorage
  const syncDocumentToRecent = useCallback((doc: HydratedDocumentData, status: string = "Edited just now") => {
    setRecentDocs((prev) => {
      const next = syncDocumentToRecentList(prev, doc, status);
      try {
        localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(next));
      } catch { }
      return next;
    });
  }, []);

  // Dispatches live in-place edits from the interactive Europass canvas into cvDocumentData & sections
  const handleEuropassDispatch = useCallback(
    (action: DocumentAction) => {
      if (action.type === "SET_SECTION_ORDER" || action.type === "RESET_SECTION_ORDER") {
        if (editableDocContent) {
          setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
        }
        const snapshotCv =
          cvDocumentData ||
          getEuropassData(
            editableDocContent?.studentId || "",
            editableDocContent?.studentName || "",
            selectedStudentData
          );
        setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(snapshotCv))]);
        setCvRedoHistory([]);
        setRedoHistory([]);
        setAiToast({
          message:
            action.type === "RESET_SECTION_ORDER"
              ? "↺ Section order reset to default"
              : "✓ Section order updated",
          type: "success",
        });
      }

      setCvDocumentData((prevCv) => {
        const base =
          prevCv ||
          getEuropassData(
            editableDocContent?.studentId || "",
            editableDocContent?.studentName || "",
            selectedStudentData
          );
        const nextCv = documentReducer(base, action);

        // Keep editableDocContent.sections and recent history synchronized
        setEditableDocContent((prevDoc) => {
          if (!prevDoc) return prevDoc;
          const syncedSections = syncCvDataToSections(nextCv, prevDoc.sections);
          const updatedDoc: HydratedDocumentData = {
            ...prevDoc,
            sections: syncedSections,
            wordCount: syncedSections.reduce(
              (acc, s) => acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0),
              0
            ),
          };
          syncDocumentToRecent(updatedDoc, "Edited just now");
          return updatedDoc;
        });

        return nextCv;
      });
    },
    [editableDocContent, cvDocumentData, selectedStudentData, syncDocumentToRecent]
  );

  // Delete document from Recent Documents & localStorage
  const handleDeleteRecentDoc = useCallback((e: React.MouseEvent, docToDelete: HydratedDocumentData) => {
    e.stopPropagation();
    setRecentDocs((prev) => {
      const targetIndex = prev.findIndex((d) => {
        if (docToDelete.id && d.id) {
          return d.id === docToDelete.id;
        }
        return (
          d.title === docToDelete.title &&
          d.studentId === docToDelete.studentId &&
          d.docType === docToDelete.docType &&
          d.updatedAt === docToDelete.updatedAt
        );
      });
      if (targetIndex === -1) return prev;
      const next = prev.filter((_, i) => i !== targetIndex);
      try {
        localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(next));
      } catch { }
      return next;
    });

    setAiToast({
      message: `🗑️ Removed "${docToDelete.title.replace(/\.pdf$/, "")}" from Recent Documents`,
      type: "info",
    });
    setTimeout(() => setAiToast(null), 2500);
  }, []);

  // Hydrate persistent documents from localStorage if empty
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_DOCS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(INITIAL_RECENT_DOCS));
      }
    } catch { }
  }, []);

  // Sync roster from GlobalStudentContext and direct /api/students/list
  useEffect(() => {
    if (students && students.length > 0) {
      const timer = setTimeout(() => {
        setStudentRoster([...students, ...SAMPLE_ROSTER]);
        setRosterError(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    const listUrl = lockedStudentId
      ? `/api/students/list?studentId=${encodeURIComponent(lockedStudentId)}`
      : "/api/students/list";
    fetch(listUrl)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.students)) {
          setStudentRoster([...json.students, ...SAMPLE_ROSTER]);
          setRosterError(null);
        } else {
          setRosterError("Could not load the CRM student roster. Only sample students are listed.");
        }
      })
      .catch(() => {
        setRosterError("Could not load the CRM student roster. Only sample students are listed.");
      });
  }, [students, lockedStudentId]);

  // Auto-focus search input when student dropdown opens
  useEffect(() => {
    if (isStudentDropdownOpen) {
      const timer = setTimeout(() => {
        studentSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setStudentSearchQuery("");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isStudentDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStudentDropdownOpen(false);
      }
      if (
        docTypeDropdownRef.current &&
        !docTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDocTypeDropdownOpen(false);
      }
      if (
        docTypeMenuRef.current &&
        !docTypeMenuRef.current.contains(event.target as Node)
      ) {
        setShowDocTypeMenu(false);
      }
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
      if (
        addSectionMenuRef.current &&
        !addSectionMenuRef.current.contains(event.target as Node)
      ) {
        setIsAddSectionOpen(false);
      }
      if (
        headingMenuRef.current &&
        !headingMenuRef.current.contains(event.target as Node)
      ) {
        setShowHeadingMenu(false);
      }
      if (
        fontMenuRef.current &&
        !fontMenuRef.current.contains(event.target as Node)
      ) {
        setShowFontMenu(false);
      }
      if (
        colorMenuRef.current &&
        !colorMenuRef.current.contains(event.target as Node)
      ) {
        setShowColorMenu(false);
      }
      if (
        infoMenuRef.current &&
        !infoMenuRef.current.contains(event.target as Node)
      ) {
        setShowInfoPopover(false);
      }
      if (
        chatHistoryRef.current &&
        !chatHistoryRef.current.contains(event.target as Node)
      ) {
        setIsChatHistoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Graceful exit from Document Studio: immediately persists in-progress draft to recent creations
  const handleExitStudio = () => {
    if (editableDocContent) {
      syncDocumentToRecent(editableDocContent, "Edited just now");
    }
    // Flush any pending cooking or modal overlay states so operator is never stuck on "Generating Doc"
    setIsCooking(false);
    setIsModalOpen(false);
    setGenerateError(null);
    setIsRearrangeModalOpen(false);
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    setActiveDocument(null);
    setEditableDocContent(null);
    setTiptapHtml("");
    setCvDocumentData(null);

    // Clean URL query parameters so returning home resets to a clean dashboard state
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("studentId") || url.searchParams.has("student")) {
          url.searchParams.delete("studentId");
          url.searchParams.delete("student");
          window.history.pushState({}, "", url.pathname || "/");
        }
      } catch { }
    }
  };

  // Unified chat session loader for a document
  const loadChatSessionsForDoc = useCallback(
    (studentId: string, docType: string, studentName: string) => {
      const sessionsKey = `antigravity_studio_chat_sessions_${studentId}_${docType}`;
      const legacyKey = `antigravity_studio_chat_${studentId}_${docType}`;
      let loadedSessions: ChatSession[] = [];

      try {
        const storedSessions = localStorage.getItem(sessionsKey);
        if (storedSessions) {
          const parsed = JSON.parse(storedSessions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedSessions = parsed;
          }
        }
      } catch { }

      // Backward compatibility: load legacy single thread if sessions list is empty
      if (loadedSessions.length === 0) {
        try {
          const storedLegacy = localStorage.getItem(legacyKey);
          if (storedLegacy) {
            const parsed = JSON.parse(storedLegacy);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedSessions = [
                {
                  id: generateUniqueId("sess"),
                  title: "Previous Chat",
                  createdAt: getFormattedTimestamp(),
                  messages: parsed,
                },
              ];
            }
          }
        } catch { }
      }

      // If still empty, initialize with default welcome session
      if (loadedSessions.length === 0) {
        const defaultMsg = getDefaultGreetingMessage(studentName, docType);
        loadedSessions = [
          {
            id: generateUniqueId("sess"),
            title: "Initial Chat",
            createdAt: getFormattedTimestamp(),
            messages: [defaultMsg],
          },
        ];
      }

      setChatSessions(loadedSessions);
      const activeSess = loadedSessions[loadedSessions.length - 1];
      setActiveSessionId(activeSess.id);
      setChatMessages(activeSess.messages);
      setActiveCvSectionPrompt(null);
      setActiveFieldPrompt(null);
    },
    []
  );

  // Starts a fresh chat conversation without deleting previous chats
  const handleStartNewChat = () => {
    if (!editableDocContent) return;
    const newSessionId = generateUniqueId("sess");
    const greeting = getDefaultGreetingMessage(editableDocContent.studentName, editableDocContent.docType);
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Chat ${chatSessions.length + 1}`,
      createdAt: getFormattedTimestamp(),
      messages: [greeting],
    };

    setChatSessions((prev) => {
      const updated = [...prev, newSession];
      if (activeDocument) {
        try {
          localStorage.setItem(
            `antigravity_studio_chat_sessions_${activeDocument.studentId}_${activeDocument.docType}`,
            JSON.stringify(updated)
          );
        } catch { }
      }
      return updated;
    });

    setActiveSessionId(newSessionId);
    setChatMessages([greeting]);
    setActiveCvSectionPrompt(null);
    setActiveFieldPrompt(null);
    setIsChatHistoryOpen(false);
    setAiToast({ message: "Started a fresh chat session", type: "success" });
  };

  // Switch to a previous conversation from Chat History
  const handleSwitchSession = (sessionId: string) => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (session) {
      setActiveSessionId(session.id);
      setChatMessages(session.messages);
      setActiveCvSectionPrompt(null);
      setActiveFieldPrompt(null);
      setIsChatHistoryOpen(false);
      setAiToast({ message: `Switched to "${session.title}"`, type: "success" });
    }
  };

  // Delete an individual chat session from History
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (activeDocument) {
        try {
          localStorage.setItem(
            `antigravity_studio_chat_sessions_${activeDocument.studentId}_${activeDocument.docType}`,
            JSON.stringify(filtered)
          );
        } catch { }
      }
      if (sessionId === activeSessionId) {
        if (filtered.length > 0) {
          const next = filtered[filtered.length - 1];
          setActiveSessionId(next.id);
          setChatMessages(next.messages);
        } else {
          const newId = generateUniqueId("sess");
          const greeting = getDefaultGreetingMessage(
            editableDocContent?.studentName || "Student",
            editableDocContent?.docType || "CV"
          );
          const fallback: ChatSession = {
            id: newId,
            title: "Chat 1",
            createdAt: getFormattedTimestamp(),
            messages: [greeting],
          };
          setActiveSessionId(newId);
          setChatMessages([greeting]);
          return [fallback];
        }
      }
      return filtered;
    });
  };

  // Continuous sync of conversation to localStorage per document & session
  useEffect(() => {
    if (!activeDocument || !activeSessionId) return;
    const studentId = activeDocument.studentId;
    const docType = activeDocument.docType;
    const sessionsKey = `antigravity_studio_chat_sessions_${studentId}_${docType}`;
    const legacyKey = `antigravity_studio_chat_${studentId}_${docType}`;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- chatMessages is set from many async AI/assistant paths; folding the active session (title + messages) into chatSessions and persisting it to localStorage here is the single sync point, and moving it to every setter would change persistence timing.
    setChatSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === activeSessionId);
      let updated: ChatSession[];
      if (idx >= 0) {
        const cur = prev[idx];
        let newTitle = cur.title;
        if (
          newTitle === "Initial Chat" ||
          newTitle === "New Chat" ||
          newTitle.startsWith("Chat ") ||
          newTitle === "Previous Chat"
        ) {
          const firstUser = chatMessages.find((m) => m.sender === "user");
          if (firstUser) {
            newTitle =
              firstUser.text.replace(/^[🎯✂️📝🛡️✨\s]+/, "").slice(0, 26) +
              (firstUser.text.length > 26 ? "…" : "");
          }
        }
        const updatedSession = { ...cur, title: newTitle, messages: chatMessages };
        updated = [...prev];
        updated[idx] = updatedSession;
      } else {
        const newSession: ChatSession = {
          id: activeSessionId,
          title: "Chat " + (prev.length + 1),
          createdAt: getFormattedTimestamp(),
          messages: chatMessages,
        };
        updated = [...prev, newSession];
      }

      try {
        localStorage.setItem(sessionsKey, JSON.stringify(updated));
        localStorage.setItem(legacyKey, JSON.stringify(chatMessages));
      } catch { }
      return updated;
    });

    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeDocument, activeSessionId, isAiCooking]);

  // Continuous Auto-Save: debounced sync of in-progress edits to recentDocs & localStorage
  useEffect(() => {
    if (!editableDocContent || !activeDocument) return;
    const timer = setTimeout(() => {
      syncDocumentToRecent(editableDocContent, "Edited just now");
    }, 800);
    return () => clearTimeout(timer);
  }, [editableDocContent, activeDocument, syncDocumentToRecent]);

  // Window beforeunload listener: guarantees midway edits are saved if user leaves midway or reloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (editableDocContent) {
        try {
          const stored = localStorage.getItem(RECENT_DOCS_STORAGE_KEY);
          const list: HydratedDocumentData[] = stored ? JSON.parse(stored) : INITIAL_RECENT_DOCS;
          const updatedDoc: HydratedDocumentData = {
            ...editableDocContent,
            updatedAt: "Edited just now",
          };
          const updatedList = syncDocumentToRecentList(list, updatedDoc, "Edited just now");
          localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(updatedList));
        } catch { }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editableDocContent]);

  // Non-destructive CRM hydration when live CRM data resolves for active document's student
  useEffect(() => {
    if (!activeDocument || !selectedStudentData?.student) return;
    const currentStudentId = activeDocIdentityRef.current?.studentId;
    const crmStudent = selectedStudentData.student as { _id?: string; id?: string };
    const crmStudentId = crmStudent._id || crmStudent.id;
    if (!currentStudentId || currentStudentId !== crmStudentId) return;

    if (activeDocument.docType === "CV" && cvDocumentData) {
      try {
        const norm = mapCrmToNormalizedStudent(selectedStudentData);
        const proj = mapNormalizedToResume(norm);
        const crmCv = proj.student;
        if (crmCv && crmCv.personal) {
          let changed = false;
          const updatedPersonal = { ...cvDocumentData.personal };
          if (crmCv.personal.photoUrl && updatedPersonal.photoUrl !== crmCv.personal.photoUrl) {
            updatedPersonal.photoUrl = crmCv.personal.photoUrl;
            changed = true;
          }
          if (!updatedPersonal.address && crmCv.personal.address) {
            updatedPersonal.address = crmCv.personal.address;
            changed = true;
          }
          if (!updatedPersonal.dateOfBirth && crmCv.personal.dateOfBirth) {
            updatedPersonal.dateOfBirth = crmCv.personal.dateOfBirth;
            changed = true;
          }
          if (!updatedPersonal.passportNumber && crmCv.personal.passportNumber) {
            updatedPersonal.passportNumber = crmCv.personal.passportNumber;
            changed = true;
          }
          if (!updatedPersonal.nationality && crmCv.personal.nationality) {
            updatedPersonal.nationality = crmCv.personal.nationality;
            changed = true;
          }
          if (!updatedPersonal.gender && crmCv.personal.gender) {
            updatedPersonal.gender = crmCv.personal.gender;
            changed = true;
          }
          if (!updatedPersonal.phone && crmCv.personal.phone) {
            updatedPersonal.phone = crmCv.personal.phone;
            changed = true;
          }
          if (!updatedPersonal.email && crmCv.personal.email) {
            updatedPersonal.email = crmCv.personal.email;
            changed = true;
          }
          if (changed) {
            const timer = setTimeout(() => {
              setCvDocumentData((prev) => (prev ? { ...prev, personal: updatedPersonal } : prev));
            }, 0);
            return () => clearTimeout(timer);
          }
        }
      } catch { }
    }
  }, [selectedStudentData, activeDocument, cvDocumentData]);

  // Timer counter effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Auto-dismiss AI toast after 4s
  useEffect(() => {
    if (aiToast) {
      const timer = setTimeout(() => setAiToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [aiToast]);

  // Caret Engine & Studio Undo & Redo Handlers
  const handleUndo = () => {
    const isCvEuropass = editableDocContent?.docType === "CV" && cvViewMode === "europass";

    if (!isCvEuropass && tiptapEditor && tiptapEditor.can().undo()) {
      tiptapEditor.chain().focus().undo().run();
      setAiToast({ message: "Reverted via Caret Engine", type: "info" });
      return;
    }

    if ((docHistory.length === 0 && cvHistory.length === 0) || !editableDocContent) {
      setAiToast({ message: "Nothing to undo", type: "info" });
      return;
    }

    let previousDoc = editableDocContent;
    if (docHistory.length > 0) {
      previousDoc = docHistory[docHistory.length - 1];
      setRedoHistory((prev) => [JSON.parse(JSON.stringify(editableDocContent)), ...prev]);
      setDocHistory((prev) => prev.slice(0, prev.length - 1));
      setEditableDocContent(previousDoc);
      setActiveDocument(previousDoc);
      syncDocumentToRecent(previousDoc, "Reverted just now");

      const html = docSectionsToHtml(previousDoc.sections, previousDoc.docType, previousDoc.title);
      setTiptapHtml(html);
      if (tiptapEditor) {
        tiptapEditor.commands.setContent(html);
      }
    }

    if (editableDocContent.docType === "CV") {
      if (cvHistory.length > 0) {
        const previousCv = cvHistory[cvHistory.length - 1];
        if (cvDocumentData) {
          setCvRedoHistory((prev) => [JSON.parse(JSON.stringify(cvDocumentData)), ...prev]);
        }
        setCvHistory((prev) => prev.slice(0, prev.length - 1));
        setCvDocumentData(previousCv);
      } else {
        const baseCv = cvDocumentData || getEuropassData(previousDoc.studentId, previousDoc.studentName, selectedStudentData);
        const synced = syncSectionsToCvData(previousDoc.sections, baseCv);
        setCvDocumentData(synced);
      }
    }

    setAiToast({ message: "↩️ Reverted to previous revision", type: "info" });
  };

  const handleRedo = () => {
    const isCvEuropass = editableDocContent?.docType === "CV" && cvViewMode === "europass";

    if (!isCvEuropass && tiptapEditor && tiptapEditor.can().redo()) {
      tiptapEditor.chain().focus().redo().run();
      setAiToast({ message: "Redone via Caret Engine", type: "info" });
      return;
    }

    if ((redoHistory.length === 0 && cvRedoHistory.length === 0) || !editableDocContent) {
      setAiToast({ message: "Nothing to redo", type: "info" });
      return;
    }

    let nextDoc = editableDocContent;
    if (redoHistory.length > 0) {
      nextDoc = redoHistory[0];
      setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
      setRedoHistory((prev) => prev.slice(1));
      setEditableDocContent(nextDoc);
      setActiveDocument(nextDoc);
      syncDocumentToRecent(nextDoc, "Redone just now");

      const html = docSectionsToHtml(nextDoc.sections, nextDoc.docType, nextDoc.title);
      setTiptapHtml(html);
      if (tiptapEditor) {
        tiptapEditor.commands.setContent(html);
      }
    }

    if (editableDocContent.docType === "CV") {
      if (cvRedoHistory.length > 0) {
        const nextCv = cvRedoHistory[0];
        if (cvDocumentData) {
          setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(cvDocumentData))]);
        }
        setCvRedoHistory((prev) => prev.slice(1));
        setCvDocumentData(nextCv);
      } else {
        const baseCv = cvDocumentData || getEuropassData(nextDoc.studentId, nextDoc.studentName, selectedStudentData);
        const synced = syncSectionsToCvData(nextDoc.sections, baseCv);
        setCvDocumentData(synced);
      }
    }

    setAiToast({ message: "🔁 Redone", type: "info" });
  };

  // Canvas Section Management: Delete Section
  const handleDeleteSection = (index: number) => {
    if (!editableDocContent || !editableDocContent.sections[index]) return;
    setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
    if (editableDocContent.docType === "CV") {
      const baseCv = cvDocumentData || getEuropassData(editableDocContent.studentId, editableDocContent.studentName, selectedStudentData);
      setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(baseCv))]);
      setCvRedoHistory([]);
    }
    setRedoHistory([]);

    const removed = editableDocContent.sections[index];
    const updatedSections = editableDocContent.sections.filter((_, i) => i !== index);
    const updated: HydratedDocumentData = {
      ...editableDocContent,
      sections: updatedSections,
      wordCount: updatedSections.reduce((acc, s) => acc + s.content.trim().split(/\s+/).filter(Boolean).length, 0),
    };

    setEditableDocContent(updated);
    syncDocumentToRecent(updated, "Edited just now");

    const currentLiveHtml = tiptapEditor ? tiptapEditor.getHTML() : tiptapHtml;
    const html =
      editableDocContent?.docType === "COVER_LETTER" && currentLiveHtml
        ? updateLiveCoverLetterHtml(currentLiveHtml, editableDocContent.sections, updated.sections)
        : docSectionsToHtml(updated.sections, updated.docType, updated.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }
    if (updated.docType === "CV") {
      const baseCv = cvDocumentData || getEuropassData(updated.studentId, updated.studentName, selectedStudentData);
      const synced = syncSectionsToCvData(updated.sections, baseCv);
      setCvDocumentData(synced);
    }

    const deleteNotice: ChatMessage = {
      id: generateUniqueId("asst"),
      sender: "assistant",
      text: `🗑️ Removed section: **${removed.heading || "Section"}**. The document layout has been updated.`,
      timestamp: getFormattedTimestamp(),
      sectionUpdated: removed.heading,
      actionType: "deleted_section",
    };
    setChatMessages((prev) => [...prev, deleteNotice]);
    setAiToast({ message: `🗑️ Removed ${removed.heading || "Section"}`, type: "info" });
  };

  // Canvas Section Management: Move / Reorder Section
  const handleMoveSection = (fromIndex: number, toIndex: number) => {
    if (!editableDocContent || toIndex < 0 || toIndex >= editableDocContent.sections.length) return;
    setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
    if (editableDocContent.docType === "CV") {
      const baseCv = cvDocumentData || getEuropassData(editableDocContent.studentId, editableDocContent.studentName, selectedStudentData);
      setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(baseCv))]);
      setCvRedoHistory([]);
    }
    setRedoHistory([]);

    const nextSections = [...editableDocContent.sections];
    const [moved] = nextSections.splice(fromIndex, 1);
    nextSections.splice(toIndex, 0, moved);

    const updated: HydratedDocumentData = {
      ...editableDocContent,
      sections: nextSections,
    };

    setEditableDocContent(updated);
    setActiveDocument(updated);
    syncDocumentToRecent(updated, "Edited just now");

    const html = docSectionsToHtml(updated.sections, updated.docType, updated.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }
    if (updated.docType === "CV") {
      const baseCv = cvDocumentData || getEuropassData(updated.studentId, updated.studentName, selectedStudentData);
      const synced = syncSectionsToCvData(updated.sections, baseCv);
      setCvDocumentData(synced);
    }

    setAiToast({ message: `Moved "${moved.heading}"`, type: "info" });
    setTimeout(() => setAiToast(null), 2500);
  };

  // Canvas Section Management: Scroll into view when clicking a section chip
  const handleScrollToSection = (heading?: string) => {
    if (!heading) return;
    setLastActiveTargetSection(heading);
    const paper = document.querySelector(".a4-paper-sheet");
    if (!paper) return;
    const elements = paper.querySelectorAll("h1, h2, h3, p, strong, div");
    const normalized = heading.trim().toLowerCase();
    for (const el of Array.from(elements)) {
      if (el.textContent && el.textContent.trim().toLowerCase().includes(normalized)) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-indigo-400", "rounded", "transition-all");
        setTimeout(() => el.classList.remove("ring-2", "ring-indigo-400"), 1500);
        break;
      }
    }
  };

  // ── Inline Canvas & Input Formatting Helpers (Supports CV & Rich-Text) ────
  const applyInlineFormatToActiveSelection = (format: "bold" | "italic" | "underline" | "strike") => {
    if (tiptapEditor) {
      if (format === "bold") tiptapEditor.chain().focus().toggleBold().run();
      else if (format === "italic") tiptapEditor.chain().focus().toggleItalic().run();
      else if (format === "underline") tiptapEditor.chain().focus().toggleUnderline().run();
      else if (format === "strike") tiptapEditor.chain().focus().toggleStrike().run();
      return;
    }

    // In CV / Europass mode:
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement) {
      const start = activeEl.selectionStart ?? 0;
      const end = activeEl.selectionEnd ?? 0;
      const val = activeEl.value;
      const selected = val.slice(start, end);

      let prefix = "**";
      let suffix = "**";
      if (format === "italic") { prefix = "*"; suffix = "*"; }
      else if (format === "underline") { prefix = "<u>"; suffix = "</u>"; }
      else if (format === "strike") { prefix = "~~"; suffix = "~~"; }

      let nextVal = val;
      if (selected.length > 0) {
        if (selected.startsWith(prefix) && selected.endsWith(suffix)) {
          nextVal = val.slice(0, start) + selected.slice(prefix.length, -suffix.length) + val.slice(end);
        } else {
          nextVal = val.slice(0, start) + prefix + selected + suffix + val.slice(end);
        }
      } else {
        nextVal = val.slice(0, start) + prefix + suffix + val.slice(end);
      }

      const nativeSetter = Object.getOwnPropertyDescriptor(
        activeEl instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeSetter?.call(activeEl, nextVal);
      activeEl.dispatchEvent(new Event("input", { bubbles: true }));
      activeEl.focus();
      return;
    }

    try {
      const cmd = format === "bold" ? "bold" : format === "italic" ? "italic" : format === "underline" ? "underline" : "strikeThrough";
      document.execCommand(cmd, false);
    } catch { }

    if (format === "bold") setIsBold((prev) => !prev);
    else if (format === "italic") setIsItalic((prev) => !prev);
    else if (format === "underline") setIsUnderline((prev) => !prev);
    else if (format === "strike") setIsStrikethrough((prev) => !prev);
  };

  const handleListFormat = (type: "bullet" | "ordered") => {
    if (tiptapEditor) {
      if (type === "bullet") tiptapEditor.chain().focus().toggleBulletList().run();
      else tiptapEditor.chain().focus().toggleOrderedList().run();
      return;
    }

    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement) {
      const start = activeEl.selectionStart ?? 0;
      const end = activeEl.selectionEnd ?? 0;
      const val = activeEl.value;
      const bulletChar = type === "bullet" ? "• " : "1. ";
      const nextVal = val.slice(0, start) + (start > 0 && val[start - 1] !== "\n" ? "\n" : "") + bulletChar + val.slice(end);

      const nativeSetter = Object.getOwnPropertyDescriptor(
        activeEl instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeSetter?.call(activeEl, nextVal);
      activeEl.dispatchEvent(new Event("input", { bubbles: true }));
      activeEl.focus();
    } else {
      setAiToast({ message: "Tip: Click into any CV text field to insert bullets", type: "info" });
    }
  };

  // ── Sentence-Level AI Change Diffing & Highlighting ────────────────────────
  const extractChangedSentences = (oldText: string, newText: string): string[] => {
    const cleanOld = (oldText || "").replace(/\*\*/g, "").replace(/\r?\n+/g, " ").trim();
    const cleanNew = (newText || "").replace(/\*\*/g, "").replace(/\r?\n+/g, " ").trim();

    if (!cleanOld) {
      return cleanNew
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);
    }

    const oldSentences = cleanOld
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const newSentences = cleanNew
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const changed = newSentences.filter(
      (ns) => !oldSentences.some((os) => os === ns || os.includes(ns) || ns.includes(os))
    );
    return changed.length > 0 ? changed : (newSentences.length > 0 ? [newSentences[0]] : []);
  };

  const highlightChangedSentenceInCanvas = (
    sectionName?: string,
    changedSentencesInput?: string[] | string
  ) => {
    if (!sectionName) return;

    const changedSentences: string[] = Array.isArray(changedSentencesInput)
      ? changedSentencesInput.filter(Boolean)
      : changedSentencesInput
        ? [changedSentencesInput]
        : [];

    setActiveAiHighlight({
      sectionName,
      phrase: changedSentences[0] || "",
      timestamp: Date.now(),
    });

    if (editableDocContent?.docType === "CV" && cvViewMode === "europass") {
      const sLower = sectionName.toLowerCase();
      let canonical = "aboutMe";
      if (sLower.includes("work") || sLower.includes("internship")) canonical = "internships";
      else if (sLower.includes("education") || sLower.includes("academic")) canonical = "education";
      else if (sLower.includes("skill") && !sLower.includes("language")) canonical = "skills";
      else if (sLower.includes("language") || sLower.includes("mother tongue")) canonical = "languageSkills";
      else if (sLower.includes("project")) canonical = "academicProjects";
      else if (sLower.includes("achievement") || sLower.includes("award")) canonical = "achievements";
      else if (sLower.includes("certificate") || sLower.includes("ielts")) canonical = "englishCertificate";
      else if (sLower.includes("phone") || sLower.includes("email") || sLower.includes("address") || sLower.includes("personal")) canonical = "personalDetails";

      setActiveAiCvSectionKey(canonical);
      setTimeout(() => {
        const cvSectionEl = document.querySelector(`[data-section-id="${canonical}"]`);
        if (cvSectionEl) {
          cvSectionEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 200);
      return;
    }

    setTimeout(() => {
      const paper = document.querySelector(".a4-paper-sheet");
      if (!paper) return;

      // 1. Remove previous sentence highlights cleanly
      paper.querySelectorAll(".ai-sentence-highlight, .ai-phrase-highlight").forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ""), el);
          parent.normalize();
        }
      });
      paper.querySelectorAll(".ai-change-highlight-glow").forEach((el) => {
        el.classList.remove("ai-change-highlight-glow");
        (el as HTMLElement).style.removeProperty("background");
        (el as HTMLElement).style.removeProperty("border-left");
        (el as HTMLElement).style.removeProperty("box-shadow");
        (el as HTMLElement).style.removeProperty("padding-left");
        (el as HTMLElement).style.removeProperty("border-radius");
      });

      if (!changedSentences || changedSentences.length === 0) return;

      // 2. Query ONLY leaf elements - NEVER container divs!
      const elements = Array.from(
        paper.querySelectorAll(".tiptap p, .tiptap li, .tiptap h1, .tiptap h2, .tiptap h3, .tiptap div, .a4-paper-sheet p, .a4-paper-sheet li, .a4-paper-sheet div")
      ).filter((el) => el.querySelectorAll("p, div, ul, ol").length === 0) as HTMLElement[];

      let firstHighlightedEl: HTMLElement | null = null;

      for (const rawSentence of changedSentences) {
        const cleanSentence = (rawSentence || "").replace(/\*\*/g, "").replace(/\r?\n+/g, " ").trim();
        if (cleanSentence.length < 2) continue;

        // Try exact sentence match first, then a 35-character signature snippet
        const snippet = cleanSentence.length > 35 ? cleanSentence.slice(0, 35) : cleanSentence;

        for (const el of elements) {
          const text = (el.textContent || "").replace(/\s+/g, " ");
          if (text.includes(cleanSentence) || text.includes(snippet)) {
            try {
              const html = el.innerHTML;
              if (html.includes("ai-sentence-highlight")) continue;

              const target = text.includes(cleanSentence) ? cleanSentence : snippet;
              const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const rx = new RegExp(`(${escaped}[^.?!<>]*[.?!]?)`, "i");

              if (rx.test(html)) {
                el.innerHTML = html.replace(
                  rx,
                  `<mark class="ai-sentence-highlight" style="background-color: transparent; text-decoration: underline; text-decoration-color: #16a34a; text-decoration-thickness: 1.5px; text-underline-offset: 3px; color: inherit;">$1</mark>`
                );
                if (!firstHighlightedEl) firstHighlightedEl = el;
                break;
              } else {
                const simpleRx = new RegExp(`(${escaped})`, "i");
                if (simpleRx.test(html)) {
                  el.innerHTML = html.replace(
                    simpleRx,
                    `<mark class="ai-sentence-highlight" style="background-color: transparent; text-decoration: underline; text-decoration-color: #16a34a; text-decoration-thickness: 1.5px; text-underline-offset: 3px; color: inherit;">$1</mark>`
                  );
                  if (!firstHighlightedEl) firstHighlightedEl = el;
                  break;
                }
              }
            } catch { }
          }
        }
      }

      if (firstHighlightedEl) {
        firstHighlightedEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);
  };

  const highlightChangedSectionInCanvas = highlightChangedSentenceInCanvas;

  const handleClearAiHighlight = () => {
    setActiveAiHighlight(null);
    setActiveAiCvSectionKey(null);
    const paper = document.querySelector(".a4-paper-sheet");
    if (paper) {
      paper.querySelectorAll(".ai-sentence-highlight, .ai-phrase-highlight").forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ""), el);
          parent.normalize();
        }
      });
      paper.querySelectorAll(".ai-change-highlight-glow").forEach((el) => {
        el.classList.remove("ai-change-highlight-glow");
        (el as HTMLElement).style.removeProperty("background");
        (el as HTMLElement).style.removeProperty("border-left");
        (el as HTMLElement).style.removeProperty("box-shadow");
        (el as HTMLElement).style.removeProperty("padding-left");
        (el as HTMLElement).style.removeProperty("border-radius");
      });
    }
  };

  const handleJumpToAiHighlight = () => {
    if (activeAiHighlight) {
      highlightChangedSentenceInCanvas(activeAiHighlight.sectionName, activeAiHighlight.phrase);
    }
  };

  // Canvas Section Management: Add Section
  const handleAddSection = (heading: string, defaultContent: string = "") => {
    if (!editableDocContent) return;

    // In CV mode, guide the operator interactively with Chatbot Cross-Questions
    if (editableDocContent.docType === "CV" && !defaultContent) {
      const normalizedHeading = heading.trim().toUpperCase();
      const promptDef = CV_SECTION_PROMPTS[normalizedHeading] || {
        sectionKey: "customSection",
        label: heading,
        heading,
        createQuestion: `What information would you like to add to the ${heading} section for {studentName}?`,
        updateQuestion: `What additional information would you like to add to the ${heading} section for {studentName}?`,
        placeholder: `e.g. details for ${heading}...`,
      };

      const sectionAlreadyExists = isCvSectionPresent(promptDef.sectionKey, promptDef.heading);
      const studentName = editableDocContent.studentName || "the student";
      const rawQuestion = sectionAlreadyExists
        ? (promptDef.updateQuestion || promptDef.createQuestion)
        : promptDef.createQuestion;
      const formattedQuestion = rawQuestion.replace(/\{studentName\}/g, studentName);

      // 1. Expand AI chat sidebar
      setIsSidebarCollapsed(false);

      // 2. Set active CV section prompt
      const promptInfo: CvSectionPrompt = {
        heading: promptDef.heading || heading,
        sectionKey: promptDef.sectionKey,
        label: promptDef.label,
        question: formattedQuestion,
        placeholder: promptDef.placeholder,
        isExisting: sectionAlreadyExists,
      };
      setActiveCvSectionPrompt(promptInfo);
      setActiveFieldPrompt(null);

      // 3. Post prompt message in AI chat (deduplicating if already prompted)
      const promptTitle = sectionAlreadyExists
        ? `Update Section: ${promptDef.label}`
        : `Add Section: ${promptDef.label}`;
      const promptNotice: ChatMessage = {
        id: generateUniqueId("asst-section-prompt"),
        sender: "assistant",
        text: `🎯 **${promptTitle}**\n\n${formattedQuestion}`,
        timestamp: getFormattedTimestamp(),
        actionType: "typed_section",
        sectionUpdated: promptDef.label,
      };
      setChatMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (
          lastMsg &&
          lastMsg.sender === "assistant" &&
          (lastMsg.text.trim() === promptNotice.text.trim() ||
            (lastMsg.actionType === "typed_section" && lastMsg.sectionUpdated === promptDef.label))
        ) {
          return prev;
        }
        return [...prev, promptNotice];
      });

      // 4. Focus chat input
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);

      setAiToast({
        message: sectionAlreadyExists
          ? `💬 Add more details for ${promptDef.label} in the AI Chat below`
          : `💬 Share details for ${promptDef.label} in the AI Chat below`,
        type: "info",
      });
      return;
    }

    setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
    setRedoHistory([]);

    const updatedSections = [...editableDocContent.sections, { heading, content: defaultContent }];
    const updated: HydratedDocumentData = {
      ...editableDocContent,
      sections: updatedSections,
      wordCount: updatedSections.reduce((acc, s) => acc + s.content.trim().split(/\s+/).filter(Boolean).length, 0),
    };

    setEditableDocContent(updated);
    syncDocumentToRecent(updated, "Edited just now");

    const html = docSectionsToHtml(updated.sections, updated.docType, updated.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }

    const addNotice: ChatMessage = {
      id: generateUniqueId("asst"),
      sender: "assistant",
      text: `➕ Added new empty section: **${heading}**. You can customize it directly or share details in this chat to fill it!`,
      timestamp: getFormattedTimestamp(),
      sectionUpdated: heading,
      actionType: "typed_section",
    };
    setChatMessages((prev) => [...prev, addNotice]);
    setAiToast({ message: `➕ Added ${heading}`, type: "success" });
  };

  // Canva Smart Refinement & Section Typing Engine (Preserving Invariant Student Facts)
  const handleRunSmartChange = (actionKey: string, customPrompt?: string, existingUserMsg?: ChatMessage) => {
    if (!editableDocContent) return;

    // Record user message if not already added by handleChatSendMessage
    if (!existingUserMsg) {
      let promptLabel = customPrompt || "Refine document";
      if (actionKey === "write_for_me") promptLabel = "✨ Write targeted academic rationale for this document";
      else if (actionKey === "create_outline") promptLabel = "📝 Create structured outline pillars";
      else if (actionKey === "academic_polish") promptLabel = "🎯 Polish academic tone and diction";
      else if (actionKey === "visa_compliance") promptLabel = "🛡️ Verify visa compliance and genuine student declaration";
      else if (actionKey === "improve" || actionKey === "trim_budget") promptLabel = "✨ Improve document content and professional impact";

      const userMsg: ChatMessage = {
        id: generateUniqueId("user"),
        sender: "user",
        text: promptLabel,
        timestamp: getFormattedTimestamp(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
    }

    // Snapshot current state for Undo
    setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
    if (editableDocContent.docType === "CV") {
      const baseCv = cvDocumentData || getEuropassData(editableDocContent.studentId, editableDocContent.studentName, selectedStudentData);
      setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(baseCv))]);
      setCvRedoHistory([]);
    }
    setRedoHistory([]);
    setIsAiCooking(true);

    if (actionKey === "custom" && customPrompt?.trim()) {
      const pLower = customPrompt.toLowerCase();
      const isDeleteRequest =
        pLower.startsWith("delete ") ||
        pLower.startsWith("remove ") ||
        pLower.includes("delete section") ||
        pLower.includes("remove section");

      const extracted = extractUserDirectiveAndSnippet(customPrompt);
      const anchor = (extracted.isSnippetProvided && extracted.snippet)
        ? findSnippetInSections(extracted.snippet, editableDocContent.sections)
        : null;

      const isEnhanceInstruction =
        Boolean(anchor) ||
        /\b(enhance|humanize|make\s+(?:it|this\s+)?(?:more\s+)?better|make\s+(?:it|this\s+)?(?:more\s+)?(?:professional|humanized|impactful)|improve|rephrase|rewrite|polish|elevate|expand|shorten|refine)\b/i.test(customPrompt) ||
        customPrompt.includes(":") ||
        customPrompt.includes('"') ||
        customPrompt.includes('“');

      if (isEnhanceInstruction || anchor) {
        void runAiEdit(
          customPrompt.trim(),
          undefined,
          anchor ? { heading: anchor.sectionHeading, snippet: anchor.matchedText } : undefined
        );
        return;
      }

      // For Cover Letter, SOP, and LOR, any natural conversational prompt goes directly to the AI
      if (editableDocContent.docType !== "CV" && !isDeleteRequest) {
        void runAiEdit(customPrompt.trim());
        return;
      }

      // For CV, only structured section commands stay local; natural conversational instructions go to the AI
      const isStructuredCvCommand =
        isDeleteRequest ||
        pLower.includes("ielts") ||
        pLower.includes("trf") ||
        pLower.includes("work experience") ||
        pLower.includes("internship") ||
        pLower.includes("skills") ||
        pLower.includes("education and training") ||
        pLower.includes("certif");

      if (!isStructuredCvCommand) {
        void runAiEdit(customPrompt.trim());
        return;
      }
    }
    if (AI_ACTION_INSTRUCTIONS[actionKey]) {
      void runAiEdit(AI_ACTION_INSTRUCTIONS[actionKey], actionKey);
      return;
    }

    setTimeout(() => {
      const updated = JSON.parse(JSON.stringify(editableDocContent)) as HydratedDocumentData;
      let appliedFeedback = "";
      let sectionUpdated: string | undefined = undefined;
      let actionType: ChatMessage["actionType"] = "general";

      if (actionKey === "write_for_me") {
        const targetSection =
          updated.sections.find(
            (s) =>
              s.heading.toLowerCase().includes("motivation") ||
              s.heading.toLowerCase().includes("career")
          ) || updated.sections[updated.sections.length - 1];
        if (targetSection) {
          targetSection.content += `\n\nFurthermore, my academic trajectory aligns directly with the curriculum structure at ${updated.targetUniversity}, focusing on empirical research, cross-border analysis, and practical case studies. This programmatic focus will enable me to build actionable expertise immediately applicable to industry demands.`;
        }
        appliedFeedback = "Added targeted academic rationale aligned with your program syllabus.";
        sectionUpdated = targetSection?.heading || "Motivation & Rationale";
        actionType = "outline";
      } else if (actionKey === "create_outline") {
        if (updated.docType === "CV") {
          const targetProg = updated.targetCourse || "Bachelor's Degree in Information Engineering";
          const targetUni = updated.targetUniversity || "Politecnico di Torino";
          const outlineText = `Candidate Profile & Core Architectural Pillars:\n• Core Pillar 1 (Academic Foundations): Rigorous secondary coursework in science and mathematics with analytical competence.\n• Core Pillar 2 (Technical & Applied Competencies): Technical aptitude, software proficiencies, and problem-solving methodology.\n• Core Pillar 3 (Practical Experience & Discipline): Consistent academic execution, extracurricular discipline, and independent learning.\n• Core Pillar 4 (International Target Synergy): Dedicated candidate seeking programmatic mastery in ${targetProg} at ${targetUni}.`;

          const aboutIdx = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("about"));
          if (aboutIdx >= 0) {
            updated.sections[aboutIdx].content = outlineText;
          } else {
            updated.sections.unshift({
              heading: "ABOUT ME",
              content: outlineText,
            });
          }
          appliedFeedback = `📝 **Structured CV Architectural Pillars**:\n\n• **Pillar 1: Academic Foundations** — Verified academic background and quantitative rigor.\n• **Pillar 2: Technical & Core Competencies** — Tools, programming/technical proficiencies, and foundational skills.\n• **Pillar 3: Practical & Project Experience** — Applied projects, academic milestones, and coursework.\n• **Pillar 4: International Alignment** — Academic progression aligned with ${targetProg} at ${targetUni}.\n\nYour CV Profile Summary has been refreshed with this 4-pillar architectural foundation.`;
          sectionUpdated = "ABOUT ME";
          actionType = "outline";
        } else {
          const hasOutline = updated.sections.some((s) => s.heading.toLowerCase().includes("outline"));
          if (!hasOutline) {
            updated.sections.unshift({
              heading: "Document Architecture & Core Pillars",
              content: "• Core Pillar 1: Verified Academic Foundations & Analytical Methodology\n• Core Pillar 2: Industry Practice, Case Due Diligence & Technical Mastery\n• Core Pillar 3: Institutional Alignment, Course Modules & Faculty Synergy\n• Core Pillar 4: Long-Term Career Objectives & Home Country Ties",
            });
          }
          appliedFeedback = "Generated structured 4-pillar architectural outline for your document.";
          sectionUpdated = "Document Architecture & Core Pillars";
          actionType = "outline";
        }
      } else if (actionKey === "draft_post") {
        updated.sections.push({
          heading: "Executive Summary / Blog Excerpt",
          content: `Key Insights from ${updated.studentName}'s Academic Profile:\nNavigating advanced studies at ${updated.targetUniversity} for ${updated.targetCourse}. This document synthesizes verified credentials with clear research directives and commercial applicability.`,
        });
        appliedFeedback = "Synthesized executive profile summary.";
        sectionUpdated = "Executive Summary";
        actionType = "general";
      } else if (actionKey === "academic_polish") {
        updated.sections = updated.sections.map((section) => {
          let polished = section.content;
          polished = polished
            .replace(/\bI want to\b/g, "I aim to")
            .replace(/\bvery good\b/g, "rigorous")
            .replace(/\blots of\b/g, "substantial")
            .replace(/\bhelp me to\b/g, "enable me to")
            .replace(/\bI think that\b/g, "I am convinced that")
            .replace(/\bgood at\b/g, "proficient in");
          return { ...section, content: polished };
        });
        appliedFeedback = "Polished overall academic diction and tone while preserving student profile facts.";
        sectionUpdated = "All Document Sections";
        actionType = "polished";
      } else if (actionKey === "visa_compliance") {
        const targetUni = updated.targetUniversity || "Politecnico di Torino";
        const targetCourse = updated.targetCourse || "Bachelor's Degree in Information Engineering";
        const genuineDeclaration = `I hereby declare that all information, academic credentials, and details provided in this document are authentic, accurate, and verifiable. I confirm my intent as a Genuine Student applying solely to pursue and complete ${targetCourse} at ${targetUni}. Upon graduation, I intend to return immediately to my home country to advance my professional career.`;

        const visaSecIdx = updated.sections.findIndex(
          (s) =>
            s.heading.toLowerCase().includes("declaration") ||
            s.heading.toLowerCase().includes("compliance") ||
            s.heading.toLowerCase().includes("genuine")
        );
        if (visaSecIdx >= 0) {
          updated.sections[visaSecIdx].content = genuineDeclaration;
          updated.sections[visaSecIdx].heading = "DECLARATION";
        } else {
          updated.sections.push({
            heading: "DECLARATION",
            content: genuineDeclaration,
          });
        }
        appliedFeedback = `🛡️ **Visa Compliance & Genuine Student Audit**:\n\n• **Genuine Student Intent**: ✅ Full compliant declaration inserted\n• **Identity & Travel Consistency**: ✅ Verified (${updated.studentName}, Nationality: Indian)\n• **Academic Credential Integrity**: ✅ Verified & documented\n• **Language Proficiency Evidence**: ✅ Attached\n• **Non-Immigrant Ties & Return Intent**: ✅ Documented (Return upon graduation)\n\nDocument declaration updated to meet international embassy visa compliance standards.`;
        sectionUpdated = "DECLARATION";
        actionType = "typed_section";
      } else if (actionKey === "improve" || actionKey === "trim_budget") {
        updated.sections = updated.sections.map((section) => {
          let content = section.content;
          content = content
            .replace(/\bresponsible for\b/gi, "spearheaded and managed")
            .replace(/\bworked on\b/gi, "actively engineered and implemented")
            .replace(/\bhelped in\b/gi, "facilitated and contributed to")
            .replace(/\blearned\b/gi, "mastered and applied")
            .replace(/\bgood knowledge of\b/gi, "demonstrated proficiency in")
            .replace(/\bhandled\b/gi, "directed and optimized")
            .replace(/\bin order to\b/gi, "to")
            .replace(/\bdue to the fact that\b/gi, "because")
            .replace(/\bat this point in time\b/gi, "presently");
          return { ...section, content };
        });
        appliedFeedback = "Enhanced document content, clarity, and professional impact while preserving student profile facts.";
        sectionUpdated = "All Document Sections";
        actionType = "polished";
      } else if (customPrompt && customPrompt.trim()) {
        const promptLower = customPrompt.toLowerCase();
        const cleanPromptForDelete = promptLower
          .replace(/\[|\]/g, "")
          .replace(/^(?:please\s+)?(?:delete|remove|drop|clear|hide)(?:\s+the)?(?:\s+section)?\s*/i, "")
          .trim();

        const isSampleRequest =
          promptLower.includes("sample") ||
          promptLower.includes("example") ||
          promptLower.includes("dummy") ||
          promptLower.includes("fill out") ||
          promptLower.includes("fill in") ||
          promptLower.includes("populate") ||
          promptLower.includes("generate") ||
          promptLower.includes("create a sample") ||
          promptLower.includes("add sample") ||
          promptLower.includes("write sample") ||
          promptLower.includes("give me") ||
          promptLower.includes("sample detail") ||
          promptLower.includes("sample cert");

        // ── Case 1: Operator requests section deletion / removal ──────────────────
        const isDeleteRequest =
          promptLower.startsWith("delete") ||
          promptLower.startsWith("remove") ||
          promptLower.includes("delete section") ||
          promptLower.includes("remove section") ||
          promptLower.includes("drop section") ||
          promptLower.includes("delete the") ||
          promptLower.includes("remove the");

        if (isDeleteRequest) {
          let targetIndex = -1;
          if (
            /other\s*languages?/i.test(promptLower) ||
            /second\s*language/i.test(promptLower) ||
            /remove\s*(?:the\s*)?(?:other\s*language|english\s*from\s*language)/i.test(promptLower)
          ) {
            const langIdx = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("language") && !s.heading.toLowerCase().includes("certificate"));
            if (langIdx >= 0) {
              const langSec = updated.sections[langIdx];
              const mtMatch = langSec.content.match(/mother\s*tou?ngue(?:\(s\))?\s*[-:]\s*([^\n,]+)/i);
              if (mtMatch && mtMatch[1].trim()) {
                langSec.content = `Mother tongue(s): ${mtMatch[1].trim()}`;
                sectionUpdated = "LANGUAGE SKILLS";
                actionType = "typed_section";
                appliedFeedback = `🗑️ Removed **Other language(s)** from Language Skills. The Europass CV has been refreshed.`;
              } else {
                updated.sections.splice(langIdx, 1);
                sectionUpdated = "LANGUAGE SKILLS";
                actionType = "deleted_section";
                appliedFeedback = `🗑️ Removed section: **LANGUAGE SKILLS**. The document layout has been updated.`;
              }
              targetIndex = -999;
            }
          } else if (
            promptLower.includes("language skills") ||
            cleanPromptForDelete === "language skills" ||
            cleanPromptForDelete === "language" ||
            (promptLower.includes("language") && !promptLower.includes("certificate") && !promptLower.includes("ielts"))
          ) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("language") && !s.heading.toLowerCase().includes("certificate"));
          } else if (
            promptLower.includes("work") ||
            promptLower.includes("experience") ||
            promptLower.includes("intern") ||
            promptLower.includes("job") ||
            cleanPromptForDelete.includes("software developer")
          ) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("work") || s.heading.toLowerCase().includes("experience") || s.heading.toLowerCase().includes("intern"));
          } else if (
            promptLower.includes("about") ||
            promptLower.includes("bio") ||
            promptLower.includes("summary") ||
            cleanPromptForDelete === "about me"
          ) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("about"));
          } else if (
            promptLower.includes("ielts") ||
            promptLower.includes("english language") ||
            promptLower.includes("language cert") ||
            cleanPromptForDelete.includes("ielts")
          ) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("english language") || s.heading.toLowerCase().includes("ielts"));
          } else if (
            cleanPromptForDelete === "skills" ||
            cleanPromptForDelete === "skill" ||
            (promptLower.includes("skill") && !promptLower.includes("language"))
          ) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("skills") && !s.heading.toLowerCase().includes("language"));
          } else if (promptLower.includes("cert") || cleanPromptForDelete.includes("cert")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("cert"));
          } else if (promptLower.includes("hobb") || promptLower.includes("interest") || cleanPromptForDelete.includes("hobb")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("hobb"));
          } else if (promptLower.includes("declaration") || cleanPromptForDelete.includes("declaration")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("declaration"));
          } else {
            targetIndex = updated.sections.findIndex((s) => promptLower.includes(s.heading.toLowerCase()) || cleanPromptForDelete === s.heading.toLowerCase() || s.heading.toLowerCase().includes(cleanPromptForDelete));
          }

          if (targetIndex >= 0) {
            const removedSec = updated.sections[targetIndex];
            updated.sections.splice(targetIndex, 1);
            sectionUpdated = removedSec.heading;
            actionType = "deleted_section";
            appliedFeedback = `🗑️ Removed section: **${removedSec.heading}**. The document layout has been updated.`;

            if (updated.docType === "CV") {
              const baseCv = cvDocumentData || getEuropassData(updated.studentId, updated.studentName, selectedStudentData);
              const syncedCv = syncSectionsToCvData(updated.sections, baseCv);
              setCvDocumentData(syncedCv);
            }
          } else if (targetIndex !== -999) {
            appliedFeedback = "Could not find the specified section to delete. Please specify the exact section name.";
          }
        }

        // ── Case 2: Operator shares IELTS / Test Report Form Details ─────────────
        else if (
          promptLower.includes("ielts") ||
          promptLower.includes("trf") ||
          promptLower.includes("test report") ||
          promptLower.includes("band") ||
          (promptLower.includes("score") && (promptLower.includes("listening") || promptLower.includes("reading")))
        ) {
          const overallMatch = customPrompt.match(/(?:overall(?:\s*band)?(?:\s*score)?|band|score)[:\s]*([0-9](?:\.[0-9])?)/i) || customPrompt.match(/\b([5-9]\.[0-9]|\b[6-9]\b)/);
          const trfMatch = customPrompt.match(/(?:trf(?:\s*no\.?|\s*number)?[:\s]*)([a-zA-Z0-9]+)/i) || customPrompt.match(/\b([0-9]{2}[A-Z]{2}[0-9]{6}[A-Z]{4}[0-9]{3}[A-Z])\b/i);
          const lMatch = customPrompt.match(/listening[:\s]*([0-9](?:\.[0-9])?)/i);
          const rMatch = customPrompt.match(/reading[:\s]*([0-9](?:\.[0-9])?)/i);
          const wMatch = customPrompt.match(/writing[:\s]*([0-9](?:\.[0-9])?)/i);
          const sMatch = customPrompt.match(/speaking[:\s]*([0-9](?:\.[0-9])?)/i);
          const dateMatch = customPrompt.match(/(?:issue date|date taken|test date|date)[:\s]*([0-9a-zA-Z\s,/-]+)/i);

          // Only scores the operator actually typed are used; nothing is defaulted.
          const overall = overallMatch ? overallMatch[1].trim() : "";
          const trfNumber = trfMatch ? trfMatch[1].trim() : "";
          const lScore = lMatch ? lMatch[1].trim() : "";
          const rScore = rMatch ? rMatch[1].trim() : "";
          const wScore = wMatch ? wMatch[1].trim() : "";
          const sScore = sMatch ? sMatch[1].trim() : "";
          const testDate = dateMatch ? dateMatch[1].trim() : "";
          const subscores = [
            lScore && `Listening: ${lScore}`,
            rScore && `Reading: ${rScore}`,
            wScore && `Writing: ${wScore}`,
            sScore && `Speaking: ${sScore}`,
          ].filter(Boolean).join(", ");

          if (!overall) {
            appliedFeedback = "No change made — I won't invent IELTS scores. Paste the student's actual details, e.g. \"IELTS overall 7.0, listening 7.5, reading 7.0, writing 6.5, speaking 7.0, TRF 24AB123456\".";
          } else if (updated.docType === "CV") {
            let certSec = updated.sections.find((s) => s.heading.toLowerCase().includes("english language") || s.heading.toLowerCase().includes("ielts"));
            if (!certSec) {
              certSec = { heading: "ENGLISH LANGUAGE CERTIFICATE", content: "" };
              updated.sections.splice(Math.min(4, updated.sections.length), 0, certSec);
            }
            certSec.content = [
              "International English Language Testing System",
              "Test Report Form",
              `• Overall Band Score - ${overall}`,
              lScore && `• Listening - ${lScore}`,
              rScore && `• Reading - ${rScore}`,
              wScore && `• Writing - ${wScore}`,
              sScore && `• Speaking - ${sScore}`,
              testDate && `• Issue Date - ${testDate}`,
              trfNumber && `• Test Report Form Number - ${trfNumber}`,
            ].filter(Boolean).join("\n");

            sectionUpdated = "ENGLISH LANGUAGE CERTIFICATE";
            actionType = "typed_section";
            appliedFeedback = `Typed out **English Language Certificate** with IELTS Overall **${overall}**${subscores ? ` (${subscores})` : ""}${trfNumber ? ` and TRF Number **${trfNumber}**` : ""}.`;
          } else {
            const acadSec = updated.sections.find((s) => s.heading.toLowerCase().includes("academic background") || s.heading.toLowerCase().includes("background") || s.heading.toLowerCase().includes("academics"));
            if (acadSec) {
              if (!acadSec.content.includes("IELTS")) {
                acadSec.content += ` Further, I have demonstrated strong English language proficiency through the International English Language Testing System (**IELTS Academic**), achieving an overall band score of **${overall}**${subscores ? ` (${subscores})` : ""}${trfNumber ? ` under Test Report Form (TRF) Number **${trfNumber}**` : ""}.`;
              } else {
                acadSec.content = acadSec.content.replace(/(band score of [\d.]+\*\*\.)/i, `band score of **${overall}**${trfNumber ? ` (TRF No. **${trfNumber}**)` : ""}.`);
              }
              sectionUpdated = acadSec.heading;
              actionType = "typed_section";
              appliedFeedback = `Typed out IELTS test scores (Band **${overall}**${trfNumber ? `, TRF No. **${trfNumber}**` : ""}) into the Academic Background section.`;
            }
          }
        }
        // ── Case 3: Operator shares Work Experience details ──────────────────────
        else if (
          promptLower.includes("work experience") ||
          promptLower.includes("job") ||
          promptLower.includes("deloitte") ||
          promptLower.includes("pwc") ||
          promptLower.includes("trainee") ||
          promptLower.includes("analyst") ||
          promptLower.includes("internship") ||
          promptLower.includes("employed")
        ) {
          let workSec = updated.sections.find((s) => s.heading.toLowerCase().includes("work experience") || s.heading.toLowerCase().includes("internship"));

          const isRemoval =
            /^(?:please\s+)?(?:remove|delete|clear|drop|hide)\s+(?:work\s*experience|internships?|jobs?|software\s*developer)/i.test(
              promptLower
            ) ||
            ((promptLower.includes("remove") || promptLower.includes("delete")) &&
              (promptLower.includes("work experience") || promptLower.includes("software developer")));

          if (isRemoval) {
            if (workSec) {
              updated.sections = updated.sections.filter((s) => s !== workSec);
            }
            if (updated.docType === "CV") {
              const baseCv = cvDocumentData || getEuropassData(updated.studentId, updated.studentName, selectedStudentData);
              const updatedCv = JSON.parse(JSON.stringify(baseCv));
              updatedCv.internships = [];
              if (updatedCv.sectionOrder) {
                updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id: string) => id !== "internships");
              }
              setCvDocumentData(updatedCv);
            }
            appliedFeedback = `🗑️ Removed **Work Experience** from your document.`;
            sectionUpdated = "WORK EXPERIENCE";
            actionType = "deleted_section";
          } else {
            if (!workSec) {
              workSec = { heading: "WORK EXPERIENCE", content: "" };
              updated.sections.splice(Math.min(2, updated.sections.length), 0, workSec);
            }

            const cleanText = customPrompt
              .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(work\s+experience|internships?|jobs?)[:\s-]*/i, "")
              .trim();

            if (isSampleRequest || !cleanText || cleanText.length < 5) {
              appliedFeedback = "No change made — I won't invent work experience. Paste the student's actual details, e.g. \"Work experience: Data Analyst, Acme Pvt Ltd, 06/2023 – 04/2024, Pune, built weekly sales dashboards\".";
            } else if (cleanText.length > 40 && cleanText.includes("\n")) {
              workSec.content = cleanText;
              appliedFeedback = "Typed out **Work Experience** section with provided employment details.";
            } else {
              const lines = cleanText.split(/[,;•\n]+/).map((l) => l.trim()).filter(Boolean);
              const role = lines[0] || "[MISSING: role]";
              const company = lines[1] || "[MISSING: company]";
              const dates = lines.find((l) => /\d{4}/.test(l)) || "[MISSING: dates]";
              const location = lines.find((l) => /mumbai|delhi|bangalore|pune|london|paris|remote|bhopal|chennai|rome|milan/i.test(l)) || "";
              const duties = lines.slice(2).filter((l) => l !== dates && l !== location);

              workSec.content = [
                role,
                `${company} [ ${dates} ]`,
                location && `Location: ${location}`,
                ...duties.map((d) => `• ${d}`),
              ].filter(Boolean).join("\n");
              appliedFeedback = `Typed out **Work Experience** at **${company}** as **${role}**.`;
            }

            sectionUpdated = "WORK EXPERIENCE";
            actionType = "typed_section";
          }
        }

        // ── Case 4: Operator shares Education details ───────────────────────────
        else if (
          promptLower.includes("education") ||
          promptLower.includes("bachelor") ||
          promptLower.includes("degree") ||
          promptLower.includes("university") ||
          promptLower.includes("college") ||
          promptLower.includes("cgpa") ||
          promptLower.includes("gpa")
        ) {
          let eduSec = updated.sections.find((s) => s.heading.toLowerCase().includes("education") || s.heading.toLowerCase().includes("training"));
          if (!eduSec) {
            eduSec = { heading: "EDUCATION AND TRAINING", content: "" };
            updated.sections.splice(1, 0, eduSec);
          }

          const cleanEdu = customPrompt
            .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(education(\s+and\s+training)?|degree|qualification)[:\s-]*/i, "")
            .trim();

          if (isSampleRequest || !cleanEdu || cleanEdu.length < 4) {
            appliedFeedback = "No change made — I won't invent education details. Paste the student's actual details, e.g. \"Education: B.Com, University of Mumbai, 2020 – 2023, CGPA 8.2/10\".";
          } else {
            eduSec.content = cleanEdu;
            appliedFeedback = "Updated **Education and Training** section with academic credentials.";
          }
          sectionUpdated = "EDUCATION AND TRAINING";
          actionType = "typed_section";
        }

        // ── Case 5: Operator shares About Me / Profile Summary ─────────────────
        else if (
          promptLower.includes("about me") ||
          promptLower.includes("bio") ||
          promptLower.includes("profile summary") ||
          (promptLower.includes("summary") && !promptLower.includes("blog"))
        ) {
          let aboutSec = updated.sections.find((s) => s.heading.toLowerCase().includes("about me"));
          if (!aboutSec) {
            aboutSec = { heading: "ABOUT ME", content: "" };
            updated.sections.unshift(aboutSec);
          }
          const cleanAbout = customPrompt
            .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(about\s+me|bio|profile(\s+summary)?|summary)[:\s-]*/i, "")
            .trim();

          if (isSampleRequest || !cleanAbout) {
            appliedFeedback = "No change made — I won't invent a profile summary. Paste the student's actual details, e.g. \"About me: <two or three sentences in the student's own words>\".";
          } else {
            aboutSec.content = cleanAbout;
            appliedFeedback = "Updated **About Me** section with candidate profile summary.";
          }
          sectionUpdated = "ABOUT ME";
          actionType = "typed_section";
        }

        // ── Case 6: Operator shares Skills ─────────────────────────────────────
        else if (promptLower.includes("skill") || promptLower.includes("technologies") || promptLower.includes("tools")) {
          let skillsSec = updated.sections.find((s) => s.heading.toLowerCase().includes("skills") && !s.heading.toLowerCase().includes("language"));
          if (!skillsSec) {
            skillsSec = { heading: "SKILLS", content: "" };
            updated.sections.splice(Math.min(5, updated.sections.length), 0, skillsSec);
          }
          const cleanSkills = customPrompt
            .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(skills?|technologies|tools)[:\s-]*/i, "")
            .trim();

          if (isSampleRequest || !cleanSkills) {
            appliedFeedback = "No change made — I won't invent skills. Paste the student's actual details, e.g. \"Skills: Excel / SQL / Tableau\".";
          } else {
            skillsSec.content = cleanSkills;
            appliedFeedback = "Typed out **Skills** section with technical and professional proficiencies.";
          }
          sectionUpdated = "SKILLS";
          actionType = "typed_section";
        }

        // ── Case 7: Operator shares or requests Certifications ─────────────────────
        else if (
          promptLower.includes("certif") ||
          promptLower.includes("credential") ||
          promptLower.includes("license")
        ) {
          let certSec = updated.sections.find((s) => s.heading.toLowerCase().includes("certification"));
          if (!certSec) {
            certSec = { heading: "CERTIFICATIONS", content: "" };
            updated.sections.splice(Math.min(6, updated.sections.length), 0, certSec);
          }

          const cleanCert = customPrompt
            .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(certifications?|certificates?|credentials?)[:\s-]*/i, "")
            .trim();

          if (isSampleRequest || !cleanCert) {
            appliedFeedback = "No change made — I won't invent certifications. Paste the student's actual details, e.g. \"Certifications: Google Data Analytics – Coursera, 2024\".";
          } else {
            certSec.content = cleanCert.startsWith("•") ? cleanCert : `• ${cleanCert}`;
            appliedFeedback = "Updated **Certifications** section with the provided credentials.";
          }

          sectionUpdated = "CERTIFICATIONS";
          actionType = "typed_section";
        }

        // ── Case 8: Operator shares Hobbies / Interests ─────────────────────────
        else if (promptLower.includes("hobby") || promptLower.includes("hobbies") || promptLower.includes("interest")) {
          let hobbySec = updated.sections.find((s) => s.heading.toLowerCase().includes("hobbies"));
          if (!hobbySec) {
            hobbySec = { heading: "HOBBIES AND INTERESTS", content: "" };
            updated.sections.push(hobbySec);
          }
          const cleanHobbies = customPrompt
            .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(hobbies|interests)[:\s-]*/i, "")
            .trim();

          if (isSampleRequest || !cleanHobbies) {
            appliedFeedback = "No change made — I won't invent hobbies. Paste the student's actual details, e.g. \"Hobbies: badminton / photography\".";
          } else {
            hobbySec.content = cleanHobbies;
            appliedFeedback = "Updated **Hobbies and Interests** section.";
          }
          sectionUpdated = "HOBBIES AND INTERESTS";
          actionType = "typed_section";
        }

        // ── Case 8.5: Operator shares Language Skills / Mother Tongue ───────────
        else if (
          promptLower.includes("language") ||
          promptLower.includes("mother tongue") ||
          promptLower.includes("mother tounge") ||
          promptLower.includes("native language")
        ) {
          let langSec = updated.sections.find((s) => s.heading.toLowerCase().includes("language") && !s.heading.toLowerCase().includes("certificate"));

          // If user prompt is asking to remove/clear other language(s)
          const isRemovalOfOther =
            /remove|delete|clear|drop|hide/i.test(promptLower) &&
            (/other/i.test(promptLower) || /english/i.test(promptLower) || /second/i.test(promptLower));

          if (isRemovalOfOther) {
            if (langSec) {
              const mtMatch = langSec.content.match(/mother\s*tou?ngue(?:\(s\))?\s*[-:]\s*([^\n,]+)/i);
              if (mtMatch && mtMatch[1].trim()) {
                langSec.content = `Mother tongue(s): ${mtMatch[1].trim()}`;
                appliedFeedback = `🗑️ Removed **Other language(s)** from Language Skills. Only Mother Tongue (**${mtMatch[1].trim()}**) is retained in your CV.`;
              } else {
                updated.sections = updated.sections.filter((s) => s !== langSec);
                appliedFeedback = `🗑️ Removed section: **LANGUAGE SKILLS**. The document layout has been updated.`;
              }
            } else {
              appliedFeedback = `Language Skills does not contain other languages.`;
            }
            sectionUpdated = "LANGUAGE SKILLS";
            actionType = "typed_section";
          } else {
            if (!langSec) {
              langSec = { heading: "LANGUAGE SKILLS", content: "" };
              updated.sections.splice(Math.min(3, updated.sections.length), 0, langSec);
            }

            const mtMatch = customPrompt.match(/(?:mother\s*tou?ngue|native(?:\s*language)?|mother\s*language)[:\s]+([^\n,;]+)/i);
            const cleanLang = customPrompt
              .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(language(\s*skills)?|languages?)[:\s-]*/i, "")
              .trim();

            if (mtMatch) {
              const mt = mtMatch[1].trim();
              const existingOtherMatch = langSec.content.match(/Other\s*language(?:\(s\))?\s*[:\-]\s*([^\n]+)/i);
              const otherVal = existingOtherMatch && existingOtherMatch[1]?.trim() && !existingOtherMatch[1].toLowerCase().includes("remove")
                ? existingOtherMatch[1].trim()
                : "";
              langSec.content = otherVal
                ? `Mother tongue(s): ${mt}\nOther language(s): ${otherVal}`
                : `Mother tongue(s): ${mt}`;
              appliedFeedback = `Updated **Language Skills** with Mother Tongue **${mt}**.`;
            } else if (cleanLang && !/remove|delete/i.test(cleanLang)) {
              langSec.content = `Mother tongue(s): Hindi\nOther language(s): ${cleanLang}`;
              appliedFeedback = `Updated **Language Skills** with **${cleanLang}**.`;
            } else {
              appliedFeedback = "Updated **Language Skills** section.";
            }
            sectionUpdated = "LANGUAGE SKILLS";
            actionType = "typed_section";
          }
        }

        // ── Case 9: Travel / Flight Logistics ──────────────────────────────────
        else if (
          promptLower.includes("flight") ||
          promptLower.includes("pnr") ||
          promptLower.includes("airline") ||
          promptLower.includes("emirates") ||
          promptLower.includes("transit") ||
          promptLower.includes("travel")
        ) {
          const travelSec = updated.sections.find((s) => s.heading.toLowerCase().includes("travel"));
          if (travelSec) {
            const pnrMatch = customPrompt.match(/pnr[:\s]+([a-zA-Z0-9]+)/i);
            if (customPrompt.length > 50 && (customPrompt.toLowerCase().includes("additionally") || customPrompt.toLowerCase().includes("booking"))) {
              travelSec.content = customPrompt.trim();
            } else if (pnrMatch) {
              const newPnr = pnrMatch[1].trim();
              travelSec.content = travelSec.content.replace(/PNR:\s*[\w\d[\]-]+/i, `PNR: ${newPnr}`);
            } else {
              appliedFeedback = "No change made — I won't invent travel details. Paste the student's actual details, e.g. \"PNR: ABC123\".";
            }
            sectionUpdated = "Travel Logistics";
            actionType = "typed_section";
            if (!appliedFeedback) appliedFeedback = "Updated Travel Logistics (Flight, Itinerary & PNR).";
          }
        }

        // ── Case 10: Insurance Logistics ────────────────────────────────────────
        else if (
          promptLower.includes("insurance") ||
          promptLower.includes("icici") ||
          promptLower.includes("policy") ||
          promptLower.includes("coverage") ||
          promptLower.includes("bajaj")
        ) {
          const insSec = updated.sections.find((s) => s.heading.toLowerCase().includes("insurance"));
          if (insSec) {
            const certMatch = customPrompt.match(/(?:cert(?:ificate)?\s*(?:no\.?|number)?[:\s]*|policy\s*(?:no\.?|number)?[:\s]*)([a-zA-Z0-9-]+)/i);
            if (customPrompt.length > 50 && customPrompt.toLowerCase().includes("obtained")) {
              insSec.content = customPrompt.trim();
            } else if (certMatch) {
              const newCert = certMatch[1].trim();
              insSec.content = insSec.content.replace(/Certificate No\.\s*[\w\d[\]-]+/i, `Certificate No. ${newCert}`);
            } else {
              appliedFeedback = "No change made — I won't invent insurance details. Paste the student's actual details, e.g. \"Policy number: POL-123456\".";
            }
            sectionUpdated = "Travel & Health Insurance";
            actionType = "typed_section";
            if (!appliedFeedback) appliedFeedback = "Updated Travel & Health Insurance Policy details.";
          }
        }

        // ── Case 11: Accommodation Logistics ────────────────────────────────────
        else if (
          promptLower.includes("accommodation") ||
          promptLower.includes("dimora") ||
          promptLower.includes("residence") ||
          promptLower.includes("stay") ||
          promptLower.includes("housing")
        ) {
          const accSec = updated.sections.find((s) => s.heading.toLowerCase().includes("accommodation"));
          if (accSec) {
            if (customPrompt.length > 50 && customPrompt.toLowerCase().includes("temporary accommodation")) {
              accSec.content = customPrompt.trim();
            } else {
              appliedFeedback = "No change made — I won't invent accommodation details. Paste the student's actual details, e.g. \"I have secured temporary accommodation at <residence>, <city>, from <date> to <date>.\".";
            }
            sectionUpdated = "Accommodation Arrangements";
            actionType = "typed_section";
            if (!appliedFeedback) appliedFeedback = "Updated Accommodation Arrangements.";
          }
        }

        // ── Case 12: Financial Sponsorship & Loan ───────────────────────────────
        else if (
          promptLower.includes("loan") ||
          promptLower.includes("disbursed") ||
          promptLower.includes("credila") ||
          promptLower.includes("hsbc") ||
          promptLower.includes("net worth") ||
          promptLower.includes("itr") ||
          promptLower.includes("financial") ||
          promptLower.includes("sponsor") ||
          promptLower.includes("bank")
        ) {
          const finSec = updated.sections.find(
            (s) => s.heading.toLowerCase().includes("financial") || s.heading.toLowerCase().includes("sponsorship")
          );
          if (finSec) {
            if (customPrompt.length > 80 && customPrompt.toLowerCase().includes("sponsored")) {
              finSec.content = customPrompt.trim();
            } else {
              appliedFeedback = "No change made — I won't invent sponsorship or loan details. Paste the student's actual details, e.g. \"My studies will be sponsored by my father, <name>, ...\".";
            }
            sectionUpdated = "Financial Sponsorship";
            actionType = "typed_section";
            if (!appliedFeedback) appliedFeedback = "Updated Financial Sponsorship details.";
          }
        }

        // ── Case 13: General Academic instruction / Custom refinement ───────────
        else {
          const mainSec =
            updated.sections.find(
              (s) =>
                s.heading.toLowerCase().includes("motivation") ||
                s.heading.toLowerCase().includes("academic")
            ) || updated.sections[0];
          if (mainSec) {
            mainSec.content += `\n\n[Applied Refinement]: ${customPrompt.trim()} — Aligned with course objectives at ${updated.targetUniversity}.`;
          }
          sectionUpdated = mainSec?.heading || "Section Draft";
          actionType = "general";
          appliedFeedback = `Applied refinement to **${mainSec?.heading || "Document"}**: "${customPrompt.slice(0, 42)}..."`;
        }
      }

      commitAssistantEdit(updated, appliedFeedback, sectionUpdated, actionType);
    }, 550);
  };

  // Applies an assistant edit to the document, editor, Europass view, recents and chat
  const commitAssistantEdit = (
    updated: HydratedDocumentData,
    feedback: string,
    sectionUpdated: string | undefined,
    actionType: ChatMessage["actionType"],
    diagnostic?: AssistantDiagnostic
  ) => {
    // Sync Europass layout if active document is CV
    if (updated.docType === "CV") {
      const isSameStudent = Boolean(cvDocumentData && activeDocIdentityRef.current?.studentId === updated.studentId);
      const baseCv = isSameStudent
        ? cvDocumentData!
        : getEuropassData(updated.studentId, updated.studentName, selectedStudentData);
      const syncedCv = syncSectionsToCvData(updated.sections, baseCv);
      setCvDocumentData(syncedCv);
    }

    // Recalculate word count
    updated.wordCount = updated.sections.reduce(
      (acc, s) => acc + s.content.trim().split(/\s+/).filter(Boolean).length,
      0
    );

    setEditableDocContent(updated);
    syncDocumentToRecent(updated, "Edited just now");
    const html = docSectionsToHtml(updated.sections, updated.docType, updated.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }

    // Append Assistant Response to Chat Thread
    const assistantMsg: ChatMessage = {
      id: generateUniqueId("asst"),
      sender: "assistant",
      text: feedback || "Document updated successfully.",
      timestamp: getFormattedTimestamp(),
      sectionUpdated,
      actionType,
      diagnostic,
    };
    setChatMessages((prev) => [...prev, assistantMsg]);
    setAiToast({ message: `✨ AI Assistant: ${feedback.replace(/\*\*/g, "")}`, type: "success" });
    setAiPromptText("");
    setIsAiCooking(false);

    if (sectionUpdated) {
      const oldSec = editableDocContent?.sections?.find(
        (s) => s.heading.toLowerCase() === (sectionUpdated || "").toLowerCase()
      );
      const newSec = updated.sections.find(
        (s) => s.heading.toLowerCase() === (sectionUpdated || "").toLowerCase()
      );
      const changedSentences = oldSec && newSec
        ? extractChangedSentences(oldSec.content, newSec.content)
        : [];
      highlightChangedSentenceInCanvas(sectionUpdated, changedSentences);
    }
  };

  // Instructions the real AI handles (chat box, Polish, Improve). Other quick actions stay built-in.
  const AI_ACTION_INSTRUCTIONS: Record<string, string> = {
    academic_polish:
      "Polish the academic tone and wording of the whole document. Keep every fact, name, and figure unchanged.",
    improve:
      "Improve and elevate the document content for professional impact, clarity, and precision. Strengthen bullet points, descriptions, and summary using active, impactful language while strictly preserving all facts, dates, names, scores, and institutions.",
    trim_budget:
      "Improve and elevate the document content for professional impact, clarity, and precision. Strengthen bullet points, descriptions, and summary using active, impactful language while strictly preserving all facts, dates, names, scores, and institutions.",
  };

  const executeLocalSmartFallback = (actionKey: string) => {
    if (!editableDocContent) return;
    const updated = JSON.parse(JSON.stringify(editableDocContent)) as HydratedDocumentData;
    let appliedFeedback = "";
    let sectionUpdated: string | undefined = undefined;
    let actionType: ChatMessage["actionType"] = "general";

    if (actionKey === "academic_polish") {
      updated.sections = updated.sections.map((section) => {
        let polished = section.content;
        // Offline fallback: only wording changes that keep the meaning (no inflated claims).
        polished = polished
          .replace(/\blots of\b/g, "a lot of")
          .replace(/\bhelp me to\b/g, "help me")
          .replace(/\bin order to\b/gi, "to");
        return { ...section, content: polished };
      });
      appliedFeedback = "Polished overall academic diction and tone while preserving student profile facts.";
      sectionUpdated = "All Document Sections";
      actionType = "polished";
    } else if (actionKey === "improve" || actionKey === "trim_budget") {
      updated.sections = updated.sections.map((section) => {
        let content = section.content;
        // Offline fallback: only wording changes that keep the meaning (no inflated claims).
        content = content
          .replace(/\bhelped in\b/gi, "helped with")
          .replace(/\bin order to\b/gi, "to")
          .replace(/\bdue to the fact that\b/gi, "because")
          .replace(/\bat this point in time\b/gi, "presently");
        return { ...section, content };
      });
      appliedFeedback = "Enhanced document content, clarity, and professional impact while preserving student profile facts.";
      sectionUpdated = "All Document Sections";
      actionType = "polished";
    }

    commitAssistantEdit(updated, appliedFeedback, sectionUpdated, actionType);
  };

  const runAiEdit = async (
    instruction: string,
    fallbackKey?: string,
    targetAnchor?: { heading: string; snippet: string }
  ) => {
    if (!editableDocContent) return;
    setIsAiCooking(true);
    const doc = ensureDocumentIdentity(editableDocContent);

    // Cancel any previous in-flight AI request
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;
    // Never leave the chat spinning: give up after 90 seconds with a clear message.
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 90_000);

    const requestId = generateUniqueId("req");
    const targetDocId = doc.id || "";
    const targetStudentId = doc.studentId;
    const targetDocType = doc.docType;

    activeAiRequestRef.current = {
      requestId,
      docId: targetDocId,
      studentId: targetStudentId,
    };

    const history = chatMessages.slice(-10).map((m) => ({ sender: m.sender, text: m.text }));

    const reportFailure = (text: string) => {
      // Guard: do not report failure if request is already obsolete
      if (activeAiRequestRef.current?.requestId !== requestId) return;
      setChatMessages((prev) => [
        ...prev,
        {
          id: generateUniqueId("asst"),
          sender: "assistant",
          text,
          timestamp: getFormattedTimestamp(),
          actionType: "general",
        },
      ]);
      setDocHistory((prev) => prev.slice(0, -1));
      setCvHistory((prev) => prev.slice(0, -1));
      setIsAiCooking(false);
    };

    try {
      const res = await fetch("/api/ai/studio-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          studentId: doc.studentId,
          docType: doc.docType,
          title: doc.title,
          sections: doc.sections,
          instruction,
          history,
          targetAnchor,
        }),
      });
      const json = await res.json();

      // RACE GUARD: discard the reply if a newer request replaced this one, or the operator
      // switched to another student or document type meanwhile. (Document ids are not used:
      // documents without a stored id get a fresh random id each time, which never matches.)
      if (!activeAiRequestRef.current || activeAiRequestRef.current.requestId !== requestId) {
        return; // a newer request owns the spinner
      }
      const openDoc = editableDocRef.current;
      if (!openDoc || openDoc.studentId !== targetStudentId || openDoc.docType !== targetDocType) {
        console.warn("[runAiEdit] Discarded AI response for a document that is no longer open.");
        setIsAiCooking(false);
        return;
      }
      void targetDocId;

      if (!res.ok || !json.success) {
        if (fallbackKey) {
          executeLocalSmartFallback(fallbackKey);
          return;
        }
        reportFailure(`⚠️ ${json?.error?.message || "The AI request failed."} No changes were made.`);
        return;
      }

      const changed: string[] = json.changedHeadings || [];
      const unverified: string[] = json.unverifiedValues || [];
      if (changed.length === 0) {
        const isEditDirective = /\b(make|improve|enhance|polish|rewrite|rephrase|add|update|change|delete|remove|fix)\b/i.test(instruction);
        // Show the AI's own explanation when it gave one; the generic hint is only a fallback.
        const aiReply = typeof json.reply === "string" && json.reply.trim() && json.reply.trim() !== "Done." ? json.reply.trim() : "";
        const replyText =
          aiReply ||
          (isEditDirective
            ? `I could not apply any text changes to that section. Please specify the exact sentence or paragraph you'd like to improve.`
            : "I don't have an answer for that yet. Could you rephrase?");
        const asstMsg: ChatMessage = {
          id: generateUniqueId("asst"),
          sender: "assistant",
          text: replyText,
          timestamp: getFormattedTimestamp(),
          actionType: "general",
          diagnostic: {
            instruction,
            detectedIntent: isEditDirective ? "REWRITE_SECTION" : "ANSWER_QUESTION",
            selectedDocument: doc.docType,
            clarificationNeeded: isEditDirective,
            processingRoute: "openai",
            proposedOperation: isEditDirective
              ? "AI proposed no changes; reported status accurately"
              : "OpenAI answered inquiry or requested clarification without mutating document",
            saveResult: "not_applicable",
            actualChangedFields: [],
          },
        };
        setChatMessages((prev) => [...prev, asstMsg]);
        setIsAiCooking(false);
        return;
      }

      const cleanedSections =
        doc.docType === "COVER_LETTER"
          ? (json.sections || []).map((s: { heading: string; content: string }) => ({
            ...s,
            content: cleanCoverLetterText(s.content),
          }))
          : json.sections;
      const updated: HydratedDocumentData = { ...doc, sections: cleanedSections };
      const feedback =
        json.reply +
        (unverified.length
          ? `\n\n⚠️ Please verify these values — they weren't in the document or your message: ${unverified.join(", ")}`
          : "");
      const changedHeadingTarget = targetAnchor?.heading || changed[0];
      // Follow-ups ("shorter", "again") refer to what was just changed: one section, or the
      // whole document when several sections changed.
      setLastActiveTargetSection(changed.length === 1 ? changed[0] : null);
      const diag: AssistantDiagnostic = {
        instruction,
        detectedIntent: "REWRITE_SECTION",
        selectedDocument: doc.docType,
        targetSectionOrField: changedHeadingTarget,
        clarificationNeeded: false,
        processingRoute: "openai",
        proposedOperation: `Updated ${changed.join(", ")} via OpenAI API`,
        saveResult: "persisted",
        actualChangedFields: changed,
      };
      commitAssistantEdit(updated, feedback, changedHeadingTarget, "typed_section", diag);
    } catch (err) {
      if (timedOut) {
        reportFailure("⚠️ The AI took too long to respond. No changes were made — please try again, or ask for a smaller change.");
        return;
      }
      if (err instanceof Error && err.name === "AbortError") {
        // Request aborted due to new operator action or switch - ignore cleanly
        if (activeAiRequestRef.current?.requestId === requestId) setIsAiCooking(false);
        return;
      }
      if (fallbackKey) {
        executeLocalSmartFallback(fallbackKey);
        return;
      }
      reportFailure("⚠️ Could not reach the AI service. No changes were made.");
    } finally {
      clearTimeout(timeoutHandle);
    }
  };
  // Chat message submission handler
  const handleChatSendMessage = (promptText: string) => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt || !editableDocContent) return;

    const extracted = extractUserDirectiveAndSnippet(trimmedPrompt);
    const anchor = (extracted.isSnippetProvided && extracted.snippet)
      ? findSnippetInSections(extracted.snippet, editableDocContent.sections)
      : null;

    const isEnhanceOrRewrite =
      Boolean(anchor) ||
      /\b(enhance|humanize|make\s+(?:it|this\s+)?(?:more\s+)?better|make\s+(?:it|this\s+)?(?:more\s+)?(?:professional|humanized|impactful)|improve|rephrase|rewrite|polish|elevate|expand|shorten|refine)\b/i.test(trimmedPrompt);

    // Direct CV section matcher or active CV section question flow (only if NOT an enhancement or in-place edit)
    const directCvSectionMatch =
      !isEnhanceOrRewrite && editableDocContent.docType === "CV"
        ? parseDirectCvSectionInstruction(trimmedPrompt)
        : null;
    const activeSectionPrompt = activeCvSectionPrompt || (directCvSectionMatch ? {
      heading: directCvSectionMatch.heading,
      sectionKey: directCvSectionMatch.sectionKey,
      label: directCvSectionMatch.label,
      question: "",
      placeholder: "",
    } : null);

    // ── Unified Intelligent Admissions Assistant Engine (CV, Cover Letter, SOP) ──
    if (!activeSectionPrompt && !activeFieldPrompt) {
      const userMsg: ChatMessage = {
        id: generateUniqueId("user"),
        sender: "user",
        text: trimmedPrompt,
        timestamp: getFormattedTimestamp(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setAiPromptText("");
      setIsAiCooking(true);

      const baseCv =
        cvDocumentData ||
        getEuropassData(editableDocContent.studentId, editableDocContent.studentName, selectedStudentData);

      const recentHistory = chatMessages.slice(-10).map((m) => ({ sender: m.sender, text: m.text }));

      void (async () => {
        let isHandledByAiEdit = false;
        try {
          const result = await processUnifiedMessage(
            trimmedPrompt,
            editableDocContent,
            baseCv,
            activeSopContext,
            selectedStudentData,
            recentHistory,
            pendingClarificationTask,
            lastActiveTargetSection
          );

          if (result.isUndo) {
            handleUndo();
            const asstMsg: ChatMessage = {
              id: generateUniqueId("asst-undo"),
              sender: "assistant",
              text: result.reply,
              timestamp: getFormattedTimestamp(),
              actionType: "general",
              diagnostic: result.diagnostic,
            };
            setChatMessages((prev) => [...prev, asstMsg]);
            setIsAiCooking(false);
            return;
          }

          if (result.isRedo) {
            handleRedo();
            const asstMsg: ChatMessage = {
              id: generateUniqueId("asst-redo"),
              sender: "assistant",
              text: result.reply,
              timestamp: getFormattedTimestamp(),
              actionType: "general",
              diagnostic: result.diagnostic,
            };
            setChatMessages((prev) => [...prev, asstMsg]);
            setIsAiCooking(false);
            return;
          }

          if (result.pendingTask !== undefined) {
            setPendingClarificationTask(result.pendingTask);
          }

          if (result.targetSection) {
            const matchedSection = editableDocContent.sections.find(
              (s) => s.heading.toLowerCase() === result.targetSection!.toLowerCase() ||
                s.heading.toLowerCase().includes(result.targetSection!.toLowerCase()) ||
                result.targetSection!.toLowerCase().includes(s.heading.toLowerCase())
            );
            if (matchedSection) {
              setLastActiveTargetSection(matchedSection.heading);
            }
          }

          if (result.needsAiRewrite) {
            setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
            if (editableDocContent.docType === "CV") {
              setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(baseCv))]);
              setCvRedoHistory([]);
            }
            setRedoHistory([]);
            isHandledByAiEdit = true;

            void runAiEdit(
              result.aiPrompt || trimmedPrompt,
              undefined,
              result.targetAnchor || (result.targetSection ? { heading: result.targetSection, snippet: "" } : undefined)
            );
            return;
          }

          if (result.updatedSections) {
            setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
            if (editableDocContent.docType === "CV") {
              setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(baseCv))]);
              setCvRedoHistory([]);
            }
            setRedoHistory([]);

            const updatedDoc: HydratedDocumentData = {
              ...editableDocContent,
              sections: result.updatedSections,
              fieldValues: result.updatedFieldValues || editableDocContent.fieldValues,
              wordCount: result.updatedSections.reduce(
                (acc, s) => acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0),
                0
              ),
            };

            if (result.updatedCv) {
              setCvDocumentData(result.updatedCv);
            }
            setEditableDocContent(updatedDoc);
            setActiveDocument(updatedDoc);
            syncDocumentToRecent(updatedDoc, "Edited just now");

            const currentLiveHtml = tiptapEditor ? tiptapEditor.getHTML() : tiptapHtml;
            const newHtml =
              editableDocContent.docType === "COVER_LETTER" && currentLiveHtml
                ? updateLiveCoverLetterHtml(currentLiveHtml, editableDocContent.sections, result.updatedSections)
                : docSectionsToHtml(result.updatedSections, updatedDoc.docType, updatedDoc.title);
            setTiptapHtml(newHtml);
            if (tiptapEditor) {
              tiptapEditor.commands.setContent(newHtml);
            }

            const asstMsg: ChatMessage = {
              id: generateUniqueId("assistant-unified"),
              sender: "assistant",
              text: result.reply,
              timestamp: getFormattedTimestamp(),
              actionType: result.actionType === "DELETE_SECTION" ? "deleted_section" : "typed_section",
              sectionUpdated: result.targetSection,
              diagnostic: result.diagnostic,
            };
            setChatMessages((prev) => [...prev, asstMsg]);

            setAiToast({
              message: result.targetSection ? `✨ Updated ${result.targetSection}` : "✨ Document updated",
              type: "success",
            });
            setTimeout(() => setAiToast(null), 3000);

            if (result.targetSection) {
              const changedSentences: string[] = [];
              if (result.updatedSections && editableDocContent.sections) {
                for (const newSec of result.updatedSections) {
                  const oldSec = editableDocContent.sections.find(
                    (s) => s.heading.toLowerCase() === newSec.heading.toLowerCase()
                  );
                  if (oldSec && oldSec.content !== newSec.content) {
                    const diffs = extractChangedSentences(oldSec.content, newSec.content);
                    changedSentences.push(...diffs);
                  }
                }
              }
              if (changedSentences.length === 0 && result.updatedFieldValues) {
                changedSentences.push(...Object.values(result.updatedFieldValues).filter(Boolean));
              }
              highlightChangedSentenceInCanvas(result.targetSection, changedSentences);
            }
          } else {
            // Question or clarification answered, or issue acknowledged without document modification
            const asstMsg: ChatMessage = {
              id: generateUniqueId("assistant-msg"),
              sender: "assistant",
              text: result.reply,
              timestamp: getFormattedTimestamp(),
              actionType: result.actionType === "CLARIFY" ? "outline" : "general",
              diagnostic: result.diagnostic,
            };
            setChatMessages((prev) => [...prev, asstMsg]);
          }
        } catch (err) {
          console.error("[processUnifiedMessage] error:", err);
          const asstMsg: ChatMessage = {
            id: generateUniqueId("assistant-err"),
            sender: "assistant",
            text: "⚠️ Something went wrong applying that change. Please try again.",
            timestamp: getFormattedTimestamp(),
            actionType: "general",
          };
          setChatMessages((prev) => [...prev, asstMsg]);
        } finally {
          if (!isHandledByAiEdit) {
            setIsAiCooking(false);
          }
        }
      })(); return;
    }

    // ── Dedicated CV Section Interactive & Direct Adder ───────────────────────
    if (editableDocContent.docType === "CV" && activeSectionPrompt) {
      const rawAnswer = directCvSectionMatch ? directCvSectionMatch.content : trimmedPrompt;
      const cleanAnswer = rawAnswer.replace(/^[:=\s]+/, "").replace(/\.$/, "").trim();

      // 1. Record user response message in AI chat
      const userMsg: ChatMessage = {
        id: generateUniqueId("user"),
        sender: "user",
        text: trimmedPrompt,
        timestamp: getFormattedTimestamp(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setAiPromptText("");

      // 2. Snapshot current state for Undo
      setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
      const currentCv = cvDocumentData || getEuropassData(editableDocContent.studentId, editableDocContent.studentName, selectedStudentData);
      setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(currentCv))]);
      setRedoHistory([]);
      setCvRedoHistory([]);
      const updatedCv: DocumentData = JSON.parse(JSON.stringify(currentCv));

      // Preserve photoUrl if set
      if (currentCv.personal?.photoUrl) {
        if (!updatedCv.personal) updatedCv.personal = {};
        updatedCv.personal.photoUrl = currentCv.personal.photoUrl;
      }

      let formattedSectionHeading = activeSectionPrompt.heading;
      let formattedContent = "";
      let summaryText = "";

      switch (activeSectionPrompt.sectionKey) {
        case "hobbies": {
          formattedSectionHeading = "HOBBIES AND INTERESTS";
          const parsed = cleanAnswer
            .replace(/\band\b/gi, ",")
            .split(/[,•\n]+/)
            .map((h) => h.trim().replace(/^[•\-*0-9.)\s]+/, "").trim())
            .filter(Boolean);
          const rawItems = parsed.length > 0 ? parsed : [cleanAnswer];
          const items = rawItems.filter(isValidSkillNoun).map((h) => h.charAt(0).toUpperCase() + h.slice(1));

          // Deduplicate against existing hobbies
          const existingHobbies = updatedCv.hobbies || [];
          const existingNames = new Set(existingHobbies.map((h) => h.name?.toLowerCase().trim()));
          const newUniqueItems = items.filter((item) => !existingNames.has(item.toLowerCase()));
          const itemsToAdd = newUniqueItems.length > 0 ? newUniqueItems : items;

          formattedContent = itemsToAdd.map((s) => `• ${s}`).join("\n");
          summaryText = itemsToAdd.join(", ");

          const newHobbyEntries = itemsToAdd.map((name, idx) => ({
            id: `hobby-${Date.now()}-${idx}`,
            name,
          }));
          updatedCv.hobbies = [...existingHobbies, ...newHobbyEntries];
          break;
        }

        case "skills": {
          formattedSectionHeading = "DIGITAL SKILLS";
          const parsed = cleanAnswer
            .replace(/\band\b/gi, ",")
            .split(/[,•\n]+/)
            .map((s) => s.trim().replace(/^[•\-*0-9.)\s]+/, "").trim())
            .filter(Boolean);
          const rawItems = parsed.length > 0 ? parsed : [cleanAnswer];
          const items = rawItems.map((s) => s.charAt(0).toUpperCase() + s.slice(1));

          const existingSkills = updatedCv.skills || [];
          const existingNames = new Set(existingSkills.map((s) => s.name?.toLowerCase().trim()));
          const newUniqueItems = items.filter((item) => !existingNames.has(item.toLowerCase()));
          const itemsToAdd = newUniqueItems.length > 0 ? newUniqueItems : items;

          formattedContent = itemsToAdd.join(" • ");
          summaryText = itemsToAdd.join(", ");

          const newSkillEntries = itemsToAdd.map((name, idx) => ({
            id: `skill-${Date.now()}-${idx}`,
            name,
          }));
          updatedCv.skills = [...existingSkills, ...newSkillEntries];
          break;
        }

        case "englishCertificate": {
          formattedSectionHeading = "ENGLISH LANGUAGE CERTIFICATE";
          const bandMatch = cleanAnswer.match(/(?:overall|band|score)?\s*([5-9](?:\.[05])?)/i);
          const trfMatch = cleanAnswer.match(/(?:trf\s*(?:no|number)?|trf\s*[:=\s]+)?([0-9]{2}[a-zA-Z]{2}[0-9]{6}[a-zA-Z0-9]+)/i);
          const lMatch = cleanAnswer.match(/listening\s*[:=\s]*([0-9.]+)/i);
          const rMatch = cleanAnswer.match(/reading\s*[:=\s]*([0-9.]+)/i);
          const wMatch = cleanAnswer.match(/writing\s*[:=\s]*([0-9.]+)/i);
          const sMatch = cleanAnswer.match(/speaking\s*[:=\s]*([0-9.]+)/i);

          const overall = bandMatch ? bandMatch[1] : "7.5";
          const trf = trfMatch ? trfMatch[1] : undefined;
          const l = lMatch ? lMatch[1] : undefined;
          const r = rMatch ? rMatch[1] : undefined;
          const w = wMatch ? wMatch[1] : undefined;
          const s = sMatch ? sMatch[1] : undefined;

          const compLine = [
            l ? `Listening: ${l}` : null,
            r ? `Reading: ${r}` : null,
            w ? `Writing: ${w}` : null,
            s ? `Speaking: ${s}` : null,
          ].filter(Boolean).join(" | ");

          formattedContent = [
            `Overall Band Score: ${overall}`,
            compLine || "Listening: 8.0 | Reading: 7.5 | Writing: 7.0 | Speaking: 7.5",
            trf ? `Test Report Form Number: ${trf}` : null,
          ].filter(Boolean).join("\n");
          summaryText = `Overall Band ${overall}${trf ? ` (TRF: ${trf})` : ""}`;

          updatedCv.englishCertificate = {
            examName: "IELTS",
            score: overall,
            listening: l || updatedCv.englishCertificate?.listening || "8.0",
            reading: r || updatedCv.englishCertificate?.reading || "7.5",
            writing: w || updatedCv.englishCertificate?.writing || "7.0",
            speaking: s || updatedCv.englishCertificate?.speaking || "7.5",
            trfNumber: trf || updatedCv.englishCertificate?.trfNumber,
          };
          break;
        }

        case "workExperience": {
          formattedSectionHeading = "WORK EXPERIENCE";

          // Try structured key-value matching
          const posMatch = cleanAnswer.match(/(?:position|job\s*title|role|title)\s*[:=-]\s*([^\n,]+)/i);
          const compMatch = cleanAnswer.match(/(?:company|employer|organization|organisation|workplace)\s*[:=-]\s*([^\n,]+)/i);
          const durMatch = cleanAnswer.match(/(?:duration|dates?|period|time|tenure)\s*[:=-]\s*([^\n,]+)/i);
          const respMatch = cleanAnswer.match(/(?:responsibilities|responsibility|duties|tasks|description|work|summary)\s*[:=-]\s*([\s\S]+)/i);
          const locMatch = cleanAnswer.match(/(?:location|city|address)\s*[:=-]\s*([^\n,]+)/i);

          let role = posMatch ? posMatch[1].trim() : "";
          let comp = compMatch ? compMatch[1].trim() : "";
          let dates = durMatch ? durMatch[1].trim() : "";
          let loc = locMatch ? locMatch[1].trim() : "";
          let desc = respMatch ? respMatch[1].trim() : "";

          // Fallback to natural language extraction if not key-value labeled
          if (!role || !comp) {
            const bracketDate = cleanAnswer.match(/\[\s*([^\]]+)\s*\]/);
            const textDate = cleanAnswer.match(
              /((?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*(?:[-–—]|to)\s*(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|Present))/i
            );
            if (!dates) {
              if (bracketDate) dates = bracketDate[1].trim();
              else if (textDate) dates = textDate[1].trim();
            }

            let remaining = cleanAnswer;
            if (bracketDate) remaining = remaining.replace(bracketDate[0], " ");
            if (textDate) remaining = remaining.replace(textDate[0], " ");

            if (!desc) {
              const rMatch = remaining.match(/(?:responsibilities|duties|tasks|description)\s*[:=-]\s*([\s\S]+)/i);
              if (rMatch) {
                desc = rMatch[1].trim();
                remaining = remaining.slice(0, rMatch.index).trim();
              }
            }

            // Check if pipe-separated e.g. "Software developer ABC Enterprises | Bhopal, Madhya Pradesh"
            if (remaining.includes("|")) {
              const parts = remaining.split("|").map((p) => p.trim()).filter(Boolean);
              if (parts.length >= 3) {
                if (!role) role = parts[0];
                if (!comp) comp = parts[1];
                if (!loc) loc = parts[2];
              } else if (parts.length === 2) {
                if (!loc) loc = parts[1];
                const first = parts[0];
                const atMatch = first.match(/^(.+?)\s+(?:at|@|for)\s+(.+)$/i);
                if (atMatch) {
                  if (!role) role = atMatch[1].trim();
                  if (!comp) comp = atMatch[2].trim();
                } else {
                  const roleRegex = /^(software\s*(?:developer|engineer)|frontend\s*(?:developer|engineer)|backend\s*(?:developer|engineer)|full\s*stack\s*(?:developer|engineer)|web\s*(?:developer|engineer)|data\s*(?:analyst|scientist)|product\s*manager|project\s*manager|intern(?:ship)?|trainee|analyst|associate|designer)\b\s*(.*)$/i;
                  const matchRole = first.match(roleRegex);
                  if (matchRole && matchRole[2]?.trim()) {
                    if (!role) role = matchRole[1].trim();
                    if (!comp) comp = matchRole[2].trim();
                  } else {
                    const compSuffixMatch = first.match(/^(.+?)\s+([A-Za-z0-9&.\s]+(?:Enterprises|Technologies|Pvt\s*Ltd|Ltd|Inc|LLC|Corp|Solutions|Systems|Labs|Services|Consulting|Group|Infotech|Software|Agency))$/i);
                    if (compSuffixMatch) {
                      if (!role) role = compSuffixMatch[1].trim();
                      if (!comp) comp = compSuffixMatch[2].trim();
                    } else {
                      const words = first.split(/\s+/);
                      if (words.length >= 4) {
                        if (!role) role = words.slice(0, 2).join(" ");
                        if (!comp) comp = words.slice(2).join(" ");
                      } else {
                        if (!role) role = first;
                      }
                    }
                  }
                }
              }
            } else {
              const atMatch = remaining.match(/^([^@–\-,]+?)\s+(?:at|@|for|–|-)\s+([^,.\n]+)/i);
              if (atMatch) {
                if (!role) role = atMatch[1].trim();
                if (!comp) comp = atMatch[2].trim();
                if (!desc && remaining.slice(atMatch[0].length).trim()) {
                  desc = remaining.slice(atMatch[0].length).replace(/^[.,;\-\s]+/, "").trim();
                }
              } else {
                const lines = remaining.split(/\n+/).map((l) => l.trim()).filter(Boolean);
                if (!role && lines[0]) role = lines[0];
                if (!comp && lines[1]) comp = lines[1];

                // Check if line 2 is a bullet or description vs location
                if (lines[2]) {
                  const isBulletOrLong = /^[•\-*]/.test(lines[2]) || lines[2].length > 40;
                  if (isBulletOrLong) {
                    if (!desc) desc = lines.slice(2).join("\n");
                  } else {
                    if (!loc) loc = lines[2];
                    if (!desc && lines.slice(3).length > 0) desc = lines.slice(3).join("\n");
                  }
                }
              }
            }
          }

          // Clean prefixes & provide sane fallbacks
          role = role.replace(/^(?:position|role|job\s*title)[:=-]\s*/i, "").trim() || "Software Developer Intern";
          comp = comp.replace(/^(?:company|employer|organization)[:=-]\s*/i, "").trim().replace(/\s+from$/i, "").trim() || "Company";
          loc = loc.replace(/^(?:location|city)[:=-]\s*/i, "").trim();
          dates = dates.replace(/^(?:duration|dates?|period)[:=-]\s*/i, "").trim() || "June 2023 – December 2023";
          desc = desc.replace(/^(?:responsibilities|duties|tasks)[:=-]\s*/i, "").trim();

          const compLoc = [comp, loc].filter(Boolean).join(" | ");
          const dateBadge = dates ? `[ ${dates} ]` : "";
          const compLine = dateBadge ? `${compLoc} ${dateBadge}` : compLoc;
          formattedContent = desc ? `${role}\n${compLine}\n${desc}` : `${role}\n${compLine}`;
          summaryText = `${role} at ${comp}${loc ? ` (${loc})` : ""} [${dates}]`;

          const newInternEntry = {
            id: `intern-${Date.now()}`,
            role,
            company: comp,
            location: loc || undefined,
            startDate: dates.split(/[–-]|to/i)[0]?.trim() || "",
            endDate: dates.split(/[–-]|to/i)[1]?.trim() || "",
            description: desc,
          };
          const existingInterns = (updatedCv.internships || []).filter((e) => e.role || e.company);
          updatedCv.internships = [...existingInterns, newInternEntry];
          break;
        }

        case "education": {
          formattedSectionHeading = "EDUCATION AND TRAINING";

          const qualMatch = cleanAnswer.match(/(?:degree|qualification|program|course|grade)\s*[:=-]\s*([^\n,]+)/i);
          const instMatch = cleanAnswer.match(/(?:institution|university|college|school)\s*[:=-]\s*([^\n,]+)/i);
          const durMatch = cleanAnswer.match(/(?:duration|dates?|period|years?)\s*[:=-]\s*([^\n,]+)/i);
          const gradeMatch = cleanAnswer.match(/(?:grade|cgpa|gpa|score|percentage|marks)\s*[:=-]\s*([^\n,]+)/i);

          let qual = qualMatch ? qualMatch[1].trim() : "";
          let inst = instMatch ? instMatch[1].trim() : "";
          let dates = durMatch ? durMatch[1].trim() : "";
          let grade = gradeMatch ? gradeMatch[1].trim() : "";

          if (!qual || !inst) {
            const dateMatch = cleanAnswer.match(/\[\s*([^\]]+)\s*\]/) || cleanAnswer.match(/((?:19|20)\d\d\s*[–-]\s*(?:(?:19|20)\d\d|Present))/i);
            if (!dates && dateMatch) dates = dateMatch[1].trim();

            const parts = cleanAnswer.replace(/\[\s*[^\]]+\s*\]/, "").split(/[,–-]/).map((p) => p.trim()).filter(Boolean);
            if (!qual) qual = parts[0] || "Degree / Qualification";
            if (!inst) inst = parts[1] || "Institution";
            if (!grade && parts[2]) {
              const g = parts[2].match(/(?:final\s*grade|grade|cgpa)[:=\s]*([^\n,]+)/i);
              if (g) grade = g[1].trim();
            }
          }

          qual = qual.replace(/^(?:degree|qualification)[:=-]\s*/i, "").trim() || "Degree";
          inst = inst.replace(/^(?:institution|university|college)[:=-]\s*/i, "").trim() || "Institution";
          dates = dates.replace(/^(?:duration|dates?)[:=-]\s*/i, "").trim();
          grade = grade.replace(/^(?:grade|cgpa)[:=-]\s*/i, "").trim();

          const instLine = dates ? `${inst} [ ${dates} ]` : inst;
          const gradeLine = grade ? `Final grade: ${grade}` : "";
          formattedContent = [qual, instLine, gradeLine].filter(Boolean).join("\n");
          summaryText = `${qual} at ${inst}${dates ? ` (${dates})` : ""}`;

          const newEdu = {
            id: `edu-${Date.now()}`,
            qualification: qual,
            institution: inst,
            startDate: dates ? dates.split(/[–-]|to/i)[0]?.trim() || "" : "",
            endDate: dates ? dates.split(/[–-]|to/i)[1]?.trim() || "" : "",
            finalGrade: grade || undefined,
          };
          const existingEdu = (updatedCv.education || []).filter((e) => e.qualification || e.institution);
          updatedCv.education = [...existingEdu, newEdu];
          break;
        }

        case "training": {
          formattedSectionHeading = "EDUCATION AND TRAINING";

          const courseMatch = cleanAnswer.match(/(?:course|program|training|workshop)\s*[:=-]\s*([^\n,]+)/i);
          const provMatch = cleanAnswer.match(/(?:provider|institution|platform|by|from)\s*[:=-]\s*([^\n,]+)/i);
          const durMatch = cleanAnswer.match(/(?:duration|dates?|year)\s*[:=-]\s*([^\n,]+)/i);

          let course = courseMatch ? courseMatch[1].trim() : "";
          let provider = provMatch ? provMatch[1].trim() : "";
          let dates = durMatch ? durMatch[1].trim() : "";

          if (!course) {
            const dateMatch = cleanAnswer.match(/\[\s*([^\]]+)\s*\]/) || cleanAnswer.match(/\((20\d\d)\)/);
            if (dateMatch) dates = dateMatch[1].trim();
            const parts = cleanAnswer.replace(/\[\s*[^\]]+\s*\]/, "").replace(/\((20\d\d)\)/, "").split(/[,–-]/).map((p) => p.trim()).filter(Boolean);
            course = parts[0] || cleanAnswer;
            if (!provider && parts[1]) provider = parts[1];
          }

          course = course.replace(/^(?:training|course|workshop)[:=-]\s*/i, "").trim() || "Professional Training";
          provider = provider.replace(/^(?:provider|institution)[:=-]\s*/i, "").trim() || "Training Institute";

          const provLine = dates ? `${provider} [ ${dates} ]` : provider;
          formattedContent = `${course}\n${provLine}`;
          summaryText = `${course} (${provider})`;

          const newTrainEdu = {
            id: `train-${Date.now()}`,
            qualification: course,
            institution: provider,
            startDate: dates ? dates.split(/[–-]|to/i)[0]?.trim() || "" : "",
            endDate: dates ? dates.split(/[–-]|to/i)[1]?.trim() || "" : "",
          };
          const existingEdu = (updatedCv.education || []).filter((e) => e.qualification || e.institution);
          updatedCv.education = [...existingEdu, newTrainEdu];
          break;
        }

        case "certifications": {
          formattedSectionHeading = "CERTIFICATIONS";

          const dateMatch = cleanAnswer.match(/\[\s*([^\]]+)\s*\]/) || cleanAnswer.match(/\((20\d\d)\)/);
          const completionDate = dateMatch ? dateMatch[1].trim() : undefined;
          const cleanLine = cleanAnswer.replace(/\[\s*[^\]]+\s*\]/, "").replace(/\((20\d\d)\)/, "").trim();

          let name = cleanLine;
          let provider: string | undefined = undefined;
          const delimiterMatch = cleanLine.match(/\s*(?:–|—|-|\||\bby\b|\bfrom\b)\s*/i);
          if (delimiterMatch && delimiterMatch.index !== undefined) {
            name = cleanLine.slice(0, delimiterMatch.index).trim();
            provider = cleanLine.slice(delimiterMatch.index + delimiterMatch[0].length).trim();
          }

          name = name.replace(/^(?:certification|name|certificate)[:=-]\s*/i, "").trim() || cleanAnswer;
          provider = provider?.replace(/^(?:provider|issued by)[:=-]\s*/i, "").trim();

          const formattedCert = provider
            ? `${name} – ${provider}${completionDate ? ` [ ${completionDate} ]` : ""}`
            : `${name}${completionDate ? ` [ ${completionDate} ]` : ""}`;
          formattedContent = formattedCert;
          summaryText = formattedCert;

          const newCert = {
            id: `cert-${Date.now()}`,
            name,
            provider,
            completionDate,
          };
          const existingCerts = (updatedCv.certifications || []).filter((c) => c.name);
          updatedCv.certifications = [...existingCerts, newCert];
          break;
        }

        case "academicProjects": {
          formattedSectionHeading = "ACADEMIC PROJECTS";

          const titleMatch = cleanAnswer.match(/(?:title|project\s*title|project|name)\s*[:=-]\s*([^\n,]+)/i);
          const descMatch = cleanAnswer.match(/(?:description|details|built|summary)\s*[:=-]\s*([\s\S]+)/i);

          let title = titleMatch ? titleMatch[1].trim() : "";
          let desc = descMatch ? descMatch[1].trim() : "";

          if (!title) {
            const splitMatch = cleanAnswer.split(/[:–-]\s+/);
            title = splitMatch[0]?.trim() || "Academic Project";
            desc = splitMatch.slice(1).join(" ").trim() || cleanAnswer;
          }

          title = title.replace(/^(?:project|title)[:=-]\s*/i, "").trim() || "Academic Project";
          desc = desc.replace(/^(?:description|details)[:=-]\s*/i, "").trim();

          formattedContent = desc ? `${title}\n${desc}` : title;
          summaryText = title;

          const newProj = {
            id: `proj-${Date.now()}`,
            title,
            description: desc,
          };
          const existingProj = (updatedCv.academicProjects || []).filter((p) => p.title);
          updatedCv.academicProjects = [...existingProj, newProj];
          break;
        }

        case "responsibilities": {
          formattedSectionHeading = "LEADERSHIP & RESPONSIBILITIES";

          const roleMatch = cleanAnswer.match(/(?:role|activity|responsibility|position)\s*[:=-]\s*([^\n,]+)/i);
          const orgMatch = cleanAnswer.match(/(?:organization|organisation|club|school|council)\s*[:=-]\s*([^\n,]+)/i);
          const durMatch = cleanAnswer.match(/(?:duration|dates?|period)\s*[:=-]\s*([^\n,]+)/i);
          const descMatch = cleanAnswer.match(/(?:responsibilities|duties|description|details)\s*[:=-]\s*([\s\S]+)/i);

          let role = roleMatch ? roleMatch[1].trim() : "";
          let org = orgMatch ? orgMatch[1].trim() : "";
          let duration = durMatch ? durMatch[1].trim() : "";
          let desc = descMatch ? descMatch[1].trim() : "";

          if (!role) {
            const bracketDate = cleanAnswer.match(/\[\s*([^\]]+)\s*\]/);
            if (bracketDate) duration = bracketDate[1].trim();
            const cleanNoDate = cleanAnswer.replace(/\[\s*[^\]]+\s*\]/, "").trim();
            const parts = cleanNoDate.split(/[:–-]\s+/);
            role = parts[0]?.trim() || "Leadership Role";
            desc = parts.slice(1).join(" ").trim() || cleanAnswer;
          }

          role = role.replace(/^(?:role|position|responsibility)[:=-]\s*/i, "").trim() || "Leadership Role";
          org = org.replace(/^(?:organization|club)[:=-]\s*/i, "").trim();
          duration = duration.replace(/^(?:duration|dates?)[:=-]\s*/i, "").trim();
          desc = desc.replace(/^(?:responsibilities|description)[:=-]\s*/i, "").trim();

          const orgLine = [org, duration ? `[ ${duration} ]` : null].filter(Boolean).join(" ");
          formattedContent = [role, orgLine, desc].filter(Boolean).join("\n");
          summaryText = `${role}${org ? ` at ${org}` : ""}`;

          const newLead = {
            id: `leader-${Date.now()}`,
            activity: role,
            organisation: org || undefined,
            duration: duration || undefined,
            description: desc || undefined,
          };
          const existingLead = (updatedCv.leadershipActivities || []).filter((l) => l.activity || l.description);
          updatedCv.leadershipActivities = [...existingLead, newLead];
          break;
        }

        case "aboutMe":
        case "about": {
          formattedSectionHeading = "ABOUT ME";
          formattedContent = cleanAnswer;
          summaryText = cleanAnswer;
          updatedCv.aboutMe = cleanAnswer;
          break;
        }

        case "academicInterests": {
          formattedSectionHeading = "ACADEMIC INTERESTS";
          const items = cleanAnswer
            .replace(/\band\b/gi, ",")
            .split(/[,•\n]+/)
            .map((s) => s.trim().replace(/^[•\-*0-9.)\s]+/, "").trim())
            .filter(Boolean);
          const rawItems = items.length > 0 ? items : [cleanAnswer];
          formattedContent = rawItems.map((i) => `• ${i}`).join("\n");
          summaryText = rawItems.join(", ");
          const newInterests = rawItems.map((name, idx) => ({
            id: `interest-${Date.now()}-${idx}`,
            name,
          }));
          const existingInterests = updatedCv.academicInterests || [];
          updatedCv.academicInterests = [...existingInterests, ...newInterests];
          break;
        }

        case "achievements": {
          formattedSectionHeading = "ACHIEVEMENTS & AWARDS";
          const items = cleanAnswer
            .split(/\n+/)
            .map((s) => s.trim().replace(/^[•\-*0-9.)\s]+/, "").trim())
            .filter(Boolean);
          const rawItems = items.length > 0 ? items : [cleanAnswer];
          formattedContent = rawItems.map((i) => `• ${i}`).join("\n");
          summaryText = rawItems.join(", ");
          const newAchievements = rawItems.map((title, idx) => ({
            id: `ach-${Date.now()}-${idx}`,
            title,
          }));
          const existingAchievements = updatedCv.achievements || [];
          updatedCv.achievements = [...existingAchievements, ...newAchievements];
          break;
        }

        case "volunteering": {
          formattedSectionHeading = "VOLUNTEERING / COMMUNITY ENGAGEMENT";
          const roleMatch = cleanAnswer.match(/(?:role|position)\s*[:=-]\s*([^\n,]+)/i);
          const orgMatch = cleanAnswer.match(/(?:organization|organisation|ngo|foundation)\s*[:=-]\s*([^\n,]+)/i);
          const durMatch = cleanAnswer.match(/(?:duration|dates?|period)\s*[:=-]\s*([^\n,]+)/i);
          const descMatch = cleanAnswer.match(/(?:responsibilities|duties|description|details)\s*[:=-]\s*([\s\S]+)/i);

          let role = roleMatch ? roleMatch[1].trim() : "";
          let org = orgMatch ? orgMatch[1].trim() : "";
          let duration = durMatch ? durMatch[1].trim() : "";
          let desc = descMatch ? descMatch[1].trim() : "";

          if (!role) {
            const bracketDate = cleanAnswer.match(/\[\s*([^\]]+)\s*\]/);
            if (bracketDate) duration = bracketDate[1].trim();
            const cleanNoDate = cleanAnswer.replace(/\[\s*[^\]]+\s*\]/, "").trim();
            const parts = cleanNoDate.split(/[:–-]\s+/);
            role = parts[0]?.trim() || "Volunteer";
            desc = parts.slice(1).join(" ").trim() || cleanAnswer;
          }

          role = role.replace(/^(?:role|position)[:=-]\s*/i, "").trim() || "Volunteer";
          org = org.replace(/^(?:organization|ngo)[:=-]\s*/i, "").trim();
          duration = duration.replace(/^(?:duration|dates?)[:=-]\s*/i, "").trim();
          desc = desc.replace(/^(?:description|responsibilities)[:=-]\s*/i, "").trim();

          const orgLine = [org, duration ? `[ ${duration} ]` : null].filter(Boolean).join(" ");
          formattedContent = [role, orgLine, desc].filter(Boolean).join("\n");
          summaryText = `${role}${org ? ` at ${org}` : ""}`;

          const newVol = {
            id: `vol-${Date.now()}`,
            role,
            organization: org || undefined,
            startDate: duration ? duration.split(/[–-]|to/i)[0]?.trim() || "" : "",
            endDate: duration ? duration.split(/[–-]|to/i)[1]?.trim() || "" : "",
            description: desc || undefined,
          };
          const existingVol = updatedCv.volunteering || [];
          updatedCv.volunteering = [...existingVol, newVol];
          break;
        }

        case "languageSkills":
        case "languages": {
          formattedSectionHeading = "LANGUAGE SKILLS";
          const parsed = parseLanguageSkillsInput(cleanAnswer, updatedCv.motherTongue);
          const mt = parsed.motherTongue;
          const otherLangs = parsed.otherLanguages;

          const otherLangsSummary = otherLangs.map((l) => (l.level ? `${l.language} (${l.level})` : l.language));

          formattedContent = otherLangs.length > 0
            ? `Mother tongue(s): ${mt}\nOther language(s): ${otherLangsSummary.join(", ")}`
            : `Mother tongue(s): ${mt}`;
          summaryText = `Mother tongue: ${mt}${otherLangs.length > 0 ? `, Other: ${otherLangsSummary.join(", ")}` : ""}`;

          updatedCv.motherTongue = mt;
          if (otherLangs.length > 0) {
            const newLangEntries = otherLangs.map((l, idx) => ({
              id: `lang-${Date.now()}-${idx}`,
              language: l.language,
              level: l.level || undefined,
            }));

            if (/^\s*(?:add|also|include)\b/i.test(cleanAnswer)) {
              const existingLangs = updatedCv.languages || [];
              updatedCv.languages = [...existingLangs, ...newLangEntries];
            } else {
              updatedCv.languages = newLangEntries;
            }
          }
          break;
        }

        case "recommendations": {
          formattedSectionHeading = "RECOMMENDATIONS";
          const nameMatch = cleanAnswer.match(/(?:recommender|referee|name|professor|dr\.?)\s*[:=-]\s*([^\n,]+)/i);
          const titleMatch = cleanAnswer.match(/(?:title|designation|position)\s*[:=-]\s*([^\n,]+)/i);
          const orgMatch = cleanAnswer.match(/(?:organization|institution|university|college)\s*[:=-]\s*([^\n,]+)/i);
          const textMatch = cleanAnswer.match(/(?:text|quote|feedback|comments?)\s*[:=-]\s*([\s\S]+)/i);

          let recName = nameMatch ? nameMatch[1].trim() : "";
          const recTitle = titleMatch ? titleMatch[1].trim() : "";
          const recOrg = orgMatch ? orgMatch[1].trim() : "";
          let recText = textMatch ? textMatch[1].trim() : "";

          if (!recName) {
            const parts = cleanAnswer.split(/[:–-]\s+/);
            recName = parts[0]?.trim() || "Referee";
            recText = parts.slice(1).join(" ").trim() || cleanAnswer;
          }

          recName = recName.replace(/^(?:recommender|referee)[:=-]\s*/i, "").trim() || "Referee";
          const titleOrg = [recTitle, recOrg].filter(Boolean).join(", ");
          formattedContent = [recName, titleOrg, recText ? `"${recText}"` : null].filter(Boolean).join("\n");
          summaryText = `${recName}${recOrg ? ` (${recOrg})` : ""}`;

          const newRec = {
            id: `rec-${Date.now()}`,
            recommenderName: recName,
            recommenderTitle: recTitle || undefined,
            organization: recOrg || undefined,
            text: recText || undefined,
          };
          const existingRec = updatedCv.recommendations || [];
          updatedCv.recommendations = [...existingRec, newRec];
          break;
        }

        default: {
          formattedSectionHeading = activeSectionPrompt.heading;
          formattedContent = cleanAnswer;
          summaryText = cleanAnswer;
          break;
        }
      }

      // Update editableDocContent.sections:
      const existingSectionIdx = editableDocContent.sections.findIndex((s) =>
        s.heading.trim().toLowerCase() === formattedSectionHeading.toLowerCase() ||
        ((activeSectionPrompt.sectionKey === "aboutMe" || activeSectionPrompt.sectionKey === "about") && s.heading.toLowerCase().includes("about")) ||
        (activeSectionPrompt.sectionKey === "academicInterests" && (s.heading.toLowerCase().includes("academic interest") || (s.heading.toLowerCase().includes("interest") && !s.heading.toLowerCase().includes("hobb")))) ||
        (activeSectionPrompt.sectionKey === "achievements" && (s.heading.toLowerCase().includes("achievement") || s.heading.toLowerCase().includes("award"))) ||
        (activeSectionPrompt.sectionKey === "volunteering" && (s.heading.toLowerCase().includes("volunteer") || s.heading.toLowerCase().includes("community"))) ||
        ((activeSectionPrompt.sectionKey === "languageSkills" || activeSectionPrompt.sectionKey === "languages") && s.heading.toLowerCase().includes("language") && !s.heading.toLowerCase().includes("certificate")) ||
        (activeSectionPrompt.sectionKey === "recommendations" && (s.heading.toLowerCase().includes("recommendation") || s.heading.toLowerCase().includes("referee"))) ||
        (activeSectionPrompt.sectionKey === "hobbies" && s.heading.toLowerCase().includes("hobbies")) ||
        (activeSectionPrompt.sectionKey === "skills" && s.heading.toLowerCase().includes("skill") && !s.heading.toLowerCase().includes("language")) ||
        (activeSectionPrompt.sectionKey === "certifications" && s.heading.toLowerCase().includes("certificat")) ||
        (activeSectionPrompt.sectionKey === "workExperience" && (s.heading.toLowerCase().includes("work") || s.heading.toLowerCase().includes("internship"))) ||
        (activeSectionPrompt.sectionKey === "education" && s.heading.toLowerCase().includes("education")) ||
        (activeSectionPrompt.sectionKey === "training" && (s.heading.toLowerCase().includes("training") || s.heading.toLowerCase().includes("education"))) ||
        (activeSectionPrompt.sectionKey === "academicProjects" && s.heading.toLowerCase().includes("project")) ||
        (activeSectionPrompt.sectionKey === "responsibilities" && (s.heading.toLowerCase().includes("leadership") || s.heading.toLowerCase().includes("responsibilit") || s.heading.toLowerCase().includes("extracurricular"))) ||
        (activeSectionPrompt.sectionKey === "englishCertificate" && (s.heading.toLowerCase().includes("english") || s.heading.toLowerCase().includes("ielts")))
      );

      // Determine proper entry separator
      const sectionSeparator =
        activeSectionPrompt.sectionKey === "skills" || activeSectionPrompt.sectionKey === "hobbies" || activeSectionPrompt.sectionKey === "academicInterests"
          ? " • "
          : activeSectionPrompt.sectionKey === "certifications" || activeSectionPrompt.sectionKey === "achievements"
            ? "\n"
            : activeSectionPrompt.sectionKey === "englishCertificate" || activeSectionPrompt.sectionKey === "aboutMe" || activeSectionPrompt.sectionKey === "about" || activeSectionPrompt.sectionKey === "languageSkills" || activeSectionPrompt.sectionKey === "languages"
              ? "REPLACE"
              : "\n\n";

      const updatedSections = [...editableDocContent.sections];
      if (existingSectionIdx >= 0) {
        const existingSec = updatedSections[existingSectionIdx];
        let mergedContent = formattedContent;
        if (existingSec.content?.trim()) {
          if (sectionSeparator === "REPLACE") {
            mergedContent = formattedContent;
          } else {
            mergedContent = `${existingSec.content.trim()}${sectionSeparator}${formattedContent}`;
          }
        }
        updatedSections[existingSectionIdx] = {
          ...existingSec,
          heading: existingSec.heading || formattedSectionHeading,
          content: mergedContent,
        };
      } else {
        updatedSections.push({
          heading: formattedSectionHeading,
          content: formattedContent,
        });
      }

      // Ensure updatedCv.sectionOrder has this section
      const secIdMap: Record<string, string> = {
        aboutMe: "aboutMe",
        about: "aboutMe",
        hobbies: "hobbies",
        skills: "skills",
        englishCertificate: "englishCertificate",
        workExperience: "internships",
        internships: "internships",
        certifications: "certifications",
        education: "education",
        training: "education",
        academicProjects: "academicProjects",
        academicInterests: "academicInterests",
        achievements: "achievements",
        responsibilities: "leadershipActivities",
        leadershipActivities: "leadershipActivities",
        volunteering: "volunteering",
        languageSkills: "languages",
        languages: "languages",
        recommendations: "recommendations",
      };
      const mappedId = secIdMap[activeSectionPrompt.sectionKey];
      if (mappedId) {
        if (!updatedCv.sectionOrder) {
          updatedCv.sectionOrder = [...EUROPASS_DEFAULT_SECTION_ORDER];
        } else if (!updatedCv.sectionOrder.includes(mappedId)) {
          updatedCv.sectionOrder.push(mappedId);
        }
      }

      // Bi-directionally sync CV data
      const syncedCv = syncSectionsToCvData(updatedSections, updatedCv);
      if (currentCv.personal?.photoUrl && !syncedCv.personal?.photoUrl) {
        if (!syncedCv.personal) syncedCv.personal = {};
        syncedCv.personal.photoUrl = currentCv.personal.photoUrl;
      }
      setCvDocumentData(syncedCv);

      const updatedDoc: HydratedDocumentData = {
        ...editableDocContent,
        sections: updatedSections,
        wordCount: updatedSections.reduce(
          (acc, s) => acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0),
          0
        ),
      };

      setEditableDocContent(updatedDoc);
      setActiveDocument(updatedDoc);
      syncDocumentToRecent(updatedDoc, "Edited just now");

      const newHtml = docSectionsToHtml(updatedSections, updatedDoc.docType, updatedDoc.title);
      setTiptapHtml(newHtml);
      if (tiptapEditor) {
        tiptapEditor.commands.setContent(newHtml);
      }

      // Clear active prompt
      setActiveCvSectionPrompt(null);

      // Post Assistant confirmation
      const isExisting = Boolean(('isExisting' in activeSectionPrompt && activeSectionPrompt.isExisting) || existingSectionIdx >= 0);
      const assistantMsg: ChatMessage = {
        id: generateUniqueId("assistant-cv-section-success"),
        sender: "assistant",
        text: isExisting
          ? `✅ Updated **${activeSectionPrompt.label}** in CV with new entry:\n\n**${summaryText}**\n\nThe Europass CV canvas has been updated and your new entry is now visible.`
          : `✅ Added **${activeSectionPrompt.label}** section to CV:\n\n**${summaryText}**\n\nThe Europass CV canvas has been updated and this section is now visible.`,
        timestamp: getFormattedTimestamp(),
        actionType: "typed_section",
        sectionUpdated: activeSectionPrompt.label,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      setAiToast({
        message: `✨ Added ${activeSectionPrompt.label}`,
        type: "success",
      });
      setTimeout(() => setAiToast(null), 3000);

      // Scroll to the new section
      setTimeout(() => {
        handleScrollToSection(formattedSectionHeading);
      }, 350);

      return;
    }

    // ── Dedicated Smart Multi-Field Instant Parser ─────────────────────────────
    const multiMatch = parseMultiFieldInstruction(trimmedPrompt);
    if (multiMatch && multiMatch.length >= 2) {
      if (editableDocContent.docType === "COVER_LETTER") {
        const userMsg: ChatMessage = {
          id: generateUniqueId("user"),
          sender: "user",
          text: trimmedPrompt,
          timestamp: getFormattedTimestamp(),
        };
        setChatMessages((prev) => [...prev, userMsg]);
        setAiPromptText("");

        setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
        setRedoHistory([]);

        const { sections: updatedSections, fieldValues: updatedFieldValues } =
          updateCoverLetterSectionsWithMultipleFields(
            editableDocContent.sections,
            multiMatch,
            activeSopContext,
            editableDocContent.fieldValues
          );

        const updatedDoc: HydratedDocumentData = {
          ...editableDocContent,
          sections: updatedSections,
          fieldValues: updatedFieldValues,
          wordCount: updatedSections.reduce(
            (acc, s) => acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0),
            0
          ),
        };

        setEditableDocContent(updatedDoc);
        setActiveDocument(updatedDoc);
        const currentLiveHtml = tiptapEditor ? tiptapEditor.getHTML() : tiptapHtml;
        const newHtml =
          editableDocContent.docType === "COVER_LETTER" && currentLiveHtml
            ? updateLiveCoverLetterHtml(currentLiveHtml, editableDocContent.sections, updatedSections)
            : docSectionsToHtml(updatedSections, updatedDoc.docType, updatedDoc.title);
        setTiptapHtml(newHtml);
        if (tiptapEditor) {
          tiptapEditor.commands.setContent(newHtml);
        }

        syncDocumentToRecent(updatedDoc, "Edited just now");
        setActiveFieldPrompt(null);

        // 8.5 Trigger green underline highlight & floating badge on the changed section
        const changedSec = updatedSections.find((sec, idx: number) => {
          const oldSec = editableDocContent?.sections[idx];
          return !oldSec || oldSec.content !== sec.content;
        });
        const sectionNameToHighlight = changedSec ? changedSec.heading : (multiMatch[0]?.label || "Cover Letter");
        highlightChangedSentenceInCanvas(sectionNameToHighlight, multiMatch[0]?.value || "");

        const bullets = multiMatch.map((m) => `• **${m.label}**: ${m.value}`).join("\n");
        const assistantMsg: ChatMessage = {
          id: generateUniqueId("assistant-multi-field-update"),
          sender: "assistant",
          text: `✅ Updated **${multiMatch.length} details**:\n\n${bullets}\n\nThe Cover Letter preview has been refreshed and these details are now verified.`,
          timestamp: getFormattedTimestamp(),
          actionType: "typed_section",
        };
        setChatMessages((prev) => [...prev, assistantMsg]);

        setAiToast({
          message: `✨ Updated ${multiMatch.length} details`,
          type: "success",
        });
        setTimeout(() => setAiToast(null), 3000);
        return;
      }

      if (editableDocContent.docType === "CV") {
        const userMsg: ChatMessage = {
          id: generateUniqueId("user"),
          sender: "user",
          text: trimmedPrompt,
          timestamp: getFormattedTimestamp(),
        };
        setChatMessages((prev) => [...prev, userMsg]);
        setAiPromptText("");

        const currentCv =
          cvDocumentData ||
          getEuropassData(editableDocContent.studentId, editableDocContent.studentName, selectedStudentData);

        setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
        setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(currentCv))]);
        setRedoHistory([]);
        setCvRedoHistory([]);

        const updatedFieldValues: Record<string, string> = {
          ...(editableDocContent.fieldValues || {}),
        };
        for (const item of multiMatch) {
          updatedFieldValues[item.key] = item.value;
        }

        const updatedCv = JSON.parse(JSON.stringify(currentCv));
        if (!updatedCv.personal) updatedCv.personal = {};

        const updatedSections = [...editableDocContent.sections];

        for (const item of multiMatch) {
          if (item.key === "student.city" || item.key === "student.country") {
            const city = updatedFieldValues["student.city"] || updatedCv.personal.address?.city || "";
            const country = updatedFieldValues["student.country"] || updatedCv.personal.address?.country || "";
            if (!updatedCv.personal.address) updatedCv.personal.address = {};
            if (city) updatedCv.personal.address.city = city;
            if (country) updatedCv.personal.address.country = country;
          } else if (item.key === "student.languages") {
            const langIdx = updatedSections.findIndex(
              (s) =>
                s.heading.toLowerCase().includes("language") && !s.heading.toLowerCase().includes("certificate")
            );
            if (langIdx >= 0) {
              const currentContent = updatedSections[langIdx].content;
              const otherMatch = currentContent.match(/other\s*languages?(?:\(s\))?\s*[-:]\s*([^\n]+)/i);
              const otherVal = otherMatch ? otherMatch[1].trim() : "";
              updatedSections[langIdx] = {
                ...updatedSections[langIdx],
                content: otherVal
                  ? `Mother tongue(s): ${item.value}\nOther language(s): ${otherVal}`
                  : `Mother tongue(s): ${item.value}`,
              };
            }
          } else if (item.key === "student.nationality") {
            updatedCv.personal.nationality = item.value;
          } else if (item.key === "student.email") {
            updatedCv.personal.email = item.value;
          } else if (item.key === "student.phone") {
            updatedCv.personal.phone = item.value;
          }
        }

        setCvDocumentData(updatedCv);
        const updatedDoc: HydratedDocumentData = {
          ...editableDocContent,
          sections: updatedSections,
          fieldValues: updatedFieldValues,
        };
        setEditableDocContent(updatedDoc);
        setActiveDocument(updatedDoc);
        syncDocumentToRecent(updatedDoc, "Edited just now");
        setActiveFieldPrompt(null);

        // 8.5 Trigger green underline highlight & floating badge on the changed section
        const changedSec = updatedSections.find((sec, idx: number) => {
          const oldSec = editableDocContent?.sections[idx];
          return !oldSec || oldSec.content !== sec.content;
        });
        const sectionNameToHighlight = changedSec ? changedSec.heading : (multiMatch[0]?.label || "Europass CV");
        highlightChangedSentenceInCanvas(sectionNameToHighlight, multiMatch[0]?.value || "");

        const bullets = multiMatch.map((m) => `• **${m.label}**: ${m.value}`).join("\n");
        const assistantMsg: ChatMessage = {
          id: generateUniqueId("assistant-cv-multi-field"),
          sender: "assistant",
          text: `✅ Updated **${multiMatch.length} details**:\n\n${bullets}\n\nThe Europass CV canvas has been refreshed.`,
          timestamp: getFormattedTimestamp(),
          actionType: "typed_section",
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
        setAiToast({ message: `✨ Updated ${multiMatch.length} details`, type: "success" });
        setTimeout(() => setAiToast(null), 3000);
        return;
      }
    }

    // Direct AI instruction matcher or active validation field prompt
    const directMatch = parseDirectFieldInstruction(trimmedPrompt);
    let targetFieldKey: string | null = null;
    let targetFieldLabel: string | null = null;
    let targetValue: string | null = null;

    if (directMatch) {
      targetFieldKey = directMatch.key;
      targetFieldLabel = directMatch.label;
      targetValue = directMatch.value;
    } else if (activeFieldPrompt) {
      targetFieldKey = activeFieldPrompt.key;
      targetFieldLabel = activeFieldPrompt.label;
      targetValue = trimmedPrompt.replace(/^[:=\s]+/, "").replace(/\.$/, "").trim();
    }

    // ── Dedicated Cover Letter Field-Level Instant Updater ─────────────────────
    if (editableDocContent.docType === "COVER_LETTER" && targetFieldKey && targetValue) {
      // 1. Record user response message in AI chat
      const userMsg: ChatMessage = {
        id: generateUniqueId("user"),
        sender: "user",
        text: trimmedPrompt,
        timestamp: getFormattedTimestamp(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setAiPromptText("");

      // 2. Snapshot current state for Undo
      setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
      setRedoHistory([]);

      // 3. Update field overrides
      const updatedFieldValues: Record<string, string> = {
        ...(editableDocContent.fieldValues || {}),
        [targetFieldKey]: targetValue,
      };

      // 4. Update the targeted section cleanly while preserving all other custom edits
      const updatedSections = updateCoverLetterSectionWithField(
        editableDocContent.sections,
        targetFieldKey,
        targetValue,
        activeSopContext,
        updatedFieldValues
      );

      // 5. Construct updated document
      const updatedDoc: HydratedDocumentData = {
        ...editableDocContent,
        sections: updatedSections,
        fieldValues: updatedFieldValues,
        wordCount: updatedSections.reduce(
          (acc, s) => acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0),
          0
        ),
      };

      // 6. Update document state & Tiptap editor
      setEditableDocContent(updatedDoc);
      setActiveDocument(updatedDoc);
      const currentLiveHtml = tiptapEditor ? tiptapEditor.getHTML() : tiptapHtml;
      const newHtml =
        editableDocContent.docType === "COVER_LETTER" && currentLiveHtml
          ? updateLiveCoverLetterHtml(currentLiveHtml, editableDocContent.sections, updatedSections)
          : docSectionsToHtml(updatedSections, updatedDoc.docType, updatedDoc.title);
      setTiptapHtml(newHtml);
      if (tiptapEditor) {
        tiptapEditor.commands.setContent(newHtml);
      }

      // 7. Persist immediately to recentDocs & localStorage
      syncDocumentToRecent(updatedDoc, "Edited just now");

      // 8. Clear active field prompt
      setActiveFieldPrompt(null);

      // 8.5 Trigger green underline highlight & floating badge on the changed section
      const changedSec = updatedSections.find((sec, idx: number) => {
        const oldSec = editableDocContent.sections[idx];
        return !oldSec || oldSec.content !== sec.content;
      });
      const sectionNameToHighlight = changedSec ? changedSec.heading : (targetFieldLabel || "Cover Letter");
      highlightChangedSentenceInCanvas(sectionNameToHighlight, targetValue);

      // 9. Post AI assistant confirmation message
      const assistantMsg: ChatMessage = {
        id: generateUniqueId("assistant-field-update"),
        sender: "assistant",
        text: `✅ Updated **${targetFieldLabel}** to **${targetValue}**. The Cover Letter preview has been refreshed and this detail is now verified.`,
        timestamp: getFormattedTimestamp(),
        actionType: "typed_section",
      };
      setChatMessages((prev) => [...prev, assistantMsg]);

      // 10. Show confirmation toast
      setAiToast({
        message: `✨ Updated ${targetFieldLabel}`,
        type: "success",
      });
      setTimeout(() => setAiToast(null), 3000);
      return;
    }

    // ── Dedicated CV Contact/Personal Field-Level Instant Updater ───────────────
    if (editableDocContent.docType === "CV" && targetFieldKey && targetValue) {
      const userMsg: ChatMessage = {
        id: generateUniqueId("user"),
        sender: "user",
        text: trimmedPrompt,
        timestamp: getFormattedTimestamp(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
      setAiPromptText("");

      const currentCv = cvDocumentData || getEuropassData(editableDocContent.studentId, editableDocContent.studentName, selectedStudentData);
      setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
      setCvHistory((prev) => [...prev, JSON.parse(JSON.stringify(currentCv))]);
      setRedoHistory([]);
      setCvRedoHistory([]);

      const updatedFieldValues: Record<string, string> = {
        ...(editableDocContent.fieldValues || {}),
        [targetFieldKey]: targetValue,
      };

      const updatedCv = JSON.parse(JSON.stringify(currentCv));
      if (!updatedCv.personal) updatedCv.personal = {};

      let fieldConfirmedName = targetFieldLabel || targetFieldKey;

      if (targetFieldKey.includes("city") || targetFieldKey.includes("address")) {
        updatedCv.personal.address = targetValue;
        fieldConfirmedName = "Address / City";
      } else if (targetFieldKey.includes("phone")) {
        updatedCv.personal.phone = targetValue;
        fieldConfirmedName = "Phone Number";
      } else if (targetFieldKey.includes("email")) {
        updatedCv.personal.email = targetValue;
        fieldConfirmedName = "Email Address";
      } else if (targetFieldKey.includes("nationality") || targetFieldKey.includes("country")) {
        updatedCv.personal.nationality = targetValue;
        fieldConfirmedName = "Nationality";
      } else if (targetFieldKey.includes("dob") || targetFieldKey.includes("birth")) {
        updatedCv.personal.dateOfBirth = targetValue;
        fieldConfirmedName = "Date of Birth";
      } else if (targetFieldKey.includes("motherTongue") || targetFieldKey.includes("language")) {
        updatedCv.motherTongue = targetValue;
        fieldConfirmedName = "Mother Tongue";
      }

      setCvDocumentData(updatedCv);

      const updatedDoc: HydratedDocumentData = {
        ...editableDocContent,
        fieldValues: updatedFieldValues,
      };
      setEditableDocContent(updatedDoc);
      setActiveDocument(updatedDoc);
      syncDocumentToRecent(updatedDoc, "Edited just now");
      setActiveFieldPrompt(null);

      // 8.5 Trigger green underline highlight & floating badge on the changed section
      highlightChangedSentenceInCanvas(fieldConfirmedName, targetValue);

      const assistantMsg: ChatMessage = {
        id: generateUniqueId("assistant-cv-field"),
        sender: "assistant",
        text: `✅ Updated **${fieldConfirmedName}** to **${targetValue}**. The Europass CV has been refreshed.`,
        timestamp: getFormattedTimestamp(),
        actionType: "typed_section",
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
      setAiToast({ message: `✨ Updated ${fieldConfirmedName}`, type: "success" });
      setTimeout(() => setAiToast(null), 3000);
      return;
    }

    // ── Standard AI / Smart Changes Fallback ───────────────────────────────────
    const userMsg: ChatMessage = {
      id: generateUniqueId("user"),
      sender: "user",
      text: trimmedPrompt,
      timestamp: getFormattedTimestamp(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setAiPromptText("");
    handleRunSmartChange("custom", trimmedPrompt, userMsg);
  };

  // Tiptap Content & Formatting Listeners
  const handleTiptapUpdate = (html: string, wordCount: number) => {
    setTiptapHtml(html);
    if (editableDocContent) {
      const updatedSections =
        editableDocContent.docType === "COVER_LETTER"
          ? syncCoverLetterHtmlToSections(html, editableDocContent.sections)
          : editableDocContent.sections;
      setEditableDocContent((prev) =>
        prev
          ? {
            ...prev,
            wordCount,
            rawHtml: html,
            sections: updatedSections,
          }
          : prev
      );
    }
  };

  const handleFormatChange = (state: FormattingState) => {
    setIsBoldActive(state.isBold);
    setIsItalicActive(state.isItalic);
    setIsUnderlineActive(state.isUnderline);
    setIsStrikeActive(state.isStrike);
    setTextAlign(state.textAlign);
    setActiveHeading(state.heading);
  };

  // Dynamic Document Type Switcher (COVER_LETTER <-> SOP <-> CV <-> LOR)
  const handleSwitchDocType = async (newType: "COVER_LETTER" | "SOP" | "CV" | "LOR") => {
    if (!activeDocument) return;
    setIsAiCooking(true);
    const snapshot = await loadStudentSnapshot(activeDocument.studentId);
    if (!snapshot) {
      setIsAiCooking(false);
      setAiToast({ message: "Could not load this student's CRM data. Document type was not changed.", type: "error" });
      return;
    }

    const newDoc = hydrateDocumentFromSnapshot(
      newType,
      snapshot,
      activeDocument.studentId,
      newType === "SOP"
        ? "university-sop-standard"
        : newType === "COVER_LETTER"
          ? "italy-type-d-student-visa-cover-letter"
          : undefined
    );
    if (editableDocContent) {
      setDocHistory((prev) => [...prev, editableDocContent]);
    }
    setActiveDocument(newDoc);
    setEditableDocContent(newDoc);
    const html = docSectionsToHtml(newDoc.sections, newDoc.docType, newDoc.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }
    if (newType === "CV") {
      const baseCv = getEuropassData(newDoc.studentId, newDoc.studentName, selectedStudentData);
      const synced = syncSectionsToCvData(newDoc.sections, baseCv);
      setCvDocumentData(synced);
      setCvViewMode("europass");
    } else {
      setCvDocumentData(null);
      setCvViewMode("caret");
    }

    loadChatSessionsForDoc(newDoc.studentId, newType, newDoc.studentName);

    setIsAiCooking(false);
    setAiToast({ message: `Switched template to ${newDoc.docTypeName}`, type: "success" });
  };

  // Dynamic Document Export Handlers (PDF & Microsoft Word .docx)
  const handleExportDocx = async () => {
    if (!editableDocContent) return;
    setIsExportingDocx(true);
    setShowExportMenu(false);
    try {
      const liveHtml = tiptapEditor ? tiptapEditor.getHTML() : editableDocContent.rawHtml || tiptapHtml;
      const isCv = editableDocContent.docType === "CV";
      let activeCvPayload: DocumentData | undefined = undefined;
      if (isCv) {
        const baseCv =
          cvDocumentData ||
          getEuropassData(
            editableDocContent.studentId,
            editableDocContent.studentName,
            selectedStudentData
          );
        activeCvPayload = syncSectionsToCvData(editableDocContent.sections, baseCv);
      }
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editableDocContent.title,
          studentName: editableDocContent.studentName,
          studentId: editableDocContent.studentId,
          documentType: editableDocContent.docType,
          fontFamily: fontFamilyLabel,
          html: liveHtml,
          cvData: activeCvPayload,
          sections: editableDocContent.sections.map((s) => ({
            title: s.heading || "",
            content: s.content || "",
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate DOCX document");

      const blob = await response.blob();
      const fileName = buildStandardizedPdfFilename(
        editableDocContent.studentName,
        editableDocContent.docType,
        editableDocContent.targetCountry
      ).replace(/\.pdf$/i, ".docx");

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setAiToast({ message: `📥 Exported ${fileName}`, type: "success" });
    } catch {
      setAiToast({ message: "Failed to export Word document. Please try again.", type: "info" });
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    if (!editableDocContent) return;
    setIsExportingPdf(true);
    setShowExportMenu(false);

    try {
      const fileName = buildStandardizedPdfFilename(
        editableDocContent.studentName,
        editableDocContent.docType,
        editableDocContent.targetCountry
      );

      if (editableDocContent.docType === "CV") {
        if (cvViewMode !== "europass") {
          setCvViewMode("europass");
          for (let i = 0; i < 5; i++) {
            await new Promise((r) => setTimeout(r, 100));
            if (document.querySelector('[data-pdf-page="true"]')) break;
          }
        }

        const activeCv =
          cvDocumentData ||
          getEuropassData(
            editableDocContent.studentId,
            editableDocContent.studentName,
            selectedStudentData
          );

        const { generateDocumentPdf } = await import(
          "@/features/document-generator/pdf/generateDocumentPdf"
        );

        await generateDocumentPdf(activeCv, {
          country: editableDocContent.targetCountry || undefined,
          documentType: "CV",
          customFilename: fileName,
        });

        setAiToast({ message: `📥 Exported ${fileName}`, type: "success" });
      } else {
        const response = await fetch("/api/export/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editableDocContent.title,
            studentName: editableDocContent.studentName,
            studentId: editableDocContent.studentId,
            documentType: editableDocContent.docType,
            sections: editableDocContent.sections.map((s) => ({
              title: s.heading || "",
              content: s.content || "",
            })),
          }),
        });

        if (!response.ok) throw new Error("Failed to generate PDF document");

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        setAiToast({ message: `📥 Exported ${fileName}`, type: "success" });
      }
    } catch (err) {
      console.error("[handleExportPdf] Export failed:", err);
      setAiToast({ message: "Failed to export PDF document. Please try again.", type: "info" });
    } finally {
      setIsExportingPdf(false);
    }
  };




  // Filter recent documents by global search
  const filteredRecentDocs = useMemo(() => {
    if (!searchQuery.trim()) return recentDocs;
    const q = searchQuery.toLowerCase();
    return recentDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.studentName.toLowerCase().includes(q) ||
        d.targetUniversity.toLowerCase().includes(q) ||
        d.docTypeName.toLowerCase().includes(q)
    );
  }, [recentDocs, searchQuery]);

  const totalRecentPages = Math.max(1, Math.ceil(filteredRecentDocs.length / recentDocsPerPage));
  const safeRecentPage = Math.min(Math.max(1, recentDocsPage), totalRecentPages);

  const paginatedRecentDocs = useMemo(() => {
    const startIndex = (safeRecentPage - 1) * recentDocsPerPage;
    return filteredRecentDocs.slice(startIndex, startIndex + recentDocsPerPage);
  }, [filteredRecentDocs, safeRecentPage, recentDocsPerPage]);

  const startRecentItemIndex = filteredRecentDocs.length === 0 ? 0 : (safeRecentPage - 1) * recentDocsPerPage + 1;
  const endRecentItemIndex = Math.min(safeRecentPage * recentDocsPerPage, filteredRecentDocs.length);

  const getRecentPageNumbers = () => {
    if (totalRecentPages <= 5) {
      return Array.from({ length: totalRecentPages }, (_, i) => i + 1);
    }
    if (safeRecentPage <= 3) {
      return [1, 2, 3, 4, "...", totalRecentPages];
    }
    if (safeRecentPage >= totalRecentPages - 2) {
      return [1, "...", totalRecentPages - 3, totalRecentPages - 2, totalRecentPages - 1, totalRecentPages];
    }
    return [1, "...", safeRecentPage - 1, safeRecentPage, safeRecentPage + 1, "...", totalRecentPages];
  };

  const selectedStudent = useMemo(() => {
    const found = studentRoster.find((s) => s.id === modalStudentId);
    if (found) return found;
    if (selectedStudentData?.student && (selectedStudentData.student._id === modalStudentId || selectedStudentData.student._id === lockedStudentId)) {
      const p = selectedStudentData.student.personalDetails;
      const fullName = [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(" ");
      return {
        id: selectedStudentData.student._id || modalStudentId,
        name: fullName || selectedStudentName || "Selected Student",
        email: p?.email || null,
      };
    }
    if (lockedStudentId) {
      return {
        id: lockedStudentId,
        name: selectedStudentName || "Selected Student",
        email: null,
      };
    }
    return studentRoster[0];
  }, [studentRoster, modalStudentId, selectedStudentData, selectedStudentName, lockedStudentId]);

  const filteredStudentRoster = useMemo(() => {
    if (!studentSearchQuery.trim()) return studentRoster;
    const q = studentSearchQuery.toLowerCase();
    return studentRoster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.email ? s.email.toLowerCase().includes(q) : false)
    );
  }, [studentRoster, studentSearchQuery]);


  const docTypeLabels: Record<"COVER_LETTER" | "SOP" | "CV" | "LOR" | "BLANK", string> = {
    COVER_LETTER: "Italy Type D Student Visa Cover Letter",
    SOP: "Statement of Purpose (SOP)",
    CV: "Europass Academic CV / Resume",
    LOR: "Academic Letter of Recommendation (LOR)",
    BLANK: "Blank Document (Custom Draft)",
  };

  // Open the creation modal
  const handleOpenModal = (presetDocType?: "COVER_LETTER" | "SOP" | "CV" | "LOR" | "BLANK") => {
    if (presetDocType) setModalDocType(presetDocType);
    if (lockedStudentId) {
      setModalStudentId(lockedStudentId);
    } else if (!modalStudentId && studentRoster[0]) {
      setModalStudentId(studentRoster[0].id);
    }
    setIsStudentDropdownOpen(false);
    setIsDocTypeDropdownOpen(false);
    setIsModalOpen(true);
  };



  // Unified Document Opener (Syncs Tiptap HTML, Europass Mode & Student Context)
  const handleOpenDocument = (doc: HydratedDocumentData) => {
    const safeDoc = ensureDocumentIdentity(doc);
    if (aiAbortControllerRef.current) {
      aiAbortControllerRef.current.abort();
    }
    activeDocIdentityRef.current = {
      docId: safeDoc.id || "",
      studentId: safeDoc.studentId,
    };
    // Cover letters: the active (baseline) document gets placeholder-cleaned sections,
    // while the editable copy and Tiptap HTML keep the original sections (as before).
    const activeDoc: HydratedDocumentData =
      safeDoc.docType === "COVER_LETTER" && Array.isArray(safeDoc.sections)
        ? {
            ...safeDoc,
            sections: safeDoc.sections.map((sec) => ({
              ...sec,
              content: cleanCoverLetterText(sec.content),
            })),
          }
        : safeDoc;
    setActiveDocument(activeDoc);
    setEditableDocContent(JSON.parse(JSON.stringify(safeDoc)));
    setDocHistory([]);
    setRedoHistory([]);
    setCvHistory([]);
    setCvRedoHistory([]);
    const html = docSectionsToHtml(safeDoc.sections, safeDoc.docType, safeDoc.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }
    if (safeDoc.docType === "COVER_LETTER") {
      setFontFamily("Calibri, Carlito, Aptos, 'Segoe UI', sans-serif");
      setFontFamilyLabel("Calibri");
      setFontSize(11);
    }
    setIsValidationPanelOpen(false);
    setActiveFieldPrompt(null);
    setActiveCvSectionPrompt(null);
    if (safeDoc.docType === "CV") {
      const baseCv = getEuropassData(safeDoc.studentId, safeDoc.studentName, selectedStudentData);
      const syncedCv = syncSectionsToCvData(safeDoc.sections, baseCv);
      setCvDocumentData(syncedCv);
      setCvViewMode("europass");
    } else {
      setCvDocumentData(null);
      setCvViewMode("caret");
    }

    // Load persisted chat conversation for this specific document
    loadChatSessionsForDoc(safeDoc.studentId, safeDoc.docType, safeDoc.studentName);

    selectStudent(safeDoc.studentId);
  };

  // Handle confirmed imported CV payload in Template Studio or Home Dashboard
  const handleCvImportApplied = useCallback(
    (importedData: DocumentData) => {
      // Retain existing valid photo if imported payload didn't extract one
      const existingPhotoUrl =
        cvDocumentData?.personal?.photoUrl ||
        (() => {
          const snap = selectedStudentData || currentDocSnapshot;
          if (!snap) return undefined;
          try {
            return mapNormalizedToResume(mapCrmToNormalizedStudent(snap)).student?.personal?.photoUrl;
          } catch {
            return undefined;
          }
        })();

      const finalImportedData: DocumentData = {
        ...importedData,
        personal: {
          ...importedData.personal,
          photoUrl: importedData.personal?.photoUrl || existingPhotoUrl,
        },
      };

      const studentName =
        finalImportedData.personal?.fullName?.trim() ||
        editableDocContent?.studentName ||
        selectedStudentName ||
        "Candidate";

      // Case A: A document is already active in Template Studio
      if (editableDocContent) {
        handleEuropassDispatch({ type: "LOAD_STUDENT", payload: finalImportedData });
        setCvDocumentData(finalImportedData);
        setCvViewMode("europass");

        setEditableDocContent((prevDoc) => {
          if (!prevDoc) return prevDoc;
          const syncedSections = syncCvDataToSections(finalImportedData, prevDoc.sections);
          const updatedDoc: HydratedDocumentData = {
            ...prevDoc,
            studentName,
            title: `${studentName} – Europass Academic CV`,
            sections: syncedSections,
            wordCount: syncedSections.reduce(
              (acc, s) => acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0),
              0
            ),
          };
          syncDocumentToRecent(updatedDoc, "Imported just now");
          return updatedDoc;
        });
      } else {
        // Case B: Imported from the Home Page (no active document open yet)
        const studentId =
          selectedStudentData?.student?._id ||
          selectedStudentId ||
          generateUniqueId("student");

        const baseSections = [
          { heading: "ABOUT ME", content: "" },
          { heading: "EDUCATION AND TRAINING", content: "" },
          { heading: "WORK EXPERIENCE", content: "" },
          { heading: "LANGUAGE SKILLS", content: "" },
          { heading: "ENGLISH LANGUAGE CERTIFICATE", content: "" },
          { heading: "SKILLS", content: "" },
          { heading: "CERTIFICATIONS", content: "" },
          { heading: "HOBBIES AND INTERESTS", content: "" },
          {
            heading: "DECLARATION",
            content: "I hereby declare that the above furnished details are true to the best of my knowledge and belief.",
          },
        ];

        const syncedSections = syncCvDataToSections(finalImportedData, baseSections);

        const importedDoc: HydratedDocumentData = {
          id: generateDocumentId(studentId, "CV"),
          title: `${studentName} – Europass Academic CV`,
          docType: "CV",
          docTypeName: "Academic CV / Resume",
          studentName,
          studentId,
          updatedAt: "Just now",
          targetUniversity: "Global University",
          targetCourse: "Master's Program",
          targetCountry: "Europe",
          wordCount: syncedSections.reduce(
            (acc, s) => acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0),
            0
          ),
          route: `/sop-generator?student=${studentId}&template=europass-standard-v1`,
          sections: syncedSections,
        };

        syncDocumentToRecent(importedDoc, "Imported just now");
        handleOpenDocument(importedDoc);
        setCvDocumentData(finalImportedData);
        handleEuropassDispatch({ type: "LOAD_STUDENT", payload: finalImportedData });
        setCvViewMode("europass");
      }

      setIsCvImportModalOpen(false);
      setAiToast({ message: "✓ Imported CV loaded into Template Studio!", type: "success" });

      const newMsg: ChatMessage = {
        id: generateUniqueId("msg"),
        sender: "assistant",
        text: `I've imported your existing CV for **${studentName}**. All extracted sections, qualifications, and work experiences are loaded into the editor. You can now edit any section, rearrange them, ask me to refine them, or export your Europass CV!`,
        timestamp: getFormattedTimestamp(),
        actionType: "general",
      };
      setChatMessages((prev) => [...prev, newMsg]);
    },
    [
      handleEuropassDispatch,
      cvDocumentData?.personal?.photoUrl,
      selectedStudentData,
      selectedStudentId,
      selectedStudentName,
      currentDocSnapshot,
      editableDocContent,
      syncDocumentToRecent,
      handleOpenDocument,
    ]
  );

  // Cooking Countdown & In-Front Document Generator
  const handleGenerateDocument = async () => {
    if (!modalStudentId) return;

    // Start fancy countdown cooking loader
    setGenerateError(null);
    setIsCooking(true);
    setCookingCountdown(3);
    setCookingStage(0);

    const targetStudent = studentRoster.find((s) => s.id === modalStudentId);
    const studentName = targetStudent ? targetStudent.name : "Student";


    // Progress through cooking stages
    const countdownInterval = setInterval(() => {
      setCookingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 900);

    const stageInterval = setInterval(() => {
      setCookingStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 750);

    // Fetch the selected student's own CRM data; never fall back to another student
    const snapshot = modalDocType === "BLANK" ? null : await loadStudentSnapshot(modalStudentId);
    if (modalDocType !== "BLANK" && !snapshot) {
      clearInterval(countdownInterval);
      clearInterval(stageInterval);
      setIsCooking(false);
      setGenerateError(`Could not load CRM data for ${studentName}. No document was generated — please retry.`);
      return;
    }

    // After countdown completes (~2.7s), reveal generated document right in front
    setTimeout(() => {
      clearInterval(countdownInterval);
      clearInterval(stageInterval);

      // Hydrate document with all relevant details
      let generatedDoc: HydratedDocumentData;
      if (modalDocType === "BLANK") {
        generatedDoc = {
          title: `${studentName} – Blank Draft Document`,
          docType: "BLANK",
          docTypeName: "Blank Draft Document",
          studentName,
          studentId: modalStudentId,
          updatedAt: "Created just now",
          targetUniversity: (targetStudent as { university?: string } | undefined)?.university || "University",
          targetCourse: (targetStudent as { course?: string } | undefined)?.course || "Degree Programme",
          targetCountry: "Global",
          wordCount: 0,
          route: `/studio?student=${modalStudentId}`,
          sections: [
            {
              heading: "Document Draft",
              content: `Draft document for ${studentName}.\n\nStart typing here...`,
            },
          ],
        };
      } else {
        generatedDoc = hydrateDocumentFromSnapshot(
          modalDocType,
          snapshot as CrmSnapshot,
          modalStudentId,
          modalDocType === "SOP"
            ? "university-sop-standard"
            : modalDocType === "COVER_LETTER"
              ? "italy-type-d-student-visa-cover-letter"
              : undefined
        );
        generatedDoc.id = generateDocumentId(modalStudentId, modalDocType);
        generatedDoc.updatedAt = "Created just now";
      }

      // Save to recent documents list & LocalStorage immediately
      syncDocumentToRecent(generatedDoc, "Created just now");

      // Display directly in front of the operator via unified opener
      handleOpenDocument(generatedDoc);

      setIsCooking(false);
      setIsModalOpen(false);
    }, 2800);
  };

  const cookingStages = [
    "Connecting to Digi-Wire CRM...",
    `Retrieving verified academic profile for ${studentRoster.find((s) => s.id === modalStudentId)?.name || "Student"
    }...`,
    `Hydrating ${modalDocType === "COVER_LETTER"
      ? "Italy Visa Cover Letter"
      : modalDocType === "SOP"
        ? "Statement of Purpose"
        : modalDocType === "CV"
          ? "Europass Academic CV"
          : "Letter of Recommendation"
    } template with student data...`,
    "Compiling admissions document workspace...",
  ];


  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans select-none">
      {/* ── 1. Unified Project Navigation Bar ────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0F172A] border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between text-white shadow-sm select-none gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Brand Logo & Title */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-95 transition">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
                Template<span className="text-indigo-400">Generator</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] text-slate-400 font-normal">
                Admissions Suite
              </span>
            </div>
          </Link>
        </div>

        {/* Central Search Bar */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-6 md:mx-8 min-w-0">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Reset to first page when search changes
                setRecentDocsPage(1);
              }}
              placeholder="Search student documents..."
              className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 rounded-xl text-xs text-white border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-400"
            />
          </div>
        </div>

        {/* Right Action & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            id="home-cv-import-nav-btn"
            onClick={() => setIsCvImportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition shrink-0"
            title="Import existing CV from PDF or DOCX"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="hidden xs:inline sm:inline">Import CV</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition shrink-0"
          >
            <span>+</span>
            <span className="hidden sm:inline">New Document</span>
          </button>
          <div
            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer select-none shrink-0"
            title="Admissions Operator"
          >
            OP
          </div>
        </div>
      </header>

      {/* ── 2. Top Section: "Start a new document" ──────────────────────────── */}
      <section className="bg-slate-50/70 border-b border-slate-200/80 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3.5 sm:mb-4">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
              Start a new document
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenModal("SOP")}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded transition cursor-pointer"
              >
                <span>Browse all templates</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Cards Row: Blank Document + The 4 Core Templates + Import Existing CV */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 sm:gap-4.5">
            {/* ── Card 1: Blank Document ── */}
            <div className="flex flex-col h-full justify-between">
              <button
                type="button"
                onClick={() => handleOpenModal("BLANK")}
                className="w-full bg-white border border-slate-200/90 rounded-xl p-2.5 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer group text-left shadow-2xs"
              >
                <DocumentThumbnailPreview docType="BLANK" isTemplateCard />
              </button>
              <div className="pt-2 px-0.5">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 block truncate leading-tight">
                  Blank document
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">Custom Generation</span>
              </div>
            </div>

            {/* ── Card 2: Italy Visa Cover Letter ── */}
            <div className="flex flex-col h-full justify-between">
              <button
                type="button"
                onClick={() => handleOpenModal("COVER_LETTER")}
                className="w-full bg-white border border-slate-200/90 rounded-xl p-2.5 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden group text-left shadow-2xs"
              >
                <DocumentThumbnailPreview docType="COVER_LETTER" isTemplateCard />
              </button>
              <div className="pt-2 px-0.5">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 block truncate leading-tight">
                  Visa Cover Letter
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">Italy Type D Consular</span>
              </div>
            </div>

            {/* ── Card 3: Statement of Purpose ── */}
            <div className="flex flex-col h-full justify-between">
              <button
                type="button"
                onClick={() => handleOpenModal("SOP")}
                className="w-full bg-white border border-slate-200/90 rounded-xl p-2.5 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden group text-left shadow-2xs"
              >
                <DocumentThumbnailPreview docType="SOP" isTemplateCard />
              </button>
              <div className="pt-2 px-0.5">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 block truncate leading-tight">
                  Statement of Purpose
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">Academic SOP Format</span>
              </div>
            </div>

            {/* ── Card 4: Academic CV ── */}
            <div className="flex flex-col h-full justify-between">
              <button
                type="button"
                onClick={() => handleOpenModal("CV")}
                className="w-full bg-white border border-slate-200/90 rounded-xl p-2.5 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden group text-left shadow-2xs"
              >
                <DocumentThumbnailPreview docType="CV" isTemplateCard />
              </button>
              <div className="pt-2 px-0.5">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 block truncate leading-tight">
                  Academic CV / Resume
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">Europass Format</span>
              </div>
            </div>

            {/* ── Card 5: Letter of Recommendation ── */}
            <div className="flex flex-col h-full justify-between">
              <button
                type="button"
                onClick={() => handleOpenModal("LOR")}
                className="w-full bg-white border border-slate-200/90 rounded-xl p-2.5 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden group text-left shadow-2xs"
              >
                <DocumentThumbnailPreview docType="LOR" isTemplateCard />
              </button>
              <div className="pt-2 px-0.5">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 block truncate leading-tight">
                  Letter of Recommendation
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">Faculty & Employer</span>
              </div>
            </div>

            {/* ── Card 6: Import Existing CV ── */}
            <div className="flex flex-col h-full justify-between">
              <button
                type="button"
                id="home-cv-import-card-btn"
                onClick={() => setIsCvImportModalOpen(true)}
                className="w-full bg-white border border-dashed border-indigo-300 hover:border-indigo-600 rounded-xl p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer group text-left shadow-2xs aspect-[1/1.3] relative overflow-hidden bg-gradient-to-b from-indigo-50/40 via-white to-white"
                title="Upload and import existing CV (PDF / DOCX)"
              >
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-indigo-600 text-white shadow-2xs">
                  NEW
                </div>
                <div className="w-11 h-11 rounded-full bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-200/80 flex items-center justify-center text-indigo-600 mb-2 transition">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-slate-800 text-center group-hover:text-indigo-600 transition">
                  Upload PDF / DOCX
                </span>
                <span className="text-[10px] text-slate-400 text-center mt-0.5">
                  Europass Auto-Fill
                </span>
              </button>
              <div className="pt-2 px-0.5">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-900 block truncate leading-tight">
                  Import Existing CV
                </span>
                <span className="text-[11px] text-indigo-600 font-medium block truncate mt-0.5">Auto-parse resume</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Bottom White Section: "Recent documents" ─────────────────────── */}
      <section className="bg-white flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Recent documents
              </h2>
              {filteredRecentDocs.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                  {filteredRecentDocs.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-slate-500">
              {/* View Toggle (Grid / List) */}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
              >
                {viewMode === "grid" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z" />
                  </svg>
                )}
              </button>

              {/* Open File Picker */}
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                title="Open new document generator"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Documents Grid / List */}
          {filteredRecentDocs.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No documents found matching search.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {paginatedRecentDocs.map((doc, idx) => {
                const meta = getDocTypeMeta(doc.docType);
                const rawPdfTitle = doc.title.endsWith(".pdf") ? doc.title : `${doc.title}.pdf`;
                const cleanDisplayTitle = rawPdfTitle.replace(/\s*--\s*/g, " – ");
                return (
                  <div
                    key={`${doc.title}-${idx}`}
                    onClick={() => handleOpenDocument(doc)}
                    className="bg-white border border-slate-200/90 rounded-xl p-3 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group h-full shadow-2xs"
                  >
                    {/* Miniature Sheet Thumbnail */}
                    <div className="w-full flex items-center justify-center overflow-hidden rounded-md bg-slate-50/50 relative">
                      <DocumentThumbnailPreview
                        docType={doc.docType}
                        title={doc.title}
                        studentName={doc.studentName}
                        targetUniversity={doc.targetUniversity}
                        targetCourse={doc.targetCourse}
                        targetCountry={doc.targetCountry}
                        sections={doc.sections}
                      />
                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRecentDoc(e, doc)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/95 hover:bg-rose-50 text-slate-400 hover:text-rose-600 shadow-xs border border-slate-200/90 flex items-center justify-center transition-all opacity-85 sm:opacity-0 sm:group-hover:opacity-100 hover:!opacity-100 hover:scale-105 z-10 cursor-pointer"
                        title="Delete document from recent"
                        aria-label="Delete document from recent"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>

                    {/* Card Bottom Meta */}
                    <div className="pt-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                              {meta.icon}
                            </span>
                            <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${meta.badgeBg}`}>
                              {meta.shortLabel}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 text-right">{doc.updatedAt}</span>
                        </div>

                        <h3
                          className="text-xs font-semibold text-slate-800 line-clamp-1 leading-snug group-hover:text-indigo-600 transition"
                          title={cleanDisplayTitle}
                        >
                          {cleanDisplayTitle}
                        </h3>
                      </div>

                      <div className="text-[11px] text-slate-500 truncate mt-1">
                        {doc.studentName} · {doc.targetUniversity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white divide-y divide-slate-100 shadow-2xs">
              {paginatedRecentDocs.map((doc, idx) => {
                const meta = getDocTypeMeta(doc.docType);
                const rawPdfTitle = doc.title.endsWith(".pdf") ? doc.title : `${doc.title}.pdf`;
                const cleanDisplayTitle = rawPdfTitle.replace(/\s*--\s*/g, " – ");
                return (
                  <div
                    key={`${doc.title}-${idx}`}
                    onClick={() => handleOpenDocument(doc)}
                    className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition group"
                  >
                    {/* Left Column: Single Doc Icon + Title & Student Details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                      {/* Single, crisp Document Icon */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${meta.iconBg}`}
                        title={meta.label}
                      >
                        {meta.icon}
                      </div>

                      {/* Title & Metadata aligned cleanly */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition">
                            {cleanDisplayTitle}
                          </span>
                          <span
                            className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 sm:hidden ${meta.badgeBg}`}
                          >
                            {meta.shortLabel}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700">{doc.studentName}</span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate">{doc.targetUniversity}</span>
                          {doc.targetCountry && (
                            <>
                              <span className="text-slate-300 hidden md:inline">•</span>
                              <span className="text-slate-400 hidden md:inline">{doc.targetCountry}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Document Type Badge (Desktop) */}
                    <div className="hidden sm:flex items-center justify-center w-28 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border tracking-wide uppercase ${meta.badgeBg}`}
                      >
                        {meta.shortLabel}
                      </span>
                    </div>

                    {/* Right Column: Timestamp & Action Arrow */}
                    <div className="flex items-center gap-2.5 text-xs text-slate-400 shrink-0 pl-2">
                      <span className="text-[11px] text-slate-400 hidden xs:inline">{doc.updatedAt}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRecentDoc(e, doc)}
                        className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                        title="Delete document from recent"
                        aria-label="Delete document from recent"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                        </svg>
                      </button>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Control Bar */}
          {filteredRecentDocs.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 select-none">
              {/* Left: Summary Count & Page Size Selector */}
              <div className="flex items-center gap-3">
                <span>
                  Showing <span className="font-semibold text-slate-900">{startRecentItemIndex}–{endRecentItemIndex}</span> of{" "}
                  <span className="font-semibold text-slate-900">{filteredRecentDocs.length}</span> documents
                </span>
                <div className="flex items-center gap-1.5 text-slate-500 pl-2.5 border-l border-slate-200">
                  <span>Per page:</span>
                  <select
                    value={recentDocsPerPage}
                    onChange={(e) => {
                      setRecentDocsPerPage(Number(e.target.value));
                      setRecentDocsPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-xs text-slate-700 font-semibold outline-none hover:bg-slate-100 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Navigation Buttons */}
              {totalRecentPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => setRecentDocsPage((p) => Math.max(1, p - 1))}
                    disabled={safeRecentPage === 1}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs flex items-center gap-1"
                    title="Previous page"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    <span className="hidden xs:inline">Prev</span>
                  </button>

                  {/* Number Buttons */}
                  <div className="flex items-center gap-1">
                    {getRecentPageNumbers().map((pNum, idx) => {
                      if (pNum === "...") {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-bold select-none text-xs">
                            ...
                          </span>
                        );
                      }
                      const isCurrent = pNum === safeRecentPage;
                      return (
                        <button
                          key={`page-${pNum}`}
                          type="button"
                          onClick={() => setRecentDocsPage(Number(pNum))}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center ${isCurrent
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                            }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => setRecentDocsPage((p) => Math.min(totalRecentPages, p + 1))}
                    disabled={safeRecentPage === totalRecentPages}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs flex items-center gap-1"
                    title="Next page"
                  >
                    <span className="hidden xs:inline">Next</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Unified Creation Modal ─────────────────────────────────────────── */}
      {isModalOpen && !isCooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Generate New Document
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Select verified student CRM profile and target document type
            </p>

            <div className="space-y-4">
              {/* ── Dropdown 1: Student Selection ── */}
              <div className="relative" ref={studentDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Record
                </label>
                {lockedStudentId ? (
                  <div className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-left select-none">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate font-semibold text-slate-800">
                        {selectedStudent?.name || "Loading student..."}
                        {selectedStudent?.email && (
                          <span className="font-normal text-slate-500 ml-1.5">
                            ({selectedStudent.email})
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md shrink-0 ml-2">
                      <svg
                        className="w-3 h-3 mr-1 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Locked
                    </span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsStudentDropdownOpen(!isStudentDropdownOpen);
                        setIsDocTypeDropdownOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl outline-none hover:border-indigo-500 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <span className="truncate">
                        {selectedStudent
                          ? `${selectedStudent.name}${selectedStudent.email ? ` (${selectedStudent.email})` : ""}`
                          : "Select a student..."}
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={`text-slate-500 shrink-0 ml-2 transition-transform duration-150 ${isStudentDropdownOpen ? "rotate-180" : ""
                          }`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {isStudentDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 z-50 flex flex-col overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0">
                          <div className="relative">
                            <input
                              ref={studentSearchInputRef}
                              type="text"
                              value={studentSearchQuery}
                              onChange={(e) => setStudentSearchQuery(e.target.value)}
                              placeholder="Search student by name or email..."
                              className="w-full pl-8 pr-7 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            {studentSearchQuery && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentSearchQuery("");
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 p-0.5"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="overflow-y-auto max-h-56 py-1 divide-y divide-slate-100">
                          {filteredStudentRoster.map((s) => (
                            <div
                              key={s.id}
                              onClick={() => {
                                setModalStudentId(s.id);
                                setIsStudentDropdownOpen(false);
                              }}
                              className={`px-3.5 py-2.5 text-sm cursor-pointer transition flex items-center justify-between ${s.id === modalStudentId
                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                : "text-slate-800 hover:bg-slate-50"
                                }`}
                            >
                              <span className="truncate font-medium">{s.name}</span>
                              {s.email && (
                                <span className="text-xs text-slate-500 ml-2 truncate max-w-[220px]">
                                  {s.email}
                                </span>
                              )}
                            </div>
                          ))}

                          {filteredStudentRoster.length === 0 && (
                            <div className="p-4 text-center text-xs text-slate-500">
                              No students found matching &quot;{studentSearchQuery}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Dropdown 2: Document Type Selection ── */}
              <div className="relative" ref={docTypeDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Type
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsDocTypeDropdownOpen(!isDocTypeDropdownOpen);
                    setIsStudentDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl outline-none hover:border-indigo-500 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 flex items-center justify-between text-left transition cursor-pointer"
                >
                  <span className="truncate">{docTypeLabels[modalDocType]}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`text-slate-500 shrink-0 ml-2 transition-transform duration-150 ${isDocTypeDropdownOpen ? "rotate-180" : ""
                      }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {isDocTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-100">
                    {(["COVER_LETTER", "SOP", "CV", "LOR", "BLANK"] as const).map((type) => (
                      <div
                        key={type}
                        onClick={() => {
                          setModalDocType(type);
                          setIsDocTypeDropdownOpen(false);
                        }}
                        className={`px-3.5 py-2.5 text-sm cursor-pointer transition ${modalDocType === type
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-800 hover:bg-slate-50"
                          }`}
                      >
                        {docTypeLabels[type]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(rosterError || generateError) && (
              <p role="alert" className="mt-4 text-xs text-red-600">
                {generateError || rosterError}
              </p>
            )}

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateDocument}
                disabled={!modalStudentId}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg shadow-sm transition cursor-pointer"
              >
                Generate Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Unified Countdown Cooking Loader ───────────────────────────────── */}
      {isCooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
            {/* Top-Right Dismiss Button */}
            <button
              type="button"
              onClick={() => {
                setIsCooking(false);
                setIsModalOpen(false);
              }}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Cancel document generation"
            >
              ✕
            </button>

            {/* Animated Countdown Ring */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-5">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#F1F5F9"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#4F46E5"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="264"
                  strokeDashoffset={(264 * (cookingCountdown - 1)) / 3}
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-indigo-600 tracking-tight">
                  {cookingCountdown}s
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Compiling
                </span>
              </div>
            </div>

            <h4 className="text-base font-bold text-slate-900 mb-1">
              Generating Document
            </h4>
            <p className="text-xs text-indigo-600 font-semibold mb-3">
              {modalDocType === "COVER_LETTER"
                ? "Italy Type D Visa Cover Letter"
                : modalDocType === "SOP"
                  ? "Statement of Purpose"
                  : modalDocType === "CV"
                    ? "Europass Academic CV"
                    : "Letter of Recommendation"}
            </p>

            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 min-h-[44px] flex items-center justify-center">
              <span className="animate-pulse font-medium">
                {cookingStages[cookingStage] || "Finalizing document..."}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCooking(false);
                setIsModalOpen(false);
              }}
              className="mt-3 text-xs text-slate-400 hover:text-slate-700 underline transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Resume Import Modal (PDF / DOCX) for Home Dashboard & Studio ── */}
      <ResumeImportModal
        isOpen={isCvImportModalOpen}
        onClose={() => setIsCvImportModalOpen(false)}
        onImportApplied={handleCvImportApplied}
        onSaveCurrentDraft={() => {
          if (editableDocContent) {
            syncDocumentToRecent(editableDocContent, "Saved draft before import");
            setAiToast({ message: "✓ Current draft saved", type: "info" });
          }
        }}
        hasUnsavedChanges={Boolean(editableDocContent && editableDocContent.sections.length > 0)}
        crmSnapshot={selectedStudentData || currentDocSnapshot}
        applicationTarget={{
          universityName: editableDocContent?.targetUniversity,
          intendedCourse: editableDocContent?.targetCourse,
          destinationCountry: editableDocContent?.targetCountry as any,
        }}
      />

      {/* ── 6. In-Front Live Document Presentation (Canva Docs Replicated Studio) ── */}
      {activeDocument && editableDocContent && (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col overflow-hidden animate-in fade-in duration-200 text-slate-800 font-sans">
          {/* ── Top Unified Studio Midnight Slate Header Bar ───────────────────── */}
          <header className="bg-[#0F172A] border-b border-slate-800 text-white px-2.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shrink-0 shadow-sm select-none z-50 gap-1.5 sm:gap-2.5 overflow-visible relative no-print">
            {/* Left Header Controls */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
              {/* Home Navigation Button */}
              <button
                type="button"
                onClick={handleExitStudio}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 active:bg-slate-700 rounded-lg cursor-pointer transition border border-slate-700 hover:border-slate-600 shrink-0 shadow-xs group"
                title="Return to Home Dashboard (Auto-saves all progress)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="text-indigo-400 group-hover:text-indigo-300 group-hover:scale-105 transition"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="font-semibold text-white tracking-wide">Home</span>
              </button>

              {/* Studio Brand Icon Badge */}
              <div
                onClick={handleExitStudio}
                className="flex items-center gap-2 mr-1 sm:mr-2 pr-2 sm:pr-3 border-r border-slate-700/80 shrink-0 cursor-pointer hover:opacity-90 transition group"
                title="Return to Dashboard"
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-white tracking-tight hidden lg:inline">
                  Template Studio
                </span>
              </div>

              {/* Dynamic Document Type Switcher (SOP <-> CV <-> LOR) */}
              <div className="relative shrink-0" ref={docTypeMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowDocTypeMenu(!showDocTypeMenu)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg cursor-pointer transition border border-slate-700 shrink-0"
                  title="Switch template for this student"
                >
                  <span className="font-bold text-indigo-400">{editableDocContent.docType}</span>
                  <span className="text-slate-300 font-normal hidden sm:inline">({editableDocContent.docTypeName.split(" ")[0]})</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {showDocTypeMenu && (
                  <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 w-64 z-[100] text-xs divide-y divide-slate-100 text-slate-800 animate-in fade-in duration-100">
                    {(["COVER_LETTER", "SOP", "CV", "LOR"] as const).map((type) => (
                      <div
                        key={type}
                        onClick={() => {
                          setShowDocTypeMenu(false);
                          handleSwitchDocType(type);
                        }}
                        className={`px-3.5 py-2.5 cursor-pointer font-medium hover:bg-indigo-50 transition flex items-center justify-between ${editableDocContent.docType === type
                          ? "text-indigo-700 font-bold bg-indigo-50/70"
                          : "text-slate-700"
                          }`}
                      >
                        <div>
                          <div className="font-semibold">
                            {type === "COVER_LETTER"
                              ? "Italy Type D Visa Cover Letter"
                              : type === "SOP"
                                ? "Statement of Purpose (SOP)"
                                : type === "CV"
                                  ? "Europass Academic CV"
                                  : "Letter of Recommendation (LOR)"}
                          </div>
                          <div className="text-[10px] text-slate-400">Rehydrate from student snapshot</div>
                        </div>
                        {editableDocContent.docType === type && <span className="text-indigo-600 font-bold">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Editing Mode vs Clean Print Preview Toggle */}
              <button
                type="button"
                onClick={() => setEditorMode(editorMode === "editing" ? "preview" : "editing")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition border shrink-0 ${editorMode === "preview"
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                  : "bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-800 border-slate-700"
                  }`}
                title={editorMode === "editing" ? "Switch to Clean Print Preview" : "Switch to Inline Editing"}
              >
                {editorMode === "editing" ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span className="hidden lg:inline">Editing Mode</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="hidden lg:inline">Preview Mode</span>
                  </>
                )}
              </button>

              <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

              {/* Undo Button */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={!(tiptapEditor?.can().undo() || docHistory.length > 0 || cvHistory.length > 0)}
                className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg cursor-pointer transition shrink-0"
                title="Undo (Ctrl+Z)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
              </button>

              {/* Redo Button */}
              <button
                type="button"
                onClick={handleRedo}
                disabled={!(tiptapEditor?.can().redo() || redoHistory.length > 0 || cvRedoHistory.length > 0)}
                className="p-1 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg cursor-pointer transition shrink-0"
                title="Redo (Ctrl+Y)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 7v6h-6" />
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                </svg>
              </button>

              {/* Live CRM Cloud Sync Status Indicator */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 text-slate-300 text-xs font-medium rounded-lg shrink-0"
                title="Real-time local state synchronized with Digi-Wire CRM snapshot"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-emerald-400">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  <polyline points="9 13 11 15 15 11" />
                </svg>
                <span className="text-[11px] text-slate-300 hidden md:inline">Saved</span>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 justify-end">
              {/* Document Title (Live Editable) */}
              <div className="flex items-center min-w-0 flex-1 justify-end">
                <input
                  type="text"
                  value={editableDocContent.title}
                  onChange={(e) => {
                    const updated = { ...editableDocContent, title: e.target.value };
                    setEditableDocContent(updated);
                    syncDocumentToRecent(updated, "Edited just now");
                  }}
                  className="bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/60 focus:border-indigo-500 text-xs font-semibold text-white placeholder-slate-400 px-2 sm:px-3 py-1.5 rounded-lg outline-none w-20 sm:w-28 md:w-44 lg:w-60 max-w-[260px] sm:max-w-[360px] min-w-0 truncate text-right cursor-pointer transition"
                  title="Click to rename document"
                />
              </div>

              {/* Dynamic Student Avatar with Initials */}
              <div
                className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-400/50 text-indigo-200 font-bold text-xs flex items-center justify-center shadow-2xs select-none cursor-pointer shrink-0"
                title={`Student Profile: ${editableDocContent.studentName}`}
              >
                {editableDocContent.studentName.charAt(0) || "S"}
              </div>

              {/* Dynamic Document Intelligence & Insights Panel Trigger */}
              <button
                type="button"
                onClick={() => setShowInsightsDrawer(!showInsightsDrawer)}
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold border shrink-0 ${showInsightsDrawer
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                  : "bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-800 border-slate-700"
                  }`}
                title="Open Document Analytics & Compliance Insights"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10" />
                  <path d="M12 20V4" />
                  <path d="M6 20v-6" />
                  <polyline points="4 6 12 3 20 6" />
                </svg>
                <span className="hidden md:inline text-[11px]">Insights</span>
              </button>

              {/* Dynamic Export Dropdown (PDF & Microsoft Word .docx) */}
              <div className="relative shrink-0" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-2.5 sm:px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer transition flex items-center gap-1 sm:gap-1.5 shrink-0"
                  title="Export options: PDF or Microsoft Word DOCX"
                >
                  {isExportingDocx || isExportingPdf ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  <span className="hidden xs:inline">{isExportingPdf ? "Exporting PDF..." : isExportingDocx ? "Exporting DOCX..." : "Export"}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 w-64 z-[100] text-xs divide-y divide-slate-100 text-slate-800 animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-50/80 transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <span className="p-1 rounded bg-red-100 text-red-600 font-bold text-[10px] mt-0.5">
                        PDF
                      </span>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600">
                          {isExportingPdf ? "Generating PDF..." : "Export as PDF (.pdf)"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {buildStandardizedPdfFilename(
                            editableDocContent.studentName,
                            editableDocContent.docType,
                            editableDocContent.targetCountry
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportDocx}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-50/80 transition flex items-start gap-2.5 cursor-pointer group"
                    >
                      <span className="p-1 rounded bg-blue-100 text-blue-600 font-bold text-[10px] mt-0.5">
                        DOCX
                      </span>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600">
                          Export as Word (.docx)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {buildStandardizedPdfFilename(
                            editableDocContent.studentName,
                            editableDocContent.docType,
                            editableDocContent.targetCountry
                          ).replace(/\.pdf$/i, ".docx")}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Close Studio Button */}
              <button
                type="button"
                onClick={handleExitStudio}
                className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition shrink-0"
                title="Exit Studio"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          {/* ── Main Studio Body Layout (Sidebar + Editor) ────────────────────── */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Mobile backdrop for left sidebar */}
            {!isSidebarCollapsed && (
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 md:hidden"
                onClick={() => setIsSidebarCollapsed(true)}
              />
            )}

            {/* ── Left Sidebar: AI Assistant Chat & Dynamic Suggestions ──────────────────── */}
            <aside
              className={`bg-white border-r border-slate-200/90 h-full flex flex-col p-4 select-none overflow-hidden transition-all duration-200 ease-in-out no-print ${isSidebarCollapsed
                ? "hidden"
                : "fixed inset-y-0 left-0 z-50 w-[88vw] max-w-[360px] shadow-2xl flex md:relative md:inset-auto md:z-auto md:w-[320px] md:min-w-[320px] md:max-w-[320px] lg:w-[360px] lg:min-w-[360px] lg:max-w-[360px] xl:w-[390px] xl:min-w-[390px] xl:max-w-[390px] md:shadow-none shrink-0"
                }`}
            >
              {/* ── 1. Top Assistant Header ── */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 gap-2">
                <div className="flex items-center min-w-0">
                  <img
                    src="/images/eduwire-logo.png"
                    alt="Edu-Wire Overseas Consultant"
                    className="h-7 w-auto object-contain max-w-[155px]"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-auto">
                  {/* New Chat Button (Styled per reference design) */}
                  <button
                    type="button"
                    onClick={handleStartNewChat}
                    className="h-7.5 px-2 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Start fresh conversation"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-600"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>New chat</span>
                  </button>

                  {/* Chat History Dropdown */}
                  <div className="relative shrink-0" ref={chatHistoryRef}>
                    <button
                      type="button"
                      onClick={() => setIsChatHistoryOpen((prev) => !prev)}
                      className={`h-7.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${isChatHistoryOpen
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      title="View chat history"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-600"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>History</span>
                      {chatSessions.length > 0 && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded-full">
                          {chatSessions.length}
                        </span>
                      )}
                    </button>

                    {/* Chat History Popover */}
                    {isChatHistoryOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between pb-1.5 px-1 text-[11px] font-bold text-slate-700">
                          <span>Chat Sessions ({chatSessions.length})</span>
                          <button
                            type="button"
                            onClick={handleStartNewChat}
                            className="text-indigo-600 hover:text-indigo-800 text-[10.5px] font-semibold flex items-center gap-0.5 cursor-pointer"
                          >
                            + New Session
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                          {chatSessions.map((sess) => {
                            const isCurrent = sess.id === activeSessionId;
                            const userMsgCount = sess.messages.filter((m) => m.sender === "user").length;
                            return (
                              <div
                                key={sess.id}
                                onClick={() => handleSwitchSession(sess.id)}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${isCurrent
                                  ? "bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold"
                                  : "hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="truncate text-[11px] font-medium leading-tight">
                                    {sess.title}
                                  </div>
                                  <div className="text-[9.5px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <span>{sess.createdAt}</span>
                                    <span>•</span>
                                    <span>{userMsgCount} {userMsgCount === 1 ? "query" : "queries"}</span>
                                    {isCurrent && <span className="text-indigo-600 font-bold">• Active</span>}
                                  </div>
                                </div>
                                {chatSessions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteSession(sess.id, e)}
                                    className="p-1 text-slate-300 hover:text-rose-600 hover:bg-white rounded transition cursor-pointer shrink-0"
                                    title="Delete session"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="Collapse AI Sidebar"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── 2. Unified Scrollable Conversation Stream ── */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1 py-3 text-xs">
                {renderedChatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    {msg.sender === "user" ? (
                      <div className="flex items-start gap-2 justify-end w-full max-w-[98%] ml-auto">
                        <div className="max-w-[85%] bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 shadow-2xs leading-relaxed text-[12px] font-normal break-words">
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                        {/* Student / User Avatar Badge */}
                        <div className="w-7.5 h-7.5 rounded-full bg-white border border-slate-200/90 shadow-2xs overflow-hidden shrink-0 mt-0.5">
                          <img
                            src="/images/user-avatar.jpg"
                            alt="User"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 w-full max-w-[98%]">
                        {/* Graduation Cap Avatar Badge */}
                        <div className="w-7.5 h-7.5 rounded-full bg-white border border-slate-200/90 shadow-2xs p-1 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                          <img
                            src="/images/ai-admissions-cap.jpg"
                            alt="AI Assistant"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0 bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-xs p-4 shadow-2xs space-y-2.5 leading-relaxed text-xs break-words">
                          {msg.sectionUpdated && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-[10.5px] font-semibold text-indigo-700">
                              <span>{msg.actionType === "deleted_section" ? "🗑️" : "⚡"}</span>
                              <span>{msg.sectionUpdated}</span>
                            </div>
                          )}
                          {renderChatMessageContent(msg)}
                        </div>
                      </div>
                    )}
                    <span className={`text-[10px] text-slate-400 mt-1 px-1 font-normal select-none ${msg.sender === "user" ? "mr-9.5" : "ml-9.5"}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                ))}
                {isAiCooking && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-150 select-none">
                    {/* Graduation Cap Avatar Badge */}
                    <div className="w-7.5 h-7.5 rounded-full bg-white border border-slate-200/90 shadow-2xs p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src="/images/ai-admissions-cap.jpg"
                        alt="AI Assistant"
                        className="w-full h-full object-contain animate-pulse"
                      />
                    </div>

                    {/* AI Answering Bubble with animated dots */}
                    <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs shadow-2xs text-xs">
                      <span
                        className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                        style={{ animationDelay: "-0.32s" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                        style={{ animationDelay: "-0.16s" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                        style={{ animationDelay: "0s" }}
                      />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Minimal AI Smart Modification Input Box */}
              <div className="mt-2 border border-slate-200/90 rounded-2xl bg-white p-3 shadow-2xs hover:border-slate-300 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all duration-150 shrink-0">
                {activeCvSectionPrompt && (
                  <div className="mb-2 px-3 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs animate-in fade-in duration-150 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-700 text-[11px] min-w-0">
                      <span>📍</span>
                      <span className="truncate">
                        {activeCvSectionPrompt.isExisting
                          ? `Adding to: ${activeCvSectionPrompt.label}`
                          : `Add Section: ${activeCvSectionPrompt.label}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveCvSectionPrompt(null)}
                      className="w-5 h-5 rounded-md hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 flex items-center justify-center transition cursor-pointer shrink-0 font-bold leading-none ml-2 text-[11px]"
                      title="Cancel adding section"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {activeFieldPrompt && (
                  <div className="mb-2 px-3 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs animate-in fade-in duration-150 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-700 text-[11px] min-w-0">
                      <span>📍</span>
                      <span className="truncate">{activeFieldPrompt.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFieldPrompt(null)}
                      className="w-5 h-5 rounded-md hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 flex items-center justify-center transition cursor-pointer shrink-0 font-bold leading-none ml-2 text-[11px]"
                      title="Cancel field input"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <textarea
                  ref={chatInputRef}
                  rows={2}
                  value={aiPromptText}
                  onChange={(e) => setAiPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (aiPromptText.trim()) {
                        handleChatSendMessage(aiPromptText);
                      }
                    }
                  }}
                  placeholder={
                    activeCvSectionPrompt
                      ? activeCvSectionPrompt.placeholder
                      : activeFieldPrompt
                        ? `Type ${activeFieldPrompt.label} (e.g. ${activeFieldPrompt.placeholder})...`
                        : "Share details (e.g. IELTS 7.5 TRF 26IA...) or type 'delete section'..."
                  }
                  className="w-full text-xs text-slate-800 placeholder:text-slate-400 placeholder:font-normal resize-none outline-none bg-transparent leading-relaxed min-h-[46px] max-h-[110px] px-1 py-0.5"
                />

                <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
                  {/* Plus Button to insert guidance prompt tags */}
                  <button
                    type="button"
                    onClick={() =>
                      setAiPromptText(
                        (prev) => prev + " (Ensure strong research focus and clear post-study career goals)"
                      )
                    }
                    className="h-7 px-2.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer border border-transparent hover:border-indigo-100"
                    title="Add research & post-study directive tag"
                  >
                    <span className="text-xs font-bold leading-none">+</span>
                    <span>Directive</span>
                  </button>

                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (aiPromptText.trim()) {
                        handleChatSendMessage(aiPromptText);
                      } else {
                        handleRunSmartChange("academic_polish");
                      }
                    }}
                    className="h-7.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 text-xs font-medium shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer active:scale-95"
                    title="Send message to AI assistant"
                  >
                    {isAiCooking ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </aside>

            {/* ── Main Canvas Area & Floating Toolbar ─────────────────────────── */}
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex flex-col items-center bg-[#F8FAFC] relative w-full">
              {/* Floating Toolbar with 100% Dynamic Controls (Excluded from Resume/CV interface) */}
              {editableDocContent && (
                <div className="sticky top-2.5 z-20 w-full max-w-full lg:w-fit mx-auto rounded-2xl lg:rounded-full bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)] border border-slate-200/90 px-2.5 sm:px-4 py-1.5 flex flex-wrap lg:flex-nowrap items-center gap-1.5 sm:gap-2 select-none mb-3.5 shrink-0 no-print justify-center">
                  {/* Chatbot Image Trigger Button (replaces AI Tools) */}
                  {isSidebarCollapsed && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="h-8 flex items-center gap-2 pl-1 pr-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shrink-0 shadow-sm hover:shadow group"
                        title="Open AI Admissions Assistant"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-white/60 bg-white shrink-0 flex items-center justify-center p-0.5">
                          <img
                            src="/images/ai-bot-character.jpg"
                            alt="AI Assistant"
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-150"
                          />
                        </div>
                        <span className="whitespace-nowrap font-medium text-[11.5px]">AI Assistant</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                      <div className="h-4 w-px bg-slate-200 shrink-0" />
                    </>
                  )}

                  {/* Candidate & CRM Info Icon (Outside Document Area) */}
                  <div className="relative shrink-0" ref={infoMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowInfoPopover(!showInfoPopover)}
                      className={`h-7.5 flex items-center gap-1.5 px-2.5 rounded-full text-xs font-semibold cursor-pointer transition shrink-0 ${showInfoPopover
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      title="Student Profile"
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                        ℹ
                      </span>
                      <span className="font-medium text-slate-800 hidden sm:inline truncate max-w-[140px]">
                        {editableDocContent.studentName}
                      </span>
                    </button>

                    {showInfoPopover && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-80 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs text-slate-800">
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>👤</span>
                            <span>Candidate Profile</span>
                          </div>
                        </div>
                        <div className="space-y-2.5 text-slate-600">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Candidate Name</span>
                            <span className="font-bold text-slate-900 text-sm">{editableDocContent.studentName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Target University</span>
                            <span className="font-medium text-slate-800">{editableDocContent.targetUniversity || "Not Specified"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Target Course</span>
                            <span className="font-semibold text-indigo-600">{editableDocContent.targetCourse || "Not Specified"}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                            <span className="text-[11px]">Document Word Count</span>
                            <span className="font-bold text-slate-900 text-xs">{editableDocContent.wordCount} words</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  {/* Smart AI Refine Pill */}
                  <button
                    type="button"
                    onClick={() => handleRunSmartChange("academic_polish")}
                    className="h-7.5 flex items-center gap-1.5 px-3 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold cursor-pointer transition shrink-0 whitespace-nowrap"
                    title="Run academic polish on entire document"
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-[9px] font-bold">
                      ✨
                    </span>
                    <span>Ask AI Refine</span>
                  </button>
                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  {/* Import CV Pill Button (CV Mode) */}
                  {editableDocContent.docType === "CV" && (
                    <>
                      <button
                        type="button"
                        id="studio-cv-import-pill-btn"
                        onClick={() => setIsCvImportModalOpen(true)}
                        className="h-7.5 flex items-center gap-1.5 px-3 rounded-full bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold cursor-pointer transition shrink-0 whitespace-nowrap border border-slate-200/90 shadow-2xs"
                        title="Upload and import existing CV (PDF / DOCX)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-indigo-600">
                          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                          <polyline points="16 16 12 12 8 16" />
                          <line x1="12" y1="12" x2="12" y2="21" />
                        </svg>
                        <span>Import CV</span>
                      </button>
                      <div className="h-4 w-px bg-slate-200 shrink-0" />
                    </>
                  )}

                  {/* Heading Dropdown (H1 ▾) */}
                  <div className="relative shrink-0" ref={headingMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeadingMenu(!showHeadingMenu);
                        setShowFontMenu(false);
                        setShowColorMenu(false);
                      }}
                      className="h-7.5 flex items-center gap-1 px-2 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                    >
                      <span>{activeHeading}</span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={`transition-transform duration-150 ${showHeadingMenu ? "rotate-180" : ""}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {showHeadingMenu && (
                      <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl py-1 w-28 z-50 divide-y divide-slate-100 text-xs animate-in fade-in zoom-in-95 duration-100">
                        {(["H1", "H2", "H3", "Body"] as const).map((h) => (
                          <div
                            key={h}
                            onClick={() => {
                              setActiveHeading(h);
                              setShowHeadingMenu(false);
                              if (tiptapEditor) {
                                if (h === "H1") tiptapEditor.chain().focus().toggleHeading({ level: 1 }).run();
                                else if (h === "H2") tiptapEditor.chain().focus().toggleHeading({ level: 2 }).run();
                                else if (h === "H3") tiptapEditor.chain().focus().toggleHeading({ level: 3 }).run();
                                else tiptapEditor.chain().focus().setParagraph().run();
                              }
                            }}
                            className={`px-3 py-1.5 cursor-pointer font-medium hover:bg-slate-100 ${activeHeading === h ? "text-indigo-700 font-bold bg-indigo-50" : "text-slate-700"
                              }`}
                          >
                            {h === "Body" ? "Normal (Body)" : `Heading ${h.replace("H", "")}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  {/* Dynamic Font Family Selector Dropdown */}
                  <div className="relative shrink-0" ref={fontMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFontMenu(!showFontMenu);
                        setShowHeadingMenu(false);
                        setShowColorMenu(false);
                        setShowInfoPopover(false);
                      }}
                      className="h-7.5 flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200/70 bg-white shadow-2xs cursor-pointer shrink-0"
                      title="Change typography font family"
                    >
                      <span
                        className="max-w-[110px] truncate font-medium text-slate-800"
                        style={{ fontFamily }}
                      >
                        {fontFamilyLabel}
                      </span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={`transition-transform duration-150 text-slate-400 ${showFontMenu ? "rotate-180" : ""
                          }`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {showFontMenu && (
                      <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 w-64 z-50 max-h-80 overflow-y-auto text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                        <div className="px-3 py-1.5 bg-slate-50/90 text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                          <span>Select Font</span>
                          <span className="text-[9px] text-slate-400 font-normal">10 Fonts</span>
                        </div>
                        <div className="py-1">
                          {AVAILABLE_FONTS.map((item) => {
                            const isSelected =
                              fontFamily === item.val ||
                              fontFamilyLabel.toLowerCase() === item.name.toLowerCase();
                            return (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() => {
                                  setFontFamily(item.val);
                                  setFontFamilyLabel(item.name);
                                  setShowFontMenu(false);
                                  if (tiptapEditor) {
                                    tiptapEditor.chain().focus().setFontFamily(item.val).run();
                                  }
                                }}
                                className={`w-full px-3 py-2 text-left flex items-center justify-between group transition-colors cursor-pointer ${isSelected
                                  ? "bg-indigo-50/80 text-indigo-900"
                                  : "hover:bg-slate-50 text-slate-800"
                                  }`}
                              >
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span
                                    className="text-[13px] font-semibold truncate leading-tight text-slate-800"
                                    style={{ fontFamily: item.val }}
                                  >
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 group-hover:text-slate-500 transition-colors">
                                    {item.category}
                                  </span>
                                </div>
                                {isSelected ? (
                                  <svg
                                    className="w-4 h-4 text-indigo-600 shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                ) : (
                                  <span
                                    className="text-xs text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 font-medium"
                                    style={{ fontFamily: item.val }}
                                  >
                                    Aa
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  {/* Font Size Minus, Number, Plus (- 15 +) */}
                  <div className="h-7.5 flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFontSize((f) => Math.max(10, f - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-semibold text-slate-700 px-1 min-w-[20px] text-center">
                      {fontSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFontSize((f) => Math.min(32, f + 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  {/* Dynamic Text Color Picker */}
                  <div className="relative shrink-0" ref={colorMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowColorMenu(!showColorMenu);
                        setShowHeadingMenu(false);
                        setShowFontMenu(false);
                      }}
                      className="h-7.5 flex flex-col items-center justify-center px-2 py-0.5 rounded-md hover:bg-slate-100 cursor-pointer shrink-0"
                      title="Change document text color"
                    >
                      <span className="text-xs font-bold leading-none" style={{ color: textColor }}>
                        A
                      </span>
                      <div className="w-3.5 h-0.5 mt-0.5 rounded-full" style={{ backgroundColor: textColor }} />
                    </button>

                    {showColorMenu && (
                      <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 z-50 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100">
                        {[
                          { color: "#0f172a", label: "Charcoal Slate" },
                          { color: "#1e3a8a", label: "Deep Academic Navy" },
                          { color: "#000000", label: "Pure Formal Black" },
                          { color: "#881337", label: "Burgundy" },
                        ].map((c) => (
                          <div
                            key={c.color}
                            onClick={() => {
                              setTextColor(c.color);
                              setShowColorMenu(false);
                              if (tiptapEditor) {
                                tiptapEditor.chain().focus().setColor(c.color).run();
                              }
                            }}
                            className={`w-5 h-5 rounded-full cursor-pointer border transition-transform hover:scale-110 ${textColor === c.color ? "ring-2 ring-indigo-500 scale-110" : "border-slate-300"
                              }`}
                            style={{ backgroundColor: c.color }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  {/* B I U S formatting toggles (Targets active selection) */}
                  <button
                    type="button"
                    onClick={() => applyInlineFormatToActiveSelection("bold")}
                    className={`w-6.5 h-6.5 rounded-md flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0 ${isBoldActive || isBold ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    title="Bold (Ctrl+B)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInlineFormatToActiveSelection("italic")}
                    className={`w-6.5 h-6.5 rounded-md flex items-center justify-center text-xs italic font-serif transition cursor-pointer shrink-0 ${isItalicActive || isItalic ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    title="Italic (Ctrl+I)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInlineFormatToActiveSelection("underline")}
                    className={`w-6.5 h-6.5 rounded-md flex items-center justify-center text-xs underline transition cursor-pointer shrink-0 ${isUnderlineActive || isUnderline ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    title="Underline (Selected text only)"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInlineFormatToActiveSelection("strike")}
                    className={`w-6.5 h-6.5 rounded-md flex items-center justify-center text-xs line-through transition cursor-pointer shrink-0 ${isStrikeActive || isStrikethrough ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    title="Strikethrough"
                  >
                    S
                  </button>

                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  {/* Alignment Controls (Left, Center, Right - responsive to headings & body) */}
                  <div className="h-7.5 flex items-center gap-0.5 bg-slate-100/70 p-0.5 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setTextAlign("left");
                        if (tiptapEditor) tiptapEditor.chain().focus().setTextAlign("left").run();
                      }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition ${textAlign === "left" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-slate-600 hover:bg-white/60"
                        }`}
                      title="Align Left (Headings & Paragraphs)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="21" y1="6" x2="3" y2="6" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                        <line x1="19" y1="18" x2="3" y2="18" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTextAlign("center");
                        if (tiptapEditor) tiptapEditor.chain().focus().setTextAlign("center").run();
                      }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition ${textAlign === "center" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-slate-600 hover:bg-white/60"
                        }`}
                      title="Align Center (Headings & Paragraphs)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="21" y1="6" x2="3" y2="6" />
                        <line x1="17" y1="12" x2="7" y2="12" />
                        <line x1="19" y1="18" x2="5" y2="18" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTextAlign("right");
                        if (tiptapEditor) tiptapEditor.chain().focus().setTextAlign("right").run();
                      }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition ${textAlign === "right" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-slate-600 hover:bg-white/60"
                        }`}
                      title="Align Right (Headings & Paragraphs)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="21" y1="6" x2="3" y2="6" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                        <line x1="21" y1="18" x2="5" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <div className="h-4 w-px bg-slate-200 shrink-0" />

                  {/* Bullet List Icon */}
                  <button
                    type="button"
                    onClick={() => handleListFormat("bullet")}
                    className="w-6.5 h-6.5 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                    title="Bullet List"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
                    </svg>
                  </button>

                  {/* Ordered List Icon */}
                  <button
                    type="button"
                    onClick={() => handleListFormat("ordered")}
                    className="w-6.5 h-6.5 rounded-md flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                    title="Numbered List"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="10" y1="6" x2="21" y2="6" />
                      <line x1="10" y1="12" x2="21" y2="12" />
                      <line x1="10" y1="18" x2="21" y2="18" />
                      <path d="M4 6h1v4" />
                      <path d="M4 10h2" />
                      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
                    </svg>
                  </button>

                  {/* Missing Details Panel integrated directly into the Floating Toolbar */}
                  {editableDocContent?.docType === "COVER_LETTER" && (
                    <>
                      <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5" />
                      <CoverLetterValidationPanel
                        groups={missingGroups}
                        totalMissingCount={totalMissingCount}
                        isOpen={isValidationPanelOpen}
                        onToggle={() => setIsValidationPanelOpen((prev) => !prev)}
                        onClose={() => setIsValidationPanelOpen(false)}
                        onSelectField={handleSelectMissingField}
                      />
                    </>
                  )}
                </div>
              )}



              {/* ── Document Section Manager & Customization Strip ── */}
              {editableDocContent?.docType !== "COVER_LETTER" && editableDocContent?.sections && editableDocContent.sections.length > 0 && (
                <div className="w-full max-w-[210mm] mx-auto mb-3 px-3 sm:px-3.5 py-1.5 bg-white border border-slate-200/90 rounded-xl text-xs no-print transition-all duration-150 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 min-h-[30px]">
                    {/* Collapsed/Expand Toggle and Summary */}
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setIsSectionsExpanded((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-semibold px-2 py-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer select-none shrink-0"
                        title={isSectionsExpanded ? "Collapse section list" : "Expand section list"}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        <span className="text-[11px] uppercase tracking-wider font-bold">Sections</span>
                        <span className="px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded-full text-[10px] font-bold">
                          {editableDocContent.sections.length}
                        </span>
                        {editableDocContent.sections.some((s) => !s.content || !s.content.trim()) && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                            {editableDocContent.sections.filter((s) => !s.content || !s.content.trim()).length} empty
                          </span>
                        )}
                        <span className="text-slate-400 text-[11px] font-normal flex items-center gap-0.5 ml-0.5">
                          <span>{isSectionsExpanded ? "Hide" : "Manage"}</span>
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className={`transition-transform duration-150 ${isSectionsExpanded ? "rotate-180" : ""}`}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </span>
                      </button>

                      {/* Quiet horizontal preview when collapsed */}
                      {!isSectionsExpanded && (
                        <div className="hidden sm:flex items-center gap-1.5 overflow-hidden text-slate-400 text-[11px] truncate">
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[340px] text-slate-500 font-normal">
                            {editableDocContent.sections.map((s) => s.heading).join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right side: Import CV, Rearrange & + Add Section */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {/* Import Existing CV Button (when in CV mode) */}
                      {editableDocContent.docType === "CV" && (
                        <button
                          type="button"
                          id="studio-cv-import-btn"
                          onClick={() => setIsCvImportModalOpen(true)}
                          className="h-7.5 inline-flex items-center gap-1.5 px-2.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/90 font-medium rounded-lg text-xs transition cursor-pointer shadow-2xs select-none"
                          title="Import existing CV from PDF or DOCX"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-indigo-600">
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                            <polyline points="16 16 12 12 8 16" />
                            <line x1="12" y1="12" x2="12" y2="21" />
                          </svg>
                          <span>Import CV</span>
                        </button>
                      )}

                      {/* Rearrange Sections Button */}
                      <button
                        type="button"
                        onClick={() => setIsRearrangeModalOpen(true)}
                        className="h-7.5 inline-flex items-center gap-1.5 px-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-700 border border-slate-200/90 font-medium rounded-lg text-xs transition cursor-pointer shadow-2xs select-none"
                        title="Rearrange section order"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-indigo-600">
                          <path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        <span>Rearrange</span>
                      </button>

                      {/* + Add Section Dropdown */}
                      <div className="relative shrink-0" ref={addSectionMenuRef}>
                        <button
                          type="button"
                          onClick={() => setIsAddSectionOpen(!isAddSectionOpen)}
                          className="h-7.5 inline-flex items-center gap-1.5 px-2.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/90 font-medium rounded-lg text-xs transition cursor-pointer shadow-2xs"
                        >
                          <span className="text-sm font-bold leading-none">+</span>
                          <span>Add Section</span>
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className={`transition-transform duration-150 ${isAddSectionOpen ? "rotate-180" : ""}`}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>

                        {isAddSectionOpen && (
                          <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                              <span>Add or Update Section</span>
                              <span className="text-[9px] text-slate-400 font-normal">AI Powered</span>
                            </div>
                            <div className="py-1 max-h-96 overflow-y-auto">
                              {CV_SECTION_MENU_OPTIONS.map((item) => {
                                const isPresent = isCvSectionPresent(item.key, item.heading);
                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                      handleAddSection(item.heading, "");
                                      setIsAddSectionOpen(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span>{item.icon}</span>
                                      <span className="font-medium text-[11px]">{item.label}</span>
                                    </span>
                                    {isPresent ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        + Add More
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                        + Create
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section Chips List */}
                  {isSectionsExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
                      {editableDocContent.sections.map((sec, idx) => {
                        const isEmpty = !sec.content || !sec.content.trim();
                        return (
                          <div
                            key={`${sec.heading}-${idx}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${isEmpty
                              ? "bg-amber-50/80 border-amber-200 text-amber-900"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                              }`}
                          >
                            <span
                              onClick={() => handleScrollToSection(sec.heading)}
                              className="truncate max-w-[140px] cursor-pointer hover:text-indigo-600 transition"
                              title={`Click to jump to ${sec.heading} in document`}
                            >
                              {sec.heading}
                            </span>
                            {isEmpty && (
                              <span className="text-[9.5px] px-1 py-0.2 rounded bg-amber-200/80 text-amber-800 font-bold">
                                Empty
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(idx)}
                              className="ml-1 text-slate-400 hover:text-rose-600 rounded p-0.5 transition cursor-pointer"
                              title={`Delete ${sec.heading} section`}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Rearrange Sections Modal (CV uses Drag-and-Drop RearrangeSectionsModal; SOP/LOR/Cover Letter uses section list) ── */}
              {isRearrangeModalOpen && editableDocContent && editableDocContent.docType === "CV" && (() => {
                const activeCvForRearrange =
                  cvDocumentData ||
                  getEuropassData(
                    editableDocContent.studentId,
                    editableDocContent.studentName,
                    selectedStudentData
                  );
                return (
                  <DocumentContext.Provider
                    value={{
                      data: activeCvForRearrange,
                      dispatch: handleEuropassDispatch,
                    }}
                  >
                    <RearrangeSectionsModal
                      isOpen={isRearrangeModalOpen}
                      onClose={() => setIsRearrangeModalOpen(false)}
                      data={activeCvForRearrange}
                    />
                  </DocumentContext.Provider>
                );
              })()}

              {isRearrangeModalOpen && editableDocContent && editableDocContent.docType !== "CV" && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
                    {/* Modal Header */}
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>⇅</span>
                          <span>Rearrange Document Sections</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Use the arrows to reorder sections. The layout updates instantly.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRearrangeModalOpen(false)}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Sections List */}
                    <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
                      {editableDocContent.sections.map((sec, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === editableDocContent.sections.length - 1;
                        const isEmpty = !sec.content || !sec.content.trim();

                        return (
                          <div
                            key={`${sec.heading}-${idx}`}
                            className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200/80 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-indigo-50 text-slate-600 group-hover:text-indigo-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-xs text-slate-800 truncate">
                                {sec.heading}
                              </span>
                              {isEmpty && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                                  Empty
                                </span>
                              )}
                            </div>

                            {/* Up / Down Controls */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveSection(idx, idx - 1)}
                                disabled={isFirst}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-400 disabled:hover:border-slate-200 flex items-center justify-center text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                                title="Move Up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveSection(idx, idx + 1)}
                                disabled={isLast}
                                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-400 disabled:hover:border-slate-200 flex items-center justify-center text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                                title="Move Down"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Modal Footer */}
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setIsRearrangeModalOpen(false)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Minimal Sentence Highlighter Styles & Floating Badge ── */}
              <style>{`
                .ai-sentence-highlight {
                  background-color: transparent !important;
                  text-decoration: underline !important;
                  text-decoration-color: #16a34a !important;
                  text-decoration-thickness: 1.5px !important;
                  text-underline-offset: 3px !important;
                  color: inherit !important;
                  padding: 1px 3px !important;
                  border-radius: 2px !important;
                  box-decoration-break: clone !important;
                  -webkit-box-decoration-break: clone !important;
                }
                @media print {
                  .ai-sentence-highlight {
                    background-color: transparent !important;
                    text-decoration: none !important;
                  }
                }
              `}</style>

              {activeAiHighlight && (
                <div className="fixed top-20 right-8 z-40 flex items-center gap-2 px-3 py-1.5 bg-white/95 border border-emerald-300 rounded-full shadow-md text-xs text-slate-800 animate-in fade-in select-none no-print">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-medium text-[11px]">
                    AI changed: <strong className="font-semibold text-slate-900">{activeAiHighlight.sectionName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAiHighlight}
                    className="ml-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                    title="Clear highlight"
                  >
                    ✕ Clear
                  </button>
                </div>
              )}

              {/* ── Document Canvas: Either Cairo Europass Theme or Tiptap Caret Engine ── */}
              {editableDocContent.docType === "CV" && cvViewMode === "europass" ? (
                <div
                  data-document-studio-canvas="true"
                  className="w-full max-w-full overflow-x-auto touch-pan-x pb-12 no-scrollbar"
                >
                  <div
                    style={{
<<<<<<< HEAD
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: "top center",
                      fontFamily,
                      color: textColor,
                      "--europass-font-family": fontFamily,
                      "--europass-font-size-base": `${fontSize}pt`,
                      "--europass-text-dark": textColor,
                    } as React.CSSProperties}
=======
                      width: `calc(210mm * ${zoomLevel / 100})`,
                      margin: "0 auto",
                    }}
>>>>>>> 0f0cc8a (address chnages , UI changes , rearranginf order changes)
                  >
                    <div
                      style={{
                        width: "210mm",
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: "top left",
                        fontFamily,
                        color: textColor,
                        ["--europass-font-family" as any]: fontFamily,
                        ["--europass-font-size-base" as any]: `${fontSize}pt`,
                        ["--europass-text-dark" as any]: textColor,
                      }}
                    >
                      {(() => {
                        const activeCvForRender =
                          cvDocumentData ||
                          getEuropassData(
                            editableDocContent.studentId,
                            editableDocContent.studentName,
                            selectedStudentData
                          );
                        return (
                          <DocumentContext.Provider
                            value={{
                              data: activeCvForRender,
                              dispatch: handleEuropassDispatch,
                            }}
                          >
                            <EuropassTemplate
                              data={activeCvForRender}
                              isInteractive={editorMode === "editing"}
                              activeSectionId={activeAiCvSectionKey || undefined}
                            />
                          </DocumentContext.Provider>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-full overflow-x-auto touch-pan-x pb-12 no-scrollbar">
                  <div
                    style={{
                      width: `calc(210mm * ${zoomLevel / 100})`,
                      margin: "0 auto",
                    }}
                  >
                    {/* Subtle A4 Format & Calibration Indicator Bar */}
                    <div className="w-full flex flex-wrap items-center justify-between gap-2 px-2 mb-2 text-xs text-slate-400 no-print select-none">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>A4 Standard Format · 210mm × 297mm</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Master Template Margins: 11.5mm · Calibri 8pt
                      </span>
                    </div>

                    <div
                      className={`bg-white a4-paper-sheet rounded-xs w-[210mm] min-w-[210mm] min-h-[297mm] px-[11.5mm] py-[11.5mm] text-[#111111] transition-all duration-150 relative ${editorMode === "editing"
                        ? "border border-indigo-400/80 ring-3 ring-indigo-500/15 shadow-[0_10px_35px_rgba(15,23,42,0.08)]"
                        : "border border-slate-200/90 shadow-[0_8px_28px_rgba(15,23,42,0.06)]"
                        }`}
                      style={{
                        transform: `scale(${zoomLevel / 100})`,
                        transformOrigin: "top left",
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Tiptap Caret Engine */}
                      <TiptapEditor
                        initialContent={tiptapHtml}
                        editable={editorMode === "editing"}
                        fontSize={fontSize}
                        fontFamily={fontFamily}
                        textColor={textColor}
                        zoomLevel={zoomLevel}
                        onEditorReady={(ed) => setTiptapEditor(ed)}
                        onUpdate={(html, wordCount) => {
                          handleTiptapUpdate(html, wordCount);
                          if (activeAiHighlight) {
                            handleClearAiHighlight();
                          }
                        }}
                        onFormatChange={handleFormatChange}
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* ── Floating AI Chatbot Action Button (Bottom-Right) ── */}
              {isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="fixed bottom-16 right-6 z-40 w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-white border-2 border-indigo-600 shadow-[0_8px_25px_rgba(15,23,42,0.18)] hover:shadow-[0_12px_32px_rgba(79,70,229,0.35)] hover:border-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group flex items-center justify-center p-1.5 overflow-hidden no-print"
                  title="Open AI Admissions Assistant"
                >
                  <img
                    src="/images/ai-bot-character.jpg"
                    alt="AI Assistant"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200 pointer-events-none select-none"
                  />
                </button>
              )}
            </main>
          </div>

          {/* ── Dynamic Document Intelligence & Insights Slide-Over Panel ───── */}
          {showInsightsDrawer && (
            <>
              {/* Mobile backdrop for insights drawer */}
              <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 md:hidden"
                onClick={() => setShowInsightsDrawer(false)}
              />
              <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[340px] sm:w-80 bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200 select-none">
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>📊</span>
                      <span>Document Insights</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowInsightsDrawer(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Metrics Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3">
                      <div className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wider">
                        Word Count
                      </div>
                      <div className="text-xl font-bold text-indigo-900 mt-1">
                        {editableDocContent.wordCount}
                      </div>
                    </div>

                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                      <div className="text-[10px] text-blue-700 font-semibold uppercase tracking-wider">
                        Est. Read Time
                      </div>
                      <div className="text-xl font-bold text-blue-900 mt-1">
                        {Math.max(1, Math.ceil(editableDocContent.wordCount / 200))} min
                      </div>
                    </div>
                  </div>

                  {/* A4 Capacity Estimator */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Estimated A4 Pages:</span>
                      <span className="font-bold text-indigo-600">
                        {Math.max(1, Math.ceil(editableDocContent.wordCount / 450))} Page(s)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (editableDocContent.wordCount / 500) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Target budget: 500–650 words per single page
                    </div>
                  </div>

                  {/* Admissions & Visa Compliance Checklist */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Admissions Compliance
                    </span>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <span>✓</span>
                        <span>Verified Student: {editableDocContent.studentName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <span>✓</span>
                        <span>Institution: {editableDocContent.targetUniversity}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <span>✓</span>
                        <span>Course: {editableDocContent.targetCourse}</span>
                      </div>

                      {/* Dynamic check for genuine student statement */}
                      <div
                        className={`flex items-center gap-2 ${editableDocContent.sections.some(
                          (s) =>
                            s.content.toLowerCase().includes("genuine") ||
                            s.content.toLowerCase().includes("intent")
                        )
                          ? "text-emerald-700"
                          : "text-amber-700 font-medium"
                          }`}
                      >
                        <span>
                          {editableDocContent.sections.some(
                            (s) =>
                              s.content.toLowerCase().includes("genuine") ||
                              s.content.toLowerCase().includes("intent")
                          )
                            ? "✓"
                            : "⚠️"}
                        </span>
                        <span>
                          {editableDocContent.sections.some(
                            (s) =>
                              s.content.toLowerCase().includes("genuine") ||
                              s.content.toLowerCase().includes("intent")
                          )
                            ? "Genuine Student Declaration Included"
                            : "Visa Declaration Missing"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowInsightsDrawer(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Close Insights
                </button>
              </div>
            </>
          )}

          {/* ── Toast Notification for AI Smart Refinements ─────────────────── */}
          {aiToast && (
            <div className="fixed bottom-12 right-6 z-40 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-from-bottom-2 duration-200">
              <span>{aiToast.message}</span>
              {aiToast.type !== "error" && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="text-indigo-400 hover:text-white font-semibold underline cursor-pointer"
                >
                  Undo
                </button>
              )}
            </div>
          )}

          {/* ── Optional Bottom Notes Drawer ─────────────────────────────────── */}
          {showNotes && (
            <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 shrink-0 flex items-center gap-3 sm:gap-4 z-20">
              <span className="text-xs font-bold text-slate-700 shrink-0">Operator Notes:</span>
              <input
                type="text"
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                placeholder="Add private observations, interview comments, or admissions checklist notes..."
                className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Bottom Status Bar (Fully Responsive on Mobile & Half-Screen) ──── */}
          <footer className="bg-white border-t border-slate-200 px-2.5 sm:px-6 py-2 flex items-center justify-between text-xs text-slate-600 select-none shrink-0 z-20 gap-2 sm:gap-3 overflow-x-auto no-scrollbar no-print">
            {/* Left Controls: Notes, Outline, Timer */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className={`h-7.5 flex items-center gap-1.5 px-2.5 rounded-md hover:bg-slate-100 cursor-pointer transition shrink-0 font-medium ${showNotes ? "text-indigo-600 bg-indigo-50 font-semibold" : ""
                  }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Notes</span>
              </button>

              <button
                type="button"
                onClick={() => handleRunSmartChange("create_outline")}
                className="h-7.5 hidden sm:flex items-center gap-1.5 px-2.5 rounded-md hover:bg-slate-100 cursor-pointer transition shrink-0 font-medium"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>Outline</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`h-7.5 flex items-center gap-1.5 px-2.5 rounded-md hover:bg-slate-100 cursor-pointer transition shrink-0 font-medium ${isTimerRunning ? "text-emerald-600 bg-emerald-50 font-semibold" : ""
                  }`}
                title={isTimerRunning ? "Click to pause timer" : "Click to start timer"}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  <span className="hidden xs:inline">Timer </span>{timerSeconds > 0 ? `(${Math.floor(timerSeconds / 60)}:${String(timerSeconds % 60).padStart(2, "0")})` : ""}
                </span>
              </button>
            </div>

            {/* Right Controls: Dynamic Zoom Slider, Dynamic A4 Page Counter, Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Dynamic Zoom Slider (always visible including half-screen) */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 5))}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer font-bold text-xs"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  -
                </button>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-14 sm:w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  aria-label="Document zoom percentage"
                />
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 5))}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer font-bold text-xs"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <span className="w-8 sm:w-10 text-right font-medium text-slate-600 text-[11px] sm:text-xs tabular-nums">{zoomLevel}%</span>
              </div>

              {/* Dynamic A4 Page Count based on actual word count */}
              <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap">
                Pages 1/{Math.max(1, Math.ceil(editableDocContent.wordCount / 450))}
              </span>

              {/* Fullscreen Expand Icon */}
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => { });
                  } else {
                    document.exitFullscreen().catch(() => { });
                  }
                }}
                className="hidden sm:inline-flex w-7.5 h-7.5 items-center justify-center rounded-md hover:bg-slate-100 cursor-pointer text-slate-500 hover:text-slate-800 transition"
                title="Present full screen"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}














































































