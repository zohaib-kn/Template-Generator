"use client";

/**
 * usePhotoCrop.ts
 *
 * Encapsulates all pan / zoom / crop-to-circle logic for the photo cropper.
 * No JSX — purely canvas math and pointer event handlers.
 *
 * Usage:
 *   const { canvasRef, zoom, setZoom, onPointerDown, onPointerMove,
 *           onPointerUp, onWheel, cropToCircle } = usePhotoCrop(imgEl, cropSize);
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Diameter of the circular crop window in canvas-display pixels. */
export const CROP_WINDOW_PX = 300;

/** Minimum zoom (image fills the crop circle). */
const MIN_ZOOM = 1;

/** Maximum zoom. */
const MAX_ZOOM = 3;

/** Canvas display dimensions (square). */
const CANVAS_SIZE = 380;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Offset {
  x: number;
  y: number;
}

interface UsePhotoCropReturn {
  /** Attach to the `<canvas>` element. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Current zoom level (1 – 3). */
  zoom: number;
  setZoom: (z: number) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
  onWheel: (e: ReactWheelEvent<HTMLCanvasElement>) => void;
  /**
   * Render the final circular crop to an offscreen canvas and return a
   * Base64-encoded JPEG data-URI (quality 0.92).
   *
   * @param outputPx  Diameter of the output image in pixels.
   */
  cropToCircle: (outputPx: number) => string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Compute the display scale so the image *at zoom=1* fills the crop circle
 * with no empty space (cover behaviour).
 */
function baseScale(img: HTMLImageElement): number {
  const shorter = Math.min(img.naturalWidth, img.naturalHeight);
  return CROP_WINDOW_PX / shorter;
}

/**
 * Clamp offset so the image always fully covers the crop circle at the current
 * zoom level. Returns a clamped { x, y }.
 */
function clampOffset(
  offset: Offset,
  img: HTMLImageElement,
  zoom: number
): Offset {
  const scale = baseScale(img) * zoom;
  const imgW = img.naturalWidth * scale;
  const imgH = img.naturalHeight * scale;

  // Centre of the canvas
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const r = CROP_WINDOW_PX / 2;

  // Image is drawn so that its centre aligns with (cx + offset.x, cy + offset.y)
  const minX = cx - (imgW / 2 - r); // rightmost allowed centre
  const maxX = cx + (imgW / 2 - r); // leftmost allowed centre
  const minY = cy - (imgH / 2 - r);
  const maxY = cy + (imgH / 2 - r);

  return {
    x: Math.min(maxX, Math.max(minX, cx + offset.x)) - cx,
    y: Math.min(maxY, Math.max(minY, cy + offset.y)) - cy,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePhotoCrop(
  imgEl: HTMLImageElement | null
): UsePhotoCropReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [zoom, setZoomRaw] = useState(1);
  // Offset from canvas centre in display pixels
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  // Dragging state stored in a ref to avoid stale closures in pointer handlers
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  // ── Render loop ────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = baseScale(imgEl) * zoom;
    const imgW = imgEl.naturalWidth * scale;
    const imgH = imgEl.naturalHeight * scale;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;

    // Image top-left
    const drawX = cx + offset.x - imgW / 2;
    const drawY = cy + offset.y - imgH / 2;

    // ── Clear
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // ── Draw image (full canvas, no clip yet — gives us the dimmed corners)
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(imgEl, drawX, drawY, imgW, imgH);
    ctx.restore();

    // ── Dark overlay with circular hole
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.beginPath();
    // Full canvas rect
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // Subtract circle (even-odd winding)
    ctx.arc(cx, cy, CROP_WINDOW_PX / 2, 0, Math.PI * 2, true);
    ctx.fill("evenodd");
    ctx.restore();

    // ── Circle border
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, CROP_WINDOW_PX / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [imgEl, zoom, offset]);

  // ── Zoom setter (clamped + re-clamp offset) ───────────────────────────────

  const setZoom = useCallback(
    (z: number) => {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
      setZoomRaw(clamped);
      if (imgEl) {
        setOffset((prev) => clampOffset(prev, imgEl, clamped));
      }
    },
    [imgEl]
  );

  // ── Pointer handlers ──────────────────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!dragRef.current.active || !imgEl) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;

      setOffset((prev) => {
        const next = { x: prev.x + dx, y: prev.y + dy };
        return clampOffset(next, imgEl, zoom);
      });
    },
    [imgEl, zoom]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? 0.08 : -0.08));
    },
    [setZoom, zoom]
  );

  // ── Crop-to-circle ────────────────────────────────────────────────────────

  const cropToCircle = useCallback(
    (outputPx: number): string => {
      if (!imgEl) return "";

      const offscreen = document.createElement("canvas");
      offscreen.width = outputPx;
      offscreen.height = outputPx;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return "";

      const scale = baseScale(imgEl) * zoom;
      // Centre of the crop window in canvas-display coords
      const cx = CANVAS_SIZE / 2;
      const cy = CANVAS_SIZE / 2;
      // Image centre in canvas-display coords
      const imgCX = cx + offset.x;
      const imgCY = cy + offset.y;
      // Crop window bounds in canvas-display coords
      const cropLeft = cx - CROP_WINDOW_PX / 2;
      const cropTop = cy - CROP_WINDOW_PX / 2;

      // Map crop window corners back to source image pixel coordinates
      const imgW = imgEl.naturalWidth * scale;
      const imgH = imgEl.naturalHeight * scale;
      const imgDrawX = imgCX - imgW / 2; // top-left of image in canvas coords

      const srcX = ((cropLeft - imgDrawX) / scale);
      const srcY = ((cropTop - imgCY + imgH / 2) / scale);
      const srcSize = CROP_WINDOW_PX / scale;

      // Circular clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(outputPx / 2, outputPx / 2, outputPx / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        imgEl,
        srcX,
        srcY,
        srcSize,
        srcSize,
        0,
        0,
        outputPx,
        outputPx
      );
      ctx.restore();

      return offscreen.toDataURL("image/jpeg", 0.92);
    },
    [imgEl, zoom, offset]
  );

  return {
    canvasRef,
    zoom,
    setZoom,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    cropToCircle,
  };
}
