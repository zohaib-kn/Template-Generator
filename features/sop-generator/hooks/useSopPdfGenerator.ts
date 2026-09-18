"use client";

import { useState, useCallback } from "react";
import { generateSopPdf, type SopPdfNamingOptions } from "../pdf/generateSopPdf";

export type SopPdfStatus = "idle" | "generating" | "success" | "error";

export interface UseSopPdfGeneratorReturn {
  status: SopPdfStatus;
  errorMessage: string | null;
  downloadPdf: (
    targetElement: HTMLElement,
    options?: SopPdfNamingOptions
  ) => Promise<boolean>;
  resetStatus: () => void;
}

export function useSopPdfGenerator(): UseSopPdfGeneratorReturn {
  const [status, setStatus] = useState<SopPdfStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const downloadPdf = useCallback(
    async (
      targetElement: HTMLElement,
      options?: SopPdfNamingOptions
    ): Promise<boolean> => {
      setStatus("generating");
      setErrorMessage(null);

      try {
        await generateSopPdf(targetElement, options);
        setStatus("success");
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during PDF generation.";
        setErrorMessage(message);
        setStatus("error");
        return false;
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
