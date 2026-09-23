/**
 * services/import/parsers/pdfImageExtractor.ts
 *
 * Extracts candidate profile photographs from Page 1 of a PDF resume.
 *
 * Uses `unpdf` to extract raw image pixel buffers and a pure-Node PNG encoder
 * (using built-in `zlib`) to produce a standard base64 data-URI without
 * native C++ bindings, canvas workers, or DOM dependencies.
 */

import zlib from "zlib";
import { extractImages } from "unpdf";

export interface ExtractedPhotoCandidate {
  dataUrl: string;
  width: number;
  height: number;
  channels: 1 | 3 | 4;
  aspectRatio: number;
  score: number;
}

// ── CRC32 Table for PNG Generation ──────────────────────────────────────────

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(buf: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

/**
 * Encodes raw pixel data into a standard PNG buffer using Node's built-in zlib.
 */
export function rawPixelsToPng(
  raw: Uint8ClampedArray,
  width: number,
  height: number,
  channels: 1 | 3 | 4
): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = channels === 4 ? 6 : channels === 3 ? 2 : 0; // RGBA=6, RGB=2, Grayscale=0
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Default filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makePngChunk("IHDR", ihdrData);

  const rowSize = width * channels;
  const scanlines = Buffer.alloc(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (rowSize + 1)] = 0; // Filter type: None (0)
    Buffer.from(raw.buffer, raw.byteOffset + y * rowSize, rowSize).copy(
      scanlines,
      y * (rowSize + 1) + 1
    );
  }

  const idatChunk = makePngChunk("IDAT", zlib.deflateSync(scanlines));
  const iendChunk = makePngChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Scores an extracted image to determine how likely it is to be a profile photo.
 * Filters out bullet icons, banner logos, and full-page background scans.
 */
function scoreCandidate(width: number, height: number): number {
  // 1. Minimum dimension check: Discard tiny icons/bullets (e.g. phone/mail icons < 50px)
  if (width < 50 || height < 50) return -1;

  // 2. Maximum dimension check: Discard entire full-page background scans
  if (width >= 2000 && height >= 2600) return -1;

  const aspect = width / height;

  // 3. Aspect ratio check:
  // Passport photos are usually 3:4 (0.75) or square (1.0), occasionally 4:5 or 2:3.
  // Wide banners (> 2.0) or thin vertical lines (< 0.4) are never portrait photos.
  if (aspect < 0.45 || aspect > 1.8) return -1;

  let score = 100;

  // Prefer aspect ratios close to typical passport/square dimensions (0.75 - 1.1)
  const distFromTargetRatio = Math.abs(aspect - 0.85);
  score -= distFromTargetRatio * 40;

  // Prefer typical photo resolutions (between 100px and 900px)
  if (width >= 100 && width <= 900 && height >= 100 && height <= 1000) {
    score += 30;
  }

  return score;
}

/**
 * Extracts candidate profile photo from Page 1 of the given PDF buffer.
 * Returns the highest-scoring candidate as a data URI (`data:image/png;base64,...`),
 * or `null` if no candidate meets profile photo criteria.
 */
export async function extractPdfProfilePhoto(
  buffer: Buffer,
  timeoutMs = 4000
): Promise<string | null> {
  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[pdfImageExtractor] Extraction timed out after ${timeoutMs}ms`);
      resolve(null);
    }, timeoutMs);
  });

  const extractionPromise = (async () => {
    try {
      const images = await extractImages(new Uint8Array(buffer), 1);
      if (!images || images.length === 0) return null;

      const scoredCandidates: { candidate: ExtractedPhotoCandidate; score: number }[] = [];

      for (const img of images) {
        const score = scoreCandidate(img.width, img.height);
        if (score <= 0) continue;

        try {
          const pngBuf = rawPixelsToPng(img.data, img.width, img.height, img.channels);
          const dataUrl = `data:image/png;base64,${pngBuf.toString("base64")}`;
          scoredCandidates.push({
            candidate: {
              dataUrl,
              width: img.width,
              height: img.height,
              channels: img.channels,
              aspectRatio: img.width / img.height,
              score,
            },
            score,
          });
        } catch (encErr) {
          console.warn("[pdfImageExtractor] PNG encoding warning for candidate:", encErr);
        }
      }

      if (scoredCandidates.length === 0) return null;

      // Sort by score descending (highest confidence first)
      scoredCandidates.sort((a, b) => b.score - a.score);
      return scoredCandidates[0].candidate.dataUrl;
    } catch (err) {
      console.warn("[pdfImageExtractor] Image extraction warning:", err);
      return null;
    }
  })();

  try {
    return await Promise.race([extractionPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
