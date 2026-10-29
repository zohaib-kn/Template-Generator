/**
 * lib/http/requestLimits.ts
 *
 * Bounded JSON body reading and safe Content-Disposition headers for API routes.
 */

export class RequestTooLargeError extends Error {
  constructor(readonly limitBytes: number) {
    super(`Request body exceeds the ${Math.round(limitBytes / 1024)} KB limit.`);
    this.name = "RequestTooLargeError";
  }
}

export class InvalidJsonError extends Error {
  constructor() {
    super("Invalid JSON request body.");
    this.name = "InvalidJsonError";
  }
}

/**
 * Reads and parses a JSON body, refusing anything over `maxBytes` — checked against
 * Content-Length up front and enforced while streaming (chunked bodies can't bypass it).
 */
export async function readJsonBody<T>(req: Request, maxBytes: number): Promise<T> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestTooLargeError(maxBytes);

  const reader = req.body?.getReader();
  if (!reader) throw new InvalidJsonError();

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new RequestTooLargeError(maxBytes);
    }
    chunks.push(value);
  }

  const text = new TextDecoder().decode(Buffer.concat(chunks));
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new InvalidJsonError();
  }
}

/** Reduces arbitrary text to a filename segment: letters, digits, '_' and '-' only. */
export function safeFilenamePart(value: string | null | undefined, fallback: string, maxLength = 80): string {
  const cleaned = (value || "")
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLength);
  return cleaned || fallback;
}

/**
 * `attachment` Content-Disposition for a name built from safeFilenamePart segments.
 * Never contains quotes, CR/LF or non-ASCII, so header injection is impossible.
 */
export function attachmentDisposition(baseName: string, extension: string): string {
  const name = `${safeFilenamePart(baseName, "document", 150)}.${extension.replace(/[^a-z0-9]/gi, "")}`;
  return `attachment; filename="${name}"`;
}
