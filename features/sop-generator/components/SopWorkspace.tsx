"use client";

import { useState, useMemo } from "react";
import type { ReviewStatus } from "../types/sop-generator";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { SectionSidebar } from "./SectionSidebar";
import { SectionEditor } from "./SectionEditor";
import { ContextPanel } from "./ContextPanel";
import { DocumentPreview } from "./DocumentPreview";
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
 * Provides:
 *   - Live section review & editing
 *   - Auto-revert APPROVED -> NEEDS_REVIEW on edit
 *   - Document approval gates
 *   - Official Embassy PDF Generation & Download
 */
export function SopWorkspace() {
  // ── Load data (all via service — no direct mock imports here) ────────────
  const application = useMemo(() => getApplication(), []);
  const template    = useMemo(() => getTemplate(application.templateId), [application]);
  const ctx         = useMemo(() => getStudentDocumentContext(), []);
  const validation  = useMemo(() => validateDocumentContext(ctx), [ctx]);

  const sections = template.sections;
  const firstSectionId = sections.sort((a, b) => a.order - b.order)[0]?.id ?? null;

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(firstSectionId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [docApproved, setDocApproved] = useState(false);

  // Per-section content — start from template originals
  const [sectionContents, setSectionContents] = useState<Record<string, string>>(
    () => Object.fromEntries(sections.map((s) => [s.id, s.content]))
  );

  // Per-section review status
  const [sectionStatuses, setSectionStatuses] = useState<Record<string, ReviewStatus>>(
    () => Object.fromEntries(sections.map((s) => [s.id, "NOT_REVIEWED" as ReviewStatus]))
  );

  // ── PDF Generator Hook ───────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────

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

    await downloadPdf(target, {
      studentName: application.studentName,
      country: ctx.destination.country,
      documentType: "Visa_Cover_Letter",
      year: 2026,
    });
  }

  // ── Selected section ──────────────────────────────────────────────────────
  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Shared product header */}
      <AppHeader />

      {/* Workspace header */}
      <WorkspaceHeader
        templateName={template.name}
        studentName={application.studentName}
        documentStatus={docApproved ? "approved" : application.status}
        approvedCount={approvedCount}
        requiredCount={requiredSections.length}
        totalCount={sections.length}
        hasErrors={documentHasErrors}
        onSaveDraft={handleSaveDraft}
        onPreview={() => setPreviewOpen(true)}
        onApproveDocument={handleApproveDocument}
        onApproveAll={handleApproveAll}
        onDownloadPdf={handleDownloadPdf}
        isGeneratingPdf={isGeneratingPdf}
      />

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
              Ready for visa application & embassy submission.
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

      {/* Offscreen dedicated printable container for single-page high-DPI capture */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: "794px",
          minHeight: "1123px",
          padding: "40px 52px",
          fontFamily: "'Times New Roman', Times, Georgia, serif",
          fontSize: "13px",
          lineHeight: "1.30",
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
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
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
                    marginBottom: "12px",
                    whiteSpace: "pre-line",
                    lineHeight: "1.25",
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
                    marginBottom: "12px",
                    textAlign: "left",
                    lineHeight: "1.25",
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
                    marginTop: "16px",
                    whiteSpace: "pre-line",
                    lineHeight: "1.25",
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
                  marginBottom: "7px",
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
