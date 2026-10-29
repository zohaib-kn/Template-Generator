/**
 * lib/net/safeImageFetch.ts
 *
 * SSRF-hardened fetch for remote images (used by /api/proxy-image).
 *
 * - http(s) on default ports only; no credentials in the URL.
 * - Every resolved address is checked at connect time (custom DNS lookup), so DNS names
 *   pointing at private ranges and DNS rebinding are both blocked. IP literals are
 *   checked before connecting.
 * - Redirects are never followed.
 * - Body is capped at MAX_IMAGE_BYTES and must be a raster image whose magic bytes match
 *   an allow-listed type. SVG (scriptable) and anything else is rejected.
 */

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { LookupFunction } from "node:net";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

export class ImageFetchError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ImageFetchError";
  }
}

const blockList = new net.BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockList.addSubnet(prefix, bits, "ipv4");
}
for (const [prefix, bits] of [
  ["::", 128],
  ["::1", 128],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockList.addSubnet(prefix, bits, "ipv6");
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved and documentation ranges. */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blockList.check(address, "ipv4");
  if (family !== 6) return true;

  const lower = address.toLowerCase();
  // IPv4-mapped / IPv4-compatible / NAT64 forms carry an IPv4 address in the low 32 bits
  const embedded = lower.match(/^(?:::ffff:|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
  if (embedded) return isBlockedAddress(embedded[1]);
  const mappedHex = lower.match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isBlockedAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return blockList.check(address, "ipv6");
}

/** DNS lookup used for every outbound connection; rejects if any resolved address is blocked. */
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(new ImageFetchError("Image host resolves to a forbidden network address.", 403), "", 0);
    }
    if ((options as { all?: boolean }).all) {
      return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, addresses);
    }
    callback(null, addresses[0].address, addresses[0].family);
  });
};

const IMAGE_SIGNATURES: Array<{ type: string; test: (b: Buffer) => boolean }> = [
  { type: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/gif", test: (b) => b.subarray(0, 6).toString("latin1") === "GIF87a" || b.subarray(0, 6).toString("latin1") === "GIF89a" },
  { type: "image/webp", test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
  { type: "image/avif", test: (b) => b.subarray(4, 8).toString("latin1") === "ftyp" && /^avi[fs]$/.test(b.subarray(8, 12).toString("latin1")) },
  { type: "image/bmp", test: (b) => b[0] === 0x42 && b[1] === 0x4d },
];

/** Detects the image type from magic bytes; null if not an allow-listed raster image. */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  return IMAGE_SIGNATURES.find((s) => s.test(buf))?.type ?? null;
}

/** Validates a user-supplied image URL. Throws ImageFetchError when it is not allowed. */
export function parseImageUrl(raw: string | null | undefined): URL {
  if (!raw || raw.length > 2048) throw new ImageFetchError("Invalid or missing image URL parameter.", 400);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImageFetchError("Malformed URL format.", 400);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ImageFetchError("Only http and https image URLs are allowed.", 400);
  }
  if (url.username || url.password) throw new ImageFetchError("Credentials in image URLs are not allowed.", 400);
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new ImageFetchError("Non-standard ports are not allowed.", 403);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new ImageFetchError("Access to private or internal network addresses is forbidden.", 403);
  }
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw new ImageFetchError("Access to private or internal network addresses is forbidden.", 403);
  }
  return url;
}

export async function fetchRemoteImage(rawUrl: string | null | undefined): Promise<{ body: Buffer; contentType: string }> {
  const url = parseImageUrl(rawUrl);
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.get(
      url,
      {
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: { Accept: "image/*", "User-Agent": "TemplateGenerator-ImageProxy/1.0" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return reject(new ImageFetchError("Image redirects are not followed.", 502));
        }
        if (status !== 200) {
          res.resume();
          return reject(new ImageFetchError(`Upstream image fetch failed with HTTP ${status}.`, 502));
        }
        const declared = Number(res.headers["content-length"]);
        if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
          res.destroy();
          return reject(new ImageFetchError("Image exceeds the 5 MB limit.", 413));
        }

        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_IMAGE_BYTES) {
            res.destroy();
            reject(new ImageFetchError("Image exceeds the 5 MB limit.", 413));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          const contentType = sniffImageType(body);
          if (!contentType) return reject(new ImageFetchError("Upstream content is not a supported image.", 415));
          resolve({ body, contentType });
        });
        res.on("error", () => reject(new ImageFetchError("Failed to fetch image upstream.", 502)));
      }
    );
    req.on("timeout", () => req.destroy(new ImageFetchError("Image proxy request timed out.", 504)));
    req.on("error", (err) =>
      reject(err instanceof ImageFetchError ? err : new ImageFetchError("Failed to fetch image upstream.", 502))
    );
  });
}
