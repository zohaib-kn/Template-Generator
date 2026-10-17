"use client";

import React, { useMemo } from "react";
import type { TemplateSection, StudentDocumentContext, SopTemplate, ReviewStatus } from "../types/sop-generator";
import { interpolate } from "../lib/interpolateTemplate";
import { calculateDocumentWordCount, calculateSectionWordCount } from "../lib/wordCount";
import { SopInteractiveSection } from "./SopInteractiveSection";
import { SopCanvasInlineEditor } from "./SopCanvasInlineEditor";

export interface SopDocumentLetterProps {
  sections: TemplateSection[];
  sectionContents: Record<string, string>;
  ctx: StudentDocumentContext;
  template?: SopTemplate;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  activeSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  // Interactive Live Edition additions:
  isInteractive?: boolean;
  editingSectionId?: string | null;
  onStartEdit?: (sectionId: string) => void;
  onFinishEdit?: () => void;
  onContentChange?: (sectionId: string, newContent: string) => void;
  onApproveSection?: (sectionId: string) => void;
  statuses?: Record<string, ReviewStatus>;
}

/**
 * Parses markdown bold (**text**) into <strong> elements with safe inline styling.
 * Avoids any Tailwind v4 color classes so html2canvas never crashes on lab/oklch.
 */
export function renderFormatted(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: "#111827" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Full A4 letter renderer.
 *
 * Supports single-page embassy format or university statement of purpose:
 * - Centered title (from template config: COVER LETTER or STATEMENT OF PURPOSE)
 * - Configurable salutation and signoff
 * - Natural human student prose with bold factual highlights
 * - Calibrated typography and safe inline styles
 */
export function SopDocumentLetter({
  sections,
  sectionContents,
  ctx,
  template,
  id = "sop-preview-letter-page",
  className = "",
  style = {},
  activeSectionId,
  onSelectSection,
  isInteractive = false,
  editingSectionId = null,
  onStartEdit,
  onFinishEdit,
  onContentChange,
  onApproveSection,
  statuses,
}: SopDocumentLetterProps) {
  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections]
  );

  const headerTitle = template?.documentHeaderTitle || "COVER LETTER";
  const isUniversitySop = template?.documentType === "UNIVERSITY_SOP";
  const salutation = template?.salutation;

  const totalWordCount = useMemo(
    () => calculateDocumentWordCount(sections, sectionContents, ctx),
    [sections, sectionContents, ctx]
  );

  return (
    <div
      id={id}
      className={`bg-white text-[#111827] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)] border border-slate-300/80 rounded-xs transition-shadow ${className}`}
      style={{
        width: "794px",
        minHeight: "1123px",
        padding: "36px 48px",
        fontFamily: "'Times New Roman', Times, Georgia, serif",
        fontSize: "13px",
        lineHeight: "1.23",
        color: "#111827",
        backgroundColor: "#ffffff",
        textAlign: "justify",
        boxSizing: "border-box",
        margin: "0 auto",
        ...style,
      }}
    >
      {/* Centered Document Header */}
      <div style={{ textAlign: "center", marginBottom: isUniversitySop ? "8px" : "12px" }}>
        <span
          style={{
            fontSize: isUniversitySop ? "15px" : "14px",
            fontWeight: "bold",
            textDecoration: "underline",
            letterSpacing: "0.08em",
          }}
        >
          {headerTitle}
        </span>
      </div>

      {/* Applicant metadata header for University SOP */}
      {isUniversitySop && (
        <div
          style={{
            textAlign: "center",
            marginBottom: "14px",
            color: "#374151",
            fontSize: "12px",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "8px",
          }}
        >
          <strong>{ctx.student.fullName || "Student Name"}</strong> · {ctx.destination.course || "Target Program"} · {ctx.destination.university || "Target Institution"}
        </div>
      )}

      {/* Salutation if configured on template (e.g., Dear Admissions Committee,) */}
      {salutation && (
        <div
          style={{
            marginBottom: "10px",
            textAlign: "left",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          {salutation}
        </div>
      )}

      {/* Sections in flowing letter format */}
      {sorted.map((section) => {
        const rawContent = sectionContents[section.id] ?? section.content;
        const rendered = interpolate(rawContent, ctx);
        const isActive = activeSectionId === section.id;
        const isEditing = Boolean(isInteractive && editingSectionId === section.id);
        const sectionStatus = statuses?.[section.id] ?? "NOT_REVIEWED";
        const secWordCount = calculateSectionWordCount(rawContent, ctx);

        const sectionWrapperStyle: React.CSSProperties = {
          position: "relative",
          cursor: onSelectSection ? "pointer" : "default",
          borderRadius: "2px",
          paddingLeft: "8px",
          paddingRight: "8px",
          marginLeft: "-8px",
          marginRight: "-8px",
          transition: "background-color 150ms ease, border-color 150ms ease",
          borderLeft: isActive && !isInteractive ? "3px solid #096491" : "3px solid transparent",
          backgroundColor: isActive && !isInteractive ? "rgba(9, 100, 145, 0.03)" : "transparent",
        };

        const isLeftAligned =
          section.id === "recipient" ||
          section.id === "subject" ||
          section.id === "signature";

        const contentNode = isEditing ? (
          <SopCanvasInlineEditor
            sectionId={section.id}
            initialContent={rendered}
            textAlign={isLeftAligned ? "left" : "justify"}
            fontWeight={section.id === "subject" ? "bold" : "normal"}
            onChange={(newVal) => onContentChange?.(section.id, newVal)}
            onDone={() => onFinishEdit?.()}
            onCancel={() => onFinishEdit?.()}
          />
        ) : section.id === "recipient" ? (
          <div
            id={`sop-section-anchor-${section.id}`}
            onClick={
              isInteractive
                ? () => onStartEdit?.(section.id)
                : onSelectSection
                ? () => onSelectSection(section.id)
                : undefined
            }
            style={{
              ...(!isInteractive ? sectionWrapperStyle : {}),
              marginBottom: "10px",
              whiteSpace: "pre-line",
              lineHeight: "1.22",
              textAlign: "left",
            }}
          >
            {renderFormatted(rendered)}
          </div>
        ) : section.id === "subject" ? (
          <div
            id={`sop-section-anchor-${section.id}`}
            onClick={
              isInteractive
                ? () => onStartEdit?.(section.id)
                : onSelectSection
                ? () => onSelectSection(section.id)
                : undefined
            }
            style={{
              ...(!isInteractive ? sectionWrapperStyle : {}),
              fontWeight: "bold",
              marginBottom: "10px",
              textAlign: "left",
              lineHeight: "1.22",
            }}
          >
            {renderFormatted(rendered)}
          </div>
        ) : section.id === "signature" ? (
          <div
            id={`sop-section-anchor-${section.id}`}
            onClick={
              isInteractive
                ? () => onStartEdit?.(section.id)
                : onSelectSection
                ? () => onSelectSection(section.id)
                : undefined
            }
            style={{
              ...(!isInteractive ? sectionWrapperStyle : {}),
              marginTop: "12px",
              whiteSpace: "pre-line",
              lineHeight: "1.22",
              textAlign: "left",
            }}
          >
            {renderFormatted(rendered)}
          </div>
        ) : (
          <div
            id={`sop-section-anchor-${section.id}`}
            onClick={
              isInteractive
                ? () => onStartEdit?.(section.id)
                : onSelectSection
                ? () => onSelectSection(section.id)
                : undefined
            }
            style={{
              ...(!isInteractive ? sectionWrapperStyle : {}),
              marginBottom: isUniversitySop ? "10px" : "5.5px",
              textIndent: "0",
            }}
          >
            <p style={{ margin: 0, padding: 0, whiteSpace: "pre-line" }}>
              {renderFormatted(rendered)}
            </p>
          </div>
        );

        if (isInteractive) {
          return (
            <SopInteractiveSection
              key={section.id}
              sectionId={section.id}
              title={section.title}
              order={section.order}
              wordCount={secWordCount}
              status={sectionStatus}
              isSelected={isActive}
              isEditing={isEditing}
              onSelect={() => onSelectSection?.(section.id)}
              onEdit={() => onStartEdit?.(section.id)}
            >
              {contentNode}
            </SopInteractiveSection>
          );
        }

        return <React.Fragment key={section.id}>{contentNode}</React.Fragment>;
      })}

      {/* Document standard footer note */}
      <div
        data-html2canvas-ignore="true"
        className="mt-6 pt-3 border-t border-slate-100 text-center select-none"
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "10px",
          color: "#94a3b8",
        }}
      >
        {isUniversitySop
          ? `University Statement of Purpose · Academic Standard · ${totalWordCount} words`
          : `Single-Page A4 Embassy Standard (Times New Roman · 13px / 1.23 line-height · ${totalWordCount} words)`}
      </div>
    </div>
  );
}
