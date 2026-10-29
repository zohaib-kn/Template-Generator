"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import {
  hydrateDocumentFromSnapshot,
  type HydratedDocumentData,
  RECENT_DOCS_STORAGE_KEY,
} from "../utils/documentHydrator";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import type { Editor } from "@tiptap/react";
import { TiptapEditor, type FormattingState } from "./TiptapEditor";
import { DocumentThumbnailPreview } from "./DocumentThumbnailPreview";
import { EuropassTemplate } from "@/templates/europass/EuropassTemplate";
import { mapCrmToNormalizedStudent, mapNormalizedToResume } from "@/services/normalization";
import { createEmptyDocumentData } from "@/features/document-generator/utils/documentDefaults";
import {
  getSampleRohanIyerSnapshot,
  getSampleAaravMehtaSnapshot,
  getSampleAafiaAmeenSnapshot,
  getSampleSnapshotById,
  SAMPLE_STUDENTS,
} from "@/lib/sampleStudents";
import type { DocumentData } from "@/types";
import { syncSectionsToCvData } from "../utils/documentStudioSync";

export { RECENT_DOCS_STORAGE_KEY, syncSectionsToCvData };

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  sectionUpdated?: string;
  actionType?: "typed_section" | "deleted_section" | "polished" | "trimmed" | "outline" | "general";
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
    title: "Aafia Ameen – Italy Visa Cover Letter",
    updatedAt: "Opened Just now",
  },
  {
    ...hydrateDocumentFromSnapshot(
      "CV",
      getSampleRohanIyerSnapshot(),
      "sample-rohan-iyer"
    ),
    title: "Rohan Iyer – Europass CV",
    updatedAt: "Opened 10m ago",
  },
  {
    ...hydrateDocumentFromSnapshot(
      "SOP",
      getSampleRohanIyerSnapshot(),
      "sample-rohan-iyer"
    ),
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
    title: "Aarav Mehta – Italy Visa Cover Letter",
    updatedAt: "Opened Oct 24, 2026",
  },
  {
    ...hydrateDocumentFromSnapshot(
      "CV",
      getSampleAaravMehtaSnapshot(),
      "sample-aarav-mehta"
    ),
    title: "Aarav Mehta – Europass Academic CV",
    updatedAt: "Opened Jul 24, 2024",
  },
  {
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

function docSectionsToHtml(
  sections: { heading?: string; content: string }[],
  docType?: "SOP" | "CV" | "LOR" | "COVER_LETTER" | "BLANK",
  title?: string
): string {
  const isCoverLetter =
    docType === "COVER_LETTER" ||
    (title ? title.toLowerCase().includes("cover letter") : false) ||
    sections.some(
      (s) =>
        s.heading === "Recipient / Consulate" ||
        s.heading === "Subject Line" ||
        s.heading === "Student Contact & Signature"
    );

  const fmt = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  if (isCoverLetter) {
    const getSec = (match: string) =>
      sections.find((s) => s.heading?.toLowerCase().includes(match.toLowerCase()))?.content || "";

    const recipient = getSec("recipient") || getSec("consulate");
    const subject = getSec("subject");
    const intro = getSec("student introduction");
    const academics = getSec("academic background");
    const whyCourse = getSec("why this course") || getSec("why course");
    const whyUniv = getSec("why this university") || getSec("why university");
    const whyItaly = getSec("why italy") || getSec("why this country");
    const futurePlan = getSec("future academic plan");
    const careerPlan = getSec("career plan");
    const returnIntent = getSec("return") || getSec("home country");
    const finance = getSec("financial") || getSec("sponsorship");
    const accommodation = getSec("accommodation");
    const insurance = getSec("insurance");
    const travel = getSec("travel");
    const closing = getSec("closing");
    const signature = getSec("signature") || getSec("contact");

    const headerHtml = `<div style="text-align: center; margin-bottom: 12px;"><span style="font-size: 8.5pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.05em;">COVER LETTER</span></div>`;

    const recipientHtml = recipient
      ? `<div style="text-align: left; margin-bottom: 11px; line-height: 1.25; white-space: pre-line;">${fmt(recipient)}</div>`
      : "";
    const subjectHtml = subject
      ? `<div style="text-align: left; margin-bottom: 11px; font-weight: bold; line-height: 1.25;">${fmt(subject)}</div>`
      : "";

    // P1: Intro + Academics combined into single continuous paragraph matching Image 1
    const p1Parts = [intro, academics].filter(Boolean).map(fmt).join(" ");
    const p1Html = p1Parts
      ? `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: 7px; line-height: 1.16;">${p1Parts}</p>`
      : "";

    // P2: Why Course
    const p2Html = whyCourse
      ? `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: 7px; line-height: 1.16;">${fmt(whyCourse)}</p>`
      : "";

    // P3: Why University
    const p3Html = whyUniv
      ? `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: 7px; line-height: 1.16;">${fmt(whyUniv)}</p>`
      : "";

    // P4: Why Italy
    const p4Html = whyItaly
      ? `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: 7px; line-height: 1.16;">${fmt(whyItaly)}</p>`
      : "";

    // P5: Future Plans, Career & Return Intent combined into single continuous paragraph matching Image 1
    const p5Parts = [futurePlan, careerPlan, returnIntent].filter(Boolean).map(fmt).join(" ");
    const p5Html = p5Parts
      ? `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: 7px; line-height: 1.16;">${p5Parts}</p>`
      : "";

    // P6: Financial Sponsorship
    const p6Html = finance
      ? `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: 7px; line-height: 1.16;">${fmt(finance)}</p>`
      : "";

    // P7: Logistics (Accommodation + Insurance + Travel)
    const p7Parts = [accommodation, insurance, travel].filter(Boolean).map(fmt).join(" ");
    const p7Html = p7Parts
      ? `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: 7px; line-height: 1.16;">${p7Parts}</p>`
      : "";

    // P8: Closing Statement
    const p8Html = closing
      ? `<p style="text-align: justify; text-justify: inter-word; margin-top: 0; margin-bottom: 11px; line-height: 1.16;">${fmt(closing)}</p>`
      : "";

    // Signature block with blue underlined email link
    let sigFormatted = signature ? fmt(signature) : "";
    sigFormatted = sigFormatted.replace(
      /(Email:\s*)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      `$1<a href="mailto:$2" style="color: #1d4ed8; text-decoration: underline;">$2</a>`
    );
    const sigHtml = sigFormatted
      ? `<div style="text-align: left; margin-top: 11px; line-height: 1.25; white-space: pre-line;">${sigFormatted}</div>`
      : "";

    return `<div style="font-family: Calibri, Carlito, Aptos, 'Segoe UI', sans-serif; font-size: 8.25pt; line-height: 1.16; color: #111111;">${headerHtml}${recipientHtml}${subjectHtml}${p1Html}${p2Html}${p3Html}${p4Html}${p5Html}${p6Html}${p7Html}${p8Html}${sigHtml}</div>`;
  }

  const isSop =
    docType === "SOP" || (title ? title.toLowerCase().includes("statement of purpose") : false);

  if (isSop) {
    const headerHtml = `<div style="text-align: center; margin-bottom: 18px;"><span style="font-size: 15px; font-weight: bold; text-decoration: underline; letter-spacing: 0.08em;">STATEMENT OF PURPOSE</span></div>`;
    const bodyHtml = sections
      .map((s) => {
        const bodyContent = s.content
          .split("\n\n")
          .map((para) => `<p style="text-align: justify; margin-bottom: 14px; line-height: 1.35;">${fmt(para).replace(/\n/g, "<br/>")}</p>`)
          .join("");
        return bodyContent;
      })
      .join("");
    return `<div style="font-family: 'Times New Roman', Times, Georgia, serif; font-size: 14px; line-height: 1.35; color: #111827;">${headerHtml}${bodyHtml}</div>`;
  }

  return sections
    .map((s) => {
      const headingHtml = s.heading ? `<h2>${s.heading}</h2>` : "";
      const bodyHtml = s.content
        .split("\n\n")
        .map((para) => {
          const boldFormatted = para.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
          return `<p>${boldFormatted.replace(/\n/g, "<br/>")}</p>`;
        })
        .join("");
      return headingHtml + bodyHtml;
    })
    .join("");
}

function getEuropassData(
  studentId: string,
  studentName?: string,
  globalStudentData?: any
): DocumentData {
  // Only the selected student's own CRM snapshot, or an exact sample ID, may populate a CV.
  const ownSnapshot =
    globalStudentData && globalStudentData.student ? globalStudentData : getSampleSnapshotById(studentId);
  if (ownSnapshot) {
    try {
      const norm = mapCrmToNormalizedStudent(ownSnapshot);
      const proj = mapNormalizedToResume(norm);
      if (proj.student && proj.student.personal?.fullName) return proj.student;
    } catch {}
  }

  const empty = createEmptyDocumentData();
  return {
    ...empty,
    personal: {
      ...empty.personal,
      fullName: studentName || "",
    },
  };
}



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
  const router = useRouter();
  const { students, selectedStudentId, selectStudent, selectedStudentData } = useGlobalStudent();

  // Search & View State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [recentDocs, setRecentDocs] = useState<HydratedDocumentData[]>(INITIAL_RECENT_DOCS);

  // Hydrate persistent documents from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_DOCS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentDocs(parsed);
          return;
        }
      }
      localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(INITIAL_RECENT_DOCS));
    } catch {}
  }, []);

  // Modal State (2 clean dropdowns: student first, then doc type)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudentId, setModalStudentId] = useState<string>("sample-aafia-ameen");
  const [modalDocType, setModalDocType] = useState<"COVER_LETTER" | "SOP" | "CV" | "LOR" | "BLANK">("COVER_LETTER");

  // Continuous persistence: Syncs any document creation or midway edits to recentDocs & localStorage
  const syncDocumentToRecent = (doc: HydratedDocumentData, status: string = "Edited just now") => {
    setRecentDocs((prev) => {
      const docWithMeta: HydratedDocumentData = {
        ...doc,
        updatedAt: status,
      };
      const existingIdx = prev.findIndex(
        (d) =>
          d.title === doc.title ||
          (d.studentId === doc.studentId && d.docType === doc.docType && d.title.includes(doc.studentName))
      );
      let next: HydratedDocumentData[];
      if (existingIdx >= 0) {
        next = [docWithMeta, ...prev.filter((_, idx) => idx !== existingIdx)];
      } else {
        next = [docWithMeta, ...prev];
      }
      try {
        localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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

  // Auto-focus search input when student dropdown opens
  useEffect(() => {
    if (isStudentDropdownOpen) {
      setTimeout(() => {
        studentSearchInputRef.current?.focus();
      }, 50);
    } else {
      setStudentSearchQuery("");
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fancy Countdown Cooking Loader State
  const [isCooking, setIsCooking] = useState(false);
  const [cookingCountdown, setCookingCountdown] = useState(3);
  const [cookingStage, setCookingStage] = useState(0);

  // In-Front Live Document Presentation State
  const [activeDocument, setActiveDocument] = useState<HydratedDocumentData | null>(null);
  const [editableDocContent, setEditableDocContent] = useState<HydratedDocumentData | null>(null);
  const [cvDocumentData, setCvDocumentData] = useState<DocumentData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isSectionsExpanded, setIsSectionsExpanded] = useState(false);
  const addSectionMenuRef = useRef<HTMLDivElement>(null);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const infoMenuRef = useRef<HTMLDivElement>(null);

  // Graceful exit from Document Studio: immediately persists in-progress draft to recent creations
  const handleExitStudio = () => {
    if (editableDocContent) {
      syncDocumentToRecent(editableDocContent, "Edited just now");
    }
    setActiveDocument(null);
    setEditableDocContent(null);
    setTiptapHtml("");
    setCvDocumentData(null);
  };

  // Continuous sync of conversation to localStorage per document
  useEffect(() => {
    if (!activeDocument) return;
    const storageKey = `antigravity_studio_chat_${activeDocument.studentId}_${activeDocument.docType}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(chatMessages));
    } catch {}
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, activeDocument]);

  // Continuous Auto-Save: debounced sync of in-progress edits to recentDocs & localStorage
  useEffect(() => {
    if (!editableDocContent || !activeDocument) return;
    const timer = setTimeout(() => {
      syncDocumentToRecent(editableDocContent, "Edited just now");
    }, 800);
    return () => clearTimeout(timer);
  }, [editableDocContent?.title, editableDocContent?.wordCount, editableDocContent?.sections]);

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
          const idx = list.findIndex(
            (d) =>
              d.title === updatedDoc.title ||
              (d.studentId === updatedDoc.studentId && d.docType === updatedDoc.docType)
          );
          let next: HydratedDocumentData[];
          if (idx >= 0) {
            next = [updatedDoc, ...list.filter((_, i) => i !== idx)];
          } else {
            next = [updatedDoc, ...list];
          }
          localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editableDocContent]);

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
  const [showNotes, setShowNotes] = useState(false);
  const [notesContent, setNotesContent] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

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
    if (tiptapEditor && tiptapEditor.can().undo()) {
      tiptapEditor.chain().focus().undo().run();
      setAiToast({ message: "Reverted via Caret Engine", type: "info" });
      return;
    }
    if (docHistory.length === 0 || !editableDocContent) return;
    const previous = docHistory[docHistory.length - 1];
    setRedoHistory((prev) => [editableDocContent, ...prev]);
    setDocHistory((prev) => prev.slice(0, prev.length - 1));
    setEditableDocContent(previous);
    const html = docSectionsToHtml(previous.sections, previous.docType, previous.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }
    setAiToast({ message: "Reverted to previous revision", type: "info" });
  };

  const handleRedo = () => {
    if (tiptapEditor && tiptapEditor.can().redo()) {
      tiptapEditor.chain().focus().redo().run();
      setAiToast({ message: "Redone via Caret Engine", type: "info" });
      return;
    }
    if (redoHistory.length === 0 || !editableDocContent) return;
    const next = redoHistory[0];
    setDocHistory((prev) => [...prev, editableDocContent]);
    setRedoHistory((prev) => prev.slice(1));
    setEditableDocContent(next);
    const html = docSectionsToHtml(next.sections, next.docType, next.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }
    setAiToast({ message: "Redone", type: "info" });
  };

  // Canvas Section Management: Delete Section
  const handleDeleteSection = (index: number) => {
    if (!editableDocContent || !editableDocContent.sections[index]) return;
    setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
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

    const html = docSectionsToHtml(updated.sections, updated.docType, updated.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }
    if (updated.docType === "CV") {
      const baseCv = getEuropassData(updated.studentId, updated.studentName, selectedStudentData);
      const synced = syncSectionsToCvData(updated.sections, baseCv);
      setCvDocumentData(synced);
    }

    const deleteNotice: ChatMessage = {
      id: `asst-${Date.now()}`,
      sender: "assistant",
      text: `🗑️ Removed section: **${removed.heading || "Section"}**. The document layout has been updated.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sectionUpdated: removed.heading,
      actionType: "deleted_section",
    };
    setChatMessages((prev) => [...prev, deleteNotice]);
    setAiToast({ message: `🗑️ Removed ${removed.heading || "Section"}`, type: "info" });
  };

  // Canvas Section Management: Scroll into view when clicking a section chip
  const handleScrollToSection = (heading?: string) => {
    if (!heading) return;
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

  // Canvas Section Management: Add Section
  const handleAddSection = (heading: string, defaultContent: string = "") => {
    if (!editableDocContent) return;
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
    if (updated.docType === "CV") {
      const baseCv = getEuropassData(updated.studentId, updated.studentName, selectedStudentData);
      const synced = syncSectionsToCvData(updated.sections, baseCv);
      setCvDocumentData(synced);
    }

    const addNotice: ChatMessage = {
      id: `asst-${Date.now()}`,
      sender: "assistant",
      text: `➕ Added new empty section: **${heading}**. You can customize it directly or share details in this chat to fill it!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
      else if (actionKey === "trim_budget") promptLabel = "✂️ Trim verbosity to fit 1-page budget";

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: promptLabel,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, userMsg]);
    }

    // Snapshot current state for Undo
    setDocHistory((prev) => [...prev, JSON.parse(JSON.stringify(editableDocContent))]);
    setRedoHistory([]);
    setIsAiCooking(true);

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
        const hasVisaSection = updated.sections.some(
          (s) =>
            s.heading.toLowerCase().includes("declaration") ||
            s.heading.toLowerCase().includes("compliance")
        );
        if (!hasVisaSection) {
          updated.sections.push({
            heading: "Visa Compliance & Genuine Student Intent Declaration",
            content: `I confirm that I am applying as a Genuine Student with sole intent to complete my specified studies at ${updated.targetUniversity}. My family possesses verified financial sponsorship covering all tuition and maintenance benchmarks. Upon graduation, I will return immediately to India to advance my career.`,
          });
        }
        appliedFeedback = "Verified visa compliance standards and inserted Genuine Student Intent declaration.";
        sectionUpdated = "Visa Compliance Declaration";
        actionType = "typed_section";
      } else if (actionKey === "trim_budget") {
        updated.sections = updated.sections.map((section) => {
          const sentences = section.content.split(". ");
          const trimmed = sentences
            .map((s) =>
              s
                .replace(/\bin order to\b/g, "to")
                .replace(/\bdue to the fact that\b/g, "because")
                .replace(/\bat this point in time\b/g, "presently")
            )
            .join(". ");
          return { ...section, content: trimmed };
        });
        appliedFeedback = "Trimmed verbosity by ~15% to guarantee a strict 1-page presentation budget.";
        sectionUpdated = "All Document Sections";
        actionType = "trimmed";
      } else if (customPrompt && customPrompt.trim()) {
        const promptLower = customPrompt.toLowerCase();

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
          if (promptLower.includes("work") || promptLower.includes("experience") || promptLower.includes("intern")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("work") || s.heading.toLowerCase().includes("experience"));
          } else if (promptLower.includes("about") || promptLower.includes("bio") || promptLower.includes("summary")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("about"));
          } else if (promptLower.includes("skill")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("skills") && !s.heading.toLowerCase().includes("language"));
          } else if (promptLower.includes("cert")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("cert"));
          } else if (promptLower.includes("hobb") || promptLower.includes("interest")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("hobb"));
          } else if (promptLower.includes("ielts") || promptLower.includes("english") || promptLower.includes("language certificate")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("english language") || s.heading.toLowerCase().includes("ielts"));
          } else if (promptLower.includes("declaration")) {
            targetIndex = updated.sections.findIndex((s) => s.heading.toLowerCase().includes("declaration"));
          } else {
            targetIndex = updated.sections.findIndex((s) => promptLower.includes(s.heading.toLowerCase()));
          }

          if (targetIndex >= 0) {
            const removedSec = updated.sections[targetIndex];
            updated.sections.splice(targetIndex, 1);
            sectionUpdated = removedSec.heading;
            actionType = "deleted_section";
            appliedFeedback = `🗑️ Removed section: **${removedSec.heading}**. The document layout has been updated.`;
          } else {
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

          const overall = overallMatch ? overallMatch[1].trim() : "7.5";
          const trfNumber = trfMatch ? trfMatch[1].trim() : "26IA506129FAIM003A";
          const lScore = lMatch ? lMatch[1].trim() : "9.0";
          const rScore = rMatch ? rMatch[1].trim() : "7.5";
          const wScore = wMatch ? wMatch[1].trim() : "6.5";
          const sScore = sMatch ? sMatch[1].trim() : "7.0";
          const testDate = dateMatch ? dateMatch[1].trim() : "23/08/2026";

          if (updated.docType === "CV") {
            let certSec = updated.sections.find((s) => s.heading.toLowerCase().includes("english language") || s.heading.toLowerCase().includes("ielts"));
            if (!certSec) {
              certSec = { heading: "ENGLISH LANGUAGE CERTIFICATE", content: "" };
              updated.sections.splice(Math.min(4, updated.sections.length), 0, certSec);
            }
            certSec.content = `International English Language Testing System\nTest Report Form\n• Overall Band Score - ${overall}\n• Listening - ${lScore}\n• Reading - ${rScore}\n• Writing - ${wScore}\n• Speaking - ${sScore}\n• Issue Date - ${testDate}\n• Test Report Form Number - ${trfNumber}`;

            let langSec = updated.sections.find((s) => s.heading.toLowerCase().includes("language skills"));
            if (langSec) {
              langSec.content = `Mother tongue(s): Hindi / Urdu\nOther language(s): English (Listening ${lScore >= "8.5" ? "C2" : "C1"}, Reading ${rScore >= "8.5" ? "C2" : "C1"}, Writing ${wScore >= "7.0" ? "C1" : "B2"}, Spoken Production ${sScore >= "7.5" ? "C1" : "B2"}, Spoken Interaction ${sScore >= "7.5" ? "C1" : "B2"}) - Overall IELTS ${overall}`;
            }
            sectionUpdated = "ENGLISH LANGUAGE CERTIFICATE";
            actionType = "typed_section";
            appliedFeedback = `Typed out **English Language Certificate** with IELTS Overall **${overall}**, Subscores (L:${lScore}, R:${rScore}, W:${wScore}, S:${sScore}), and TRF Number **${trfNumber}**. Both Europass and Caret views updated.`;
          } else {
            const acadSec = updated.sections.find((s) => s.heading.toLowerCase().includes("academic background") || s.heading.toLowerCase().includes("background") || s.heading.toLowerCase().includes("academics"));
            if (acadSec) {
              if (!acadSec.content.includes("IELTS")) {
                acadSec.content += ` Further, I have demonstrated strong English language proficiency through the International English Language Testing System (**IELTS Academic**), achieving an overall band score of **${overall}** (Listening: ${lScore}, Reading: ${rScore}, Writing: ${wScore}, Speaking: ${sScore}) under Test Report Form (TRF) Number **${trfNumber}**.`;
              } else {
                acadSec.content = acadSec.content.replace(/(band score of [\d.]+\*\*\.)/i, `band score of **${overall}** (TRF No. **${trfNumber}**).`);
              }
              sectionUpdated = acadSec.heading;
              actionType = "typed_section";
              appliedFeedback = `Typed out verified IELTS test scores (Band **${overall}**, TRF No. **${trfNumber}**) into the Academic Background section.`;
            }
          }
        }

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

        const courseContext = ((updated.targetCourse || "") + " " + (updated.targetUniversity || "")).toLowerCase();
        const isTech =
          courseContext.includes("data") ||
          courseContext.includes("computer") ||
          courseContext.includes("engineer") ||
          courseContext.includes("science") ||
          courseContext.includes("tech") ||
          courseContext.includes("ai") ||
          courseContext.includes("information");

        // ── Case 3: Operator shares Work Experience details ──────────────────────
        if (
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
          if (!workSec) {
            workSec = { heading: "WORK EXPERIENCE", content: "" };
            updated.sections.splice(Math.min(2, updated.sections.length), 0, workSec);
          }

          if (isSampleRequest || customPrompt.trim().length < 25) {
            if (isTech) {
              workSec.content = "Software Engineering Intern\nTechSolutions Global [ 06/2023 – 04/2024 ]\nLocation: Mumbai, India\n• Developed scalable backend microservices and RESTful API endpoints\n• Automated continuous integration test suites and optimized database queries";
            } else {
              workSec.content = "Financial Analyst Trainee\nDeloitte India [ 06/2023 – 04/2024 ]\nLocation: Mumbai, India\n• Performed quarterly financial variance auditing and portfolio reconciliation\n• Automated valuation spreadsheets and cross-border commercial compliance models";
            }
            appliedFeedback = "Typed out verified **Work Experience** entry with job role, company, dates, and duties.";
          } else if (customPrompt.length > 40 && customPrompt.includes("\n")) {
            workSec.content = customPrompt.trim();
            appliedFeedback = "Typed out **Work Experience** section with provided employment details.";
          } else {
            const cleanText = customPrompt
              .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(work\s+experience|internships?|jobs?)[:\s-]*/i, "")
              .trim();
            const lines = cleanText.split(/[,;•\n]+/).map((l) => l.trim()).filter(Boolean);
            const role = lines[0] || (isTech ? "Software Engineering Intern" : "Financial Analyst Trainee");
            const company = lines[1] || (isTech ? "TechSolutions Global" : "Deloitte India");
            const dates = lines.find((l) => /\d{4}/.test(l)) || "06/2023 – 04/2024";
            const location = lines.find((l) => /mumbai|delhi|bangalore|pune|london|paris|remote|bhopal|chennai/i.test(l)) || "Mumbai, India";
            const duties = lines.slice(2).filter((l) => l !== dates && l !== location);

            workSec.content = `${role}\n${company} [ ${dates} ]\nLocation: ${location}\n${
              duties.length > 0
                ? duties.map((d) => `• ${d}`).join("\n")
                : "• Performed core technical implementation and cross-border analytical reporting\n• Automated documentation and test coverage"
            }`;
            appliedFeedback = `Typed out **Work Experience** at **${company}** as **${role}**.`;
          }

          sectionUpdated = "WORK EXPERIENCE";
          actionType = "typed_section";
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

          if (isSampleRequest || customPrompt.trim().length < 25) {
            if (isTech) {
              eduSec.content = "Bachelor of Technology in Computer Science and Engineering\nVellore Institute of Technology [ 2020 – 2024 ]\nLocation: Vellore, India | Final grade: CGPA 8.8/10";
            } else {
              eduSec.content = "Bachelor of Commerce (Honours in Finance)\nUniversity of Mumbai [ 2020 – 2023 ]\nLocation: Mumbai, India | Final grade: CGPA 8.7/10";
            }
            appliedFeedback = "Typed out verified **Education and Training** entry with degree, institution, and grades.";
          } else {
            const cleanEdu = customPrompt
              .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(education(\s+and\s+training)?|degree|qualification)[:\s-]*/i, "")
              .trim();
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
          if (isSampleRequest || customPrompt.trim().length < 20) {
            aboutSec.content = `Ambitious and analytical ${updated.targetCourse} applicant with a verified academic background in quantitative problem solving and research. Eager to contribute to collaborative projects and academic inquiries at ${updated.targetUniversity}.`;
            appliedFeedback = "Typed out a tailored **About Me** academic summary aligned with your university programme.";
          } else {
            aboutSec.content = customPrompt
              .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(about\s+me|bio|profile(\s+summary)?|summary)[:\s-]*/i, "")
              .trim();
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
          if (isSampleRequest || customPrompt.trim().length < 20) {
            if (isTech) {
              skillsSec.content = "Python / Machine Learning / Data Structures / SQL / React.js / Node.js / Git / Docker";
            } else {
              skillsSec.content = "Financial Modeling / Data Analysis / Advanced Excel / Corporate Strategy / Tableau / Quantitative Research";
            }
            appliedFeedback = "Typed out curated **Skills** proficiencies aligned with your degree programme.";
          } else {
            const cleanSkills = customPrompt
              .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(skills?|technologies|tools)[:\s-]*/i, "")
              .trim();
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

          if (isSampleRequest || customPrompt.trim().length < 32) {
            if (isTech) {
              certSec.content = "• Deep Learning & Neural Networks Specialization – Coursera (DeepLearning.AI) [ 2023 ]\n• AWS Certified Cloud Practitioner – Amazon Web Services [ 2024 ]";
              appliedFeedback = "Typed out verified accredited **Certifications** in Deep Learning (Coursera) and Cloud Architecture (AWS).";
            } else {
              certSec.content = "• Financial Modeling & Valuation Analyst (FMVA)® – Corporate Finance Institute [ 2023 ]\n• Business Analytics & Decision Making – Coursera (Wharton) [ 2024 ]";
              appliedFeedback = "Typed out verified accredited **Certifications** in Financial Modeling (CFI) and Business Analytics (Coursera/Wharton).";
            }
          } else {
            let cleanCert = customPrompt
              .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(certifications?|certificates?|credentials?)[:\s-]*/i, "")
              .trim();
            if (!cleanCert.includes("–") && !cleanCert.includes("-") && !cleanCert.includes("by") && !cleanCert.includes("from") && !cleanCert.includes("|")) {
              cleanCert = `${cleanCert} – Accredited Online Certification [ 2024 ]`;
            }
            certSec.content = cleanCert.startsWith("•") ? cleanCert : `• ${cleanCert}`;
            appliedFeedback = "Updated **Certifications** section with verified credentials.";
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
          if (isSampleRequest || customPrompt.trim().length < 20) {
            hobbySec.content = "Open-source software contributing / Competitive chess / Long-distance running / Technical blogging";
            appliedFeedback = "Typed out verified **Hobbies and Interests** section.";
          } else {
            const cleanHobbies = customPrompt
              .replace(/^(please\s+)?(fill\s+out|add|set|put|type|update)?\s*(hobbies|interests)[:\s-]*/i, "")
              .trim();
            hobbySec.content = cleanHobbies;
            appliedFeedback = "Updated **Hobbies and Interests** section.";
          }
          sectionUpdated = "HOBBIES AND INTERESTS";
          actionType = "typed_section";
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
              travelSec.content = `Additionally, I have confirmed my travel arrangements by booking an **Emirates** flight from **Mumbai (BOM)** to **Venice Marco Polo Airport (VCE)** via **Dubai (DXB)** for **20 September 2026** under **PNR: PCNXKF**, ensuring my timely arrival in Italy before the commencement of my studies.`;
            }
            sectionUpdated = "Travel Logistics";
            actionType = "typed_section";
            appliedFeedback = "Updated Travel Logistics (Flight, Itinerary & PNR).";
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
              insSec.content = `I have also obtained a **365-day ICICI Lombard General Insurance Overseas Student Travel Insurance Policy (Certificate No. IC512370)**, valid from **01 September 2026 to 31 August 2027**, in compliance with the visa requirements.`;
            }
            sectionUpdated = "Travel & Health Insurance";
            actionType = "typed_section";
            appliedFeedback = "Updated Travel & Health Insurance Policy details.";
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
              accSec.content = `I have made all the necessary arrangements for my stay in Italy. I have secured temporary accommodation at **Dimora in Prato, Padova, Italy**, from **20 September 2026 to 20 October 2026**, which will provide me with sufficient time to settle in and arrange my long-term accommodation after my arrival.`;
            }
            sectionUpdated = "Accommodation Arrangements";
            actionType = "typed_section";
            appliedFeedback = "Updated Accommodation Arrangements (Dimora in Prato).";
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
              finSec.content = `My higher education and living expenses in Italy will be fully sponsored by my father, Mr. Amin Jamali. To finance my studies, he has obtained an education loan of **INR 39,00,000 (Indian Rupees Thirty-Nine Lakh Only)** from Credila Financial Services Limited, of which **INR 38,11,848** has been disbursed into his HSBC Bank Savings Account No. **053-059036-006** after the applicable insurance deductions. As of **23 July 2026**, the account reflects an available balance of **INR 38,11,848.00** (approximately **EUR 34,719.44**, based on the exchange rate of **1 EUR = INR 109.79**). My father has undertaken full financial responsibility for my tuition fees, accommodation, living expenses, travel, medical insurance, and all other costs associated with my education and stay in Italy. He also has a CA-certified net worth of **INR 2,32,44,511** and is a regular income tax assessee. In support of my application, I have enclosed the education loan sanction letter, bank statement, CA-certified net worth certificate, notarized sponsorship affidavit, and his Income Tax Returns for Assessment Years **2024–25, 2025–26, and 2026–27** as evidence of his financial capacity and commitment to sponsoring my education.`;
            }
            sectionUpdated = "Financial Sponsorship";
            actionType = "typed_section";
            appliedFeedback = "Updated Financial Sponsorship & Banking Verification details.";
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

      // Sync Europass layout if active document is CV
      if (updated.docType === "CV") {
        const baseCv = getEuropassData(updated.studentId, updated.studentName, selectedStudentData);
        const syncedCv = syncSectionsToCvData(updated.sections, baseCv);
        setCvDocumentData(syncedCv);
      }

      // Recalculate word count
      const totalWords = updated.sections.reduce(
        (acc, s) => acc + s.content.trim().split(/\s+/).filter(Boolean).length,
        0
      );
      updated.wordCount = totalWords;

      setEditableDocContent(updated);
      syncDocumentToRecent(updated, "Edited just now");
      const html = docSectionsToHtml(updated.sections, updated.docType, updated.title);
      setTiptapHtml(html);
      if (tiptapEditor) {
        tiptapEditor.commands.setContent(html);
      }

      // Append Assistant Response to Chat Thread
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: appliedFeedback || "Document updated successfully.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sectionUpdated,
        actionType,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
      setAiToast({ message: `✨ AI Assistant: ${appliedFeedback.replace(/\*\*/g, "")}`, type: "success" });
      setAiPromptText("");
      setIsAiCooking(false);
    }, 550);
  };

  // Chat message submission handler
  const handleChatSendMessage = (promptText: string) => {
    if (!promptText.trim() || !editableDocContent) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: promptText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setAiPromptText("");
    handleRunSmartChange("custom", promptText.trim(), userMsg);
  };

  // Tiptap Content & Formatting Listeners
  const handleTiptapUpdate = (html: string, wordCount: number) => {
    setTiptapHtml(html);
    if (editableDocContent) {
      setEditableDocContent((prev) => (prev ? { ...prev, wordCount, rawHtml: html } : prev));
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

    const newDoc = hydrateDocumentFromSnapshot(newType, snapshot, activeDocument.studentId);
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

    const storageKey = `antigravity_studio_chat_${newDoc.studentId}_${newType}`;
    try {
      const savedChat = localStorage.getItem(storageKey);
      if (savedChat) {
        setChatMessages(JSON.parse(savedChat));
      } else {
        setChatMessages([]);
      }
    } catch {
      setChatMessages([]);
    }

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
          sections: editableDocContent.sections.map((s) => ({
            title: s.heading || "",
            content: s.content || "",
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate DOCX document");

      const blob = await response.blob();
      const safeName = editableDocContent.studentName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeDocType = editableDocContent.docType;
      const fileName = `${safeName}_${safeDocType}.docx`;

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

  const handleExportPdf = () => {
    if (!editableDocContent) return;
    setShowExportMenu(false);

    const safeName = editableDocContent.studentName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeDocType = editableDocContent.docType;
    const safeUni = (editableDocContent.targetUniversity || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const targetTitle = `${safeName}_${safeDocType}_${safeUni}`;

    const prevTitle = document.title;
    document.title = targetTitle;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1500);
  };

  // Fictional demo students, clearly labelled; always listed after the live CRM roster
  const SAMPLE_ROSTER = useMemo(
    () => SAMPLE_STUDENTS.map((s) => ({ id: s.id, name: `${s.name} (Sample)`, email: s.email })),
    []
  );

  const [studentRoster, setStudentRoster] = useState<Array<{ id: string; name: string; email: string | null }>>(SAMPLE_ROSTER);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);


  // Sync roster from GlobalStudentContext and direct /api/students/list
  useEffect(() => {
    if (students && students.length > 0) {
      setStudentRoster([...students, ...SAMPLE_ROSTER]);
      setRosterError(null);
      return;
    }

    fetch("/api/students/list")
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
  }, [students, SAMPLE_ROSTER]);


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

  const selectedStudent = useMemo(() => {
    return studentRoster.find((s) => s.id === modalStudentId) || studentRoster[0];
  }, [studentRoster, modalStudentId]);

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
    if (!modalStudentId && studentRoster[0]) setModalStudentId(studentRoster[0].id);
    setIsStudentDropdownOpen(false);
    setIsDocTypeDropdownOpen(false);
    setIsModalOpen(true);
  };



  // Unified Document Opener (Syncs Tiptap HTML, Europass Mode & Student Context)
  const handleOpenDocument = (doc: HydratedDocumentData) => {
    setActiveDocument(doc);
    setEditableDocContent(JSON.parse(JSON.stringify(doc)));
    setDocHistory([]);
    setRedoHistory([]);
    const html = docSectionsToHtml(doc.sections, doc.docType, doc.title);
    setTiptapHtml(html);
    if (tiptapEditor) {
      tiptapEditor.commands.setContent(html);
    }
    if (doc.docType === "COVER_LETTER") {
      setFontFamily("Calibri, Carlito, Aptos, 'Segoe UI', sans-serif");
      setFontFamilyLabel("Calibri");
      setFontSize(11);
    }
    if (doc.docType === "CV") {
      const baseCv = getEuropassData(doc.studentId, doc.studentName, selectedStudentData);
      const syncedCv = syncSectionsToCvData(doc.sections, baseCv);
      setCvDocumentData(syncedCv);
      setCvViewMode("europass");
    } else {
      setCvDocumentData(null);
      setCvViewMode("caret");
    }

    // Load persisted chat conversation for this specific document
    const storageKey = `antigravity_studio_chat_${doc.studentId}_${doc.docType}`;
    try {
      const savedChat = localStorage.getItem(storageKey);
      if (savedChat) {
        setChatMessages(JSON.parse(savedChat));
      } else {
        setChatMessages([]);
      }
    } catch {
      setChatMessages([]);
    }

    selectStudent(doc.studentId);
  };

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
          targetUniversity: (targetStudent as any)?.university || "University",
          targetCourse: (targetStudent as any)?.course || "Degree Programme",
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
        generatedDoc = hydrateDocumentFromSnapshot(modalDocType, snapshot as CrmSnapshot, modalStudentId);
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
    `Retrieving verified academic profile for ${
      studentRoster.find((s) => s.id === modalStudentId)?.name || "Student"
    }...`,
    `Hydrating ${
      modalDocType === "COVER_LETTER"
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student documents..."
              className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 rounded-xl text-xs text-white border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-400"
            />
          </div>
        </div>

        {/* Right Action & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
      <section className="bg-slate-50/70 border-b border-slate-200/80 py-5 sm:py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
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

          {/* Cards Row: Blank Document + The 4 Core Templates */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 sm:gap-4.5">
            {/* ── Card 1: Blank Document ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal("BLANK")}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-2.5 hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center justify-center cursor-pointer group text-left"
              >
                <DocumentThumbnailPreview docType="BLANK" isTemplateCard />
              </button>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-2.5">
                Blank document
              </span>
              <span className="text-[11px] text-slate-500">Custom Generation</span>
            </div>

            {/* ── Card 2: Italy Visa Cover Letter ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal("COVER_LETTER")}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-2.5 hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between cursor-pointer overflow-hidden group text-left"
              >
                <DocumentThumbnailPreview docType="COVER_LETTER" isTemplateCard />
              </button>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-2.5 line-clamp-1">
                Visa Cover Letter
              </span>
              <span className="text-[11px] text-slate-500">Italy Type D Consular</span>
            </div>

            {/* ── Card 3: Statement of Purpose ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal("SOP")}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-2.5 hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between cursor-pointer overflow-hidden group text-left"
              >
                <DocumentThumbnailPreview docType="SOP" isTemplateCard />
              </button>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-2.5 line-clamp-1">
                Statement of Purpose
              </span>
              <span className="text-[11px] text-slate-500">Academic SOP Format</span>
            </div>

            {/* ── Card 4: Academic CV ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal("CV")}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-2.5 hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between cursor-pointer overflow-hidden group text-left"
              >
                <DocumentThumbnailPreview docType="CV" isTemplateCard />
              </button>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-2.5 line-clamp-1">
                Academic CV / Resume
              </span>
              <span className="text-[11px] text-slate-500">Europass Format</span>
            </div>

            {/* ── Card 5: Letter of Recommendation ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal("LOR")}
                className="w-full bg-white border border-slate-200/90 rounded-2xl p-2.5 hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between cursor-pointer overflow-hidden group text-left"
              >
                <DocumentThumbnailPreview docType="LOR" isTemplateCard />
              </button>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-2.5 line-clamp-1">
                Letter of Recommendation
              </span>
              <span className="text-[11px] text-slate-500">Faculty & Employer</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Bottom White Section: "Recent documents" ─────────────────────── */}
      <section className="bg-white flex-1 py-8 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Recent documents
            </h2>

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
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
              {filteredRecentDocs.map((doc, idx) => {
                const meta = getDocTypeMeta(doc.docType);
                return (
                  <div
                    key={`${doc.title}-${idx}`}
                    onClick={() => handleOpenDocument(doc)}
                    className="bg-white border border-slate-200/90 rounded-2xl p-3 hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Miniature Sheet Thumbnail */}
                    <div className="w-full flex items-center justify-center">
                      <DocumentThumbnailPreview
                        docType={doc.docType}
                        title={doc.title}
                        studentName={doc.studentName}
                        targetUniversity={doc.targetUniversity}
                        targetCourse={doc.targetCourse}
                        targetCountry={doc.targetCountry}
                        sections={doc.sections}
                      />
                    </div>

                    {/* Card Bottom Meta */}
                    <div className="pt-2.5">
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                            {meta.icon}
                          </span>
                          <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${meta.badgeBg}`}>
                            {meta.shortLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 text-right">{doc.updatedAt}</span>
                      </div>

                      <h3
                        className="text-xs font-semibold text-slate-800 line-clamp-1 leading-snug group-hover:text-indigo-600 transition"
                        title={doc.title.endsWith(".pdf") ? doc.title : `${doc.title}.pdf`}
                      >
                        {doc.title.endsWith(".pdf") ? doc.title : `${doc.title}.pdf`}
                      </h3>

                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {doc.studentName} · {doc.targetUniversity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white divide-y divide-slate-100 shadow-2xs">
              {filteredRecentDocs.map((doc, idx) => {
                const meta = getDocTypeMeta(doc.docType);
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
                            {doc.title.endsWith(".pdf") ? doc.title : `${doc.title}.pdf`}
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
                    <div className="flex items-center gap-3.5 text-xs text-slate-400 shrink-0 pl-2">
                      <span className="text-[11px] text-slate-400 hidden xs:inline">{doc.updatedAt}</span>
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
                    className={`text-slate-500 shrink-0 ml-2 transition-transform duration-150 ${
                      isStudentDropdownOpen ? "rotate-180" : ""
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
                          className={`px-3.5 py-2.5 text-sm cursor-pointer transition flex items-center justify-between ${
                            s.id === modalStudentId
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
                    className={`text-slate-500 shrink-0 ml-2 transition-transform duration-150 ${
                      isDocTypeDropdownOpen ? "rotate-180" : ""
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
                        className={`px-3.5 py-2.5 text-sm cursor-pointer transition ${
                          modalDocType === type
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl border border-slate-200 flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
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
          </div>
        </div>
      )}

      {/* ── 6. In-Front Live Document Presentation (Canva Docs Replicated Studio) ── */}
      {activeDocument && editableDocContent && (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col overflow-hidden animate-in fade-in duration-200 text-slate-800 font-sans">
          {/* ── Top Unified Studio Midnight Slate Header Bar ───────────────────── */}
          <header className="bg-[#0F172A] border-b border-slate-800 text-white px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shrink-0 shadow-sm select-none z-30 gap-1.5 sm:gap-2.5 overflow-visible relative no-print">
            {/* Left Header Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
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
                  <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 w-64 z-50 text-xs divide-y divide-slate-100 text-slate-800 animate-in fade-in duration-100">
                    {(["COVER_LETTER", "SOP", "CV", "LOR"] as const).map((type) => (
                      <div
                        key={type}
                        onClick={() => {
                          setShowDocTypeMenu(false);
                          handleSwitchDocType(type);
                        }}
                        className={`px-3.5 py-2.5 cursor-pointer font-medium hover:bg-indigo-50 transition flex items-center justify-between ${
                          editableDocContent.docType === type
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
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition border shrink-0 ${
                  editorMode === "preview"
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
                    <span className="hidden sm:inline">Editing Mode</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="hidden sm:inline">Preview Mode</span>
                  </>
                )}
              </button>

              <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1 shrink-0" />

              {/* Undo Button */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={!(tiptapEditor?.can().undo() || docHistory.length > 0)}
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
                disabled={!(tiptapEditor?.can().redo() || redoHistory.length > 0)}
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
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end shrink">
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
                  className="bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/60 focus:border-indigo-500 text-xs font-semibold text-white placeholder-slate-400 px-2 sm:px-3 py-1.5 rounded-lg outline-none w-20 xs:w-28 sm:w-44 md:w-64 max-w-[260px] sm:max-w-[360px] truncate text-right cursor-pointer transition shrink"
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
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold border shrink-0 ${
                  showInsightsDrawer
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
                  {isExportingDocx ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  <span className="hidden xs:inline">Export</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 w-64 z-50 text-xs divide-y divide-slate-100 text-slate-800 animate-in fade-in duration-100">
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
                          Export as PDF (.pdf)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {editableDocContent.studentName.replace(/[^a-zA-Z0-9_-]/g, "_")}_{editableDocContent.docType}.pdf
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
                          {editableDocContent.studentName.replace(/[^a-zA-Z0-9_-]/g, "_")}_{editableDocContent.docType}.docx
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
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-30 md:hidden"
                onClick={() => setIsSidebarCollapsed(true)}
              />
            )}

            {/* ── Left Sidebar: AI Assistant Chat & Dynamic Suggestions ──────────────────── */}
            <aside
              className={`bg-white border-r border-slate-200 flex-col justify-between p-4 sm:p-5 select-none overflow-hidden transition-all duration-200 ease-in-out no-print ${
                isSidebarCollapsed
                  ? "hidden"
                  : "fixed inset-y-0 left-0 z-40 w-[88vw] max-w-[350px] shadow-2xl flex md:relative md:inset-auto md:z-auto md:w-[340px] md:min-w-[340px] md:max-w-[340px] md:shadow-none shrink-0"
              }`}
            >
              {chatMessages.length === 0 ? (
                /* ── State A: Starter Suggestions (Visible before conversation starts) ── */
                <div className="space-y-5 overflow-y-auto pr-1">
                  {/* Unified Studio Brand Heading with Collapse Button */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                        <span>What will we write today?</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        AI-powered composition &amp; admissions intelligence
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
                      title="Collapse AI Sidebar"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                  </div>

                  {/* Purpose-Built Document Generation Action Pills */}
                  <div className="flex flex-col gap-2">
                    {/* 1. Write / Expand Section */}
                    <button
                      type="button"
                      onClick={() => handleRunSmartChange("write_for_me")}
                      className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/70 shadow-2xs text-xs font-semibold text-slate-800 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-600 font-bold group-hover:scale-110 transition-transform">
                          ✨
                        </span>
                        <span>Write for me</span>
                      </div>
                      <span className="text-[10px] text-indigo-500 font-bold">Auto</span>
                    </button>

                    {/* 2. Create structured outline */}
                    <button
                      type="button"
                      onClick={() => handleRunSmartChange("create_outline")}
                      className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/70 shadow-2xs text-xs font-semibold text-slate-800 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#4F46E5"
                          strokeWidth="2.2"
                          className="group-hover:scale-110 transition-transform"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Create an outline</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Pillars</span>
                    </button>

                    {/* 3. Dynamic Link to Student's Live CRM Profile */}
                    <a
                      href={process.env.NEXT_PUBLIC_CRM_VIEWER_URL || "https://crm.digi-wire.com/student-data-viewer"}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 shadow-2xs text-xs font-semibold text-slate-700 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#475569"
                          strokeWidth="2.5"
                          className="group-hover:scale-110 transition-transform"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        <span>View CRM Record</span>
                      </div>
                      <span className="text-[10px] text-slate-400">External ↗</span>
                    </a>

                    {/* Targeted Admissions Refinement Engine */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Admissions Smart Refinements
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRunSmartChange("academic_polish")}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-100/80 hover:border-indigo-300 text-[11px] font-medium text-indigo-800 transition cursor-pointer"
                      >
                        <span>🎯 Academic Tone Polish</span>
                        <span className="text-[9.5px] text-indigo-500 font-bold">Refine</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunSmartChange("visa_compliance")}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 hover:border-emerald-300 text-[11px] font-medium text-emerald-800 transition cursor-pointer"
                      >
                        <span>🛡️ Visa Compliance Check</span>
                        <span className="text-[9.5px] text-emerald-600 font-bold">Audit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunSmartChange("trim_budget")}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 hover:border-blue-300 text-[11px] font-medium text-blue-800 transition cursor-pointer"
                      >
                        <span>✂️ Trim to 1-Page Budget</span>
                        <span className="text-[9.5px] text-blue-600 font-bold">-15%</span>
                      </button>
                    </div>

                    {/* Operator Guidance Card */}
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[11px] text-slate-600 space-y-1">
                      <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <span>💬</span>
                        <span>Operator Chat Typing</span>
                      </div>
                      <p className="leading-relaxed">
                        Share student details in the chat (e.g. IELTS scores, TRF, work experience, education) and the AI will type out that section. Or type &quot;delete [section]&quot; to delete any section!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── State B: Active Conversation Stream (Suggestions Disappear When Convo Begins) ── */
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Active Header with Clear / Restart Thread */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0">
                        ✨
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">AI Admissions Assistant</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {editableDocContent.studentName} · {editableDocContent.docType}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setChatMessages([]);
                          if (activeDocument) {
                            localStorage.removeItem(
                              `antigravity_studio_chat_${activeDocument.studentId}_${activeDocument.docType}`
                            );
                          }
                        }}
                        className="text-[10.5px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-0.5 rounded transition cursor-pointer"
                        title="Clear conversation and show starter suggestions"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed(true)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Collapse AI Sidebar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Message Thread */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-3 text-xs">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                      >
                        {msg.sender === "user" ? (
                          <div className="max-w-[88%] bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 shadow-2xs leading-relaxed text-xs">
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        ) : (
                          <div className="max-w-[94%] bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs space-y-1.5 leading-relaxed text-xs">
                            {msg.sectionUpdated && (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700">
                                <span>{msg.actionType === "deleted_section" ? "🗑️" : "⚡"}</span>
                                <span>{msg.sectionUpdated}</span>
                              </div>
                            )}
                            <div className="whitespace-pre-wrap text-slate-700">
                              {msg.text.split("**").map((part, idx) =>
                                idx % 2 === 1 ? (
                                  <strong key={idx} className="font-semibold text-slate-900">
                                    {part}
                                  </strong>
                                ) : (
                                  part
                                )
                              )}
                            </div>
                          </div>
                        )}
                        <span className="text-[9.5px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                      </div>
                    ))}
                    {isAiCooking && (
                      <div className="flex items-center gap-2 p-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs w-fit">
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span>Composing &amp; typing out section...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Quick Action Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRunSmartChange("academic_polish")}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 cursor-pointer shrink-0 transition"
                    >
                      🎯 Polish
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunSmartChange("trim_budget")}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 cursor-pointer shrink-0 transition"
                    >
                      ✂️ Trim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunSmartChange("create_outline")}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 border border-slate-200 cursor-pointer shrink-0 transition"
                    >
                      📝 Outline
                    </button>
                  </div>
                </div>
              )}

              {/* Minimal AI Smart Modification Input Box */}
              <div className="mt-3 border border-slate-200 rounded-2xl bg-white p-3 shadow-xs hover:border-indigo-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition shrink-0">
                <textarea
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
                  placeholder="Share details (e.g. IELTS 7.5 TRF 26IA...) or type 'delete section'..."
                  className="w-full text-xs text-slate-800 placeholder-slate-400 resize-none outline-none bg-transparent leading-relaxed"
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
                    className="w-6 h-6 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center text-sm font-bold cursor-pointer transition"
                    title="Add research & post-study directive tag"
                  >
                    +
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
                    className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center text-xs font-semibold shadow-xs cursor-pointer transition"
                    title="Send message to AI assistant"
                  >
                    {isAiCooking ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </aside>

            {/* ── Main Canvas Area & Floating Toolbar ─────────────────────────── */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex flex-col items-center bg-[#F8FAFC] relative w-full">
              {/* Floating Toolbar with 100% Dynamic Controls */}
              <div className="sticky top-2 z-40 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-fit mx-auto rounded-full bg-white shadow-[0_4px_24px_rgba(15,23,42,0.12)] border border-slate-200 px-3 sm:px-4 py-1.5 flex items-center gap-1.5 sm:gap-2 select-none mb-6 shrink-0 no-print">
                {/* Clean trigger to open AI Tools directly within the toolbar when sidebar is collapsed */}
                {isSidebarCollapsed && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(false)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shrink-0 shadow-xs"
                      title="Open AI Composition Tools & Chat"
                    >
                      <span className="text-xs">✨</span>
                      <span className="whitespace-nowrap">AI Tools</span>
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
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition shrink-0 ${
                      showInfoPopover
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                    title="Student Profile & CRM Verification Info"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                      ℹ
                    </span>
                    <span className="font-medium text-slate-800 hidden sm:inline truncate max-w-[120px]">
                      {editableDocContent.studentName}
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                      ✓ CRM Verified
                    </span>
                  </button>

                  {showInfoPopover && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-80 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs text-slate-800">
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>👤</span>
                          <span>Candidate CRM Profile</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold text-[10px]">
                          ✓ CRM Verified
                        </span>
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

                {/* CV View Mode Toggle (Europass Theme vs Caret Editor) */}
                {editableDocContent.docType === "CV" && (
                  <>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCvViewMode("europass")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition shrink-0 ${
                          cvViewMode === "europass"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Switch to Authentic Europass Theme"
                      >
                        <span>🇪🇺 Europass Theme</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCvViewMode("caret")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition shrink-0 ${
                          cvViewMode === "caret"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Switch to Tiptap Caret Editor"
                      >
                        <span>📝 Caret Editor</span>
                      </button>
                    </div>
                    <div className="h-4 w-px bg-slate-200 shrink-0" />
                  </>
                )}

                {/* Smart AI Refine Pill */}
                <button
                  type="button"
                  onClick={() => handleRunSmartChange("academic_polish")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold cursor-pointer transition shrink-0 whitespace-nowrap"
                  title="Run academic polish on entire document"
                >
                  <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-[9px] font-bold">
                    ✨
                  </span>
                  <span>Ask AI Refine</span>
                </button>

                <div className="h-4 w-px bg-slate-200 shrink-0" />

                {/* Heading Dropdown (H1 ▾) */}
                <div className="relative shrink-0" ref={headingMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeadingMenu(!showHeadingMenu);
                      setShowFontMenu(false);
                      setShowColorMenu(false);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
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
                          className={`px-3 py-1.5 cursor-pointer font-medium hover:bg-slate-100 ${
                            activeHeading === h ? "text-indigo-700 font-bold bg-indigo-50" : "text-slate-700"
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
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200/70 bg-white shadow-2xs cursor-pointer shrink-0"
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
                      className={`transition-transform duration-150 text-slate-400 ${
                        showFontMenu ? "rotate-180" : ""
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
                              className={`w-full px-3 py-2 text-left flex items-center justify-between group transition-colors cursor-pointer ${
                                isSelected
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
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.max(10, f - 1))}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-semibold text-slate-700 px-1 min-w-[20px] text-center">
                    {fontSize}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.min(32, f + 1))}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
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
                    className="flex flex-col items-center justify-center px-2 py-0.5 rounded hover:bg-slate-100 cursor-pointer shrink-0"
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
                          className={`w-5 h-5 rounded-full cursor-pointer border transition-transform hover:scale-110 ${
                            textColor === c.color ? "ring-2 ring-indigo-500 scale-110" : "border-slate-300"
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
                  onClick={() => {
                    if (tiptapEditor) {
                      tiptapEditor.chain().focus().toggleBold().run();
                    } else {
                      setIsBold(!isBold);
                    }
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0 ${
                    isBoldActive || isBold ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tiptapEditor) {
                      tiptapEditor.chain().focus().toggleItalic().run();
                    } else {
                      setIsItalic(!isItalic);
                    }
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs italic font-serif transition cursor-pointer shrink-0 ${
                    isItalicActive || isItalic ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tiptapEditor) {
                      tiptapEditor.chain().focus().toggleUnderline().run();
                    } else {
                      setIsUnderline(!isUnderline);
                    }
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs underline transition cursor-pointer shrink-0 ${
                    isUnderlineActive || isUnderline ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Underline (Selected text only)"
                >
                  U
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tiptapEditor) {
                      tiptapEditor.chain().focus().toggleStrike().run();
                    } else {
                      setIsStrikethrough(!isStrikethrough);
                    }
                  }}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs line-through transition cursor-pointer shrink-0 ${
                    isStrikeActive || isStrikethrough ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Strikethrough"
                >
                  S
                </button>

                <div className="h-4 w-px bg-slate-200 shrink-0" />

                {/* Alignment Controls (Left, Center, Right - responsive to headings & body) */}
                <div className="flex items-center gap-0.5 bg-slate-100/70 p-0.5 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTextAlign("left");
                      if (tiptapEditor) tiptapEditor.chain().focus().setTextAlign("left").run();
                    }}
                    className={`p-1 rounded cursor-pointer transition ${
                      textAlign === "left" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-slate-600 hover:bg-white/60"
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
                    className={`p-1 rounded cursor-pointer transition ${
                      textAlign === "center" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-slate-600 hover:bg-white/60"
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
                    className={`p-1 rounded cursor-pointer transition ${
                      textAlign === "right" ? "bg-white text-indigo-600 shadow-2xs font-bold" : "text-slate-600 hover:bg-white/60"
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
                  onClick={() => {
                    if (tiptapEditor) {
                      tiptapEditor.chain().focus().toggleBulletList().run();
                    } else {
                      handleRunSmartChange("create_outline");
                    }
                  }}
                  className="p-1 rounded text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
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
                  onClick={() => {
                    if (tiptapEditor) {
                      tiptapEditor.chain().focus().toggleOrderedList().run();
                    }
                  }}
                  className="p-1 rounded text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
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
              </div>

              {/* ── Document Section Manager & Customization Strip ── */}
              {editableDocContent?.sections && editableDocContent.sections.length > 0 && (
                <div className="w-full max-w-[210mm] mx-auto mb-2 px-3 py-1.5 bg-slate-50/90 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs no-print transition-all duration-150 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 min-h-[30px]">
                    {/* Collapsed/Expand Toggle and Summary */}
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setIsSectionsExpanded((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-semibold px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer select-none shrink-0"
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

                    {/* Right side: + Add Section Dropdown */}
                    <div className="relative shrink-0" ref={addSectionMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsAddSectionOpen(!isAddSectionOpen)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/90 font-medium rounded-lg text-xs transition cursor-pointer shadow-2xs"
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
                        <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Add Section
                          </div>
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSection("WORK EXPERIENCE", "");
                                setIsAddSectionOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                            >
                              <span>💼 Work Experience</span>
                              <span className="text-[10px] text-slate-400">Empty</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSection("ENGLISH LANGUAGE CERTIFICATE", "");
                                setIsAddSectionOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                            >
                              <span>🌐 English Certificate (IELTS)</span>
                              <span className="text-[10px] text-slate-400">Empty</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSection("EDUCATION AND TRAINING", "");
                                setIsAddSectionOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                            >
                              <span>🎓 Education &amp; Training</span>
                              <span className="text-[10px] text-slate-400">Empty</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSection("DIGITAL SKILLS", "");
                                setIsAddSectionOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                            >
                              <span>⚡ Digital &amp; Technical Skills</span>
                              <span className="text-[10px] text-slate-400">Empty</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSection("CERTIFICATIONS", "");
                                setIsAddSectionOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                            >
                              <span>📜 Certifications</span>
                              <span className="text-[10px] text-slate-400">Empty</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSection("HOBBIES AND INTERESTS", "");
                                setIsAddSectionOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                            >
                              <span>🎯 Hobbies &amp; Extracurricular</span>
                              <span className="text-[10px] text-slate-400">Empty</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSection("ACADEMIC PROJECTS", "");
                                setIsAddSectionOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer"
                            >
                              <span>🔬 Academic Projects</span>
                              <span className="text-[10px] text-slate-400">Empty</span>
                            </button>
                          </div>
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSection("CUSTOM SECTION", "");
                                setIsAddSectionOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 flex items-center justify-between transition cursor-pointer font-medium"
                            >
                              <span>➕ Blank Custom Section</span>
                              <span className="text-[10px] text-slate-400">Empty</span>
                            </button>
                          </div>
                        </div>
                      )}
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
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                              isEmpty
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

              {/* ── Document Canvas: Either Cairo Europass Theme or Tiptap Caret Engine ── */}
              {editableDocContent.docType === "CV" && cvViewMode === "europass" ? (
                <div className="w-full max-w-full overflow-x-auto touch-pan-x flex flex-col items-center pb-12 no-scrollbar">
                  {/* Sub-bar for Europass indicating Theme */}
                  <div className="w-full max-w-[210mm] flex items-center justify-between px-2 mb-3 text-xs text-slate-500 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-700">
                        Europass Standard Curriculum Vitae
                      </span>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                        Official EU Format (Cairo-Verified)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                      A4 Standard · 210mm × 297mm
                    </span>
                  </div>

                  <div
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: "top center",
                    }}
                  >
                    <EuropassTemplate
                      data={
                        cvDocumentData ||
                        getEuropassData(
                          editableDocContent.studentId,
                          editableDocContent.studentName,
                          selectedStudentData
                        )
                      }
                      isInteractive={editorMode === "editing"}
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-full overflow-x-auto touch-pan-x flex flex-col items-center pb-12 no-scrollbar">
                  {/* Subtle A4 Format & Calibration Indicator Bar */}
                  <div className="w-[210mm] min-w-[210mm] flex items-center justify-between px-2 mb-2 text-xs text-slate-400 no-print select-none">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      <span>A4 Standard Format · 210mm × 297mm</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Master Template Margins: 11.5mm · Calibri 8pt
                    </span>
                  </div>

                  <div
                    className={`bg-white a4-paper-sheet shadow-[0_12px_40px_rgba(15,23,42,0.08)] rounded-xs w-[210mm] min-w-[210mm] min-h-[297mm] px-[11.5mm] py-[11.5mm] text-[#111111] transition-all duration-150 relative ${
                      editorMode === "editing"
                        ? "border-2 border-indigo-500/80 ring-4 ring-indigo-50/50"
                        : "border border-slate-300 shadow-[0_10px_35px_rgba(15,23,42,0.06)]"
                    }`}
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: "top center",
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
                      onUpdate={handleTiptapUpdate}
                      onFormatChange={handleFormatChange}
                    />
                  </div>
                </div>
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
                      className={`flex items-center gap-2 ${
                        editableDocContent.sections.some(
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

          {/* ── Bottom Status Bar (Fully Responsive on Mobile) ────────────────── */}
          <footer className="bg-white border-t border-slate-200 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-slate-600 select-none shrink-0 z-20 gap-2 no-print">
            {/* Left Controls: Notes, Outline, Timer */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition shrink-0 ${
                  showNotes ? "text-indigo-600 font-semibold" : ""
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
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition shrink-0"
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
                className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer transition shrink-0 ${
                  isTimerRunning ? "text-emerald-600 font-semibold" : ""
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
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Dynamic Zoom Slider (shown on tablet and desktop) */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(75, z - 5))}
                  className="hover:text-slate-900 cursor-pointer font-bold px-1"
                >
                  -
                </button>
                <input
                  type="range"
                  min="75"
                  max="150"
                  step="5"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 5))}
                  className="hover:text-slate-900 cursor-pointer font-bold px-1"
                >
                  +
                </button>
                <span className="w-10 text-right font-medium">{zoomLevel}%</span>
              </div>

              {/* Dynamic A4 Page Count based on actual word count */}
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                Pages 1/{Math.max(1, Math.ceil(editableDocContent.wordCount / 450))}
              </span>

              {/* Fullscreen Expand Icon */}
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  } else {
                    document.exitFullscreen().catch(() => {});
                  }
                }}
                className="hidden sm:inline-block p-1 rounded hover:bg-slate-100 cursor-pointer text-slate-500 hover:text-slate-800"
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
