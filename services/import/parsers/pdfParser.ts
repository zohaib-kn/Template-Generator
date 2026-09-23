/**
 * services/import/parsers/pdfParser.ts
 *
 * Resilient server-side PDF text extraction using unpdf.
 * unpdf is cross-runtime (Node.js/Next.js/Serverless), avoids browser DOM/worker issues,
 * and extracts text cleanly without Canvas or DOMMatrix requirements.
 *
 * Features:
 * - 10-second timeout safeguard to prevent hung workers.
 * - Detects empty/scanned PDFs (<50 characters readable text).
 * - Identifies password-protected/encrypted PDFs.
 */

import { extractText, getDocumentProxy } from "unpdf";

export class ScannedPdfError extends Error {
  constructor(
    message = "We couldn't detect readable text in this PDF. Scanned documents or image-only PDFs are not supported in V1."
  ) {
    super(message);
    this.name = "ScannedPdfError";
  }
}

export class PasswordProtectedPdfError extends Error {
  constructor(message = "This PDF is password-protected. Please upload an unprotected copy.") {
    super(message);
    this.name = "PasswordProtectedPdfError";
  }
}

export interface PdfParseResult {
  text: string;
  numPages: number;
}

export async function parsePdfBuffer(
  buffer: Buffer,
  timeoutMs = 10000
): Promise<PdfParseResult> {
  const parsePromise = (async () => {
    try {
      const uint8 = new Uint8Array(buffer);
      const pdf = await getDocumentProxy(uint8);
      const { totalPages, text } = await extractText(pdf, { mergePages: true });

      return {
        text: text || "",
        numPages: totalPages || 1,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.name : "";
      if (
        name.includes("Password") ||
        msg.toLowerCase().includes("password") ||
        msg.toLowerCase().includes("encrypted") ||
        msg.toLowerCase().includes("bad decrypt")
      ) {
        throw new PasswordProtectedPdfError();
      }
      throw err;
    }
  })();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error("PDF text extraction timed out. The file may be complex or corrupted.")
        ),
      timeoutMs
    )
  );

  const result = await Promise.race([parsePromise, timeoutPromise]);

  if (!result.text || result.text.trim().length < 50) {
    throw new ScannedPdfError();
  }

  return result;
}

