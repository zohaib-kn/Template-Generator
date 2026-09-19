import type { Metadata } from "next";
import { LorWorkspace } from "@/features/lor-generator/components/LorWorkspace";

export const metadata: Metadata = {
  title: "LOR Generator — Template Generator",
  description:
    "Letter of Recommendation Generator for academic, project guide, and industry endorsements with live A4 preview and institutional letterhead.",
};

/**
 * LOR Generator Page
 * Route: /lor-generator
 */
export default function LorGeneratorPage() {
  return <LorWorkspace />;
}
