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
import {
  generateDocumentPdf,
  type PdfNamingOptions,
} from "../pdf/generateDocumentPdf";

export type PdfStatus = "idle" | "generating" | "error";

export interface PdfGenerationResult {
  success: boolean;
  pdfBase64?: string;
  filename?: string;
  errorMessage?: string | null;
}

interface UsePdfGeneratorReturn {
  /** Current generation status. */
  status: PdfStatus;
  /** Human-readable error message when status === "error", null otherwise. */
  errorMessage: string | null;
  /** Trigger PDF generation for the given data snapshot. */
  generate: (
    data: DocumentData,
    options?: PdfNamingOptions
  ) => Promise<PdfGenerationResult>;
}

export function usePdfGenerator(): UsePdfGeneratorReturn {
  const [status, setStatus] = useState<PdfStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generate = useCallback(
    async (
      data: DocumentData,
      options?: PdfNamingOptions
    ): Promise<PdfGenerationResult> => {
      if (status === "generating") return { success: false, errorMessage: "Generation in progress" };

      setStatus("generating");
      setErrorMessage(null);

      try {
        const result = await generateDocumentPdf(data, options);
        setStatus("idle");
        return {
          success: true,
          pdfBase64: result?.pdfBase64,
          filename: result?.filename,
        };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        console.error("[usePdfGenerator] PDF generation failed:", err);
        setErrorMessage(msg);
        setStatus("error");
        return { success: false, errorMessage: msg };
      }
    },
    [status]
  );

  return { status, errorMessage, generate };
}
