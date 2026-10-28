import { DocumentStudioDashboard } from "@/features/dashboard/components/DocumentStudioDashboard";

/**
 * Home Page: /
 * Unified Template Generator Studio Dashboard.
 *
 * Features:
 * - Approved, immutable template skeletons gallery.
 * - 2-Click document creation modal (Select Student -> Generate & Open Live Studio).
 * - Recent student document history grid with direct workspace resumption.
 */
export default function HomePage() {
  return <DocumentStudioDashboard />;
}
