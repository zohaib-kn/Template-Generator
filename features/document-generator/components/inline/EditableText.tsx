"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface EditableTextProps {
  /** Current value to display / edit */
  value: string;
  /** Called immediately on every change (already debounced internally) */
  onChange: (newValue: string) => void;
  /** When false (PDF / preview mode) renders a plain span — no inputs */
  isInteractive?: boolean;
  /** true → renders a <textarea> (multi-line); false → <input> (single line) */
  multiline?: boolean;
  /** CSS class applied to both the span (read mode) and the input (edit mode) */
  className?: string;
  /** Placeholder shown in edit mode when the field is empty */
  placeholder?: string;
  /** HTML tag used for the read-mode wrapper (default: "span") */
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div" | "a";
  /** Optional hyperlink URL (e.g. mailto:email or https://url) */
  href?: string;
  /** Link target (e.g. "_blank") */
  target?: string;
}

/**
 * EditableText — inline canvas editing component.
 *
 * In interactive mode: single-click on any text toggles it into a
 * transparent, font-matched input/textarea so the counsellor can type
 * directly on the resume canvas. Changes dispatch to DocumentContext
 * immediately (no separate save step needed).
 *
 * In non-interactive mode (preview / PDF): renders a plain span identical
 * to the original template output — zero visual difference.
 */
export function EditableText({
  value,
  onChange,
  isInteractive = false,
  multiline = false,
  className = "",
  placeholder = "",
  as: Tag = "span",
  href,
  target,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Keep local value in sync with external prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  // Auto-focus and position cursor at end when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isInteractive) return;
      e.preventDefault(); // Prevent browser navigation if Tag is an anchor
      e.stopPropagation(); // prevent ResumeInteractiveSection body click from opening drawer
      setIsEditing(true);
    },
    [isInteractive]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      setLocalValue(newVal);
      onChange(newVal);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // Flush final value on blur (already dispatched on every keystroke)
    onChange(localValue);
  }, [localValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape cancels and reverts to original value
      if (e.key === "Escape") {
        setLocalValue(value);
        setIsEditing(false);
        return;
      }
      // Enter confirms for single-line inputs (textarea allows Enter for newline)
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        setIsEditing(false);
        onChange(localValue);
      }
    },
    [localValue, multiline, onChange, value]
  );

  // ── Non-interactive / PDF mode ──────────────────────────────────────────
  if (!isInteractive) {
    if (href || Tag === "a") {
      const targetUrl = href || value;
      return (
        <a
          href={targetUrl}
          className={className}
          target={target || (targetUrl.startsWith("mailto:") ? undefined : "_blank")}
          rel="noreferrer"
          data-pdf-link={targetUrl}
        >
          {value}
        </a>
      );
    }
    return <Tag className={className}>{value}</Tag>;
  }

  // ── Edit mode ───────────────────────────────────────────────────────────
  if (isEditing) {
    const sharedStyles: React.CSSProperties = {
      background: "transparent",
      border: "none",
      outline: "none",
      padding: 0,
      margin: 0,
      width: "100%",
      fontFamily: "inherit",
      fontSize: "inherit",
      fontWeight: "inherit",
      lineHeight: "inherit",
      color: "inherit",
      letterSpacing: "inherit",
      textAlign: "inherit" as React.CSSProperties["textAlign"],
      resize: "none",
      display: "block",
      boxShadow: "0 1px 0 0 rgba(9,100,145,0.5)",
    };

    if (multiline) {
      return (
        <textarea
          ref={(node) => {
            (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            if (node) {
              node.style.height = "auto";
              node.style.height = `${node.scrollHeight}px`;
            }
          }}
          className={className}
          style={{ ...sharedStyles, overflow: "hidden", minHeight: "1.2em" }}
          value={localValue}
          placeholder={placeholder}
          onChange={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
            handleChange(e);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          rows={Math.max(1, (localValue.match(/\n/g) || []).length + 1)}
          data-editable="true"
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        className={className}
        style={sharedStyles}
        value={localValue}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-editable="true"
      />
    );
  }

  // ── Read mode (interactive but not currently editing) ───────────────────
  if (href || Tag === "a") {
    const targetUrl = href || value;
    return (
      <a
        href={targetUrl}
        className={className}
        onClick={handleClick}
        target={target || (targetUrl.startsWith("mailto:") ? undefined : "_blank")}
        rel="noreferrer"
        data-pdf-link={targetUrl}
        style={{
          cursor: "text",
          borderBottom: "1px dashed transparent",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
          (e.currentTarget as HTMLElement).style.borderBottomColor = "rgba(9,100,145,0.35)";
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
          (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent";
        }}
        title="Click to edit link"
      >
        {value || (
          <span
            data-html2canvas-ignore="true"
            style={{ opacity: 0.35, fontStyle: "italic", userSelect: "none" }}
          >
            {placeholder}
          </span>
        )}
      </a>
    );
  }

  return (
    <Tag
      className={className}
      onClick={handleClick}
      style={{
        cursor: "text",
        borderBottom: "1px dashed transparent",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderBottomColor = "rgba(9,100,145,0.35)";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent";
      }}
      title="Click to edit"
    >
      {value || (
        <span
          data-html2canvas-ignore="true"
          style={{ opacity: 0.35, fontStyle: "italic", userSelect: "none" }}
        >
          {placeholder}
        </span>
      )}
    </Tag>
  );
}
