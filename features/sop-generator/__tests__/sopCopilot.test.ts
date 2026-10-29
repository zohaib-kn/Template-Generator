/**
 * features/sop-generator/__tests__/sopCopilot.test.ts
 *
 * Automated test suite for Phase 1 SOP Copilot Chatbot UI Redesign:
 * 1. Component exports and specifications
 * 2. Custom Robot Avatar presence in launcher, header, welcome screen, and chat messages
 * 3. Exact copy requirements for welcome screen, suggestions, input, and footer
 * 4. Image asset verification in public directory
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SOPCopilot, RobotAvatar } from "../components/SOPCopilot";

describe("SOP Copilot Chatbot UI (Custom Robot Avatar Redesign)", () => {
  it("should export SOPCopilot and RobotAvatar components", () => {
    assert.strictEqual(typeof SOPCopilot, "function");
    assert.strictEqual(typeof RobotAvatar, "function");
  });

  it("should verify custom robot avatar image asset exists in public directory", () => {
    const originalAsset = path.join(process.cwd(), "public/images/sop-copilot-robot.png");
    const transparentAsset = path.join(
      process.cwd(),
      "public/images/sop-copilot-robot-transparent.png"
    );

    assert.ok(fs.existsSync(originalAsset), "Original robot image asset must exist in public/images");
    assert.ok(
      fs.existsSync(transparentAsset),
      "Transparent robot image asset must exist in public/images"
    );
  });

  it("should adhere to exact redesigned welcome screen and suggestion card copy requirements", () => {
    const filePath = path.join(
      process.cwd(),
      "features/sop-generator/components/SOPCopilot.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Header requirements
    assert.ok(content.includes("SOP Copilot"), "Should contain assistant name 'SOP Copilot'");
    assert.ok(
      content.includes("Your AI-powered document assistant"),
      "Should contain subtitle 'Your AI-powered document assistant'"
    );
    assert.ok(
      content.includes("Ready to help"),
      "Should contain status indicator 'Ready to help'"
    );

    // Welcome message & supporting text (exact prompt copy)
    assert.ok(
      content.includes("Hi! I&apos;m SOP Copilot.") || content.includes("Hi! I'm SOP Copilot."),
      "Should contain exact welcome message: Hi! I'm SOP Copilot."
    );
    assert.ok(
      content.includes(
        "I&apos;m here to help you understand your SOP, organize missing information, and prepare your document for review."
      ) ||
        content.includes(
          "I'm here to help you understand your SOP, organize missing information, and prepare your document for review."
        ),
      "Should contain exact supporting text"
    );

    // 4 Suggestion Cards (exact updated descriptions)
    assert.ok(content.includes("Fix validation errors"), "Suggestion card 1 title");
    assert.ok(
      content.includes("Understand which document details are missing."),
      "Suggestion card 1 desc"
    );

    assert.ok(content.includes("Add financial details"), "Suggestion card 2 title");
    assert.ok(
      content.includes("Organize your bank and funding information."),
      "Suggestion card 2 desc"
    );

    assert.ok(content.includes("Explain my SOP"), "Suggestion card 3 title");
    assert.ok(
      content.includes("Understand the content of my document."),
      "Suggestion card 3 desc"
    );

    assert.ok(content.includes("Review missing information"), "Suggestion card 4 title");
    assert.ok(
      content.includes("Identify details that need attention."),
      "Suggestion card 4 desc"
    );

    // Input area requirements
    assert.ok(
      content.includes("Ask me anything about your SOP..."),
      "Should have exact input placeholder: 'Ask me anything about your SOP...'"
    );
    assert.ok(
      content.includes("Review document changes before downloading."),
      "Should have exact footer disclaimer: 'Review document changes before downloading.'"
    );

    // Robot image reference and object-contain
    assert.ok(
      content.includes("object-contain"),
      "Robot image must be rendered with object-contain to prevent distortion"
    );
    assert.ok(
      content.includes("sop-copilot-robot"),
      "Must reference custom robot asset"
    );
  });

  it("should verify integration of SOPCopilot inside SopWorkspace", () => {
    const workspacePath = path.join(
      process.cwd(),
      "features/sop-generator/components/SopWorkspace.tsx"
    );
    const workspaceContent = fs.readFileSync(workspacePath, "utf-8");

    assert.ok(
      workspaceContent.includes('import { SOPCopilot } from "./SOPCopilot";'),
      "SopWorkspace must import SOPCopilot"
    );
    assert.ok(
      workspaceContent.includes("<SOPCopilot"),
      "SopWorkspace must render <SOPCopilot"
    );
  });
});
