import type { Metadata } from "next";
import { SopWorkspace } from "@/features/sop-generator/components/SopWorkspace";

export const metadata: Metadata = {
  title: "SOP Generator — Template Generator",
  description:
    "Counsellor workspace for generating and reviewing student application documents including visa cover letters, SOPs, and study plans.",
};

/**
 * SOP Generator page.
 * Route: /sop-generator
 *
 * The actual workspace and interactivity lives in SopWorkspace,
 * which is a Client Component. This page file remains a Server Component.
 *
 * NOTE: This page does NOT wrap in DocumentProvider (Resume Builder context).
 * The SOP feature manages its own local state inside SopWorkspace.
 */
export default function SopGeneratorPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      <SopWorkspace />
    </div>
  );
}
