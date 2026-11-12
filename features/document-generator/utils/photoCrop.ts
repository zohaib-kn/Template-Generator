import type { PhotoCrop } from "@/types";

export const DEFAULT_PHOTO_CROP: PhotoCrop = { x: 0, y: 0, zoom: 1 };

export interface CropDrawRect {
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
}

/**
 * Clamps pan offsets (%) and zoom factor (1.0 - 2.5) within safe bounds.
 */
export function clampPhotoCrop(crop: PhotoCrop): PhotoCrop {
  const zoom = Number.isFinite(crop.zoom)
    ? Math.min(2.5, Math.max(1, crop.zoom))
    : 1;
  const x = Number.isFinite(crop.x) ? Math.min(60, Math.max(-60, crop.x)) : 0;
  const y = Number.isFinite(crop.y) ? Math.min(60, Math.max(-60, crop.y)) : 0;
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    zoom: Math.round(zoom * 100) / 100,
  };
}

/**
 * Computes exact draw coordinates inside a square viewport of `boxSize` px
 * so preview rendering and `<canvas>` export align pixel-for-pixel.
 */
export function computePhotoDrawRect(
  natW: number,
  natH: number,
  boxSize: number,
  crop: PhotoCrop
): CropDrawRect {
  if (!natW || !natH || !boxSize) {
    return { drawX: 0, drawY: 0, drawW: boxSize, drawH: boxSize };
  }

  const safe = clampPhotoCrop(crop);
  const baseScale = Math.max(boxSize / natW, boxSize / natH);
  const scale = baseScale * safe.zoom;
  const drawW = natW * scale;
  const drawH = natH * scale;
  const drawX = (boxSize - drawW) / 2 + (safe.x / 100) * boxSize;
  const drawY = (boxSize - drawH) / 2 + (safe.y / 100) * boxSize;

  return { drawX, drawY, drawW, drawH };
}

