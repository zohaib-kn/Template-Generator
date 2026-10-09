"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { DocumentProvider, getResumeSessionStorageKey } from "../state/DocumentContext";
import { AppHeader } from "@/components/common/AppHeader";
import { useDocumentState } from "../hooks/useDocumentState";
import { testStudentData } from "../utils/testStudentData";
import type { ResumeDraftRecord } from "../types/draft";
import { ResumeDraftsModal } from "./ResumeDraftsModal";
import { getAllResumeDrafts, saveResumeDraft } from "../lib/resumeDraftStorage";
import { usePdfGenerator } from "../hooks/usePdfGenerator";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import { mapCrmToNormalizedStudent, mapNormalizedToResume } from "@/services/normalization";
import type { NormalizedAppliedProgram, NormalizedQualification } from "@/types/normalizedStudent";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { useAcademicAlignment } from "@/features/academic-alignment/hooks/useAcademicAlignment";
import type { TransitionContext } from "@/services/academicAlignment/types";

// Guidance system
import type { ApplicationTarget } from "../guidance/types";
import { getAdmissionsGuidance } from "../guidance/getAdmissionsGuidance";

// Redesigned components
import { ResumeWorkspaceHeader } from "./ResumeWorkspaceHeader";
import { ResumeSectionSidebar, RESUME_SECTION_METADATA } from "./ResumeSectionSidebar";
import { ResumeSectionEditor } from "./ResumeSectionEditor";
import { AcademicProfileProvider } from "../context/AcademicProfileContext";
import { ResumeContextPanel } from "./ResumeContextPanel";
import { ResumeStudentDetailsModal } from "./ResumeStudentDetailsModal";
import { ResumeDeveloperToolsModal } from "./ResumeDeveloperToolsModal";
import { ResumeImportModal } from "./ResumeImportModal";
import { StudentSelectModal } from "@/features/sop-generator/components/StudentSelectModal";
import { PreviewScaler } from "../preview/PreviewScaler";
import { EuropassTemplate } from "@/templates/europass/EuropassTemplate";

/**
 * Inner shell — rendered inside DocumentProvider so it can read and update context.
 */
function GeneratorLayout() {
  const { data, loadStudent, reset } = useDocumentState();
  const {
    selectedStudentData,
    selectedStudentId,
    selectStudent,
    clearStudent: clearGlobalStudent,
    applicationTarget,
    setApplicationTarget,
    lastLoadedStudentId,
    setLastLoadedStudentId,
  } = useGlobalStudent();

  // ── Active Section Selection in Resume Structure ───────────────────────────
  const [selectedSectionId, setSelectedSectionId] = useState<string>("personalDetails");

  // ── Draft management state (initialized lazily to avoid setState in effect) ──
  const [draftCount, setDraftCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return getAllResumeDrafts().length;
  });
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeDraftStudentName, setActiveDraftStudentName] = useState<string | null>(null);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedNoticeText, setSavedNoticeText] = useState<string | null>(null);

  // ── Modals state ───────────────────────────────────────────────────────────
  const [studentSelectOpen, setStudentSelectOpen] = useState(false);
  const [studentDetailsOpen, setStudentDetailsOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // ── Collapsible sidebars & responsive layout state ─────────────────────────
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");

  // ── Application Target is read & synced directly from GlobalStudentContext ──

  const guidance = useMemo(
    () => getAdmissionsGuidance(applicationTarget),
    [applicationTarget]
  );

  // ── CRM Snapshot & Multi-Program State ─────────────────────────────────────
  const [currentSnapshot, setCurrentSnapshot] = useState<CrmSnapshot | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<NormalizedAppliedProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // Track the last loaded student ID to prevent re-processing identical payloads
  const lastLoadedStudentIdRef = useRef<string | null>(null);

  const studentFullName = data.personal?.fullName?.trim() || "";

  // ── Normalized Qualifications from Resume data ────────────────────────────
  const qualifications: NormalizedQualification[] = useMemo(() => {
    return (data.education ?? []).map((edu, idx) => {
      const extractedSubjects =
        edu.description?.match(/Subjects:\s*([^|]+)/i)?.[1]?.trim() || undefined;

      const is12th = /\b(12th|higher\s*secondary|senior\s*secondary)\b/i.test(edu.qualification || "");
      const is10th = /\b(10th|secondary)\b/i.test(edu.qualification || "");
      const levelOfStudy = is12th ? "12th" : is10th ? "10th" : undefined;

      return {
        id: edu.id || `edu-${idx}`,
        qualification: edu.qualification || "Degree",
        fieldOfStudy: edu.fieldOfStudy || edu.qualification || "General",
        institution: edu.institution,
        levelOfStudy,
        subjects: extractedSubjects,
        completionYear: edu.endDate ? edu.endDate.slice(0, 4) : undefined,
      };
    });
  }, [data.education]);

  // ── Target Program from application target or selected program ────────────
  const targetProgram: NormalizedAppliedProgram | null = useMemo(() => {
    if (!applicationTarget.intendedCourse && !applicationTarget.universityName) {
      return null;
    }
    return {
      id: selectedProgramId || "resume-target-program",
      university: applicationTarget.universityName || "Target University",
      course: applicationTarget.intendedCourse || "Target Course",
      country: applicationTarget.destinationCountry || "Target Country",
      degreeLevel: applicationTarget.degreeLevel || "Master's",
      courseCategory: applicationTarget.courseCategory || "Other",
    };
  }, [applicationTarget, selectedProgramId]);

  const effectiveStudentId =
    selectedStudentId ||
    (studentFullName ? `student-${studentFullName.toLowerCase().replace(/\s+/g, "-")}` : null);
  const effectiveProgramId = selectedProgramId || targetProgram?.id || null;

  // ── Sanitized Evidence for Academic Alignment ─────────────────────────────
  const availableCertifications = useMemo(() => {
    return (data.certifications ?? [])
      .filter((c): c is typeof c & { name: string } => Boolean(c.name && c.name.trim()))
      .map((c) => ({ id: c.id, name: c.name, issuer: c.provider }));
  }, [data.certifications]);

  const availableProjects = useMemo(() => {
    return (data.academicProjects ?? [])
      .filter((p): p is typeof p & { title: string } => Boolean(p.title && p.title.trim()))
      .map((p) => ({ id: p.id, title: p.title, description: p.description }));
  }, [data.academicProjects]);

  const availableSkills = useMemo(() => {
    return (data.skills ?? [])
      .filter((s): s is typeof s & { name: string } => Boolean(s.name && s.name.trim()))
      .map((s) => ({ id: s.id, name: s.name }));
  }, [data.skills]);

  const availableInternships = useMemo(() => {
    return (data.internships ?? [])
      .filter((i): i is typeof i & { role: string } => Boolean(i.role && i.role.trim()))
      .map((i) => ({
        id: i.id,
        role: i.role,
        organization: i.company,
        description: i.description,
      }));
  }, [data.internships]);

  // ── Academic Alignment Hook (Non-blocking Informational Engine) ───────────
  const {
    result: alignmentResult,
    isStale: isAlignmentStale,
    staleReason: alignmentStaleReason,
    confirmIntentionalTransition,
    resetResolution,
  } = useAcademicAlignment({
    studentId: effectiveStudentId,
    programId: effectiveProgramId,
    targetProgram,
    qualifications,
    workExperience: availableInternships.map((intern) => ({
      id: intern.id,
      jobTitle: intern.role,
      employer: intern.organization,
      description: intern.description,
    })),
    certifications: availableCertifications,
    academicProjects: availableProjects,
    skills: availableSkills,
    internships: availableInternships,
  });

  const [isConfirmingTransition, setIsConfirmingTransition] = useState(false);
  const handleConfirmTransition = useCallback(
    async (transitionContext: TransitionContext) => {
      setIsConfirmingTransition(true);
      try {
        const ok = await confirmIntentionalTransition(transitionContext);
        if (ok) {
          setSavedNoticeText("✓ Transition rationale recorded.");
          setTimeout(() => setSavedNoticeText(null), 3000);
        }
        return ok;
      } finally {
        setIsConfirmingTransition(false);
      }
    },
    [confirmIntentionalTransition]
  );

  // ── React to global student selection ──────────────────────────────────────
  useEffect(() => {
    if (selectedStudentData && selectedStudentId && selectedStudentId !== lastLoadedStudentId) {
      setLastLoadedStudentId(selectedStudentId);

      if (selectedStudentId === "sample-aarav-mehta") {
        queueMicrotask(() => {
          const studentStorageKey = getResumeSessionStorageKey(selectedStudentId);
          let loadedAaravData = testStudentData;
          if (typeof window !== "undefined") {
            try {
              const saved = sessionStorage.getItem(studentStorageKey);
              if (saved) {
                loadedAaravData = JSON.parse(saved);
              }
            } catch {}
          }
          loadStudent(loadedAaravData);
          setCurrentSnapshot(selectedStudentData);
          setAvailablePrograms([]);
          setSelectedProgramId("");
          setActiveDraftId(null);
          setActiveDraftStudentName(null);
        });
        return;
      }

      const source = "senior-crm-api" as const;
      const normalized = mapCrmToNormalizedStudent(selectedStudentData, { source });
      const { student, target } = mapNormalizedToResume(normalized);

      queueMicrotask(() => {
        loadStudent(student);

        if (target && Object.keys(target).length > 0) {
          setApplicationTarget(target);
        } else {
          setApplicationTarget({});
        }

        setCurrentSnapshot(selectedStudentData);
        setAvailablePrograms(normalized.applications.all);
        setSelectedProgramId(
          normalized.applications.activeProgramId ||
          normalized.applications.all[0]?.id ||
          ""
        );

        setActiveDraftId(null);
        setActiveDraftStudentName(null);
      });
    } else if (!selectedStudentId && lastLoadedStudentId !== null) {
      queueMicrotask(() => {
        setLastLoadedStudentId(null);
        setCurrentSnapshot(null);
        setAvailablePrograms([]);
        setSelectedProgramId("");
        setActiveDraftId(null);
        setActiveDraftStudentName(null);
      });
    }
  }, [selectedStudentData, selectedStudentId, lastLoadedStudentId, setLastLoadedStudentId, loadStudent, setApplicationTarget]);

  // Handle program switching when student has multiple programs
  const handleProgramChange = useCallback(
    (programId: string) => {
      if (!currentSnapshot) return;
      setSelectedProgramId(programId);

      const updatedNormalized = mapCrmToNormalizedStudent(currentSnapshot, {
        source: "senior-crm-api",
        activeProgramId: programId,
      });
      const { target: newTarget } = mapNormalizedToResume(updatedNormalized);

      if (newTarget) {
        setApplicationTarget((prev) => ({ ...prev, ...newTarget }));
      }
    },
    [currentSnapshot]
  );

  // Clear student
  const handleClearStudent = useCallback(() => {
    reset();
    clearGlobalStudent();
    setLastLoadedStudentId(null);
    setCurrentSnapshot(null);
    setAvailablePrograms([]);
    setSelectedProgramId("");
    setActiveDraftId(null);
    setActiveDraftStudentName(null);
    setSavedNoticeText("✓ Cleared student profile.");
    setTimeout(() => setSavedNoticeText(null), 3000);
  }, [reset, clearGlobalStudent, setLastLoadedStudentId]);

  // ── Draft Actions ──────────────────────────────────────────────────────────
  function handleSaveDraft() {
    setIsSavingDraft(true);
    try {
      const studentName = data.personal?.fullName?.trim() || "Unnamed Student";
      const targetUni = applicationTarget.universityName || undefined;
      const targetCourse = applicationTarget.intendedCourse || undefined;
      const destCountry = applicationTarget.destinationCountry || undefined;

      const isDifferentStudent =
        Boolean(activeDraftStudentName) &&
        activeDraftStudentName?.toLowerCase() !== studentName.toLowerCase();

      const targetDraftId = isDifferentStudent ? undefined : (activeDraftId || undefined);

      const saved = saveResumeDraft({
        id: targetDraftId,
        studentId: selectedStudentId ?? undefined,
        programId: selectedProgramId || undefined,
        studentName,
        targetUniversity: targetUni,
        intendedCourse: targetCourse,
        destinationCountry: destCountry,
        data,
        applicationTarget,
      });

      setActiveDraftId(saved.id);
      setActiveDraftStudentName(studentName);
      setDraftCount(getAllResumeDrafts().length);

      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setSavedNoticeText(`✓ Resume saved at ${timeStr}`);
      setTimeout(() => setSavedNoticeText(null), 3500);
    } catch (err) {
      console.error("[Resume Save Draft Error]:", err);
      setSavedNoticeText("⚠️ Failed to save resume draft locally.");
      setTimeout(() => setSavedNoticeText(null), 4000);
    } finally {
      setIsSavingDraft(false);
    }
  }

  function handleRestoreDraft(draft: ResumeDraftRecord) {
    loadStudent(draft.data);
    if (draft.applicationTarget) {
      setApplicationTarget(draft.applicationTarget);
    }
    setActiveDraftId(draft.id);
    setActiveDraftStudentName(draft.studentName);
    setSavedNoticeText(`✓ Restored draft for "${draft.studentName}".`);
    setTimeout(() => setSavedNoticeText(null), 3500);
  }

  function handleNewResume() {
    reset();
    clearGlobalStudent();
    lastLoadedStudentIdRef.current = null;
    setCurrentSnapshot(null);
    setAvailablePrograms([]);
    setSelectedProgramId("");
    setActiveDraftId(null);
    setActiveDraftStudentName(null);
    setSavedNoticeText("✓ Started fresh blank resume.");
    setTimeout(() => setSavedNoticeText(null), 3000);
  }

  function handleImportApplied(importedData: import("@/types").DocumentData) {
    loadStudent(importedData);
    setActiveDraftId(null);
    setActiveDraftStudentName(importedData.personal?.fullName?.trim() || null);
    setSavedNoticeText("✓ Imported resume successfully loaded into workspace.");
    setTimeout(() => setSavedNoticeText(null), 3500);
  }

  // ── PDF Generation ─────────────────────────────────────────────────────────
  const { status: pdfStatus, errorMessage: pdfErrorMessage, generate } = usePdfGenerator();
  const isGeneratingPdf = pdfStatus === "generating";

  async function handleGeneratePdf() {
    const result = await generate(data, {
      country: applicationTarget.destinationCountry,
      year: new Date().getFullYear(),
      documentType: "Resume",
    });

    if (result?.success && result?.pdfBase64 && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const docId = urlParams.get("docId") || urlParams.get("documentId");
      if (docId) {
        try {
          await fetch(`/api/documents/${docId}/pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pdfBase64: result.pdfBase64,
              fileName: result.filename,
              status: "FINALIZED",
            }),
          });
        } catch (err) {
          console.warn("[Resume PDF Server Sync Failed]:", err);
        }
      }
    }
  }

  // ── Completeness Calculation ───────────────────────────────────────────────
  const { filledCount, totalCount } = useMemo(() => {
    const p = data.personal;
    const isPersonalFilled = Boolean(p?.fullName && (p.email || p.phone || p.nationality));
    const isAboutMeFilled = Boolean(data.aboutMe && data.aboutMe.trim().length > 0);
    const isEnglishFilled = Boolean(
      data.englishCertificate?.examName || data.englishCertificate?.score
    );
    const isDeclarationFilled = Boolean(
      data.declaration && data.declaration.trim().length > 0
    );

    let filled = 0;
    if (isPersonalFilled) filled++;
    if (isAboutMeFilled) filled++;
    if ((data.education ?? []).length > 0) filled++;
    if ((data.internships ?? []).length > 0) filled++;
    if ((data.academicProjects ?? []).length > 0) filled++;
    if ((data.certifications ?? []).length > 0) filled++;
    if ((data.academicInterests ?? []).length > 0) filled++;
    if ((data.achievements ?? []).length > 0) filled++;
    if ((data.leadershipActivities ?? []).length > 0) filled++;
    if ((data.volunteering ?? []).length > 0) filled++;
    if ((data.languages ?? []).length > 0) filled++;
    if (isEnglishFilled) filled++;
    if ((data.skills ?? []).length > 0) filled++;
    if ((data.hobbies ?? []).length > 0) filled++;
    if ((data.recommendations ?? []).length > 0) filled++;
    if (isDeclarationFilled) filled++;

    return {
      filledCount: filled,
      totalCount: Object.keys(RESUME_SECTION_METADATA).length,
    };
  }, [data]);

  // Destination Summary string for header
  const destinationSummary = useMemo(() => {
    const parts = [
      applicationTarget.universityName,
      applicationTarget.intendedCourse,
      applicationTarget.destinationCountry,
    ].filter(Boolean);
    return parts.join(" · ");
  }, [applicationTarget]);

  const isStudentActive = Boolean(studentFullName || currentSnapshot);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* ── Top Application Navigation (AppHeader) ── */}
      <AppHeader />



      {/* ── Resume Workspace Header (Sibling to SOP WorkspaceHeader) ── */}
      <ResumeWorkspaceHeader
        documentTitle="Europass Resume"
        studentName={studentFullName || "Student"}
        destinationSummary={destinationSummary}
        isStudentLoaded={isStudentActive}
        availablePrograms={availablePrograms}
        selectedProgramId={selectedProgramId}
        onProgramChange={handleProgramChange}
        onOpenStudentSelect={() => setStudentSelectOpen(true)}
        onClearStudent={handleClearStudent}
        onOpenImport={() => setImportModalOpen(true)}
        filledSectionsCount={filledCount}
        totalSectionsCount={totalCount}
        isSavingDraft={isSavingDraft}
        savedNoticeText={savedNoticeText}
        onSaveDraft={handleSaveDraft}
        onOpenDrafts={() => setDraftsModalOpen(true)}
        draftCount={draftCount}
        onNewResume={handleNewResume}
        onOpenRawData={() => setStudentDetailsOpen(true)}
        onOpenDevTools={() => setDevToolsOpen(true)}
        onGeneratePdf={handleGeneratePdf}
        isGeneratingPdf={isGeneratingPdf}
        pdfErrorMessage={pdfErrorMessage}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isContextOpen={isContextOpen}
        onToggleContext={() => setIsContextOpen((v) => !v)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((v) => !v)}
        alignmentResult={alignmentResult}
        isStale={isAlignmentStale}
      />

      {/* ── Main Multi-Panel Workspace ── */}
      <AcademicProfileProvider applicationTarget={applicationTarget}>
        <div className="flex flex-1 overflow-hidden relative">
          {/* ── Left: Resume Structure Navigation Sidebar ── */}
          <ResumeSectionSidebar
            data={data}
            guidance={guidance}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
          />

          {/* ── Center: Split Workspace (Section Editor + Live Resume Preview) ── */}
          <div className="flex-1 flex overflow-hidden">
            {/* Section Editor (hidden when in preview-only mode on small screens) */}
            {viewMode !== "preview" && (
              <div
                className={`flex flex-col h-full ${
                  viewMode === "editor"
                    ? "flex-1"
                    : "w-full md:w-[460px] lg:w-[480px] xl:w-[500px] flex-shrink-0"
                }`}
              >
                <ResumeSectionEditor
                  selectedSectionId={selectedSectionId}
                  guidance={guidance}
                  onSelectSection={setSelectedSectionId}
                />
              </div>
            )}

            {/* Live Document Preview (hidden when in editor-only mode) */}
            {viewMode !== "editor" && (
              <section
                className="flex-1 overflow-y-auto overflow-x-hidden bg-preview-bg flex flex-col items-center"
                aria-label="Live A4 resume document preview"
              >
                {/* Document Preview Meta Header */}
                <div className="w-full max-w-[794px] px-6 pt-5 pb-2.5 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      Live Preview
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80 font-medium">
                      Updates live
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Europass · A4 Standard
                  </span>
                </div>

                {/* Scaled A4 Document Page */}
                <div className="w-full max-w-[794px] px-4 pb-12 flex justify-center">
                  <PreviewScaler contentWidth={794}>
                    <EuropassTemplate data={data} />
                  </PreviewScaler>
                </div>
              </section>
            )}
          </div>

          {/* ── Right: Profile & Target Context Drawer (Slide-Over, 0px in flow) ── */}
          <ResumeContextPanel
            isOpen={isContextOpen}
            onClose={() => setIsContextOpen(false)}
            data={data}
            target={applicationTarget}
            onTargetChange={setApplicationTarget}
            guidance={guidance}
            availablePrograms={availablePrograms}
            selectedProgramId={selectedProgramId}
            onProgramChange={handleProgramChange}
            onOpenStudentDetails={() => setStudentDetailsOpen(true)}
            onOpenStudentSelect={() => setStudentSelectOpen(true)}
            alignmentResult={alignmentResult}
            isStale={isAlignmentStale}
            staleReason={alignmentStaleReason}
            onConfirmIntentionalTransition={handleConfirmTransition}
            onResetResolution={resetResolution}
            isConfirmingTransition={isConfirmingTransition}
            availableCertifications={availableCertifications}
            availableProjects={availableProjects}
            availableSkills={availableSkills}
            availableInternships={availableInternships}
          />
        </div>
      </AcademicProfileProvider>

      {/* ── Modal: Select Student from CRM ── */}
      <StudentSelectModal
        isOpen={studentSelectOpen}
        onClose={() => setStudentSelectOpen(false)}
        onSelectStudent={(id) => {
          selectStudent(id);
          setStudentSelectOpen(false);
        }}
        selectedStudentId={selectedStudentId}
        onClearStudent={handleClearStudent}
      />

      {/* ── Modal: View Complete Raw Student Data ── */}
      <ResumeStudentDetailsModal
        snapshot={currentSnapshot}
        isOpen={studentDetailsOpen}
        onClose={() => setStudentDetailsOpen(false)}
      />

      {/* ── Modal: Developer Tools & Webhook Testing ── */}
      <ResumeDeveloperToolsModal
        isOpen={devToolsOpen}
        onClose={() => setDevToolsOpen(false)}
        onStudentLoaded={() => {
          setActiveDraftId(null);
          setActiveDraftStudentName(null);
        }}
      />

      {/* ── Modal: Saved Resume Drafts ── */}
      <ResumeDraftsModal
        isOpen={draftsModalOpen}
        onClose={() => setDraftsModalOpen(false)}
        onLoadDraft={handleRestoreDraft}
        onNewResume={handleNewResume}
        onDraftsChange={() => setDraftCount(getAllResumeDrafts().length)}
      />

      {/* ── Modal: Import Existing Resume (PDF / DOCX) ── */}
      <ResumeImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportApplied={handleImportApplied}
        onSaveCurrentDraft={handleSaveDraft}
        hasUnsavedChanges={filledCount > 0}
        crmSnapshot={currentSnapshot}
        applicationTarget={applicationTarget}
      />
    </div>
  );
}

/**
 * Top-level shell. RootLayout provides the persistent DocumentProvider.
 */
export function DocumentGeneratorShell() {
  return <GeneratorLayout />;
}
