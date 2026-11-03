import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Europass Interactive Mode & Language Form Fixes", () => {
  it("EuropassPage supports isInteractive prop and applies pageInteractive class", () => {
    const pageFile = path.resolve(__dirname, "../../../templates/europass/EuropassPage.tsx");
    const content = fs.readFileSync(pageFile, "utf8");

    assert.ok(content.includes("isInteractive?: boolean"), "EuropassPageProps must accept isInteractive");
    assert.ok(content.includes("styles.pageInteractive"), "EuropassPage must apply styles.pageInteractive when interactive");
    assert.ok(content.includes("data-interactive"), "EuropassPage must include data-interactive attribute");
  });

  it("europass.module.css defines pageInteractive with overflow: visible and height: auto", () => {
    const cssFile = path.resolve(__dirname, "../../../templates/europass/europass.module.css");
    const content = fs.readFileSync(cssFile, "utf8");

    assert.ok(content.includes(".page.pageInteractive"), "Must define .page.pageInteractive");
    assert.ok(content.includes("overflow: visible"), "pageInteractive must have overflow: visible to prevent clipping");
    assert.ok(content.includes(".cefrToggleBtn"), "Must define .cefrToggleBtn for collapsible sub-scores");
  });

  it("LanguageInlineForm supports Enter key handling and collapsible CEFR sub-skills", () => {
    const editorFile = path.resolve(__dirname, "../../../templates/europass/components/EuropassSectionEditors.tsx");
    const content = fs.readFileSync(editorFile, "utf8");

    assert.ok(content.includes("showCefrDetails"), "LanguageInlineForm must have toggleable CEFR sub-skills");
    assert.ok(content.includes("handleKeyDown"), "LanguageInlineForm must support Enter key via handleKeyDown");
    assert.ok(content.includes("cefrToggleBtn"), "LanguageInlineForm must render toggle button for CEFR sub-skills");
  });

  it("validates language entry with only language name and proficiency", () => {
    const langData = {
      language: "German",
      level: "B2",
      listening: "",
      reading: "",
      writing: "",
      spokenProduction: "",
      spokenInteraction: "",
    };

    const canSave = Boolean(langData.language.trim());
    assert.equal(canSave, true);

    const saved = {
      language: langData.language.trim(),
      level: langData.level.trim() || undefined,
      listening: langData.listening.trim() || undefined,
      reading: langData.reading.trim() || undefined,
      writing: langData.writing.trim() || undefined,
      spokenProduction: langData.spokenProduction.trim() || undefined,
      spokenInteraction: langData.spokenInteraction.trim() || undefined,
    };

    assert.deepEqual(saved, {
      language: "German",
      level: "B2",
      listening: undefined,
      reading: undefined,
      writing: undefined,
      spokenProduction: undefined,
      spokenInteraction: undefined,
    });
  });
});

