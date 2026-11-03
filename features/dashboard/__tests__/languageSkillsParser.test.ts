import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseLanguageSkillsInput } from "../utils/languageSkillsParser";

describe("Language Skills Input Parser", () => {
  it("handles the user's latest multi-line prompt: 'Mother tongue Hindi\\n\\nOther languages: German, French, Tamil'", () => {
    const input = "Mother tongue Hindi\n\nOther languages: German, French, Tamil";
    const result = parseLanguageSkillsInput(input);

    assert.equal(result.motherTongue, "Hindi");
    assert.equal(result.hasExplicitMotherTongue, true);
    assert.deepEqual(result.otherLanguages, [
      { language: "German", level: undefined },
      { language: "French", level: undefined },
      { language: "Tamil", level: undefined },
    ]);
  });

  it("handles natural multi-line without keywords: 'hindi\\ngerman , french . tamil'", () => {
    const input = "hindi\ngerman , french . tamil";
    const result = parseLanguageSkillsInput(input);

    assert.equal(result.motherTongue, "Hindi");
    assert.equal(result.hasExplicitMotherTongue, true);
    assert.deepEqual(result.otherLanguages, [
      { language: "German", level: undefined },
      { language: "French", level: undefined },
      { language: "Tamil", level: undefined },
    ]);
  });

  it("handles single-line input specifying mother tongue: 'hindi'", () => {
    const input = "hindi";
    const result = parseLanguageSkillsInput(input);

    assert.equal(result.motherTongue, "Hindi");
    assert.equal(result.hasExplicitMotherTongue, true);
    assert.deepEqual(result.otherLanguages, []);
  });

  it("handles 'Mother tongue: Hindi, Other: German (B2), French (A2), Tamil (Fluent)'", () => {
    const input = "Mother tongue: Hindi, Other: German (B2), French (A2), Tamil (Fluent)";
    const result = parseLanguageSkillsInput(input);

    assert.equal(result.motherTongue, "Hindi");
    assert.deepEqual(result.otherLanguages, [
      { language: "German", level: "B2" },
      { language: "French", level: "A2" },
      { language: "Tamil", level: "Fluent" },
    ]);
  });

  it("handles 'Hindi as mother tongue' and 'Punjabi as native language'", () => {
    const r1 = parseLanguageSkillsInput("Hindi as mother tongue");
    assert.equal(r1.motherTongue, "Hindi");

    const r2 = parseLanguageSkillsInput("Punjabi as native language");
    assert.equal(r2.motherTongue, "Punjabi");
  });

  it("prevents mother tongue duplication in other languages", () => {
    const input = "Mother tongue: Hindi\nOther languages: Hindi, German, French";
    const result = parseLanguageSkillsInput(input);

    assert.equal(result.motherTongue, "Hindi");
    assert.deepEqual(result.otherLanguages, [
      { language: "German", level: undefined },
      { language: "French", level: undefined },
    ]);
  });

  it("handles 'Add German and French to other languages' preserving existing mother tongue", () => {
    const input = "Add German and French to other languages";
    const result = parseLanguageSkillsInput(input, "Italian");

    assert.equal(result.motherTongue, "Italian");
    assert.equal(result.hasExplicitMotherTongue, false);
    assert.deepEqual(result.otherLanguages, [
      { language: "German", level: undefined },
      { language: "French", level: undefined },
    ]);
  });
});

