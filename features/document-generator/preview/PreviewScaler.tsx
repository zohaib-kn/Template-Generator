"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface PreviewScalerProps {
  children: ReactNode;
  /** Natural width of the document in pixels (default A4 at 96dpi: 794px). */
  contentWidth?: number;
}

/** A4 page dimensions at 96 dpi. */
export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

/**
 * Scales its children so they cleanly fit the available container width.
 * The document renders at 1:1 physical dimensions (A4: 210mm / 794px) and is
 * scaled visually via CSS transform.
 *
 * Dynamically measures the total unscaled height so multi-page documents
 * scroll naturally without cutoff or arbitrary clipping.
 */
export function PreviewScaler({
  children,
  contentWidth = A4_WIDTH_PX,
}: PreviewScalerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [naturalHeight, setNaturalHeight] = useState<number>(A4_HEIGHT_PX * 2);

  // Responsive scale observer based on container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.width;
      // Allow scale up to 1, or scaled down to fit preview column
      const next = Math.min(1, (available - 4) / contentWidth);
      setScale(Math.max(0.2, next));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [contentWidth]);

  // Height observer measuring unscaled content height (supports 1, 2, or N pages)
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) {
        setNaturalHeight(entry.contentRect.height);
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scaledHeight = Math.round(naturalHeight * scale);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <div style={{ width: Math.round(contentWidth * scale), height: scaledHeight, position: "relative" }}>
        <div
          ref={contentRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: contentWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
