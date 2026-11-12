"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { PhotoCrop } from "@/types";
import {
  DEFAULT_PHOTO_CROP,
  clampPhotoCrop,
  computePhotoDrawRect,
} from "../utils/photoCrop";

interface PhotoRepositionModalProps {
  isOpen: boolean;
  sourceUrl: string;
  initialCrop?: PhotoCrop;
  onSave: (result: {
    photoUrl: string;
    photoSourceUrl: string;
    photoCrop: PhotoCrop;
  }) => void;
  onRemove: () => void;
  onClose: () => void;
}

const PREVIEW_SIZE = 200;
const EXPORT_SIZE = 420;

function readFileAsResizedDataUri(file: File, maxDim = 900): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (!src) return resolve("");
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.94));
        } else {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function getCorsSafePreviewSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) {
    return url;
  }
  if (typeof window !== "undefined" && url.startsWith(window.location.origin)) {
    return url;
  }
  if (/^https?:\/\//i.test(url)) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function PhotoRepositionModal({
  isOpen,
  sourceUrl,
  initialCrop,
  onSave,
  onRemove,
  onClose,
}: PhotoRepositionModalProps) {
  const [activeSource, setActiveSource] = useState(sourceUrl);
  const [previewSrc, setPreviewSrc] = useState(() => getCorsSafePreviewSrc(sourceUrl));
  const [crop, setCrop] = useState<PhotoCrop>(() =>
    clampPhotoCrop(initialCrop ?? DEFAULT_PHOTO_CROP)
  );
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveSource(sourceUrl);
    setPreviewSrc(getCorsSafePreviewSrc(sourceUrl));
    setCrop(clampPhotoCrop(initialCrop ?? DEFAULT_PHOTO_CROP));
  }, [isOpen, sourceUrl, initialCrop]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startX: crop.x,
        startY: crop.y,
      };
    },
    [crop.x, crop.y]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dxPct = ((e.clientX - dragStartRef.current.clientX) / PREVIEW_SIZE) * 100;
    const dyPct = ((e.clientY - dragStartRef.current.clientY) / PREVIEW_SIZE) * 100;
    setCrop((prev) =>
      clampPhotoCrop({
        ...prev,
        x: dragStartRef.current!.startX + dxPct,
        y: dragStartRef.current!.startY + dyPct,
      })
    );
  }, []);

  const handlePointerUp = useCallback(() => {
    dragStartRef.current = null;
    setIsDragging(false);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const dataUri = await readFileAsResizedDataUri(file, 900);
    if (!dataUri) return;
    setActiveSource(dataUri);
    setPreviewSrc(dataUri);
    setCrop(DEFAULT_PHOTO_CROP);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const safeCrop = clampPhotoCrop(crop);
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = EXPORT_SIZE;
          canvas.height = EXPORT_SIZE;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
            const rect = computePhotoDrawRect(
              img.naturalWidth,
              img.naturalHeight,
              EXPORT_SIZE,
              safeCrop
            );
            ctx.drawImage(img, rect.drawX, rect.drawY, rect.drawW, rect.drawH);
            const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
            onSave({
              photoUrl: croppedDataUrl,
              photoSourceUrl: activeSource,
              photoCrop: safeCrop,
            });
            return;
          }
        } catch {
          // Fall back to CSS crop if canvas export is restricted by CORS
        }
      }

      onSave({
        photoUrl: activeSource,
        photoSourceUrl: activeSource,
        photoCrop: safeCrop,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  const drawRect = computePhotoDrawRect(
    naturalSize.w,
    naturalSize.h,
    PREVIEW_SIZE,
    crop
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-slate-900/55 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto select-none"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div
        className="my-auto bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm p-5 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Adjust Profile Photo
            </h3>
            <p className="text-[11px] text-slate-500">
              Drag photo to reposition and use zoom to fit cleanly
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Circular interactive crop stage */}
        <div className="my-5 flex flex-col items-center gap-3">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              cursor: isDragging ? "grabbing" : "grab",
              touchAction: "none",
            }}
            className="relative rounded-full overflow-hidden border-4 border-slate-300 bg-white shadow-inner"
          >
            {previewSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={previewSrc}
                alt="Adjust profile framing"
                draggable={false}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setNaturalSize({
                    w: target.naturalWidth,
                    h: target.naturalHeight,
                  });
                }}
                onError={() => {
                  if (previewSrc !== activeSource) {
                    setPreviewSrc(activeSource);
                  }
                }}
                style={
                  naturalSize.w > 0
                    ? {
                        position: "absolute",
                        left: `${drawRect.drawX}px`,
                        top: `${drawRect.drawY}px`,
                        width: `${drawRect.drawW}px`,
                        height: `${drawRect.drawH}px`,
                        maxWidth: "none",
                        pointerEvents: "none",
                      }
                    : {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none",
                      }
                }
              />
            )}
          </div>

          {/* Zoom slider */}
          <div className="w-full flex items-center gap-2.5 px-1">
            <span className="text-[11px] font-semibold text-slate-500 w-10">
              Zoom
            </span>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={crop.zoom}
              onChange={(e) =>
                setCrop((prev) =>
                  clampPhotoCrop({ ...prev, zoom: Number(e.target.value) })
                )
              }
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              aria-label="Photo zoom"
            />
            <span className="text-[11px] font-semibold text-slate-600 w-10 text-right tabular-nums">
              {Math.round(crop.zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={() => setCrop(DEFAULT_PHOTO_CROP)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-medium text-red-600 cursor-pointer"
            >
              Remove
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Photo"}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.avif"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
    </div>,
    document.body
  );
}

