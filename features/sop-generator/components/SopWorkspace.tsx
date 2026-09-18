"use client";

import { useState, useMemo, useCallback } from "react";
import type { ReviewStatus, StudentDocumentContext } from "../types/sop-generator";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { SectionSidebar } from "./SectionSidebar";
import { SectionEditor } from "./SectionEditor";
import { ContextPanel } from "./ContextPanel";
import { DocumentPreview } from "./DocumentPreview";
import { SopStudentLoader } from "./SopStudentLoader";
import type { SopStudentLoadedPayload, DataSource } from "./SopStudentLoader";
import { getApplication, getTemplate, getStudentDocumentContext } from "../lib/applicationService";
import { validateDocumentContext, hasErrors } from "../lib/validateDocumentContext";
import { interpolate } from "../lib/interpolateTemplate";
import { useSopPdfGenerator } from "../hooks/useSopPdfGenerator";
import { AppHeader } from "@/components/common/AppHeader";

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

/**
 * SopWorkspace — top-level client component for the SOP Generator.
 *
 * Owns all SOP-specific UI state:
 *   selectedSectionId  — which section the editor is showing
 *   sectionContents    — current (possibly edited) content per section
 *   sectionStatuses    — counsellor review status per section
 *   previewOpen        — A4 preview modal
 *
 * Phase 2.6 additions:
 *   - SopStudentLoader bar: load real CRM data via /api/student/[id]
 *   - ctx becomes mutable state (starts from test data, replaceable by CRM)
 *   - Overwrite confirmation modal
 *   - Section review-state reset on new student load
 *   - Data source badge
 *
 * Provides:
 *   - Live section review & editing
 *   - Auto-revert APPROVED -> NEEDS_REVIEW on edit
 *   - Document approval gates
 *   - Official Embassy PDF Generation & Download
 */
export function SopWorkspace() {
  // ── Static fixtures (template & initial test ctx) ────────────────────────
  const application = useMemo(() => getApplication(), []);
  const template    = useMemo(() => getTemplate(application.templateId), [application]);
  const testCtx     = useMemo(() => getStudentDocumentContext(), []);

  const sections = template.sections;
  const firstSectionId = sections.slice().sort((a, b) => a.order - b.order)[0]?.id ?? null;

  // ── Phase 2.6: Dynamic student context ───────────────────────────────────
  // ctx starts from test data; replaced when a real student is loaded.
  const [ctx, setCtx] = useState<StudentDocumentContext>(testCtx);
  const [currentSource, setCurrentSource] = useState<DataSource>("test-data");
  const [loadedStudentName, setLoadedStudentName] = useState<string | undefined>(undefined);
  const isStudentLoaded = currentSource !== "test-data";

  // ── Phase 2.6: Overwrite-confirmation modal ───────────────────────────────
  // When a counsellor has edited sections and tries to load another student,
  // show a confirmation before replacing the workspace.
  const [pendingPayload, setPendingPayload] = useState<SopStudentLoadedPayload | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(firstSectionId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [docApproved, setDocApproved] = useState(false);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
  const [isGeneratingAllAi, setIsGeneratingAllAi] = useState(false);
  const [aiBannerNotice, setAiBannerNotice] = useState<{
    type: "info" | "success" | "error";
    message: string;
  } | null>(null);

  // Per-section content — start from template originals
  const [sectionContents, setSectionContents] = useState<Record<string, string>>(
    () => Object.fromEntries(sections.map((s) => [s.id, s.content]))
  );

  // Per-section review status
  const [sectionStatuses, setSectionStatuses] = useState<Record<string, ReviewStatus>>(
    () => Object.fromEntries(sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus]))
  );

  // Derived: has counsellor made any edits?
  const hasEdits = useMemo(() => {
    return sections.some(
      (s) =>
        sectionStatuses[s.id] !== "NOT_REVIEWED" ||
        sectionContents[s.id] !== s.content
    );
  }, [sections, sectionStatuses, sectionContents]);

  // ── Validation (reactive on ctx) ──────────────────────────────────────────
  const validation = useMemo(() => validateDocumentContext(ctx), [ctx]);

  // ── PDF Generator Hook ────────────────────────────────────────────────────
  const {
    status: pdfStatus,
    errorMessage: pdfError,
    downloadPdf,
  } = useSopPdfGenerator();
  const isGeneratingPdf = pdfStatus === "generating";

  // ── Derived state ─────────────────────────────────────────────────────────
  const requiredSections = sections.filter((s) => s.required);
  const approvedCount = requiredSections.filter(
    (s) => sectionStatuses[s.id] === "APPROVED"
  ).length;

  const documentHasErrors = hasErrors(validation);
  const canApproveDocument =
    approvedCount >= requiredSections.length && !documentHasErrors;

  // ── Phase 2.6 & AI: Apply a loaded student payload ─────────────────────────

  const applyStudentPayload = useCallback(
    (payload: SopStudentLoadedPayload) => {
      setCtx(payload.ctx);
      setCurrentSource(payload.source);
      setLoadedStudentName(payload.studentName);

      // Reset narrative sections to fresh template values for the new course
      setSectionContents((prev) => {
        const next = { ...prev };
        sections.forEach((s) => {
          if (s.regeneratable || s.source === "AI_SUGGESTED" || s.source === "HYBRID") {
            next[s.id] = s.content;
          }
        });
        return next;
      });

      // Reset section review statuses — previously approved content from
      // another student must NOT remain approved (as per spec §11).
      setSectionStatuses(
        Object.fromEntries(sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus]))
      );
      // Reset document approval gate
      setDocApproved(false);
    },
    [sections]
  );

  // ── Phase 2.6: Student loader callbacks ───────────────────────────────────

  function handleStudentLoaded(payload: SopStudentLoadedPayload) {
    if (hasEdits) {
      // Counsellor has edits — ask before overwriting (§6)
      setPendingPayload(payload);
      setShowConfirmModal(true);
    } else {
      applyStudentPayload(payload);
    }
  }

  function handleClearStudent() {
    // Revert to test data
    setCtx(testCtx);
    setCurrentSource("test-data");
    setLoadedStudentName(undefined);
    setSectionContents(Object.fromEntries(sections.map((s) => [s.id, s.content])));
    setSectionStatuses(
      Object.fromEntries(sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus]))
    );
    setDocApproved(false);
  }

  function handleConfirmOverwrite() {
    if (pendingPayload) {
      // Also reset section contents on overwrite
      setSectionContents(Object.fromEntries(sections.map((s) => [s.id, s.content])));
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
    setSectionContents((prev) => ({ ...prev, [sectionId]: newContent }));
    // Auto-revert APPROVED → NEEDS_REVIEW when content is edited
    setSectionStatuses((prev) => {
      if (prev[sectionId] === "APPROVED") {
        return { ...prev, [sectionId]: "NEEDS_REVIEW" };
      }
      return prev;
    });
  }

  function handleReset(sectionId: string) {
    const original = sections.find((s) => s.id === sectionId)?.content ?? "";
    setSectionContents((prev) => ({ ...prev, [sectionId]: original }));
    // Reset to NOT_REVIEWED after resetting content
    setSectionStatuses((prev) => ({
      ...prev,
      [sectionId]: "NOT_REVIEWED",
    }));
  }

  function handleApproveSection(sectionId: string) {
    setSectionStatuses((prev) => ({ ...prev, [sectionId]: "APPROVED" }));
  }

  function handleApproveAll() {
    setSectionStatuses(
      Object.fromEntries(sections.map((s) => [s.id, "APPROVED" as ReviewStatus]))
    );
  }

  async function handleRegenerateSection(sectionId: string) {
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
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.text) {
        // Update section content with AI-generated narrative
        setSectionContents((prev) => ({
          ...prev,
          [sectionId]: data.text,
        }));
        // Require counsellor review after AI generation
        setSectionStatuses((prev) => ({
          ...prev,
          [sectionId]: "NEEDS_REVIEW",
        }));
        // Revoke overall document signoff if previously approved
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
      message: `Generating tailored AI narratives with Gemini for "${courseTitle}"...`,
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
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.text) {
          setSectionContents((prev) => ({
            ...prev,
            [sec.id]: data.text,
          }));
          setSectionStatuses((prev) => ({
            ...prev,
            [sec.id]: "NEEDS_REVIEW" as ReviewStatus,
          }));
          completedCount++;
        } else {
          throw new Error(data?.error?.message || `Failed to generate ${sec.title}`);
        }

        // Gentle 300ms throttle to prevent sudden-burst rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setDocApproved(false);
      setAiBannerNotice({
        type: "success",
        message: `✓ Successfully generated all ${completedCount} narrative sections tailored specifically to ${courseTitle}!`,
      });
      setTimeout(() => setAiBannerNotice(null), 6000);
    } catch (err: unknown) {
      console.error("[Generate All AI Error]:", err);
      setAiBannerNotice({
        type: "error",
        message: err instanceof Error ? `⚠️ ${err.message}` : "Failed to generate AI sections.",
      });
      setTimeout(() => setAiBannerNotice(null), 7000);
    } finally {
      setIsGeneratingAllAi(false);
    }
  }

  function handleSaveDraft() {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
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

    // Use loaded student name if available; otherwise fall back to application
    const displayName = loadedStudentName || application.studentName;

    await downloadPdf(target, {
      studentName: displayName,
      country: ctx.destination.country,
      documentType: "Visa_Cover_Letter",
      year: 2026,
    });
  }

  // ── Selected section ──────────────────────────────────────────────────────
  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  // Display name in header — prefer loaded student; fall back to mock
  const displayStudentName = loadedStudentName || application.studentName;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Shared product header */}
      <AppHeader />

      {/* Workspace header */}
      <WorkspaceHeader
        templateName={template.name}
        studentName={displayStudentName}
        documentStatus={docApproved ? "approved" : application.status}
        approvedCount={approvedCount}
        requiredCount={requiredSections.length}
        totalCount={sections.length}
        hasErrors={documentHasErrors}
        onSaveDraft={handleSaveDraft}
        onPreview={() => setPreviewOpen(true)}
        onApproveDocument={handleApproveDocument}
        onApproveAll={handleApproveAll}
        onGenerateAllAi={handleGenerateAllAi}
        isGeneratingAllAi={isGeneratingAllAi}
        onDownloadPdf={handleDownloadPdf}
        isGeneratingPdf={isGeneratingPdf}
      />

      {/* Phase 2.6: Student loader bar */}
      <SopStudentLoader
        onStudentLoaded={handleStudentLoaded}
        onClearStudent={handleClearStudent}
        isStudentLoaded={isStudentLoaded}
        loadedStudentName={loadedStudentName}
        currentSource={currentSource}
      />

      {/* AI banner notice */}
      {aiBannerNotice && (
        <div
          role="status"
          aria-live="polite"
          className={`flex-shrink-0 px-5 py-2.5 border-b text-[12px] font-semibold flex items-center justify-between transition-all ${
            aiBannerNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : aiBannerNotice.type === "info"
              ? "bg-violet-50 border-violet-200 text-violet-800 animate-pulse"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{aiBannerNotice.message}</span>
          <button
            onClick={() => setAiBannerNotice(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3 text-[11px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Save notice */}
      {savedNotice && (
        <div
          role="status"
          aria-live="polite"
          className="flex-shrink-0 px-5 py-2 bg-emerald-50 border-b border-emerald-200
                     text-emerald-700 text-[11px] font-semibold"
        >
          ✓ Draft saved locally.
        </div>
      )}

      {/* PDF Error alert */}
      {pdfError && (
        <div
          role="alert"
          className="flex-shrink-0 px-5 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
        >
          <span>⚠ PDF generation failed: {pdfError}</span>
        </div>
      )}

      {/* Document approved banner */}
      {docApproved && (
        <div
          role="status"
          className="flex-shrink-0 px-5 py-2.5 bg-emerald-600 text-white
                     text-[12px] font-semibold flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <span>✓ Document approved.</span>
            <span className="font-normal opacity-90 text-[11px]">
              Ready for visa application &amp; embassy submission.
            </span>
          </div>
          <button
            id="sop-approved-banner-download-btn"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 px-3 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 shadow"
          >
            {isGeneratingPdf ? "Generating PDF…" : "📥 Download Official PDF"}
          </button>
        </div>
      )}

      {/* Three-column workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Section navigation */}
        <SectionSidebar
          sections={sections}
          selectedId={selectedSectionId}
          statuses={sectionStatuses}
          onSelectSection={setSelectedSectionId}
          onApproveAll={handleApproveAll}
        />

        {/* Centre: Section editor */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 min-w-0">
          {selectedSection ? (
            <SectionEditor
              section={selectedSection}
              ctx={ctx}
              content={sectionContents[selectedSection.id] ?? selectedSection.content}
              status={sectionStatuses[selectedSection.id] ?? "NOT_REVIEWED"}
              onContentChange={(c) => handleContentChange(selectedSection.id, c)}
              onReset={() => handleReset(selectedSection.id)}
              onApprove={() => handleApproveSection(selectedSection.id)}
              onRegenerate={handleRegenerateSection}
              isRegenerating={regeneratingSectionId === selectedSection.id}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-center px-8">
              <div>
                <p className="text-3xl mb-3">📄</p>
                <p className="text-sm font-semibold text-slate-500">
                  Select a section from the left to start editing.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right: Context panel */}
        <ContextPanel ctx={ctx} validationIssues={validation} />
      </div>

      {/* A4 Preview modal */}
      {previewOpen && (
        <DocumentPreview
          sections={sections}
          sectionContents={sectionContents}
          ctx={ctx}
          onClose={() => setPreviewOpen(false)}
          onDownloadPdf={handleDownloadPdf}
          isGeneratingPdf={isGeneratingPdf}
        />
      )}

      {/* Phase 2.6: Overwrite confirmation modal (§6) */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sop-overwrite-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200">
            <p className="text-base font-bold text-slate-800 mb-2" id="sop-overwrite-dialog-title">
              ⚠ Replace workspace?
            </p>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-5">
              Loading another student will replace the current document workspace,
              including all edits and review statuses. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                id="sop-overwrite-cancel-btn"
                onClick={handleCancelOverwrite}
                className="px-4 py-2 text-[13px] font-semibold rounded-lg border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                id="sop-overwrite-confirm-btn"
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 text-[13px] font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              textDecoration: "underline",
              letterSpacing: "0.08em",
            }}
          >
            COVER LETTER
          </span>
        </div>

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
                  marginBottom: "5.5px",
                  textIndent: "0",
                }}
              >
                <p style={{ margin: 0, padding: 0 }}>
                  {renderFormatted(rendered)}
                </p>
              </div>
            );
          })}
      </div>
    </div>
  );
}

