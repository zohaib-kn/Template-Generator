/**
 * services/import/parsers/docxParser.ts
 *
 * Resilient server-side DOCX extraction using mammoth.
 *
 * Features:
 * - 10-second timeout safeguard.
 * - Extracts both plain text and structural HTML (preserving headings, lists, tables).
 * - Identifies corrupted ZIP / DOCX archives.
 */

import mammoth from "mammoth";

export class CorruptedDocxError extends Error {
  constructor(
    message = "The Word document appears to be corrupted or invalid. Please verify the file and try again."
  ) {
    super(message);
    this.name = "CorruptedDocxError";
  }
}

export interface DocxParseResult {
  rawText: string;
  html: string;
  photoDataUrl?: string;
}

export async function parseDocxBuffer(
  buffer: Buffer,
  timeoutMs = 10000
): Promise<DocxParseResult> {
  const parsePromise = (async () => {
    try {
      let photoDataUrl: string | undefined;

      const [rawResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml(
          { buffer },
          {
            convertImage: mammoth.images.imgElement((element) => {
              return element.read("base64").then((imageBuffer) => {
                if (!photoDataUrl && element.contentType?.startsWith("image/")) {
                  photoDataUrl = `data:${element.contentType};base64,${imageBuffer}`;
                }
                return { src: photoDataUrl || "" };
              });
            }),
          }
        ),
      ]);

      return {
        rawText: rawResult.value || "",
        html: htmlResult.value || "",
        photoDataUrl,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("end of central directory") ||
        msg.includes("Can't find end of central directory") ||
        msg.includes("not a valid zip file")
      ) {
        throw new CorruptedDocxError();
      }
      throw err;
    }
  })();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error("Word document extraction timed out. The file may be complex or corrupted.")
        ),
      timeoutMs
    )
  );

  const result = await Promise.race([parsePromise, timeoutPromise]);

  if (!result.rawText || result.rawText.trim().length < 20) {
    throw new Error(
      "We couldn't detect readable text in this Word document. Please ensure the document is not empty."
    );
  }

  return result;
}
