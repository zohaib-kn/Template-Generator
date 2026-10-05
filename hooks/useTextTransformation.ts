"use client";

/**
 * hooks/useTextTransformation.ts
 *
 * Client React hook managing the lifecycle of Hinglish to Natural English
 * transformation.
 *
 * Guarantees:
 * - Original text is completely preserved in local state until user accepts.
 * - "Try Again" strictly sources from the original user text to prevent semantic drift.
 * - Non-destructive cancel/error recovery.
 */

import { useState, useCallback } from "react";
import type { TransformationMode } from "@/services/ai/transforms/textTransformationService";

export interface UseTextTransformationOptions {
  mode?: TransformationMode;
  fieldName?: string;
}

export function useTextTransformation(options: UseTextTransformationOptions = {}) {
  const { mode = "HINGLISH_TO_ENGLISH", fieldName } = options;

  const [status, setStatus] = useState<"idle" | "converting" | "reviewing" | "error">("idle");
  const [originalText, setOriginalText] = useState<string>("");
  const [suggestedText, setSuggestedText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  const convert = useCallback(
    async (sourceText: string) => {
      const trimmed = sourceText ? sourceText.trim() : "";
      if (!trimmed || trimmed.length < 5) {
        setErrorMessage("Please enter at least 5 characters to convert.");
        setStatus("error");
        return;
      }

      setOriginalText(sourceText);
      setStatus("converting");
      setErrorMessage(null);

      try {
        const res = await fetch("/api/ai/transform-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: sourceText,
            mode,
            fieldName,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          const msg =
            data?.error?.message ||
            "Couldn't convert the text. Your original text has not been changed.";
          setErrorMessage(msg);
          setStatus("error");
          return;
        }

        setSuggestedText(data.transformedText);
        setModelUsed(data.modelUsed || null);
        setStatus("reviewing");
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Couldn't convert the text. Your original text has not been changed.";
        setErrorMessage(msg);
        setStatus("error");
      }
    },
    [mode, fieldName]
  );

  const tryAgain = useCallback(async () => {
    if (!originalText) return;
    await convert(originalText);
  }, [originalText, convert]);

  const cancel = useCallback(() => {
    setStatus("idle");
    setSuggestedText("");
    setErrorMessage(null);
  }, []);

  const accept = useCallback(
    (onApply: (newText: string) => void) => {
      onApply(suggestedText);
      setStatus("idle");
      setSuggestedText("");
      setErrorMessage(null);
    },
    [suggestedText]
  );

  const dismissError = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return {
    status,
    isConverting: status === "converting",
    isReviewing: status === "reviewing",
    isError: status === "error",
    originalText,
    suggestedText,
    setSuggestedText,
    errorMessage,
    modelUsed,
    convert,
    tryAgain,
    cancel,
    accept,
    dismissError,
  };
}
