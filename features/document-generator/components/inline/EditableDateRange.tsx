"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

export function formatDateDMY(iso?: string): string {
  if (!iso) return "";
  if (iso.includes("/")) return iso;
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return iso;
}

export function parseDateRange(input: string): { startDate: string; endDate: string } {
  const raw = input.trim().replace(/^\[\s*|\s*\]$/g, "").trim();
  if (!raw) return { startDate: "", endDate: "" };

  // Check for en-dash (–) or em-dash (—)
  if (/[–—]/.test(raw)) {
    const [s, ...rest] = raw.split(/[–—]/);
    return {
      startDate: s.trim(),
      endDate: rest.join("–").trim(),
    };
  }

  // Check for " to " (case-insensitive)
  if (/\s+to\s+/i.test(raw)) {
    const [s, ...rest] = raw.split(/\s+to\s+/i);
    return {
      startDate: s.trim(),
      endDate: rest.join(" to ").trim(),
    };
  }

  // Check for " - " (hyphen with surrounding whitespace)
  if (/\s+-\s+/.test(raw)) {
    const [s, ...rest] = raw.split(/\s+-\s+/);
    return {
      startDate: s.trim(),
      endDate: rest.join(" - ").trim(),
    };
  }

  // Check for 4-digit years joined by hyphen: e.g. "2022-2025" or "2022-Present"
  const yearHyphenMatch = raw.match(/^(\d{4})\s*-\s*(\d{4}|present)$/i);
  if (yearHyphenMatch) {
    return {
      startDate: yearHyphenMatch[1].trim(),
      endDate: yearHyphenMatch[2].trim(),
    };
  }

  // Single date or year entered
  return {
    startDate: raw,
    endDate: "",
  };
}

interface EditableDateRangeProps {
  startDate?: string;
  endDate?: string;
  onUpdate?: (dates: { startDate?: string; endDate?: string }) => void;
  isInteractive?: boolean;
  className?: string;
  placeholder?: string;
}

export function EditableDateRange({
  startDate = "",
  endDate = "",
  onUpdate,
  isInteractive = false,
  className = "",
  placeholder = "Add dates",
}: EditableDateRangeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDisplay = useCallback((start?: string, end?: string): string => {
    const s = formatDateDMY(start);
    const e = formatDateDMY(end);
    if (s && e) return `${s} – ${e}`;
    if (s) return s;
    if (e) return e;
    return "";
  }, []);

  const currentDisplay = formatDisplay(startDate, endDate);
  const [localValue, setLocalValue] = useState(currentDisplay);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(currentDisplay);
    }
  }, [currentDisplay, isEditing]);

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
      if (!isInteractive || !onUpdate) return;
      e.stopPropagation();
      setIsEditing(true);
    },
    [isInteractive, onUpdate]
  );

  const handleCommit = useCallback(() => {
    setIsEditing(false);
    if (!onUpdate) return;
    const parsed = parseDateRange(localValue);
    onUpdate(parsed);
  }, [localValue, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setLocalValue(currentDisplay);
        setIsEditing(false);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleCommit();
      }
    },
    [currentDisplay, handleCommit]
  );

  // Non-interactive / PDF mode
  if (!isInteractive || !onUpdate) {
    if (!currentDisplay) return null;
    return <span className={className}>[ {currentDisplay} ]</span>;
  }

  // Edit mode
  if (isEditing) {
    return (
      <span
        className={className}
        data-html2canvas-ignore={!localValue.trim() ? "true" : undefined}
        data-pdf-ignore={!localValue.trim() ? "true" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          whiteSpace: "nowrap",
        }}
      >
        [{" "}
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          placeholder="01/08/2022 – 31/05/2025"
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "0 2px",
            margin: 0,
            fontFamily: "inherit",
            fontSize: "inherit",
            fontWeight: "inherit",
            color: "inherit",
            boxShadow: "0 1px 0 0 rgba(9,100,145,0.5)",
            width: `${Math.max(14, localValue.length + 3)}ch`,
          }}
          data-editable="true"
        />{" "}
        ]
      </span>
    );
  }

  // Interactive read mode
  return (
    <span
      className={className}
      onClick={handleClick}
      data-html2canvas-ignore={!currentDisplay ? "true" : undefined}
      data-pdf-ignore={!currentDisplay ? "true" : undefined}
      style={{
        cursor: "text",
        borderBottom: "1px dashed transparent",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderBottomColor =
          "rgba(9,100,145,0.35)";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).style.borderBottomColor =
          "transparent";
      }}
      title="Click to edit date range"
    >
      [{" "}
      {currentDisplay ? (
        currentDisplay
      ) : (
        <span
          data-html2canvas-ignore="true"
          style={{ opacity: 0.35, fontStyle: "italic", userSelect: "none" }}
        >
          {placeholder}
        </span>
      )}{" "}
      ]
    </span>
  );
}
