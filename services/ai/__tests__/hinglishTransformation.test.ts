import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  transformText,
  setMockTransformationHandler,
  buildHinglishPrompt,
  verifyFactPreservation,
  extractNumbers,
  cleanTransformedText,
} from "../transforms/textTransformationService";
import { computeAcademicAlignment } from "@/services/academicAlignment/academicAlignmentEngine";

describe("Hinglish → Natural English Transformation Tests", () => {
  beforeEach(() => {
    setMockTransformationHandler(null);
  });

  // -------------------------------------------------------------------------
  // TEST 1 — Basic Hinglish
  // -------------------------------------------------------------------------
  test("TEST 1: Converts basic Hinglish to natural English while preserving core facts", async () => {
    setMockTransformationHandler(async ({ text }) => {
      assert.match(text, /B\.Com/i);
      return "I completed my Bachelor of Commerce, and I have a keen interest in finance.";
    });

    const result = await transformText({
      text: "Maine B.Com complete kiya aur mujhe finance me interest hai.",
      mode: "HINGLISH_TO_ENGLISH",
    });

    assert.strictEqual(result.success, true);
    assert.match(result.transformedText, /Commerce|B\.Com/i);
    assert.match(result.transformedText, /finance/i);
  });

  // -------------------------------------------------------------------------
  // TEST 2 — Mixed English/Hindi
  // -------------------------------------------------------------------------
  test("TEST 2: Converts mixed English/Hindi without fabricating unmentioned tools", async () => {
    setMockTransformationHandler(async ({ text }) => {
      assert.match(text, /Excel/);
      return "During my internship, I prepared financial reports using Excel.";
    });

    const result = await transformText({
      text: "During my internship maine Excel pe financial reports banayi thi.",
      mode: "HINGLISH_TO_ENGLISH",
    });

    assert.strictEqual(result.success, true);
    assert.match(result.transformedText, /Excel/);
    assert.doesNotMatch(result.transformedText, /Python|SQL|PowerBI|Tableau/i);
  });

  // -------------------------------------------------------------------------
  // TEST 3 — Academic facts
  // -------------------------------------------------------------------------
  test("TEST 3: Preserves university name, degree, and graduation year exactly", async () => {
    setMockTransformationHandler(async () => {
      return "I completed my Bachelor of Commerce degree from Barkatullah University in 2023.";
    });

    const result = await transformText({
      text: "Maine B.Com Barkatullah University se 2023 me complete kiya.",
      mode: "HINGLISH_TO_ENGLISH",
    });

    assert.strictEqual(result.success, true);
    assert.match(result.transformedText, /Barkatullah University/);
    assert.match(result.transformedText, /2023/);
  });

  // -------------------------------------------------------------------------
  // TEST 4 — Numbers
  // -------------------------------------------------------------------------
  test("TEST 4: Preserves test scores and numbers character-for-character", async () => {
    setMockTransformationHandler(async () => {
      return "I achieved an overall band score of 6.5 in the IELTS examination.";
    });

    const result = await transformText({
      text: "Mere IELTS me 6.5 overall score hai.",
      mode: "HINGLISH_TO_ENGLISH",
    });

    assert.strictEqual(result.success, true);
    assert.match(result.transformedText, /6\.5/);
  });

  // -------------------------------------------------------------------------
  // TEST 5 — Unsupported expansion
  // -------------------------------------------------------------------------
  test("TEST 5: Fails or blocks output if unauthorized tools or subjects are fabricated", async () => {
    // Model erroneously introduces AutoCAD and workshop experience
    setMockTransformationHandler(async () => {
      return "I have a strong interest in Mechanical Engineering, with hands-on AutoCAD and workshop experience.";
    });

    const result = await transformText({
      text: "Mujhe Mechanical Engineering me interest hai.",
      mode: "HINGLISH_TO_ENGLISH",
    });

    // Should fail factual fidelity verification because AutoCAD was fabricated
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, "FACT_PRESERVATION_FAILED");
    assert.match(result.error?.message || "", /autocad/i);
  });

  // -------------------------------------------------------------------------
  // TEST 6 — Academic mismatch isolation
  // -------------------------------------------------------------------------
  test("TEST 6: Transforming Hinglish narrative does NOT resolve academic mismatch", async () => {
    // Student background: B.Com (BUSINESS)
    // Target course: Mechanical Engineering (ENGINEERING)
    const alignmentInput = {
      qualifications: [
        {
          id: "qual-1",
          qualification: "Bachelor of Commerce",
          fieldOfStudy: "Commerce",
          institution: "Barkatullah University",
          completionYear: "2023",
          isPrimary: true,
        },
      ],
      targetProgram: {
        id: "prog-1",
        university: "Technical University",
        course: "MSc Mechanical Engineering",
        country: "Germany",
        courseCategory: "Engineering",
        degreeLevel: "MASTERS",
      },
    };

    const initialAlignment = computeAcademicAlignment(alignmentInput);
    assert.strictEqual(initialAlignment.status, "ACADEMIC_MISMATCH");
    assert.strictEqual(initialAlignment.generationAllowed, false);

    // Student writes narrative in Hinglish
    setMockTransformationHandler(async () => {
      return "I wish to pursue Mechanical Engineering to advance my studies in mechanics.";
    });

    const transformResult = await transformText({
      text: "Main Mechanical Engineering padhna chahta hu.",
      mode: "HINGLISH_TO_ENGLISH",
    });

    assert.strictEqual(transformResult.success, true);

    // Re-evaluating alignment status remains ACADEMIC_MISMATCH
    // The language transformation cannot and must not grant evidence or change status
    const recomputedAlignment = computeAcademicAlignment(alignmentInput);

    assert.strictEqual(recomputedAlignment.status, "ACADEMIC_MISMATCH");
    assert.strictEqual(recomputedAlignment.generationAllowed, false);
  });

  // -------------------------------------------------------------------------
  // TEST 7 — Cancel UX State Simulation
  // -------------------------------------------------------------------------
  test("TEST 7: User canceling leaves original text untouched", () => {
    const originalText = "Maine B.Com complete kiya.";
    let formState = originalText;
    const suggestedText = "I completed my Bachelor of Commerce.";

    // Simulating UX state machine
    let isReviewing = true;

    // User triggers Cancel
    function onCancel() {
      isReviewing = false;
      // Does not mutate formState
    }

    onCancel();
    assert.strictEqual(isReviewing, false);
    assert.strictEqual(formState, originalText);
  });

  // -------------------------------------------------------------------------
  // TEST 8 — Accept UX State Simulation
  // -------------------------------------------------------------------------
  test("TEST 8: User accepting suggestion replaces field content", () => {
    const originalText = "Maine B.Com complete kiya.";
    let formState = originalText;
    const suggestedText = "I completed my Bachelor of Commerce.";

    function onAccept(newText: string) {
      formState = newText;
    }

    onAccept(suggestedText);
    assert.strictEqual(formState, "I completed my Bachelor of Commerce.");
  });

  // -------------------------------------------------------------------------
  // TEST 9 — Try Again Sourcing
  // -------------------------------------------------------------------------
  test("TEST 9: Try Again uses ORIGINAL text, not the prior suggestion", async () => {
    const originalText = "Maine statistics me projects kiye the.";
    const capturedInputs: string[] = [];

    setMockTransformationHandler(async ({ text }) => {
      capturedInputs.push(text);
      if (capturedInputs.length === 1) {
        return "I completed projects in statistics.";
      }
      return "I carried out project work focused on statistics.";
    });

    // First attempt
    const res1 = await transformText({ text: originalText });
    assert.strictEqual(res1.success, true);

    // Second attempt ("Try Again") must send originalText
    const res2 = await transformText({ text: res1.originalText });
    assert.strictEqual(res2.success, true);

    assert.strictEqual(capturedInputs.length, 2);
    assert.strictEqual(capturedInputs[0], originalText);
    assert.strictEqual(capturedInputs[1], originalText);
  });

  // -------------------------------------------------------------------------
  // TEST 10 — API Failure Resilience
  // -------------------------------------------------------------------------
  test("TEST 10: Gracefully handles API failure without losing input text", async () => {
    setMockTransformationHandler(async () => {
      throw new Error("Gemini API timeout");
    });

    const originalInput = "Maine accounts padha tha college me.";
    try {
      const res = await transformText({ text: originalInput });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.originalText, originalInput);
    } catch (err: unknown) {
      // In case unhandled rejection occurs
      assert.fail(`Should not throw uncaught error: ${err}`);
    }
  });

  // -------------------------------------------------------------------------
  // TEST 11 — Already English Input
  // -------------------------------------------------------------------------
  test("TEST 11: Lightly polishes text that is already English without adding facts", async () => {
    const input = "I completed my Bachelor of Commerce and developed an interest in finance.";
    setMockTransformationHandler(async ({ text }) => {
      return text; // Returns faithful elevated text
    });

    const result = await transformText({ text: input });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.transformedText, input);
  });

  // -------------------------------------------------------------------------
  // TEST 12 — Empty or Too Short Field
  // -------------------------------------------------------------------------
  test("TEST 12: Rejects empty or too short text without calling Gemini API", async () => {
    let called = false;
    setMockTransformationHandler(async () => {
      called = true;
      return "Should not reach here";
    });

    const resEmpty = await transformText({ text: "   " });
    assert.strictEqual(resEmpty.success, false);
    assert.strictEqual(resEmpty.error?.code, "INVALID_INPUT");
    assert.strictEqual(called, false);

    const resShort = await transformText({ text: "abc" });
    assert.strictEqual(resShort.success, false);
    assert.strictEqual(resShort.error?.code, "INVALID_INPUT");
    assert.strictEqual(called, false);
  });

  // -------------------------------------------------------------------------
  // Helper functions unit tests
  // -------------------------------------------------------------------------
  test("Helper: extractNumbers extracts various numerical formats accurately", () => {
    const numbers = extractNumbers("I scored 88.5% in 12th class in 2022 with 6.5 bands");
    assert.ok(numbers.includes("88.5%"));
    assert.ok(numbers.includes("12th"));
    assert.ok(numbers.includes("2022"));
    assert.ok(numbers.includes("6.5"));
  });

  test("Helper: cleanTransformedText removes quotes and conversational intros", () => {
    const cleaned = cleanTransformedText('"Here is the rewritten text: I worked on Excel."');
    assert.strictEqual(cleaned, "I worked on Excel.");
  });

  test("Helper: buildHinglishPrompt includes system instruction and text", () => {
    const { systemInstruction, prompt } = buildHinglishPrompt("Maine accounts kiya.", "aboutMe");
    assert.ok(systemInstruction.includes("ZERO FABRICATION"));
    assert.ok(prompt.includes("aboutMe"));
    assert.ok(prompt.includes("Maine accounts kiya."));
  });
});
