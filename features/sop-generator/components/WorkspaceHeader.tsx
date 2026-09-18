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
  onPreview: () => void;
  onApproveDocument: () => void;
  onApproveAll?: () => void;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

const DOC_STATUS_LABELS: Record<string, { label: string; colors: string }> = {
  draft:     { label: "Draft",     colors: "bg-slate-100 text-slate-600" },
  in_review: { label: "In Review", colors: "bg-amber-100 text-amber-700" },
  approved:  { label: "Approved",  colors: "bg-emerald-100 text-emerald-700" },
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
  onPreview,
  onApproveDocument,
  onApproveAll,
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
      <div className="px-5 pt-3 pb-1">
        <p className="text-[10px] text-slate-400 tracking-wide">
          Documents
          <span className="mx-1.5 text-slate-300">/</span>
          SOP Generator
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-500">Review</span>
        </p>
      </div>

      {/* Main row */}
      <div className="px-5 pb-3 flex items-start justify-between gap-4 flex-wrap">
        {/* Left: title + meta */}
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-800 leading-tight truncate">
            {templateName}
          </h1>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Student */}
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <span aria-hidden="true">👤</span>
              {studentName}
            </span>

            <span className="text-slate-200 select-none">·</span>

            {/* Document status */}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.colors}`}
            >
              {statusCfg.label}
            </span>

            <span className="text-slate-200 select-none">·</span>

            {/* Progress */}
            <span className="text-[11px] text-slate-500">
              <span
                className={
                  allRequiredApproved ? "text-emerald-600 font-semibold" : ""
                }
              >
                {approvedCount}
              </span>
              {" / "}
              {requiredCount} required sections approved
            </span>

            {/* Total sections note */}
            <span className="text-[10px] text-slate-400">
              ({totalCount} total)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allRequiredApproved ? "bg-emerald-500" : "bg-indigo-400"
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
          {/* Save Draft */}
          <button
            id="sop-save-draft-btn"
            onClick={onSaveDraft}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                       border border-slate-300 text-slate-600 bg-white
                       hover:bg-slate-50 active:scale-95 transition-all"
          >
            Save Draft
          </button>

          {/* Approve All */}
          {onApproveAll && !isApproved && (
            <button
              id="sop-header-approve-all-btn"
              onClick={onApproveAll}
              className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg
                         border border-emerald-300 text-emerald-700 bg-emerald-50
                         hover:bg-emerald-100 active:scale-95 transition-all flex items-center gap-1 shadow-xs"
              title="Mark all 16 sections as Approved"
            >
              ✓ Approve All
            </button>
          )}

          {/* Preview */}
          <button
            id="sop-preview-btn"
            onClick={onPreview}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg
                       border border-indigo-300 text-indigo-700 bg-indigo-50
                       hover:bg-indigo-100 active:scale-95 transition-all"
          >
            Preview
          </button>

          {/* Approve Document */}
          <div className="relative group">
            <button
              id="sop-approve-document-btn"
              onClick={onApproveDocument}
              disabled={!canApprove || isApproved}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all
                         ${
                           isApproved
                             ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                             : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                         }`}
            >
              {isApproved ? "✓ Document Approved" : "Approve Document"}
            </button>

            {/* Disabled tooltip */}
            {disabledReason && !isApproved && (
              <div
                className="absolute right-0 top-full mt-1.5 z-20 w-56
                            bg-slate-800 text-white text-[10px] leading-relaxed
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
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm
                           ${
                             isApproved
                               ? "bg-navy text-white hover:bg-navy-dark active:scale-95 cursor-pointer"
                               : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
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
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>

              {!isApproved && (
                <div
                  className="absolute right-0 top-full mt-1.5 z-20 w-52
                              bg-slate-800 text-white text-[10px] leading-relaxed
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
