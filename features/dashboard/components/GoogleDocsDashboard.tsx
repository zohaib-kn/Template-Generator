"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import { hydrateDocumentFromSnapshot, type HydratedDocumentData } from "../utils/documentHydrator";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import kaavyaSnapshot from "@/features/document-generator/utils/crmSnapshot_Kaavya.json";

// Default recent documents shown in the Google Docs dashboard
const INITIAL_RECENT_DOCS: HydratedDocumentData[] = [
  {
    title: "Kaavya Girish Nair – Statement of Purpose",
    docType: "SOP",
    docTypeName: "Statement of Purpose (SOP)",
    studentName: "Kaavya Girish Nair",
    studentId: "6a508a96af13bb33e9fc07ce",
    updatedAt: "Opened Oct 26, 2026",
    targetUniversity: "Brunel University London",
    targetCourse: "LLM International Commercial Law",
    targetCountry: "United Kingdom",
    wordCount: 780,
    route: "/sop-generator?student=6a508a96af13bb33e9fc07ce",
    sections: [
      {
        heading: "Applicant & Recipient Details",
        content: `Date: 26 October 2026\n\nFrom:\nKaavya Girish Nair\nPassport No: U4710267 | Date of Birth: 1999-05-14 | Nationality: Indian\nAddress: Navi Mumbai, Maharashtra, India - 400706\nContact: +91 98201 12345 | kaavya.nair@example.com\n\nTo:\nThe Admissions Directorate & Visa Committee\nBrunel University London\nUnited Kingdom`,
      },
      {
        heading: "Subject",
        content: "Subject: Statement of Purpose for Admission to LLM International Commercial Law at Brunel University London",
      },
      {
        heading: "1. Academic Background",
        content: "I am writing to formally present my candidature for the LLM International Commercial Law at Brunel University London. I graduated with a Bachelor of Laws (B.L.S. LL.B.) from Rizvi Law College, University of Mumbai in 2024 with a cumulative score of 62.4%. My legal curriculum cultivated rigorous analytical methodologies and statutory synthesis skills.",
      },
      {
        heading: "2. Professional Experience",
        content: "Following graduation, I served as a Junior Legal Associate at Solis & Lex (2024 to Present). In this role, I performed due diligence on commercial transactions, drafted cross-border contract briefs, and analyzed regulatory compliance requirements.",
      },
      {
        heading: "3. Motivation & Institutional Alignment",
        content: "Brunel University London's specialized commercial law curriculum and renowned faculty provide the exact platform required to master international arbitration, trade law, and corporate governance frameworks.",
      },
      {
        heading: "4. Career Objectives & Declaration",
        content: "Upon completion of the program, I plan to return to India to advise multinational organizations on cross-border transactions and statutory compliance. I confirm full financial readiness to cover all tuition and maintenance costs.",
      },
    ],
  },
  {
    title: "Aarav Mehta – Italy Visa Cover Letter",
    docType: "SOP",
    docTypeName: "Visa Cover Letter",
    studentName: "Aarav Mehta",
    studentId: "sample-aarav-mehta",
    updatedAt: "Opened Oct 24, 2026",
    targetUniversity: "Politecnico di Milano",
    targetCourse: "MSc Business Analytics",
    targetCountry: "Italy",
    wordCount: 520,
    route: "/sop-generator?student=sample-aarav-mehta",
    sections: [
      {
        heading: "Applicant Information",
        content: "Aarav Mehta | Passport: Z1982734 | Nationality: Indian\nTo: Consulate General of Italy, Visa Directorate\nSubject: Long-Term Type D Student Visa Application for Politecnico di Milano",
      },
      {
        heading: "Academic Qualifications",
        content: "Bachelor of Technology in Information Technology, securing 8.4 CGPA. Awarded scholarship for academic excellence.",
      },
    ],
  },
  {
    title: "Fardeen – Europass Academic CV",
    docType: "CV",
    docTypeName: "Europass Academic CV",
    studentName: "Fardeen",
    studentId: "69e600e750f7c6e4051f547e",
    updatedAt: "Opened Jul 24, 2024",
    targetUniversity: "ESCP Business School",
    targetCourse: "Master in Management",
    targetCountry: "France",
    wordCount: 610,
    route: "/resume-builder?student=69e600e750f7c6e4051f547e",
    sections: [
      {
        heading: "Personal Identification",
        content: "Name: Fardeen\nTarget: Master in Management, ESCP Business School, France\nLanguages: English (C1 Fluent), French (A2)",
      },
      {
        heading: "Education",
        content: "B.Com International Finance | Top 5% Cohort Ranking | Academic Merit Award",
      },
    ],
  },
  {
    title: "Aafia Ameen – Academic LOR",
    docType: "LOR",
    docTypeName: "Letter of Recommendation",
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
        heading: "Letterhead & Recommendation",
        content: "Department of Computer Science & Engineering | Academic Recommendation for Aafia Ameen\nEndorsing exceptional algorithmic reasoning and research dedication.",
      },
    ],
  },
];

export function GoogleDocsDashboard() {
  const router = useRouter();
  const { students, selectedStudentId, selectStudent } = useGlobalStudent();

  // Search & View State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [recentDocs, setRecentDocs] = useState<HydratedDocumentData[]>(INITIAL_RECENT_DOCS);

  // Modal State (2 clean dropdowns: student first, then doc type)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudentId, setModalStudentId] = useState<string>("");
  const [modalDocType, setModalDocType] = useState<"SOP" | "CV" | "LOR">("SOP");
  const [studentSearchFilter, setStudentSearchFilter] = useState("");

  // Fancy Countdown Cooking Loader State
  const [isCooking, setIsCooking] = useState(false);
  const [cookingCountdown, setCookingCountdown] = useState(3);
  const [cookingStage, setCookingStage] = useState(0);

  // In-Front Live Document Presentation State
  const [activeDocument, setActiveDocument] = useState<HydratedDocumentData | null>(null);
  const [editableDocContent, setEditableDocContent] = useState<HydratedDocumentData | null>(null);

  // Set default student when students load
  useEffect(() => {
    if (!modalStudentId && students.length > 0) {
      const defaultStudent = students.find((s) => s.id === "6a508a96af13bb33e9fc07ce") || students[0];
      setModalStudentId(defaultStudent.id);
    }
  }, [students, modalStudentId]);

  // Filter students for the dropdown
  const filteredStudents = useMemo(() => {
    if (!studentSearchFilter.trim()) return students;
    const q = studentSearchFilter.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q)
    );
  }, [students, studentSearchFilter]);

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

  // Open the creation modal
  const handleOpenModal = (presetDocType?: "SOP" | "CV" | "LOR") => {
    if (presetDocType) setModalDocType(presetDocType);
    if (!modalStudentId && students[0]) setModalStudentId(students[0].id);
    setStudentSearchFilter("");
    setIsModalOpen(true);
  };

  // Cooking Countdown & In-Front Document Generator
  const handleGenerateDocument = async () => {
    if (!modalStudentId) return;

    // Start fancy countdown cooking loader
    setIsCooking(true);
    setCookingCountdown(3);
    setCookingStage(0);

    const targetStudent = students.find((s) => s.id === modalStudentId);
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

    // Fetch student CRM data
    let snapshot: CrmSnapshot = kaavyaSnapshot as unknown as CrmSnapshot;
    try {
      const res = await fetch(`/api/student/${modalStudentId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          snapshot = json.data as CrmSnapshot;
        }
      }
    } catch {
      // Offline fallback
    }

    // After countdown completes (~2.7s), reveal generated document right in front
    setTimeout(() => {
      clearInterval(countdownInterval);
      clearInterval(stageInterval);

      // Hydrate document with all relevant details
      const generatedDoc = hydrateDocumentFromSnapshot(modalDocType, snapshot, modalStudentId);

      // Save to recent documents list
      setRecentDocs((prev) => [generatedDoc, ...prev.filter((d) => d.title !== generatedDoc.title)]);

      // Display directly in front of the operator
      setActiveDocument(generatedDoc);
      setEditableDocContent(JSON.parse(JSON.stringify(generatedDoc)));
      selectStudent(modalStudentId);

      setIsCooking(false);
      setIsModalOpen(false);
    }, 2800);
  };

  const cookingStages = [
    "Connecting to Digi-Wire CRM...",
    `Retrieving verified academic profile for ${
      students.find((s) => s.id === modalStudentId)?.name || "Student"
    }...`,
    `Hydrating ${
      modalDocType === "SOP"
        ? "Statement of Purpose"
        : modalDocType === "CV"
        ? "Europass Academic CV"
        : "Letter of Recommendation"
    } template with student data...`,
    "Compiling Google Docs live workspace...",
  ];

  return (
    <div className="min-h-screen bg-white text-[#202124] flex flex-col font-sans select-none">
      {/* ── 1. Official Google Docs Top Navigation Bar ────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#dadce0] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Google Docs Hamburger Menu */}
          <button
            type="button"
            className="p-2 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition"
            title="Main menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>

          {/* Google Docs Blue Page Icon & Brand */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90">
            <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
              <path
                d="M25 6H11C9.89543 6 9 6.89543 9 8V32C9 33.1046 9.89543 34 11 34H29C30.1046 34 31 33.1046 31 32V12L25 6Z"
                fill="#4285F4"
              />
              <path d="M25 6V12H31L25 6Z" fill="#A1C2FA" />
              <path d="M14 18H26V20H14V18Z" fill="white" />
              <path d="M14 23H26V25H14V23Z" fill="white" />
              <path d="M14 28H21V30H14V28Z" fill="white" />
            </svg>
            <span className="text-[22px] font-medium tracking-tight text-[#5f6368]">
              Docs
            </span>
          </Link>
        </div>

        {/* Central Google Search Bar */}
        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5f6368]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-11 pr-4 py-2.5 bg-[#f1f3f4] hover:bg-[#ebebeb] focus:bg-white rounded-full text-sm text-[#202124] border border-transparent focus:border-transparent focus:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] outline-none transition-all placeholder-[#5f6368]"
            />
          </div>
        </div>

        {/* Right Menu & User Avatar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition"
            title="Google apps"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          <div
            className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-semibold shadow-xs cursor-pointer"
            title="Operator Account"
          >
            OP
          </div>
        </div>
      </header>

      {/* ── 2. Top Gray Section: "Start a new document" ──────────────────────── */}
      <section className="bg-[#f1f3f4] border-b border-[#dadce0] py-6 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-[#202124]">
              Start a new document
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenModal("SOP")}
                className="flex items-center gap-1 text-sm font-medium text-[#5f6368] hover:text-[#202124] px-2 py-1 rounded hover:bg-[#e8eaed] transition"
              >
                <span>Template gallery</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z" />
                </svg>
              </button>
              <button
                type="button"
                className="p-1 rounded-full text-[#5f6368] hover:bg-[#e8eaed] transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Cards Row: Blank Document + The 3 Core Templates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {/* ── Card 1: Blank Document with Google 4-Color Plus ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="w-full h-44 bg-white border border-[#dadce0] rounded-[4px] hover:border-[#1a73e8] hover:shadow-md transition flex items-center justify-center cursor-pointer group"
              >
                {/* Official Google 4-Color Plus Icon */}
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  {/* Top: Red */}
                  <path d="M22 6V20" stroke="#EA4335" strokeWidth="4.5" strokeLinecap="round" />
                  {/* Right: Yellow */}
                  <path d="M24 22H38" stroke="#FBBC05" strokeWidth="4.5" strokeLinecap="round" />
                  {/* Bottom: Green */}
                  <path d="M22 24V38" stroke="#34A853" strokeWidth="4.5" strokeLinecap="round" />
                  {/* Left: Blue */}
                  <path d="M6 22H20" stroke="#4285F4" strokeWidth="4.5" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-sm font-medium text-[#202124] mt-2.5">
                Blank document
              </span>
            </div>

            {/* ── Card 2: Statement of Purpose (SOP / Visa Letter) ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal("SOP")}
                className="w-full h-44 bg-white border border-[#dadce0] rounded-[4px] hover:border-[#1a73e8] hover:shadow-md transition p-3 flex flex-col justify-between cursor-pointer overflow-hidden text-left"
              >
                <div className="space-y-1.5 w-full">
                  <div className="h-2 w-16 bg-[#1a73e8] rounded-xs" />
                  <div className="h-1.5 w-24 bg-[#dadce0] rounded-xs mt-2" />
                  <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                  <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                  <div className="h-1 w-4/5 bg-[#f1f3f4] rounded-xs" />
                  <div className="h-1 w-full bg-[#f1f3f4] rounded-xs mt-3" />
                  <div className="h-1 w-11/12 bg-[#f1f3f4] rounded-xs" />
                </div>
                <div className="text-[10px] text-[#5f6368] font-medium">
                  Embassy & University A4
                </div>
              </button>
              <span className="text-sm font-medium text-[#202124] mt-2.5 line-clamp-1">
                Statement of Purpose
              </span>
              <span className="text-xs text-[#5f6368]">Admissions & Visa</span>
            </div>

            {/* ── Card 3: Academic CV / Resume (Europass) ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal("CV")}
                className="w-full h-44 bg-white border border-[#dadce0] rounded-[4px] hover:border-[#1a73e8] hover:shadow-md transition p-3 flex flex-col justify-between cursor-pointer overflow-hidden text-left"
              >
                <div className="flex gap-2 w-full">
                  <div className="w-7 h-20 bg-[#f1f3f4] rounded-xs flex flex-col p-1 gap-1">
                    <div className="w-full h-1 bg-[#1a73e8] rounded-xs" />
                    <div className="w-3/4 h-1 bg-[#dadce0] rounded-xs" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 w-20 bg-[#202124] rounded-xs" />
                    <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                    <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                    <div className="h-1 w-3/4 bg-[#f1f3f4] rounded-xs" />
                    <div className="h-1.5 w-16 bg-[#dadce0] rounded-xs mt-2" />
                    <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                  </div>
                </div>
                <div className="text-[10px] text-[#5f6368] font-medium">
                  2-Column Europass Format
                </div>
              </button>
              <span className="text-sm font-medium text-[#202124] mt-2.5 line-clamp-1">
                Academic CV
              </span>
              <span className="text-xs text-[#5f6368]">Europass Standard</span>
            </div>

            {/* ── Card 4: Letter of Recommendation (LOR) ── */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenModal("LOR")}
                className="w-full h-44 bg-white border border-[#dadce0] rounded-[4px] hover:border-[#1a73e8] hover:shadow-md transition p-3 flex flex-col justify-between cursor-pointer overflow-hidden text-left"
              >
                <div className="space-y-1.5 w-full">
                  <div className="h-1.5 w-full bg-[#34A853] rounded-xs mb-2" />
                  <div className="h-1.5 w-20 bg-[#202124] rounded-xs" />
                  <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                  <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                  <div className="h-1 w-4/5 bg-[#f1f3f4] rounded-xs" />
                  <div className="h-1 w-full bg-[#f1f3f4] rounded-xs mt-3" />
                  <div className="h-1 w-2/3 bg-[#f1f3f4] rounded-xs" />
                </div>
                <div className="text-[10px] text-[#5f6368] font-medium">
                  Institutional Endorsement
                </div>
              </button>
              <span className="text-sm font-medium text-[#202124] mt-2.5 line-clamp-1">
                Letter of Recommendation
              </span>
              <span className="text-xs text-[#5f6368]">Institutional</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Bottom White Section: "Recent documents" ─────────────────────── */}
      <section className="bg-white flex-1 py-6 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-[#202124]">
              Recent documents
            </h2>

            <div className="flex items-center gap-4 text-[#5f6368]">
              {/* Owned by anyone */}
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium hover:text-[#202124] px-2 py-1 rounded hover:bg-[#f1f3f4] transition"
              >
                <span>Owned by anyone</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {/* View Toggle (Grid / List) */}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition"
                title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
              >
                {viewMode === "grid" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z" />
                  </svg>
                )}
              </button>

              {/* Sort A-Z */}
              <button
                type="button"
                className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition"
                title="Sort options"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
                </svg>
              </button>

              {/* Open File Picker (Folder) */}
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition"
                title="Open file picker"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Documents Grid / List */}
          {filteredRecentDocs.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#5f6368]">
              No documents found. Click &quot;Blank document&quot; to generate one.
            </div>
          ) : viewMode === "grid" ? (
            /* ── Grid View Matching Google Docs ── */
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-5">
              {filteredRecentDocs.map((doc, idx) => (
                <div
                  key={`${doc.title}-${idx}`}
                  onClick={() => {
                    setActiveDocument(doc);
                    setEditableDocContent(JSON.parse(JSON.stringify(doc)));
                  }}
                  className="bg-white border border-[#dadce0] rounded-[4px] hover:border-[#1a73e8] hover:shadow-md transition cursor-pointer flex flex-col justify-between overflow-hidden group"
                >
                  {/* Miniature Rendered Sheet Thumbnail */}
                  <div className="h-44 bg-[#f8f9fa] border-b border-[#dadce0] p-3 flex flex-col justify-start overflow-hidden relative">
                    <div className="bg-white shadow-2xs border border-[#e0e0e0] h-full p-2.5 rounded-xs space-y-1.5">
                      <div className="text-[9px] font-bold text-[#202124] line-clamp-1 border-b border-[#f1f3f4] pb-1">
                        {doc.studentName}
                      </div>
                      <div className="text-[7.5px] text-[#5f6368] line-clamp-1">
                        {doc.targetUniversity}
                      </div>
                      <div className="space-y-1 pt-1">
                        <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                        <div className="h-1 w-11/12 bg-[#f1f3f4] rounded-xs" />
                        <div className="h-1 w-4/5 bg-[#f1f3f4] rounded-xs" />
                        <div className="h-1 w-full bg-[#f1f3f4] rounded-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="p-3 bg-white">
                    <h3 className="text-sm font-medium text-[#202124] line-clamp-1 leading-snug">
                      {doc.title}
                    </h3>

                    <div className="flex items-center justify-between mt-2 text-xs text-[#5f6368]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Blue Google Docs Icon */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#4285F4" className="shrink-0">
                          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>

                        {/* Shared Icon */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-[#70757a]">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>

                        <span className="truncate text-[11px]">{doc.updatedAt}</span>
                      </div>

                      {/* Three-dot menu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDocument(doc);
                          setEditableDocContent(JSON.parse(JSON.stringify(doc)));
                        }}
                        className="p-1 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition shrink-0"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── List View ── */
            <div className="border-t border-[#dadce0] divide-y divide-[#dadce0]">
              {filteredRecentDocs.map((doc, idx) => (
                <div
                  key={`${doc.title}-${idx}`}
                  onClick={() => {
                    setActiveDocument(doc);
                    setEditableDocContent(JSON.parse(JSON.stringify(doc)));
                  }}
                  className="py-3 px-2 flex items-center justify-between hover:bg-[#f8f9fa] cursor-pointer transition rounded"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#4285F4" className="shrink-0">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#202124] truncate">
                        {doc.title}
                      </div>
                      <div className="text-xs text-[#5f6368] truncate">
                        {doc.studentName} · {doc.targetUniversity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-[#5f6368] shrink-0">
                    <span>{doc.updatedAt}</span>
                    <button
                      type="button"
                      className="p-1 rounded-full hover:bg-[#e8eaed]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Clean Creation Modal: 2 Dropdowns (Student First, Then Doc Type) ── */}
      {isModalOpen && !isCooking && (
        <div className="fixed inset-0 z-50 bg-[#202124]/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] max-w-md w-full shadow-[0_4px_24px_rgba(0,0,0,0.18)] border border-[#dadce0] p-6 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-lg font-medium text-[#202124] mb-4">
              New document
            </h3>

            <div className="space-y-4">
              {/* ── Dropdown 1 (FIRST): Student Selection ── */}
              <div>
                <label className="block text-xs font-medium text-[#5f6368] mb-1">
                  Student
                </label>

                {/* Instant search filter if roster is large */}
                <input
                  type="text"
                  value={studentSearchFilter}
                  onChange={(e) => setStudentSearchFilter(e.target.value)}
                  placeholder="Type to filter students..."
                  className="w-full px-3 py-1.5 text-xs border border-[#dadce0] rounded-[4px] mb-1.5 outline-none focus:border-[#1a73e8]"
                />

                <select
                  value={modalStudentId}
                  onChange={(e) => setModalStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-[#202124] bg-white border border-[#dadce0] rounded-[4px] outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                >
                  <option value="" disabled>
                    Select a student...
                  </option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.email ? `(${s.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Dropdown 2 (SECOND): Document Type Selection ── */}
              <div>
                <label className="block text-xs font-medium text-[#5f6368] mb-1">
                  Document type
                </label>
                <select
                  value={modalDocType}
                  onChange={(e) => setModalDocType(e.target.value as "SOP" | "CV" | "LOR")}
                  className="w-full px-3 py-2 text-sm text-[#202124] bg-white border border-[#dadce0] rounded-[4px] outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                >
                  <option value="SOP">Statement of Purpose (SOP) / Visa Letter</option>
                  <option value="CV">Europass Academic CV / Resume</option>
                  <option value="LOR">Academic Letter of Recommendation (LOR)</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-[4px] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateDocument}
                disabled={!modalStudentId}
                className="px-5 py-2 text-sm font-medium text-white bg-[#1a73e8] hover:bg-[#1557b0] disabled:bg-[#dadce0] rounded-[4px] shadow-xs transition cursor-pointer"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Fancy Countdown Cooking Loader ─────────────────────────────────── */}
      {isCooking && (
        <div className="fixed inset-0 z-50 bg-[#202124]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl border border-[#dadce0] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Fancy Circular Animated Countdown Ring */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-5">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#f1f3f4"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#1a73e8"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="264"
                  strokeDashoffset={(264 * (cookingCountdown - 1)) / 3}
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Countdown Digits */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-[#1a73e8] tracking-tight">
                  {cookingCountdown}s
                </span>
                <span className="text-[10px] text-[#5f6368] font-medium uppercase tracking-wider">
                  Cooking
                </span>
              </div>
            </div>

            {/* Operator Feedback & Cooking Stage */}
            <h4 className="text-base font-semibold text-[#202124] mb-1">
              Preparing Document
            </h4>
            <p className="text-xs text-[#1a73e8] font-medium mb-3">
              {modalDocType === "SOP"
                ? "Statement of Purpose"
                : modalDocType === "CV"
                ? "Europass Academic CV"
                : "Letter of Recommendation"}
            </p>

            <div className="w-full bg-[#f1f3f4] rounded-lg p-2.5 text-xs text-[#5f6368] min-h-[44px] flex items-center justify-center">
              <span className="animate-pulse">
                {cookingStages[cookingStage] || "Finalizing document..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. In-Front Live Document Presentation (Google Docs Live View) ─────── */}
      {activeDocument && editableDocContent && (
        <div className="fixed inset-0 z-50 bg-[#f8f9fa] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Top Google Docs Editor Header */}
          <header className="bg-white border-b border-[#dadce0] px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {/* Google Docs Blue Icon */}
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <path
                  d="M25 6H11C9.89543 6 9 6.89543 9 8V32C9 33.1046 9.89543 34 11 34H29C30.1046 34 31 33.1046 31 32V12L25 6Z"
                  fill="#4285F4"
                />
                <path d="M25 6V12H31L25 6Z" fill="#A1C2FA" />
                <path d="M14 18H26V20H14V18Z" fill="white" />
                <path d="M14 23H26V25H14V23Z" fill="white" />
                <path d="M14 28H21V30H14V28Z" fill="white" />
              </svg>

              <div>
                <input
                  type="text"
                  value={editableDocContent.title}
                  onChange={(e) =>
                    setEditableDocContent({
                      ...editableDocContent,
                      title: e.target.value,
                    })
                  }
                  className="text-base font-medium text-[#202124] px-1 py-0.5 rounded hover:border hover:border-[#dadce0] focus:border-[#1a73e8] outline-none"
                />
                <div className="flex items-center gap-3 text-xs text-[#5f6368] px-1">
                  <span>File</span>
                  <span>Edit</span>
                  <span>View</span>
                  <span>Insert</span>
                  <span>Format</span>
                  <span>Tools</span>
                  <span className="text-emerald-700 font-medium">✓ Saved to Drive</span>
                </div>
              </div>
            </div>

            {/* Quick Actions (Full Studio, Print, Close) */}
            <div className="flex items-center gap-2">
              <Link
                href={activeDocument.route}
                className="px-3 py-1.5 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-[4px] shadow-xs transition"
              >
                Open Full Studio →
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-medium text-[#202124] hover:bg-[#f1f3f4] border border-[#dadce0] rounded-[4px] transition"
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setActiveDocument(null)}
                className="px-3 py-1.5 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-[4px] transition"
              >
                Close
              </button>
            </div>
          </header>

          {/* Google Docs Toolbar */}
          <div className="bg-[#edf2fa] border-b border-[#dadce0] px-4 py-1.5 flex items-center gap-2 text-xs text-[#5f6368] overflow-x-auto shrink-0">
            <button type="button" className="p-1 rounded hover:bg-white/80" title="Undo">↶</button>
            <button type="button" className="p-1 rounded hover:bg-white/80" title="Redo">↷</button>
            <button type="button" className="p-1 rounded hover:bg-white/80" title="Print" onClick={() => window.print()}>🖨️</button>
            <div className="h-4 w-px bg-[#dadce0] mx-1" />
            <span className="px-2 py-0.5 bg-white rounded border border-[#dadce0] text-[11px]">100%</span>
            <div className="h-4 w-px bg-[#dadce0] mx-1" />
            <span className="px-2 py-0.5 bg-white rounded border border-[#dadce0] text-[11px] font-medium">Normal text</span>
            <span className="px-2 py-0.5 bg-white rounded border border-[#dadce0] text-[11px] font-medium">Arial</span>
            <span className="px-2 py-0.5 bg-white rounded border border-[#dadce0] text-[11px]">11</span>
            <div className="h-4 w-px bg-[#dadce0] mx-1" />
            <button type="button" className="p-1 rounded hover:bg-white/80 font-bold">B</button>
            <button type="button" className="p-1 rounded hover:bg-white/80 italic">I</button>
            <button type="button" className="p-1 rounded hover:bg-white/80 underline">U</button>
            <div className="h-4 w-px bg-[#dadce0] mx-1" />
            <span className="text-[11px] text-slate-500">{activeDocument.wordCount} words</span>
          </div>

          {/* The Physical A4 Sheet Presented In Front */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#f8f9fa]">
            <div
              className="bg-white shadow-[0_1px_3px_1px_rgba(60,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)] border border-[#dadce0] w-[210mm] min-h-[297mm] p-12 text-[#202124] space-y-6 leading-relaxed"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {editableDocContent.sections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  {section.heading && (
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#1a73e8] border-b border-[#dadce0] pb-1">
                      {section.heading}
                    </h4>
                  )}
                  <textarea
                    rows={Math.max(2, section.content.split("\n").length + 1)}
                    value={section.content}
                    onChange={(e) => {
                      const updated = { ...editableDocContent };
                      updated.sections[idx].content = e.target.value;
                      setEditableDocContent(updated);
                    }}
                    className="w-full text-[13px] text-[#202124] leading-relaxed resize-none border-none outline-none focus:bg-blue-50/20 rounded p-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
