"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavTab {
  label: string;
  href: string;
  id: string;
}

const NAV_TABS: NavTab[] = [
  { label: "Resume Builder", href: "/",             id: "nav-tab-resume" },
  { label: "SOP Generator",  href: "/sop-generator", id: "nav-tab-sop"    },
  { label: "LOR Generator",  href: "/lor-generator", id: "nav-tab-lor"    },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header
      className="flex items-center justify-between px-6 h-14 bg-[#111827] border-b border-slate-800
                 flex-shrink-0 z-20 relative select-none"
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-2xs">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <rect x="1" y="1" width="6" height="9" rx="1" fill="white" fillOpacity="0.95" />
            <rect x="9" y="1" width="6" height="5" rx="1" fill="white" fillOpacity="0.75" />
            <rect x="9" y="8" width="6" height="7" rx="1" fill="white" fillOpacity="0.75" />
          </svg>
        </div>
        <span style={{ color: "#ffffff" }} className="text-white font-semibold text-sm tracking-tight">
          Template Generator
        </span>
      </div>

      {/* ── Tool navigation tabs (Identical high-contrast styling across all tools) ── */}
      <nav
        className="flex items-center gap-1 bg-white/[0.08] rounded-lg p-1 border border-white/10"
        aria-label="Tool navigation"
      >
        {NAV_TABS.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/" || pathname === "/resume-builder"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              id={tab.id}
              style={{
                color: isActive ? "#0f172a" : "#e2e8f0",
                backgroundColor: isActive ? "#ffffff" : "transparent",
              }}
              className={`px-3.5 py-1.5 rounded-md text-[12px] transition-all duration-150 ${
                isActive
                  ? "shadow-sm font-semibold"
                  : "hover:bg-white/10 font-medium"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span style={{ color: isActive ? "#0f172a" : "#e2e8f0" }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Right spacer to maintain symmetrical balance matching SOP Generator ── */}
      <div className="w-[140px]" aria-hidden="true" />
    </header>
  );
}
