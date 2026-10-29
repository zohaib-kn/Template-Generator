"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface SopCanvasInlineEditorProps {
  sectionId: string;
  initialContent: string;
  textAlign?: "left" | "justify";
  fontWeight?: "normal" | "bold";
  onChange: (newContent: string) => void;
  onDone: () => void;
  onCancel?: () => void;
}

/**
 * Pure direct in-place live canvas editor.
 *
 * NO buttons, NO floating toolbars.
 * - 100% font-matched to Times New Roman 13px / 1.23 line-height
 * - Auto-resizes height dynamically with zero layout jump
 * - Auto-saves on blur (when clicking anywhere outside)
 * - Esc key reverts to the text as it was when editing started, then exits
 */
export function SopCanvasInlineEditor({
  sectionId,
  initialContent,
  textAlign = "justify",
  fontWeight = "normal",
  onChange,
  onDone,
  onCancel,
}: SopCanvasInlineEditorProps) {
  const [text, setText] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Text at the start of this edit session; Escape restores it.
  const initialRef = useRef(initialContent);
  // Last value this editor emitted, so our own keystrokes echoing back through the parent
  // are not mistaken for an external change (which would reset the Escape snapshot).
  const lastEmittedRef = useRef<string | null>(null);

  // Sync internal state only when initialContent changes externally (AI/Undo)
  useEffect(() => {
    if (initialContent === lastEmittedRef.current) return;
    setText(initialContent);
    initialRef.current = initialContent;
  }, [initialContent]);

  // Auto-resize height to fit content seamlessly
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [text, autoResize]);

  // Auto-focus on mount
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setText(newVal);
    lastEmittedRef.current = newVal;
    onChange(newVal);
  };

  const handleBlur = () => {
    onDone();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      // Revert if cancelled via Escape — only when something was actually typed, so an
      // untouched section is not rewritten (or knocked out of APPROVED)
      if (text !== initialRef.current) {
        lastEmittedRef.current = initialRef.current;
        onChange(initialRef.current);
      }
      if (onCancel) {
        onCancel();
      } else {
        onDone();
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      id={`sop-direct-canvas-editor-${sectionId}`}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      className="w-full bg-transparent border-0 outline-none p-0 m-0 resize-none overflow-hidden block"
      style={{
        fontFamily: "'Times New Roman', Times, Georgia, serif",
        fontSize: "13px",
        lineHeight: "1.23",
        fontWeight: fontWeight === "bold" ? 700 : 400,
        color: "#111827",
        textAlign,
        whiteSpace: "pre-line",
        boxSizing: "border-box",
        caretColor: "#096491",
      }}
      aria-label={`Direct live edit ${sectionId}`}
    />
  );
}
