"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import { SEED_TEMPLATES } from "@/services/templateEngine/seedTemplates";
import type { TemplateRecord } from "@/models/Template";

export function GoogleDocsDashboard() {
  const router = useRouter();
  const { students, selectedStudentId, selectStudent, applicationTarget } = useGlobalStudent();

  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateRecord>(SEED_TEMPLATES[0]);
  const [modalStudentId, setModalStudentId] = useState<string>(selectedStudentId || "");
  const [modalStudentSearch, setModalStudentSearch] = useState<string>("");
  const [selectedDocCategory, setSelectedDocCategory] = useState<"SOP_VISA" | "RESUME" | "LOR">("SOP_VISA");
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredModalStudents = useMemo(() => {
    if (!modalStudentSearch.trim()) return students;
    const q = modalStudentSearch.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q)
    );
  }, [students, modalStudentSearch]);

  // Mock / cached recent student document history for the dashboard grid
  const recentDocuments = useMemo(() => {
    return [
      {
        id: "DOC-AARAV-SOP-01",
        studentName: "Aarav Mehta",
        studentId: "6a508a96af13bb33e9fc07ce",
        documentType: "VISA_COVER_LETTER",
        templateName: "Italy – Long-Term Type D Student Visa Cover Letter",
        target: "MSc Business Analytics · Politecnico di Milano, Italy",
        updatedAt: "Today, 4:12 PM",
        status: "FINALIZED",
        wordCount: 420,
        route: "/sop-generator?student=6a508a96af13bb33e9fc07ce",
      },
      {
        id: "DOC-KAAVYA-CV-02",
        studentName: "Kaavya",
        studentId: "69e600e750f7c6e4051f547e",
        documentType: "RESUME",
        templateName: "Europass Academic CV",
        target: "Master in Management · ESCP Business School, France",
        updatedAt: "Yesterday",
        status: "DRAFT",
        wordCount: 580,
        route: "/?student=69e600e750f7c6e4051f547e",
      },
      {
        id: "DOC-AAFIA-SOP-03",
        studentName: "Aafia Ameen",
        studentId: "sample-aafia-ameen",
        documentType: "SOP",
        templateName: "University Statement of Purpose (Admissions Standard)",
        target: "MSc Computer Science · Imperial College London, UK",
        updatedAt: "Oct 24, 2026",
        status: "FINALIZED",
        wordCount: 750,
        route: "/sop-generator?student=sample-aafia-ameen",
      },
    ];
  }, []);

  const filteredDocs = recentDocuments.filter((doc) => {
    const matchesFilter = activeFilter === "ALL" || doc.documentType === activeFilter;
    const matchesSearch =
      doc.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.templateName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleOpenLaunchModal = (tpl?: TemplateRecord) => {
    const targetTpl = tpl || SEED_TEMPLATES[0];
    setSelectedTemplate(targetTpl);
    if (targetTpl.documentType === "RESUME") {
      setSelectedDocCategory("RESUME");
    } else if (targetTpl.documentType === "LOR") {
      setSelectedDocCategory("LOR");
    } else {
      setSelectedDocCategory("SOP_VISA");
    }
    setModalStudentSearch("");
    setModalStudentId(selectedStudentId || (students[0]?.id ?? "6a508a96af13bb33e9fc07ce"));
    setIsLaunchModalOpen(true);
  };

  const handleLaunchDocument = () => {
    if (!modalStudentId) return;
    setIsGenerating(true);
    selectStudent(modalStudentId);

    // Route deterministically based on document type
    setTimeout(() => {
      setIsGenerating(false);
      setIsLaunchModalOpen(false);
      if (selectedTemplate.documentType === "RESUME") {
        router.push(`/resume-builder?student=${modalStudentId}&template=${selectedTemplate.id}`);
      } else if (selectedTemplate.documentType === "LOR") {
        router.push(`/lor-generator?student=${modalStudentId}&template=${selectedTemplate.id}`);
      } else {
        router.push(`/sop-generator?student=${modalStudentId}&template=${selectedTemplate.id}`);
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col">
      {/* ── Top Google-style Navigation Bar ──────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg ai-magic-gradient flex items-center justify-center text-white font-bold text-lg shadow-sm">
            T
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 tracking-tight leading-none">
              Template Generator
            </h1>
            <span className="text-xs text-slate-400 font-medium">Admissions & Visa Studio</span>
          </div>
        </div>

        {/* Search input in header */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, university, or document..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white rounded-full text-sm border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/templates"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            Admin Studio
          </Link>
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
            OP
          </div>
        </div>
      </header>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-10">
        {/* ── Section 1: Start a New Document (Template Gallery) ──────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Start a New Document
              </h2>
              <p className="text-xs text-slate-400">
                Pick a certified, invariant skeleton. Structure is locked; student data is auto-infilled.
              </p>
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              4 Certified Templates Ready
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {/* [+] Start Blank / Custom Card */}
            <div
              onClick={() => handleOpenLaunchModal(SEED_TEMPLATES[0])}
              className="template-gallery-card group bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 min-h-[170px]"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-800 text-center">New Document</span>
              <span className="text-[11px] text-slate-400 mt-1">2-Click Infill</span>
            </div>

            {/* Template 1: Italy Visa Cover Letter */}
            <div
              onClick={() => handleOpenLaunchModal(SEED_TEMPLATES[0])}
              className="template-gallery-card bg-white border border-slate-200 rounded-xl p-3 flex flex-col cursor-pointer min-h-[170px]"
            >
              <div className="w-full h-24 bg-gradient-to-b from-slate-50 to-slate-100 rounded-md border border-slate-200/60 p-2.5 flex flex-col justify-between mb-2">
                <div className="space-y-1">
                  <div className="w-12 h-1.5 bg-blue-400 rounded-full"></div>
                  <div className="w-20 h-1 bg-slate-300 rounded-full"></div>
                  <div className="w-16 h-1 bg-slate-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded">Italy Type D</span>
                  <span>1 Page</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-800 line-clamp-1">Italy Visa Letter</span>
              <span className="text-[11px] text-slate-400">Embassy Certified</span>
            </div>

            {/* Template 2: University Admissions SOP */}
            <div
              onClick={() => handleOpenLaunchModal(SEED_TEMPLATES[1])}
              className="template-gallery-card bg-white border border-slate-200 rounded-xl p-3 flex flex-col cursor-pointer min-h-[170px]"
            >
              <div className="w-full h-24 bg-gradient-to-b from-slate-50 to-slate-100 rounded-md border border-slate-200/60 p-2.5 flex flex-col justify-between mb-2">
                <div className="space-y-1">
                  <div className="w-16 h-1.5 bg-purple-400 rounded-full"></div>
                  <div className="w-24 h-1 bg-slate-300 rounded-full"></div>
                  <div className="w-20 h-1 bg-slate-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="bg-purple-50 text-purple-700 font-medium px-1.5 py-0.5 rounded">Admissions</span>
                  <span>2 Pages</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-800 line-clamp-1">University SOP</span>
              <span className="text-[11px] text-slate-400">Academic Standard</span>
            </div>

            {/* Template 3: Europass Resume */}
            <div
              onClick={() => handleOpenLaunchModal(SEED_TEMPLATES[2])}
              className="template-gallery-card bg-white border border-slate-200 rounded-xl p-3 flex flex-col cursor-pointer min-h-[170px]"
            >
              <div className="w-full h-24 bg-gradient-to-b from-slate-50 to-slate-100 rounded-md border border-slate-200/60 p-2.5 flex flex-col justify-between mb-2">
                <div className="flex gap-2">
                  <div className="w-5 h-6 bg-blue-200 rounded-xs"></div>
                  <div className="space-y-1 flex-1">
                    <div className="w-12 h-1 bg-slate-400 rounded-full"></div>
                    <div className="w-16 h-1 bg-slate-300 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="bg-amber-50 text-amber-700 font-medium px-1.5 py-0.5 rounded">Europass</span>
                  <span>CV Format</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-800 line-clamp-1">Europass Resume</span>
              <span className="text-[11px] text-slate-400">EU Standard</span>
            </div>

            {/* Template 4: Academic LOR */}
            <div
              onClick={() => handleOpenLaunchModal(SEED_TEMPLATES[3])}
              className="template-gallery-card bg-white border border-slate-200 rounded-xl p-3 flex flex-col cursor-pointer min-h-[170px]"
            >
              <div className="w-full h-24 bg-gradient-to-b from-slate-50 to-slate-100 rounded-md border border-slate-200/60 p-2.5 flex flex-col justify-between mb-2">
                <div className="space-y-1">
                  <div className="w-14 h-1.5 bg-emerald-400 rounded-full"></div>
                  <div className="w-20 h-1 bg-slate-300 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded">HOD / Prof</span>
                  <span>Letterhead</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-800 line-clamp-1">Academic LOR</span>
              <span className="text-[11px] text-slate-400">Professor Endorsement</span>
            </div>
          </div>
        </section>

        {/* ── Section 2: Recent Documents History Grid ────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Recent Student Documents
            </h2>

            {/* Document Type Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "SOP", "VISA_COVER_LETTER", "RESUME", "LOR"].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                    activeFilter === type
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {type === "ALL"
                    ? "All Files"
                    : type === "VISA_COVER_LETTER"
                    ? "Visa Letters"
                    : type}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Grid / Table */}
          {filteredDocs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-sm text-slate-500">No matching student documents found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          doc.status === "FINALIZED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {doc.status}
                      </span>
                      <span className="text-xs text-slate-400">{doc.updatedAt}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                      {doc.studentName}
                    </h3>
                    <p className="text-xs font-medium text-blue-600 mt-0.5">{doc.templateName}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">{doc.target}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{doc.wordCount} words</span>
                    <Link
                      href={doc.route}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                    >
                      Open Live Studio →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── 2-Click Launch Modal with Document Choice & Searchable Student Roster ── */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Create New Document
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pick document type & student profile for instant deterministic hydration.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* ── STEP 1: Select Document Type (2 Core Categories) ── */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    1. Choose Document Type
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                    {/* Option 1: Statement of Purpose / Visa Cover Letter */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDocCategory("SOP_VISA");
                        setSelectedTemplate(SEED_TEMPLATES[0]);
                      }}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        selectedDocCategory === "SOP_VISA"
                          ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">📄</span>
                        {selectedDocCategory === "SOP_VISA" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-slate-900">SOP & Visa Letter</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Admissions SOP or Embassy Letter</div>
                      </div>
                    </button>

                    {/* Option 2: Academic Resume / CV */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDocCategory("RESUME");
                        setSelectedTemplate(SEED_TEMPLATES[2]);
                      }}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        selectedDocCategory === "RESUME"
                          ? "border-purple-600 bg-purple-50/70 ring-2 ring-purple-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">💼</span>
                        {selectedDocCategory === "RESUME" && (
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-slate-900">Academic CV / Resume</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Europass 2-Column Academic CV</div>
                      </div>
                    </button>
                  </div>

                  {/* Sub-template radio pill switcher */}
                  {selectedDocCategory === "SOP_VISA" && (
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate(SEED_TEMPLATES[0])}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-left text-xs transition border ${
                          selectedTemplate.id === SEED_TEMPLATES[0].id
                            ? "bg-white border-blue-500 shadow-xs font-semibold text-blue-900"
                            : "border-transparent text-slate-600 hover:bg-white/60"
                        }`}
                      >
                        <span className="font-semibold">🇮🇹 Italy Visa Letter</span>
                        <span className="text-[10px] text-slate-400 block">1-Page Embassy A4</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate(SEED_TEMPLATES[1])}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-left text-xs transition border ${
                          selectedTemplate.id === SEED_TEMPLATES[1].id
                            ? "bg-white border-blue-500 shadow-xs font-semibold text-blue-900"
                            : "border-transparent text-slate-600 hover:bg-white/60"
                        }`}
                      >
                        <span className="font-semibold">🎓 University SOP</span>
                        <span className="text-[10px] text-slate-400 block">Academic Admissions</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ── STEP 2: Searchable Student Dropdown ── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Select Student Profile (Searchable CRM)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {students.length} students loaded
                    </span>
                  </div>

                  {/* Live Search Input */}
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={modalStudentSearch}
                      onChange={(e) => setModalStudentSearch(e.target.value)}
                      placeholder="🔍 Type student name or email to filter..."
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                    {modalStudentSearch && (
                      <button
                        type="button"
                        onClick={() => setModalStudentSearch("")}
                        className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Scrollable Student Roster */}
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-2xs">
                    {filteredModalStudents.map((s) => {
                      const isSelected = modalStudentId === s.id;
                      const initials = s.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "ST";
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setModalStudentId(s.id)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between transition cursor-pointer ${
                            isSelected ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{s.name}</div>
                              {s.email && <div className="text-[10px] text-slate-400 truncate">{s.email}</div>}
                            </div>
                          </div>
                          {isSelected ? (
                            <span className="text-blue-600 font-bold text-xs shrink-0">✓ Selected</span>
                          ) : (
                            <span className="text-[10px] text-slate-400 shrink-0">Select</span>
                          )}
                        </button>
                      );
                    })}

                    {filteredModalStudents.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No students match &quot;{modalStudentSearch}&quot;.
                      </div>
                    )}
                  </div>

                  {/* Quick-Pick Benchmark Personas */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Quick benchmarks:</span>
                    <button
                      type="button"
                      onClick={() => setModalStudentId("6a508a96af13bb33e9fc07ce")}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                        modalStudentId === "6a508a96af13bb33e9fc07ce"
                          ? "bg-blue-600 text-white border-blue-600 font-semibold"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Aarav Mehta (Italy)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalStudentId("69e600e750f7c6e4051f547e")}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                        modalStudentId === "69e600e750f7c6e4051f547e"
                          ? "bg-blue-600 text-white border-blue-600 font-semibold"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Kaavya (France)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLaunchModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLaunchDocument}
                disabled={!modalStudentId || isGenerating}
                className="ai-magic-btn px-5 py-2 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Infilling Data...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Launch {selectedTemplate.name.split(" ")[0]} Studio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
