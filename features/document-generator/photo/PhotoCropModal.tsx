"use client";

/**
 * PhotoCropModal.tsx
 *
 * Instagram-style circular photo crop modal.
 *
 * Props:
 *   imgEl    — the HTMLImageElement loaded from the user's file selection
 *   onApply  — called with the final Base64-JPEG data-URI when user clicks Apply
 *   onCancel — called when user dismisses without applying
 */

import { useEffect, type KeyboardEvent } from "react";
import { usePhotoCrop, CROP_WINDOW_PX } from "./usePhotoCrop";

/** Diameter of the final exported photo in pixels. */
const OUTPUT_SIZE_PX = 400;

/** Display size of the canvas element (must match CANVAS_SIZE in usePhotoCrop). */
const CANVAS_DISPLAY_PX = 380;

interface PhotoCropModalProps {
  imgEl: HTMLImageElement;
  onApply: (dataUri: string) => void;
  onCancel: () => void;
}

export function PhotoCropModal({
  imgEl,
  onApply,
  onCancel,
}: PhotoCropModalProps) {
  const {
    canvasRef,
    zoom,
    setZoom,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    cropToCircle,
  } = usePhotoCrop(imgEl);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleApply() {
    const dataUri = cropToCircle(OUTPUT_SIZE_PX);
    if (dataUri) onApply(dataUri);
  }

  function handleBackdropKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") onCancel();
  }

  const zoomPercent = Math.round(((zoom - 1) / 2) * 100); // 0–100

  return (
    /* ── Backdrop ──────────────────────────────────────────────────────────── */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Crop profile photo"
      onClick={(e) => {
        // Close when clicking directly on backdrop
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={handleBackdropKey}
      tabIndex={-1}
    >
      {/* ── Modal card ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#1a1d23",
          borderRadius: 16,
          padding: "24px 28px 28px",
          width: CANVAS_DISPLAY_PX + 56,
          maxWidth: "95vw",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              Adjust photo
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Drag to reposition · scroll to zoom
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close crop modal"
            id="photo-crop-close-btn"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.7)",
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Canvas area ───────────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            width: CANVAS_DISPLAY_PX,
            height: CANVAS_DISPLAY_PX,
            alignSelf: "center",
            borderRadius: 12,
            overflow: "hidden",
            background: "#000",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_DISPLAY_PX}
            height={CANVAS_DISPLAY_PX}
            style={{
              display: "block",
              width: CANVAS_DISPLAY_PX,
              height: CANVAS_DISPLAY_PX,
              touchAction: "none",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            aria-label="Drag to position photo"
          />

          {/* ── Crop circle guide (CSS ring on top of canvas) ─────────────── */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: CROP_WINDOW_PX,
              height: CROP_WINDOW_PX,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              // Thin white ring on the crop edge
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.55), 0 0 0 9999px rgba(0,0,0,0)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ── Zoom slider ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              Zoom
            </span>
            <span
              style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "monospace" }}
            >
              {zoom.toFixed(2)}×
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* − button */}
            <button
              type="button"
              onClick={() => setZoom(zoom - 0.1)}
              aria-label="Zoom out"
              style={zoomButtonStyle}
            >
              −
            </button>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={100}
              value={zoomPercent}
              onChange={(e) => {
                const pct = Number(e.target.value) / 100;
                setZoom(1 + pct * 2); // maps 0–100 → 1–3
              }}
              aria-label="Zoom level"
              id="photo-crop-zoom-slider"
              style={{
                flex: 1,
                accentColor: "#4f7ef7",
                height: 4,
                cursor: "pointer",
              }}
            />

            {/* + button */}
            <button
              type="button"
              onClick={() => setZoom(zoom + 0.1)}
              aria-label="Zoom in"
              style={zoomButtonStyle}
            >
              +
            </button>
          </div>
        </div>

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            id="photo-crop-cancel-btn"
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            id="photo-crop-apply-btn"
            style={{
              padding: "9px 24px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #4f7ef7 0%, #3a5fd4 100%)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.01em",
              boxShadow: "0 2px 8px rgba(79,126,247,0.4)",
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared tiny styles ───────────────────────────────────────────────────────

const zoomButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.07)",
  color: "rgba(255,255,255,0.8)",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
