/**
 * services/pdf/pdfMetadata.ts
 *
 * Isomorphic utility for encoding and decoding structured document payloads
 * into PDF metadata (/Subject field).
 *
 * Works in both browser (window.btoa / TextEncoder) and Node.js (Buffer) environments.
 */

export interface EmbeddedPdfPayload<T = unknown> {
  generator: "templete-generator";
  version: number;
  type: string;
  timestamp: string;
  data: T;
}

const PREFIX = "TG_DATA:";

/**
 * Encode a structured payload into a base64 string with the TG_DATA: prefix.
 */
export function encodeEmbeddedData<T = unknown>(payload: EmbeddedPdfPayload<T>): string {
  const jsonStr = JSON.stringify(payload);

  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    // Browser environment with Unicode support
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `${PREFIX}${window.btoa(binary)}`;
  } else {
    // Node.js server environment
    return `${PREFIX}${Buffer.from(jsonStr, "utf-8").toString("base64")}`;
  }
}

/**
 * Decode an embedded payload from a PDF Subject or info string.
 * Returns null if the string does not match the TG_DATA format or fails parsing.
 */
export function decodeEmbeddedData<T = unknown>(
  subjectOrStr?: string | null
): EmbeddedPdfPayload<T> | null {
  if (!subjectOrStr || typeof subjectOrStr !== "string" || !subjectOrStr.startsWith(PREFIX)) {
    return null;
  }

  try {
    const rawBase64 = subjectOrStr.slice(PREFIX.length);
    let jsonStr = "";

    if (typeof Buffer !== "undefined") {
      // Node.js environment
      jsonStr = Buffer.from(rawBase64, "base64").toString("utf-8");
    } else if (typeof window !== "undefined" && typeof window.atob === "function") {
      // Browser environment with Unicode support
      const binary = window.atob(rawBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      jsonStr = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.generator === "templete-generator" && parsed.data) {
      return parsed as EmbeddedPdfPayload<T>;
    }
  } catch (err) {
    console.warn("[pdfMetadata] Failed to decode embedded data:", err);
  }

  return null;
}
