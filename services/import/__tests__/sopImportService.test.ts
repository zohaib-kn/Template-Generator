/**
 * services/import/__tests__/sopImportService.test.ts
 *
 * Automated tests for SOP import section summarization and block grouping.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { computeSopSectionsSummary } from "../sopImportService";
import type { SopParagraphBlock } from "@/features/sop-generator/types/import";

test("SOP Summary Builder: groups paragraphs into correct sections and joins multiple paragraphs", () => {
  const mockParagraphs: SopParagraphBlock[] = [
    {
      id: "p-1",
      originalText: "To,\nThe Respected Visa Officer,\nEmbassy of Italy.",
      assignedSectionId: "recipient",
      isAmbiguous: false,
      candidateSections: [],
      sourceIndex: 1,
    },
    {
      id: "p-2",
      originalText: "My name is Aafia Ameen, applying for Type D visa.",
      assignedSectionId: "student-introduction",
      isAmbiguous: false,
      candidateSections: [],
      sourceIndex: 2,
    },
    {
      id: "p-3",
      originalText: "I hold Indian Passport Z1234567.",
      assignedSectionId: "student-introduction",
      isAmbiguous: false,
      candidateSections: [],
      sourceIndex: 3,
    },
    {
      id: "p-4",
      originalText: "I completed B.Com in 2023 with 72%.",
      assignedSectionId: "academic-background",
      isAmbiguous: false,
      candidateSections: [],
      sourceIndex: 4,
    },
    {
      id: "p-5",
      originalText: "This curriculum will enhance my quantitative analytical skills.",
      assignedSectionId: "why-course",
      isAmbiguous: true,
      candidateSections: ["why-course", "career-plan"],
      reason: "Could be motivation or career plan",
      sourceIndex: 5,
    },
    {
      id: "p-6",
      originalText: "Random text that does not belong to any visa section.",
      assignedSectionId: "unmapped",
      isAmbiguous: false,
      candidateSections: [],
      sourceIndex: 6,
    },
  ];

  const summary = computeSopSectionsSummary(mockParagraphs);

  // 1. Check sections count (should match the 16 template sections)
  assert.strictEqual(summary.sectionsSummary.length, 16);

  // 2. Check multi-paragraph joining for student-introduction
  assert.ok(summary.sectionContents["student-introduction"].includes("My name is Aafia Ameen"));
  assert.ok(summary.sectionContents["student-introduction"].includes("I hold Indian Passport Z1234567"));

  // 3. Check ambiguous flag detection
  const whyCourse = summary.sectionsSummary.find((s) => s.sectionId === "why-course");
  assert.ok(whyCourse);
  assert.strictEqual(whyCourse.status, "AMBIGUOUS");
  assert.strictEqual(summary.ambiguousItems.length, 1);

  // 4. Check unmapped paragraphs
  assert.strictEqual(summary.unmappedParagraphs.length, 1);
  assert.strictEqual(summary.unmappedParagraphs[0].id, "p-6");

  // 5. Check missing sections
  const accommodation = summary.sectionsSummary.find((s) => s.sectionId === "accommodation");
  assert.ok(accommodation);
  assert.strictEqual(accommodation.status, "NOT_FOUND");
  assert.strictEqual(accommodation.paragraphCount, 0);
});
