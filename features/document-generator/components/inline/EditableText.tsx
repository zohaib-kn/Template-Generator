"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

/**
 * Parses inline rich-text markers (**bold**, *italic*, <u>underline</u>, ~~strike~~, <color:#hex>...</color>)
 * into styled React elements so that formatting from the toolbar or keyboard shortcuts renders visually.
 */
export function renderRichInlineText(text: string): React.ReactNode {
  if (!text) return text;
  if (!text.includes("*") && !text.includes("~") && !text.includes("<") && !text.includes("\n")) {
    return text;
  }

  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*[^*\n]+?\*|~~.*?~~|<u>.*?<\/u>|<s>.*?<\/s>|<color:[^>]+>.*?<\/color>|<span style="color:[^"]+">.*?<\/span>|\n)/g;
  const parts = text.split(regex);
  if (parts.length <= 1) return text;

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part === "\n") {
      return <br key={idx} />;
    }
    if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
      return (
        <strong key={idx} style={{ fontWeight: 700 }}>
          <em style={{ fontStyle: "italic" }}>
            {renderRichInlineText(part.slice(3, -3))}
          </em>
        </strong>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} style={{ fontWeight: 700 }}>
          {renderRichInlineText(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <s key={idx} style={{ textDecoration: "line-through" }}>
          {renderRichInlineText(part.slice(2, -2))}
        </s>
      );
    }
    if (part.startsWith("<u>") && part.endsWith("</u>") && part.length >= 7) {
      return (
        <u key={idx} style={{ textDecoration: "underline" }}>
          {renderRichInlineText(part.slice(3, -4))}
        </u>
      );
    }
    if (part.startsWith("<s>") && part.endsWith("</s>") && part.length >= 7) {
      return (
        <s key={idx} style={{ textDecoration: "line-through" }}>
          {renderRichInlineText(part.slice(3, -4))}
        </s>
      );
    }
    const colorMatch = part.match(/^<color:([^>]+)>(.*?)<\/color>$/s);
    if (colorMatch) {
      return (
        <span key={idx} style={{ color: colorMatch[1] }}>
          {renderRichInlineText(colorMatch[2])}
        </span>
      );
    }
    const spanColorMatch = part.match(/^<span style="color:([^"]+)">(.*?)<\/span>$/s);
    if (spanColorMatch) {
      return (
        <span key={idx} style={{ color: spanColorMatch[1] }}>
          {renderRichInlineText(spanColorMatch[2])}
        </span>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) {
      return (
        <em key={idx} style={{ fontStyle: "italic" }}>
          {renderRichInlineText(part.slice(1, -1))}
        </em>
      );
    }
    return part;
  });
}

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
  /** When true alongside multiline, pressing Enter confirms and exits edit mode instead of inserting a newline */
  submitOnEnter?: boolean;
  /** Notifies parent when inline editing begins or ends */
  onEditingChange?: (editing: boolean) => void;
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
  submitOnEnter = false,
  onEditingChange,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

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
      // localValue is only read while editing — seed it from the latest prop here
      setLocalValue(value);
      setIsEditing(true);
      onEditingChange?.(true);
    },
    [isInteractive, value, onEditingChange]
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
    // Flush final value before closing edit state
    onChange(localValue);
    setIsEditing(false);
    onEditingChange?.(false);
  }, [localValue, onChange, onEditingChange]);

  // Escape cancels and reverts to original value
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocalValue(value);
        setIsEditing(false);
        onEditingChange?.(false);
        return;
      }
      // Enter confirms for single-line inputs or multiline inputs configured with submitOnEnter
      if (e.key === "Enter" && (!multiline || submitOnEnter)) {
        e.preventDefault();
        onChange(localValue);
        setIsEditing(false);
        onEditingChange?.(false);
        return;
      }

      // Keyboard shortcuts: Ctrl/Cmd + B (Bold), Ctrl/Cmd + I (Italic), Ctrl/Cmd + U (Underline)
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        let wrapPrefix = "";
        let wrapSuffix = "";
        if (key === "b") {
          wrapPrefix = "**";
          wrapSuffix = "**";
        } else if (key === "i") {
          wrapPrefix = "*";
          wrapSuffix = "*";
        } else if (key === "u") {
          wrapPrefix = "<u>";
          wrapSuffix = "</u>";
        }

        if (wrapPrefix) {
          e.preventDefault();
          const target = e.target as HTMLInputElement | HTMLTextAreaElement;
          const start = target.selectionStart ?? 0;
          const end = target.selectionEnd ?? 0;
          const selected = localValue.slice(start, end);

          let nextVal = localValue;
          let newStart = start;
          let newEnd = end;

          if (start !== end) {
            if (
              selected.startsWith(wrapPrefix) &&
              selected.endsWith(wrapSuffix) &&
              selected.length >= wrapPrefix.length + wrapSuffix.length
            ) {
              const unwrapped = selected.slice(wrapPrefix.length, -wrapSuffix.length);
              nextVal = localValue.slice(0, start) + unwrapped + localValue.slice(end);
              newStart = start;
              newEnd = start + unwrapped.length;
            } else if (
              start >= wrapPrefix.length &&
              end + wrapSuffix.length <= localValue.length &&
              localValue.slice(start - wrapPrefix.length, start) === wrapPrefix &&
              localValue.slice(end, end + wrapSuffix.length) === wrapSuffix
            ) {
              nextVal = localValue.slice(0, start - wrapPrefix.length) + selected + localValue.slice(end + wrapSuffix.length);
              newStart = start - wrapPrefix.length;
              newEnd = end - wrapPrefix.length;
            } else {
              nextVal = localValue.slice(0, start) + wrapPrefix + selected + wrapSuffix + localValue.slice(end);
              newStart = start;
              newEnd = end + wrapPrefix.length + wrapSuffix.length;
            }
          } else {
            nextVal = localValue.slice(0, start) + wrapPrefix + wrapSuffix + localValue.slice(end);
            newStart = start + wrapPrefix.length;
            newEnd = newStart;
          }

          setLocalValue(nextVal);
          onChange(nextVal);
          requestAnimationFrame(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              try {
                inputRef.current.setSelectionRange(newStart, newEnd);
              } catch { }
            }
          });
        }
      }
    },
    [localValue, multiline, submitOnEnter, onChange, onEditingChange, value]
  );

  // Sync localValue with prop value when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

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
          {renderRichInlineText(value)}
        </a>
      );
    }
    return <Tag className={className}>{renderRichInlineText(value)}</Tag>;
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
          onFocus={(e) => {
            if (typeof window !== "undefined") {
              (window as any).__lastActiveEditable = e.currentTarget;
            }
          }}
          onSelect={(e) => {
            if (typeof window !== "undefined") {
              (window as any).__lastActiveEditable = e.currentTarget;
            }
          }}
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
        onFocus={(e) => {
          if (typeof window !== "undefined") {
            (window as any).__lastActiveEditable = e.currentTarget;
          }
        }}
        onSelect={(e) => {
          if (typeof window !== "undefined") {
            (window as any).__lastActiveEditable = e.currentTarget;
          }
        }}
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
        {value ? (
          renderRichInlineText(value)
        ) : (
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
      {value ? (
        renderRichInlineText(value)
      ) : (
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
