"use client";

/**
 * usePdfGenerator.ts
 *
 * React hook that wraps generateDocumentPdf with loading / error state.
 * The hook is the single integration point between the UI button and the
 * pure generation logic — keeping concerns cleanly separated.
 */

import { useState, useCallback } from "react";
import type { DocumentData } from "@/types";
import { generateDocumentPdf } from "../pdf/generateDocumentPdf";

export type PdfStatus = "idle" | "generating" | "error";

interface UsePdfGeneratorReturn {
  /** Current generation status. */
  status: PdfStatus;
  /** Human-readable error message when status === "error", null otherwise. */
  errorMessage: string | null;
  /** Trigger PDF generation for the given data snapshot. */
  generate: (data: DocumentData) => Promise<void>;
}

export function usePdfGenerator(): UsePdfGeneratorReturn {
  const [status, setStatus] = useState<PdfStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generate = useCallback(async (data: DocumentData) => {
    if (status === "generating") return; // Prevent double-click

    setStatus("generating");
    setErrorMessage(null);

    try {
      await generateDocumentPdf(data);
      setStatus("idle");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      console.error("[usePdfGenerator] PDF generation failed:", err);
      setErrorMessage(msg);
      setStatus("error");
    }
  }, [status]);

  return { status, errorMessage, generate };
}
