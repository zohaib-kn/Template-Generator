"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type {
  ReviewStatus,
  StudentDocumentContext,
  SopDraftRecord,
  DataSource,
  SopDocumentType,
} from "../types/sop-generator";
import type { NormalizedAppliedProgram } from "@/types/normalizedStudent";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { SectionSidebar } from "./SectionSidebar";
import { SectionEditor } from "./SectionEditor";
import { ContextPanel } from "./ContextPanel";
import { DocumentPreview } from "./DocumentPreview";
import { StudentDetailsModal } from "./StudentDetailsModal";
import type { SopStudentLoadedPayload } from "./SopStudentLoader";
import { getApplication, getStudentDocumentContext } from "../lib/applicationService";
import { getDefaultTemplate, getTemplate } from "../lib/templateRegistry";
import { validateDocumentContext, hasErrors } from "../lib/validateDocumentContext";
import { interpolate } from "../lib/interpolateTemplate";
import { useSopPdfGenerator } from "../hooks/useSopPdfGenerator";
import { AppHeader } from "@/components/common/AppHeader";
import { SopDraftsModal } from "./SopDraftsModal";
import { getAllDrafts, saveDraft } from "../lib/sopDraftStorage";
import { calculateDocumentWordCount } from "../lib/wordCount";
import { useGlobalStudent } from "@/lib/context/GlobalStudentContext";
import { mapCrmToNormalizedStudent, mapNormalizedToSop } from "@/services/normalization";
import { StudentDropdown } from "@/components/common/StudentDropdown";
import { StudentSelectModal } from "./StudentSelectModal";

/**
 * Parses markdown bold (**text**) into <strong> elements for rich embassy-grade rendering.
 */
function renderFormatted(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: "#111827" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export interface SopWorkspaceProps {
  initialDraft?: SopDraftRecord;
}

export function SopWorkspace({ initialDraft }: SopWorkspaceProps = {}) {
  // ── Document Type & Template ──────────────────────────────────────────────
  const [activeDocumentType, setActiveDocumentType] = useState<SopDocumentType>(() => {
    if (initialDraft?.documentType) return initialDraft.documentType;
    if (initialDraft?.templateId === "university-sop-standard") return "UNIVERSITY_SOP";
    return "VISA_COVER_LETTER";
  });

  const application = useMemo(() => getApplication(), []);
  const template = useMemo(() => {
    if (initialDraft?.templateId && initialDraft.documentType === activeDocumentType) {
      try {
        return getTemplate(initialDraft.templateId);
      } catch {
        return getDefaultTemplate(activeDocumentType);
      }
    }
    return getDefaultTemplate(activeDocumentType);
  }, [activeDocumentType, initialDraft]);

  const testCtx = useMemo(() => getStudentDocumentContext(), []);
  const sections = template.sections;
  const firstSectionId = sections.slice().sort((a, b) => a.order - b.order)[0]?.id ?? null;

  // ── Dynamic student context ───────────────────────────────────────────────
  const [ctx, setCtx] = useState<StudentDocumentContext>(() => initialDraft?.ctx ?? testCtx);
  const [currentSource, setCurrentSource] = useState<DataSource>(
    () => initialDraft?.currentSource ?? (initialDraft ? "live-crm" : "test-data")
  );
  const [loadedStudentName, setLoadedStudentName] = useState<string | undefined>(
    () => initialDraft?.loadedStudentName ?? initialDraft?.studentName
  );
  const [useSampleData, setUseSampleData] = useState<boolean>(
    () => Boolean(initialDraft) || false
  );

  const isStudentLoaded = currentSource !== "test-data";

  // Global student context
  const { selectedStudentData, selectedStudentId, selectStudent, clearStudent: clearGlobalStudent } = useGlobalStudent();
  const [currentSnapshot, setCurrentSnapshot] = useState<CrmSnapshot | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<NormalizedAppliedProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  // ── Overwrite-confirmation modal ──────────────────────────────────────────
  const [pendingPayload, setPendingPayload] = useState<SopStudentLoadedPayload | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(firstSectionId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [studentDetailsOpen, setStudentDetailsOpen] = useState(false);
  const [isStudentSelectOpen, setIsStudentSelectOpen] = useState(false);
  const [isContextCollapsed, setIsContextCollapsed] = useState(false);
  const [savedNoticeText, setSavedNoticeText] = useState<string | null>(
    initialDraft ? `Document ${initialDraft.id} loaded` : null
  );
  const [docApproved, setDocApproved] = useState(initialDraft?.docApproved ?? false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [recoveryBanner, setRecoveryBanner] = useState<SopDraftRecord | null>(null);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
  const [isGeneratingAllAi, setIsGeneratingAllAi] = useState(false);
  const [aiBannerNotice, setAiBannerNotice] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);

  // Per-document-type isolated session storage
  const [sectionContentsByType, setSectionContentsByType] = useState<Record<SopDocumentType, Record<string, string>>>(() => {
    const visaTemplate = getDefaultTemplate("VISA_COVER_LETTER");
    const sopTemplate = getDefaultTemplate("UNIVERSITY_SOP");
    const visaBase = Object.fromEntries(visaTemplate.sections.map((s) => [s.id, s.content]));
    const sopBase = Object.fromEntries(sopTemplate.sections.map((s) => [s.id, s.content]));

    const isSopDraft = initialDraft?.documentType === "UNIVERSITY_SOP" || initialDraft?.templateId === "university-sop-standard";
    return {
      VISA_COVER_LETTER: isSopDraft ? visaBase : { ...visaBase, ...(initialDraft?.sectionContents ?? {}) },
      UNIVERSITY_SOP: isSopDraft ? { ...sopBase, ...(initialDraft?.sectionContents ?? {}) } : sopBase,
    };
  });

  const [sectionStatusesByType, setSectionStatusesByType] = useState<Record<SopDocumentType, Record<string, ReviewStatus>>>(() => {
    const visaTemplate = getDefaultTemplate("VISA_COVER_LETTER");
    const sopTemplate = getDefaultTemplate("UNIVERSITY_SOP");
    const visaBase = Object.fromEntries(visaTemplate.sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus]));
    const sopBase = Object.fromEntries(sopTemplate.sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus]));

    const isSopDraft = initialDraft?.documentType === "UNIVERSITY_SOP" || initialDraft?.templateId === "university-sop-standard";
    return {
      VISA_COVER_LETTER: isSopDraft ? visaBase : { ...visaBase, ...(initialDraft?.sectionStatuses ?? {}) },
      UNIVERSITY_SOP: isSopDraft ? { ...sopBase, ...(initialDraft?.sectionStatuses ?? {}) } : sopBase,
    };
  });

  const sectionContents = sectionContentsByType[activeDocumentType] ?? {};
  const sectionStatuses = sectionStatusesByType[activeDocumentType] ?? {};

  // Has counsellor made any edits in active document?
  const hasEdits = useMemo(() => {
    return sections.some(
      (s) =>
        sectionStatuses[s.id] !== "NOT_REVIEWED" ||
        sectionContents[s.id] !== s.content
    );
  }, [sections, sectionStatuses, sectionContents]);

  // ── Validation (reactive on ctx & activeDocumentType) ─────────────────────
  const [validationRefreshKey, setValidationRefreshKey] = useState(0);
  const validation = useMemo(
    () => validateDocumentContext(ctx, activeDocumentType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx, activeDocumentType, validationRefreshKey]
  );

  const handleRefreshValidation = useCallback(() => {
    setValidationRefreshKey((prev) => prev + 1);
  }, []);

  // ── PDF Generator Hook ────────────────────────────────────────────────────
  const {
    status: pdfStatus,
    errorMessage: pdfError,
    downloadPdf,
  } = useSopPdfGenerator();
  const isGeneratingPdf = pdfStatus === "generating";

  // Check saved drafts on initial mount
  useEffect(() => {
    const all = getAllDrafts();
    setDraftCount(all.length);
    if (all.length > 0) {
      setRecoveryBanner(all[0]);
    }
  }, []);

  // Derived state
  const requiredSections = sections.filter((s) => s.required);
  const approvedCount = requiredSections.filter(
    (s) => sectionStatuses[s.id] === "APPROVED"
  ).length;

  const documentHasErrors = hasErrors(validation);
  const canApproveDocument =
    approvedCount >= requiredSections.length && !documentHasErrors;

  const totalWordCount = useMemo(
    () => calculateDocumentWordCount(sections, sectionContents, ctx),
    [sections, sectionContents, ctx]
  );

  // ── Apply loaded student payload ──────────────────────────────────────────
  const applyStudentPayload = useCallback(
    (payload: SopStudentLoadedPayload) => {
      setCtx(payload.ctx);
      setCurrentSource(payload.source);
      setLoadedStudentName(payload.studentName);
      setAvailablePrograms(payload.availablePrograms ?? []);
      setSelectedProgramId(payload.selectedProgramId ?? "");
      setUseSampleData(true);

      // Reset narrative sections to fresh template values for active document type
      setSectionContentsByType((prev) => {
        const nextActive = { ...prev[activeDocumentType] };
        sections.forEach((s) => {
          if (s.regeneratable || s.source === "AI_SUGGESTED" || s.source === "HYBRID") {
            nextActive[s.id] = s.content;
          }
        });
        return {
          ...prev,
          [activeDocumentType]: nextActive,
        };
      });

      // Reset section review statuses on new student load
      setSectionStatusesByType((prev) => ({
        ...prev,
        [activeDocumentType]: Object.fromEntries(
          sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus])
        ),
      }));
      setDocApproved(false);
    },
    [sections, activeDocumentType]
  );

  // ── React to Global Student Context Selection ─────────────────────────────
  useEffect(() => {
    if (selectedStudentData && selectedStudentId) {
      const crmSource = "senior-crm-api" as const;
      const normalized = mapCrmToNormalizedStudent(selectedStudentData, { source: crmSource });
      const sopCtx = mapNormalizedToSop(normalized);
      const dataSource: DataSource = "live-crm";
      const studentName = normalized.personal.fullName || "Student";
      const activeProgId =
        normalized.applications.activeProgramId ||
        normalized.applications.all[0]?.id ||
        "";

      setCurrentSnapshot(selectedStudentData);

      const payload: SopStudentLoadedPayload = {
        ctx: sopCtx,
        studentId: selectedStudentId,
        studentName,
        source: dataSource,
        availablePrograms: normalized.applications.all,
        selectedProgramId: activeProgId,
      };

      if (hasEdits) {
        setPendingPayload(payload);
        setShowConfirmModal(true);
      } else {
        applyStudentPayload(payload);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentData, selectedStudentId]);

  function handleProgramChange(programId: string) {
    if (!currentSnapshot) return;
    setSelectedProgramId(programId);

    const updatedNormalized = mapCrmToNormalizedStudent(currentSnapshot, {
      source: currentSource === "live-crm" ? "senior-crm-api" : "cached-snapshot",
      activeProgramId: programId,
    });
    const updatedCtx = mapNormalizedToSop(updatedNormalized);
    setCtx(updatedCtx);
  }

  function handleClearStudent() {
    clearGlobalStudent();
    setCurrentSnapshot(null);
    setAvailablePrograms([]);
    setSelectedProgramId("");
    setCtx(testCtx);
    setCurrentSource("test-data");
    setLoadedStudentName(undefined);
    setUseSampleData(false);
    setActiveDraftId(null);
    const visaTemplate = getDefaultTemplate("VISA_COVER_LETTER");
    const sopTemplate = getDefaultTemplate("UNIVERSITY_SOP");
    setSectionContentsByType({
      VISA_COVER_LETTER: Object.fromEntries(visaTemplate.sections.map((s) => [s.id, s.content])),
      UNIVERSITY_SOP: Object.fromEntries(sopTemplate.sections.map((s) => [s.id, s.content])),
    });
    setSectionStatusesByType({
      VISA_COVER_LETTER: Object.fromEntries(visaTemplate.sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus])),
      UNIVERSITY_SOP: Object.fromEntries(sopTemplate.sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus])),
    });
    setDocApproved(false);
  }

  function handleConfirmOverwrite() {
    if (pendingPayload) {
      setActiveDraftId(null);
      setSectionContentsByType((prev) => ({
        ...prev,
        [activeDocumentType]: Object.fromEntries(sections.map((s) => [s.id, s.content])),
      }));
      applyStudentPayload(pendingPayload);
    }
    setPendingPayload(null);
    setShowConfirmModal(false);
  }

  function handleCancelOverwrite() {
    setPendingPayload(null);
    setShowConfirmModal(false);
  }

  // ── Section handlers ──────────────────────────────────────────────────────
  function handleContentChange(sectionId: string, newContent: string) {
    setSectionContentsByType((prev) => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        [sectionId]: newContent,
      },
    }));
    // Auto-revert APPROVED → NEEDS_REVIEW on edit
    setSectionStatusesByType((prev) => {
      const current = prev[activeDocumentType];
      if (current[sectionId] === "APPROVED") {
        return {
          ...prev,
          [activeDocumentType]: {
            ...current,
            [sectionId]: "NEEDS_REVIEW",
          },
        };
      }
      return prev;
    });
  }

  function handleReset(sectionId: string) {
    const original = sections.find((s) => s.id === sectionId)?.content ?? "";
    setSectionContentsByType((prev) => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        [sectionId]: original,
      },
    }));
    setSectionStatusesByType((prev) => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        [sectionId]: "NOT_REVIEWED",
      },
    }));
  }

  function handleApproveSection(sectionId: string) {
    setSectionStatusesByType((prev) => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        [sectionId]: "APPROVED",
      },
    }));
  }

  function handleUndoApprove(sectionId: string) {
    setSectionStatusesByType((prev) => ({
      ...prev,
      [activeDocumentType]: {
        ...prev[activeDocumentType],
        [sectionId]: "NEEDS_REVIEW",
      },
    }));
    setDocApproved(false);
  }

  function handleToggleSectionStatus(sectionId: string) {
    setSectionStatusesByType((prev) => {
      const current = prev[activeDocumentType][sectionId] ?? "NOT_REVIEWED";
      const next = current === "APPROVED" ? "NEEDS_REVIEW" : "APPROVED";
      return {
        ...prev,
        [activeDocumentType]: {
          ...prev[activeDocumentType],
          [sectionId]: next,
        },
      };
    });
    if (sectionStatuses[sectionId] === "APPROVED") {
      setDocApproved(false);
    }
  }

  function handleApproveAll() {
    setSectionStatusesByType((prev) => ({
      ...prev,
      [activeDocumentType]: Object.fromEntries(
        sections.map((s) => [s.id, "APPROVED" as ReviewStatus])
      ),
    }));
  }

  async function handleRegenerateSection(
    sectionId: string,
    mode: "generate" | "rewrite-natural" = "generate"
  ) {
    const targetSection = sections.find((s) => s.id === sectionId);
    if (!targetSection) return;

    setRegeneratingSectionId(sectionId);

    try {
      const res = await fetch("/api/sop/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          sectionTitle: targetSection.title,
          context: ctx,
          currentContent: sectionContents[sectionId] ?? targetSection.content,
          mode,
          documentType: activeDocumentType,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.text) {
        setSectionContentsByType((prev) => ({
          ...prev,
          [activeDocumentType]: {
            ...prev[activeDocumentType],
            [sectionId]: data.text,
          },
        }));
        setSectionStatusesByType((prev) => ({
          ...prev,
          [activeDocumentType]: {
            ...prev[activeDocumentType],
            [sectionId]: "NEEDS_REVIEW",
          },
        }));
        setDocApproved(false);
      } else {
        throw new Error(data?.error?.message || "Failed to generate AI response.");
      }
    } catch (err: unknown) {
      console.error("[SOP AI Regenerate Error]:", err);
      throw err;
    } finally {
      setRegeneratingSectionId(null);
    }
  }

  async function handleGenerateAllAi() {
    const aiSections = sections.filter((s) => s.regeneratable);
    if (aiSections.length === 0 || isGeneratingAllAi) return;

    setIsGeneratingAllAi(true);
    const courseTitle = ctx.destination.course || "the target course";
    setAiBannerNotice({
      type: "info",
      message: `Generating tailored narratives for "${courseTitle}"...`,
    });

    try {
      let completedCount = 0;
      for (const sec of aiSections) {
        setAiBannerNotice({
          type: "info",
          message: `Generating ${sec.title} (${completedCount + 1}/${aiSections.length}) for "${courseTitle}"...`,
        });

        const res = await fetch("/api/sop/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: sec.id,
            sectionTitle: sec.title,
            context: ctx,
            currentContent: sectionContents[sec.id] ?? sec.content,
            documentType: activeDocumentType,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.text) {
          setSectionContentsByType((prev) => ({
            ...prev,
            [activeDocumentType]: {
              ...prev[activeDocumentType],
              [sec.id]: data.text,
            },
          }));
          setSectionStatusesByType((prev) => ({
            ...prev,
            [activeDocumentType]: {
              ...prev[activeDocumentType],
              [sec.id]: "NEEDS_REVIEW" as ReviewStatus,
            },
          }));
          completedCount++;
        } else {
          throw new Error(data?.error?.message || `Failed to generate ${sec.title}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setDocApproved(false);
      setAiBannerNotice({
        type: "success",
        message: `Successfully generated ${completedCount} narrative sections for ${courseTitle}.`,
      });
      setTimeout(() => setAiBannerNotice(null), 5000);
    } catch (err: unknown) {
      console.error("[Generate All AI Error]:", err);
      setAiBannerNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to generate AI sections.",
      });
      setTimeout(() => setAiBannerNotice(null), 6000);
    } finally {
      setIsGeneratingAllAi(false);
    }
  }

  function handleSaveDraft() {
    setIsSavingDraft(true);
    try {
      const displayName = loadedStudentName || application.studentName;
      const targetCourse = ctx.destination.course || "General Course";
      const targetUni = ctx.destination.university || "Target University";

      const saved = saveDraft({
        id: activeDraftId || undefined,
        studentName: displayName,
        course: targetCourse,
        university: targetUni,
        templateId: template.id,
        documentType: activeDocumentType,
        sectionContents,
        sectionStatuses,
        docApproved,
        ctx,
        currentSource,
        loadedStudentName,
      });

      setActiveDraftId(saved.id);
      setDraftCount(getAllDrafts().length);
      setRecoveryBanner(null);

      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setSavedNoticeText(`Saved at ${timeStr}`);
      setTimeout(() => setSavedNoticeText(null), 3500);
    } catch (err) {
      console.error("[SOP Save Draft Error]:", err);
      setSavedNoticeText("Failed to save draft");
      setTimeout(() => setSavedNoticeText(null), 4000);
    } finally {
      setIsSavingDraft(false);
    }
  }

  function handleRestoreDraft(draft: SopDraftRecord) {
    const docType: SopDocumentType = draft.documentType || (draft.templateId === "university-sop-standard" ? "UNIVERSITY_SOP" : "VISA_COVER_LETTER");
    setActiveDocumentType(docType);
    setCtx(draft.ctx);
    setCurrentSource(draft.currentSource || "test-data");
    setLoadedStudentName(draft.loadedStudentName || draft.studentName);
    setSectionContentsByType((prev) => ({
      ...prev,
      [docType]: draft.sectionContents,
    }));
    setSectionStatusesByType((prev) => ({
      ...prev,
      [docType]: draft.sectionStatuses,
    }));
    setDocApproved(draft.docApproved);
    setActiveDraftId(draft.id);
    setRecoveryBanner(null);
    setUseSampleData(true);
    setSavedNoticeText(`Restored draft for ${draft.studentName}`);
    setTimeout(() => setSavedNoticeText(null), 3500);
  }

  function handleDismissRecovery() {
    setRecoveryBanner(null);
  }

  function handleApproveDocument() {
    if (!canApproveDocument) return;
    setDocApproved(true);
  }

  async function handleDownloadPdf() {
    const target =
      document.getElementById("sop-preview-letter-page") ||
      document.getElementById("sop-printable-letter");
    if (!target) return;

    const displayName = loadedStudentName || application.studentName;

    const result = await downloadPdf(target, {
      studentName: displayName,
      country: ctx.destination.country,
      documentType: template.pdfDocumentType || (activeDocumentType === "UNIVERSITY_SOP" ? "University_Statement_of_Purpose" : "Visa_Cover_Letter"),
      year: ctx.destination.intakeYear || new Date().getFullYear(),
    });

    if (result.success && result.pdfBase64) {
      let targetDocId = activeDraftId;
      if (!targetDocId && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        targetDocId = urlParams.get("docId") || urlParams.get("documentId");
        if (!targetDocId) {
          const match = window.location.pathname.match(/\/sop-generator\/(DOC-[a-zA-Z0-9_-]+)/);
          if (match) targetDocId = match[1];
        }
      }

      if (targetDocId) {
        try {
          const res = await fetch(`/api/documents/${targetDocId}/pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pdfBase64: result.pdfBase64,
              fileName: result.filename,
              status: "FINALIZED",
            }),
          });
          if (res.ok) {
            setSavedNoticeText(`PDF finalized on server (${totalWordCount} words)`);
            setTimeout(() => setSavedNoticeText(null), 4000);
          }
        } catch (err) {
          console.warn("[SOP PDF Server Sync Failed]:", err);
        }
      }
    }
  }

  // Selected section (falls back to first section if current selection doesn't exist in active template)
  const effectiveSelectedId = useMemo(() => {
    if (selectedSectionId && sections.some((s) => s.id === selectedSectionId)) {
      return selectedSectionId;
    }
    return sections[0]?.id ?? null;
  }, [selectedSectionId, sections]);

  const selectedSection = sections.find((s) => s.id === effectiveSelectedId) ?? null;
  const displayStudentName = loadedStudentName || (useSampleData ? application.studentName : "No Student Selected");

  const destinationSummary = useMemo(() => {
    if (!useSampleData && !isStudentLoaded) return undefined;
    const parts = [ctx.destination.country, ctx.destination.university, ctx.destination.course].filter(Boolean);
    return parts.join(" · ");
  }, [useSampleData, isStudentLoaded, ctx.destination]);

  // Show empty state if no student has been loaded and counsellor hasn't chosen to view sample
  const showEmptyState = !isStudentLoaded && !loadedStudentName && !useSampleData;

  const isUniversitySop = activeDocumentType === "UNIVERSITY_SOP";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Slim Calm App Navigation */}
      <AppHeader />

      {/* Editorial Workspace Header */}
      <WorkspaceHeader
        activeDocumentType={activeDocumentType}
        onDocumentTypeChange={(type) => {
          setActiveDocumentType(type);
        }}
        templateName={template.name}
        studentName={displayStudentName}
        destinationSummary={destinationSummary}
        documentStatus={docApproved ? "approved" : application.status}
        approvedCount={approvedCount}
        requiredCount={requiredSections.length}
        totalCount={sections.length}
        hasErrors={documentHasErrors}
        onSaveDraft={handleSaveDraft}
        isSavingDraft={isSavingDraft}
        draftCount={draftCount}
        onOpenDrafts={() => setDraftsModalOpen(true)}
        savedNoticeText={savedNoticeText}
        onPreview={() => setPreviewOpen(true)}
        onApproveDocument={handleApproveDocument}
        onApproveAll={handleApproveAll}
        onGenerateAllAi={handleGenerateAllAi}
        isGeneratingAllAi={isGeneratingAllAi}
        onDownloadPdf={handleDownloadPdf}
        isGeneratingPdf={isGeneratingPdf}
        totalWordCount={totalWordCount}
        isStudentLoaded={isStudentLoaded}
        availablePrograms={availablePrograms}
        selectedProgramId={selectedProgramId}
        onProgramChange={handleProgramChange}
        onClearStudent={handleClearStudent}
        onOpenStudentSelect={() => setIsStudentSelectOpen(true)}
      />

      {/* Quick recovery banner */}
      {recoveryBanner && (
        <div
          role="alert"
          className="flex-shrink-0 px-6 py-2 bg-amber-50/90 border-b border-amber-200/80 text-amber-900 text-xs flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <span>📁</span>
            <span>
              Found a saved draft for{" "}
              <strong className="font-semibold text-amber-950">
                {recoveryBanner.studentName}
              </strong>
              {recoveryBanner.course ? ` (${recoveryBanner.course})` : ""}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="sop-resume-draft-btn"
              onClick={() => handleRestoreDraft(recoveryBanner)}
              className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-md text-[11px] font-semibold transition-colors shadow-xs"
            >
              Resume Editing
            </button>
            <button
              id="sop-dismiss-recovery-btn"
              onClick={handleDismissRecovery}
              className="p-1 text-amber-700 hover:text-amber-950 rounded text-xs"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* AI banner notice */}
      {aiBannerNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`flex-shrink-0 px-6 py-2 border-b text-xs flex items-center justify-between ${
            aiBannerNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : aiBannerNotice.type === "info"
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{aiBannerNotice.message}</span>
          <button
            onClick={() => setAiBannerNotice(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* PDF Error alert */}
      {pdfError && (
        <div
          role="alert"
          className="flex-shrink-0 px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
        >
          <span>⚠️ PDF generation error: {pdfError}</span>
        </div>
      )}

      {/* Document Approved Banner */}
      {docApproved && (
        <div
          role="status"
          className="flex-shrink-0 px-6 py-2.5 bg-emerald-800 text-white text-xs font-medium flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">✓ Document Approved.</span>
            <span className="opacity-90 text-[11px]">
              All required sections have been reviewed and verified for submission.
            </span>
          </div>
          <button
            id="sop-approved-banner-download-btn"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="bg-white text-emerald-900 hover:bg-emerald-50 px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-xs"
          >
            {isGeneratingPdf ? "Generating PDF…" : "📥 Download Official PDF"}
          </button>
        </div>
      )}

      {/* Main 3-Column Editorial Workspace */}
      <div className="flex flex-1 overflow-hidden bg-[#F8F9FA]">
        {/* Left: Story Structure Navigation */}
        <SectionSidebar
          sections={sections}
          selectedId={effectiveSelectedId}
          statuses={sectionStatuses}
          onSelectSection={setSelectedSectionId}
          onToggleStatus={handleToggleSectionStatus}
          groups={template.sidebarGroups}
        />

        {/* Center: Document Canvas or Empty State */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#F8F9FA] min-w-0">
          {showEmptyState ? (
            <div className="flex-1 flex items-center justify-center p-8 bg-[#F8F9FA]">
              <div className="max-w-md w-full text-center p-8 md:p-10 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-700">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Review a Student&apos;s {isUniversitySop ? "Statement of Purpose" : "Visa Letter"}
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1.5 max-w-sm mx-auto">
                    Select a student to load their academic credentials, course destination, and personal story into the workspace.
                  </p>
                </div>

                <div className="pt-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStudentSelectOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
                  >
                    <span>👥</span>
                    <span>Select Student from CRM</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setUseSampleData(true)}
                    className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2 transition-colors"
                  >
                    Or explore template with sample applicant (Aafia Ameen) →
                  </button>
                </div>
              </div>
            </div>
          ) : selectedSection ? (
            <SectionEditor
              section={selectedSection}
              ctx={ctx}
              content={sectionContents[selectedSection.id] ?? selectedSection.content}
              status={sectionStatuses[selectedSection.id] ?? "NOT_REVIEWED"}
              onContentChange={(c) => handleContentChange(selectedSection.id, c)}
              onReset={() => handleReset(selectedSection.id)}
              onApprove={() => handleApproveSection(selectedSection.id)}
              onUndoApprove={() => handleUndoApprove(selectedSection.id)}
              onRegenerate={handleRegenerateSection}
              isRegenerating={regeneratingSectionId === selectedSection.id}
              canvasMasthead={template.canvasMasthead}
              totalSections={sections.length}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-center px-8">
              <p className="text-xs text-slate-400">Select a section from the left to begin review.</p>
            </div>
          )}
        </main>

        {/* Right: Collapsible Story Context Panel */}
        <ContextPanel
          ctx={ctx}
          validationIssues={validation}
          isCollapsed={isContextCollapsed}
          onToggleCollapse={() => setIsContextCollapsed((v) => !v)}
          onOpenStudentDetails={() => setStudentDetailsOpen(true)}
          onSelectSection={setSelectedSectionId}
          onRefreshValidation={handleRefreshValidation}
          showLogistics={template.showLogisticsInContext !== false}
          activeDocumentType={activeDocumentType}
        />
      </div>

      {/* A4 Preview Modal */}
      {previewOpen && (
        <DocumentPreview
          sections={sections}
          sectionContents={sectionContents}
          ctx={ctx}
          onClose={() => setPreviewOpen(false)}
          onDownloadPdf={handleDownloadPdf}
          isGeneratingPdf={isGeneratingPdf}
          template={template}
        />
      )}

      {/* Student Details Modal (PII & sensitive records) */}
      <StudentDetailsModal
        ctx={ctx}
        isOpen={studentDetailsOpen}
        onClose={() => setStudentDetailsOpen(false)}
      />

      {/* Overwrite Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sop-overwrite-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5" id="sop-overwrite-dialog-title">
              Replace workspace?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Loading another student will reset current section edits and review statuses.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                id="sop-overwrite-cancel-btn"
                onClick={handleCancelOverwrite}
                className="h-8 px-3.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                id="sop-overwrite-confirm-btn"
                onClick={handleConfirmOverwrite}
                className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Drafts Modal */}
      <SopDraftsModal
        isOpen={draftsModalOpen}
        onClose={() => setDraftsModalOpen(false)}
        onLoadDraft={handleRestoreDraft}
        onDraftsChange={() => setDraftCount(getAllDrafts().length)}
      />

      {/* Student Select Modal */}
      <StudentSelectModal
        isOpen={isStudentSelectOpen}
        onClose={() => setIsStudentSelectOpen(false)}
        onSelectStudent={(id) => {
          selectStudent(id);
          setIsStudentSelectOpen(false);
        }}
        selectedStudentId={selectedStudentId}
        onClearStudent={handleClearStudent}
      />

      {/* Offscreen dedicated printable container for single-page high-DPI capture */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "794px",
          minHeight: "1123px",
          padding: "36px 48px",
          fontFamily: "'Times New Roman', Times, Georgia, serif",
          fontSize: "13px",
          lineHeight: "1.23",
          color: "#111827",
          backgroundColor: "#ffffff",
          textAlign: "justify",
          boxSizing: "border-box",
          pointerEvents: "none",
          zIndex: -1,
        }}
        id="sop-printable-letter"
        aria-hidden="true"
      >
        <div style={{ textAlign: "center", marginBottom: isUniversitySop ? "8px" : "12px" }}>
          <span
            style={{
              fontSize: isUniversitySop ? "15px" : "14px",
              fontWeight: "bold",
              textDecoration: "underline",
              letterSpacing: "0.08em",
            }}
          >
            {template.documentHeaderTitle || "COVER LETTER"}
          </span>
        </div>

        {/* Applicant metadata header for University SOP */}
        {isUniversitySop && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "14px",
              color: "#374151",
              fontSize: "12px",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "8px",
            }}
          >
            <strong>{ctx.student.fullName || "Student Name"}</strong> · {ctx.destination.course || "Target Program"} · {ctx.destination.university || "Target Institution"}
          </div>
        )}

        {/* Salutation if configured on template (e.g., Dear Admissions Committee,) */}
        {template.salutation && (
          <div
            style={{
              marginBottom: "10px",
              textAlign: "left",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            {template.salutation}
          </div>
        )}

        {sections
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((section) => {
            const rawContent = sectionContents[section.id] ?? section.content;
            const rendered = interpolate(rawContent, ctx);

            if (section.id === "recipient") {
              return (
                <div
                  key={section.id}
                  style={{
                    marginBottom: "10px",
                    whiteSpace: "pre-line",
                    lineHeight: "1.22",
                    textAlign: "left",
                  }}
                >
                  {renderFormatted(rendered)}
                </div>
              );
            }

            if (section.id === "subject") {
              return (
                <div
                  key={section.id}
                  style={{
                    fontWeight: "bold",
                    marginBottom: "10px",
                    textAlign: "left",
                    lineHeight: "1.22",
                  }}
                >
                  {renderFormatted(rendered)}
                </div>
              );
            }

            if (section.id === "signature") {
              return (
                <div
                  key={section.id}
                  style={{
                    marginTop: "12px",
                    whiteSpace: "pre-line",
                    lineHeight: "1.22",
                    textAlign: "left",
                  }}
                >
                  {renderFormatted(rendered)}
                </div>
              );
            }

            return (
              <div
                key={section.id}
                style={{
                  marginBottom: isUniversitySop ? "10px" : "5.5px",
                  textIndent: "0",
                }}
              >
                <p style={{ margin: 0, padding: 0, whiteSpace: "pre-line" }}>
                  {renderFormatted(rendered)}
                </p>
              </div>
            );
          })}
      </div>
    </div>
  );
}
