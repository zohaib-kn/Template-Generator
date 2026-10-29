import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { SectionEditor } from "@/features/sop-generator/components/SectionEditor";
import { SectionSidebar } from "@/features/sop-generator/components/SectionSidebar";
import { WorkspaceHeader } from "@/features/sop-generator/components/WorkspaceHeader";
import { italyTypeDCoverLetter } from "@/features/sop-generator/templates/italy-type-d-cover-letter";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";

const noop = () => {};
const ctx = {
  student: {}, academics: {}, tests: { ielts: {} }, destination: {}, career: {},
  sponsor: {}, finance: {}, accommodation: {}, insurance: {}, travel: {},
} as unknown as StudentDocumentContext;
const section = italyTypeDCoverLetter.sections[0];

function render(el: React.ReactElement) {
  return ReactDOMServer.renderToStaticMarkup(el);
}

describe("Approval controls are reachable from the UI", () => {
  it("SectionEditor shows Approve Section, and Approved + Undo once approved", () => {
    const base = { section, ctx, content: section.content, onContentChange: noop, onReset: noop, onApprove: noop };
    assert.match(render(React.createElement(SectionEditor, { ...base, status: "NOT_REVIEWED" })), /Approve Section/);
    const approved = render(React.createElement(SectionEditor, { ...base, status: "APPROVED", onUndoApprove: noop }));
    assert.match(approved, /✓ Approved/);
    assert.match(approved, /Undo/);
  });

  it("SectionSidebar renders a status toggle per section", () => {
    const html = render(
      React.createElement(SectionSidebar, {
        sections: italyTypeDCoverLetter.sections,
        selectedId: null,
        statuses: { [section.id]: "APPROVED" },
        onSelectSection: noop,
        onToggleStatus: noop,
      })
    );
    assert.ok(html.includes(`section-status-toggle-${section.id}`));
    assert.match(html, /Mark .* as unapproved/);
  });

  it("WorkspaceHeader shows Approve Document, enabled only when all required sections are approved", () => {
    const props = {
      templateName: "t", studentName: "S", documentStatus: "draft" as const, totalCount: 2,
      onSaveDraft: noop, onPreview: noop, onApproveDocument: noop, onApproveAll: noop,
    };
    const pending = render(React.createElement(WorkspaceHeader, { ...props, approvedCount: 1, requiredCount: 2, hasErrors: false }));
    assert.match(pending, /id="sop-approve-document-btn"[^>]*disabled/);
    assert.match(pending, /1 section still need review/);

    const ready = render(React.createElement(WorkspaceHeader, { ...props, approvedCount: 2, requiredCount: 2, hasErrors: false }));
    assert.doesNotMatch(ready, /id="sop-approve-document-btn"[^>]*disabled/);

    const done = render(React.createElement(WorkspaceHeader, { ...props, documentStatus: "approved", approvedCount: 2, requiredCount: 2, hasErrors: false }));
    assert.match(done, /Document Approved/);
  });
});
