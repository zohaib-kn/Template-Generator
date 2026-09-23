/**
 * services/ai/__tests__/universitySopPrompt.test.ts
 *
 * Unit tests verifying University SOP AI prompt construction:
 * - documentType === "UNIVERSITY_SOP" targets Academic Admissions Committee
 * - No consular/embassy/sponsorship details in SOP prompt
 * - Never invents "Autumn 2026" or any intake when intake is missing
 * - Includes specific instructions for University SOP sections
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildNaturalStudentPrompt, getSectionVoiceInstruction } from "../prompts/studentVoiceGuidelines";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";
import { getStudentDocumentContext } from "@/features/sop-generator/lib/applicationService";

describe("University SOP AI Prompt Generation Tests", () => {
  const baseCtx: StudentDocumentContext = getStudentDocumentContext();

  test("buildNaturalStudentPrompt — UNIVERSITY_SOP targets Admissions Committee and omits visa logistics", () => {
    const prompt = buildNaturalStudentPrompt({
      sectionId: "interest-motivation",
      sectionTitle: "Interest / Motivation",
      context: baseCtx,
      documentType: "UNIVERSITY_SOP",
    });

    assert.ok(prompt.includes("Statement of Purpose"), "Should declare Statement of Purpose");
    assert.ok(prompt.includes("Academic Admissions Committee"), "Audience should be Academic Admissions Committee");
    assert.ok(!prompt.includes("Return home immediately after graduation"), "Should not mandate return intention in SOP");
    assert.ok(!prompt.includes("Passport Number"), "Should not include passport number in SOP context");
  });

  test("buildNaturalStudentPrompt — Never invents 'Autumn 2026' when intake is missing", () => {
    const emptyIntakeCtx: StudentDocumentContext = {
      ...baseCtx,
      destination: {
        ...baseCtx.destination,
        intakeMonth: "",
        intakeYear: "",
      },
    };

    const prompt = buildNaturalStudentPrompt({
      sectionId: "student-introduction",
      sectionTitle: "Student Introduction",
      context: emptyIntakeCtx,
      documentType: "UNIVERSITY_SOP",
    });

    assert.ok(!prompt.includes("Autumn 2026"), "Prompt must NEVER invent 'Autumn 2026'");
    assert.ok(!prompt.includes("Autumn"), "Prompt must not invent Autumn");
    assert.ok(!prompt.includes("Target Intake: Autumn"), "Target intake line should not be Autumn");
  });

  test("getSectionVoiceInstruction — provides distinct instructions for University SOP sections", () => {
    const motivationVoice = getSectionVoiceInstruction("interest-motivation", baseCtx, "Computer Science", "UNIVERSITY_SOP");
    assert.ok(motivationVoice.includes("INTEREST / MOTIVATION"));
    assert.ok(motivationVoice.includes("childhood stories"));

    const fitVoice = getSectionVoiceInstruction("academic-fit", baseCtx, "Computer Science", "UNIVERSITY_SOP");
    assert.ok(fitVoice.includes("ACADEMIC FIT"));
    assert.ok(fitVoice.includes("academic rigor"));

    const visionVoice = getSectionVoiceInstruction("contribution-vision", baseCtx, "Computer Science", "UNIVERSITY_SOP");
    assert.ok(visionVoice.includes("CONTRIBUTION / FUTURE VISION"));

    const introVoice = getSectionVoiceInstruction("student-introduction", baseCtx, "Computer Science", "UNIVERSITY_SOP");
    assert.ok(introVoice.includes("Academic Admissions Committee"));
  });
});
