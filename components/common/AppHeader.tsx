import { Button } from "@/components/ui";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-6 h-14 bg-navy border-b border-navy-dark flex-shrink-0 z-10 shadow-md">
      {/* Brand */}
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div className="w-7 h-7 rounded-md bg-gold flex items-center justify-center flex-shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="6" height="9" rx="1" fill="white" fillOpacity="0.9" />
            <rect x="9" y="1" width="6" height="5" rx="1" fill="white" fillOpacity="0.6" />
            <rect x="9" y="8" width="6" height="7" rx="1" fill="white" fillOpacity="0.6" />
          </svg>
        </div>
        <span className="text-white font-semibold text-sm tracking-tight">
          Template Generator
        </span>
      </div>

      {/* Template badge */}
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium border border-white/10">
          Europass · v1
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled
          title="PDF export will be available in a future phase"
          className="border-white/20 text-white/60 bg-transparent hover:bg-white/5 cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export PDF
        </Button>
      </div>
    </header>
  );
}
