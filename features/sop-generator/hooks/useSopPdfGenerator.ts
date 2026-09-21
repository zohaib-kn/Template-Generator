"use client";

import { useState, useCallback } from "react";
import { generateSopPdf, type SopPdfNamingOptions } from "../pdf/generateSopPdf";

export type SopPdfStatus = "idle" | "generating" | "success" | "error";

export interface SopPdfGenerationResult {
  success: boolean;
  pdfBase64?: string;
  filename?: string;
  errorMessage?: string | null;
}

export interface UseSopPdfGeneratorReturn {
  status: SopPdfStatus;
  errorMessage: string | null;
  downloadPdf: (
    targetElement: HTMLElement,
    options?: SopPdfNamingOptions
  ) => Promise<SopPdfGenerationResult>;
  resetStatus: () => void;
}

export function useSopPdfGenerator(): UseSopPdfGeneratorReturn {
  const [status, setStatus] = useState<SopPdfStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const downloadPdf = useCallback(
    async (
      targetElement: HTMLElement,
      options?: SopPdfNamingOptions
    ): Promise<SopPdfGenerationResult> => {
      setStatus("generating");
      setErrorMessage(null);

      try {
        const result = await generateSopPdf(targetElement, options);
        setStatus("success");
        return {
          success: true,
          pdfBase64: result?.pdfBase64,
          filename: result?.filename,
        };
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during PDF generation.";
        setErrorMessage(message);
        setStatus("error");
        return { success: false, errorMessage: message };
      }
    },
    []
  );

  const resetStatus = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return {
    status,
    errorMessage,
    downloadPdf,
    resetStatus,
  };
}
