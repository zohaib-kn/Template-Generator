"use client";

interface WorkspaceHeaderProps {
  templateName: string;
  studentName: string;
  documentStatus: "draft" | "in_review" | "approved";
  approvedCount: number;
  requiredCount: number;
  totalCount: number;
  hasErrors: boolean;
  onSaveDraft: () => void;
  draftCount?: number;
  onOpenDrafts?: () => void;
  isSavingDraft?: boolean;
  onPreview: () => void;
  onApproveDocument: () => void;
  onApproveAll?: () => void;
  onGenerateAllAi?: () => void;
  isGeneratingAllAi?: boolean;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

const DOC_STATUS_LABELS: Record<string, { label: string; colors: string }> = {
  draft:     { label: "Draft",     colors: "bg-slate-100 text-slate-600 border-slate-200" },
  in_review: { label: "In Review", colors: "bg-amber-50 text-amber-700 border-amber-200" },
  approved:  { label: "Approved",  colors: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

/**
 * Workspace header — breadcrumb, document title, student name, status,
 * progress counter, and document-level action buttons.
 */
export function WorkspaceHeader({
  templateName,
  studentName,
  documentStatus,
  approvedCount,
  requiredCount,
  totalCount,
  hasErrors,
  onSaveDraft,
  draftCount = 0,
  onOpenDrafts,
  isSavingDraft = false,
  onPreview,
  onApproveDocument,
  onApproveAll,
  onGenerateAllAi,
  isGeneratingAllAi = false,
  onDownloadPdf,
  isGeneratingPdf = false,
}: WorkspaceHeaderProps) {
  const statusCfg = DOC_STATUS_LABELS[documentStatus] ?? DOC_STATUS_LABELS.draft;
  const allRequiredApproved = approvedCount >= requiredCount;
  const canApprove = allRequiredApproved && !hasErrors;
  const isApproved = documentStatus === "approved";

  // Reason why Approve is disabled
  const disabledReason = !canApprove
    ? hasErrors
      ? "Resolve validation errors before approving."
      : `${requiredCount - approvedCount} required section${requiredCount - approvedCount !== 1 ? "s" : ""} still need approval.`
    : null;

  return (
    <div className="flex-shrink-0 border-b border-slate-200 bg-white">
      {/* Breadcrumb */}
      <div className="px-6 pt-3.5 pb-1">
        <p className="text-[11px] font-medium text-slate-400 tracking-normal flex items-center gap-1.5">
          <span>Documents</span>
          <span className="text-slate-300">/</span>
          <span>SOP Generator</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 font-semibold">Review</span>
        </p>
      </div>

      {/* Main row */}
      <div className="px-6 pb-3.5 flex items-center justify-between gap-6 flex-wrap">
        {/* Left: title + meta */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-[18px] md:text-[20px] font-semibold text-slate-900 leading-tight tracking-tight truncate">
            {templateName}
          </h1>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Student */}
            <span className="text-[12px] text-slate-600 font-medium flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden="true">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{studentName}</span>
            </span>

            <span className="text-slate-300 select-none">·</span>

            {/* Document status */}
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusCfg.colors}`}
            >
              {statusCfg.label}
            </span>

            <span className="text-slate-300 select-none">·</span>

            {/* Progress */}
            <span className="text-[12px] text-slate-500">
              <span
                className={
                  allRequiredApproved ? "text-emerald-600 font-semibold" : "font-medium text-slate-700"
                }
              >
                {approvedCount}
              </span>
              {" / "}
              {requiredCount} required sections approved
            </span>

            {/* Total sections note */}
            <span className="text-[11px] text-slate-400 font-normal">
              ({totalCount} total)
            </span>
          </div>

          {/* Thin progress bar */}
          <div className="w-52 h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allRequiredApproved ? "bg-emerald-600" : "bg-[#096491]"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (approvedCount / Math.max(1, requiredCount)) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View Saved Drafts */}
          {onOpenDrafts && (
            <button
              id="sop-open-drafts-btn"
              onClick={onOpenDrafts}
              className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5"
              title="View saved drafts on this device"
            >
              <span className="text-xs">📁</span>
              <span>Drafts</span>
              {draftCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#096491] text-white leading-none">
                  {draftCount}
                </span>
              )}
            </button>
          )}

          {/* Save Draft */}
          <button
            id="sop-save-draft-btn"
            onClick={onSaveDraft}
            disabled={isSavingDraft}
            className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-60"
          >
            <span className="text-xs">💾</span>
            <span>{isSavingDraft ? "Saving…" : "Save Draft"}</span>
          </button>

          {/* Generate All AI */}
          {onGenerateAllAi && (
            <button
              id="sop-header-generate-all-ai-btn"
              onClick={onGenerateAllAi}
              disabled={isGeneratingAllAi}
              className="h-9 px-3 rounded-lg border border-[#D2E7F0] text-[#096491] bg-[#F0F7FA] hover:bg-[#E2F0F7] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate all course-specific AI narrative sections with Gemini"
            >
              {isGeneratingAllAi ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-[#096491]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Generating AI…</span>
                </>
              ) : (
                <>
                  <span className="text-[11px]">✨</span>
                  <span>Generate All AI</span>
                </>
              )}
            </button>
          )}

          {/* Approve All */}
          {onApproveAll && !isApproved && (
            <button
              id="sop-header-approve-all-btn"
              onClick={onApproveAll}
              className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
              title="Mark all sections as Approved"
            >
              <span className="text-slate-500">✓</span>
              <span>Approve All</span>
            </button>
          )}

          {/* Preview */}
          <button
            id="sop-preview-btn"
            onClick={onPreview}
            className="h-9 px-3.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-xs"
          >
            Preview
          </button>

          {/* Approve Document (Primary CTA) */}
          <div className="relative group">
            <button
              id="sop-approve-document-btn"
              onClick={onApproveDocument}
              disabled={!canApprove || isApproved}
              className={`h-9 px-4 rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5
                         ${
                           isApproved
                             ? "bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default"
                             : "bg-[#096491] text-white hover:bg-[#074f74] active:bg-[#063f5d] disabled:opacity-40 disabled:cursor-not-allowed"
                         }`}
            >
              {isApproved ? "✓ Document Approved" : "Approve Document"}
            </button>

            {/* Disabled tooltip */}
            {disabledReason && !isApproved && (
              <div
                className="absolute right-0 top-full mt-1.5 z-30 w-56
                            bg-slate-800 text-white text-[11px] leading-relaxed
                            rounded-lg px-3 py-2 shadow-lg pointer-events-none
                            opacity-0 group-hover:opacity-100 transition-opacity"
                role="tooltip"
              >
                {disabledReason}
              </div>
            )}
          </div>

          {/* Download PDF button */}
          {onDownloadPdf && (
            <div className="relative group">
              <button
                id="sop-download-pdf-btn"
                onClick={onDownloadPdf}
                disabled={isGeneratingPdf || !isApproved}
                className={`h-9 px-3.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs
                           ${
                             isApproved
                               ? "bg-slate-800 text-white hover:bg-slate-900 cursor-pointer"
                               : "border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                           }`}
              >
                {isGeneratingPdf ? (
                  <>
                    <svg
                      className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              {!isApproved && (
                <div
                  className="absolute right-0 top-full mt-1.5 z-30 w-52
                              bg-slate-800 text-white text-[11px] leading-relaxed
                              rounded-lg px-3 py-2 shadow-lg pointer-events-none
                              opacity-0 group-hover:opacity-100 transition-opacity text-center"
                  role="tooltip"
                >
                  Approve document to download official PDF
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
