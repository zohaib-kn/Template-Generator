"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

function formatUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function PortfolioForm() {
  const { data, setPersonal } = useDocumentState();
  const currentUrl = data.personal?.portfolioUrl ?? data.portfolioUrl ?? "";
  const resolvedHref = formatUrl(currentUrl);

  return (
    <div className="space-y-4 pt-2">
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🌐</span>
          <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
            Student Portfolio & Web Presence
          </h4>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Add a link to the student&apos;s personal portfolio, website, GitHub, Behance, or online project showcase. This link will be displayed in the CV header and will remain clickable in both the preview and the exported PDF.
        </p>
      </div>

      <div>
        <Label htmlFor="portfolio-url">Portfolio or Website URL</Label>
        <div className="relative mt-1">
          <Input
            id="portfolio-url"
            type="url"
            value={currentUrl}
            onChange={(e) => setPersonal({ portfolioUrl: e.target.value })}
            placeholder="e.g. https://portfolio.com, github.com/username, or behance.net/work"
            className="pr-20"
          />
          {currentUrl.trim() && (
            <button
              type="button"
              onClick={() => setPersonal({ portfolioUrl: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 hover:text-rose-600 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
              title="Clear link"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {resolvedHref ? (
        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Active CV Link
            </span>
            <span className="text-xs font-mono text-emerald-900 truncate block mt-0.5">
              {resolvedHref}
            </span>
          </div>

          <a
            href={resolvedHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-100/60 border border-emerald-300 px-2.5 py-1 rounded-md transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <span>Visit</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 italic">
          Tip: You can also click directly on the portfolio line in the resume header to edit the URL inline.
        </div>
      )}
    </div>
  );
}
