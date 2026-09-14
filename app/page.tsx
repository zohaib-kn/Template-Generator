import { DocumentGeneratorShell } from "@/features/document-generator/components/DocumentGeneratorShell";

/**
 * Document Generator page.
 * Route: /
 *
 * The actual layout and interactivity lives in DocumentGeneratorShell,
 * which is a Client Component. This page file can remain a Server Component
 * because Next.js App Router handles the client boundary automatically.
 */
export default function GeneratorPage() {
  return <DocumentGeneratorShell />;
}

