/**
 * services/import/__tests__/aiSopClassifier.test.ts
 *
 * Automated tests for SOP classification data mapping and non-rewriting guarantees.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { classifySopWithAi } from "../normalizers/aiSopClassifier";
import type { RawParagraphBlock } from "../normalizers/sopParagraphSegmenter";

test("AI SOP Classifier: handles empty paragraph list safely", async () => {
  const result = await classifySopWithAi([]);
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(result.classifiedParagraphs, []);
  assert.deepStrictEqual(result.extractedFacts, {});
});

test("AI SOP Classifier: fallback mapping preserves verbatim text integrity", async () => {
  const blocks: RawParagraphBlock[] = [
    {
      id: "p-1",
      text: "Verbatim text that must not be altered: GPA 3.8 at IIT Bombay in 2022.",
      sourceIndex: 1,
    },
  ];

  // If no AI key is present during offline unit test, fallback mapping returns unmapped with 100% exact text
  const result = await classifySopWithAi(blocks, 0);

  assert.strictEqual(result.classifiedParagraphs.length, 1);
  assert.strictEqual(
    result.classifiedParagraphs[0].originalText,
    "Verbatim text that must not be altered: GPA 3.8 at IIT Bombay in 2022."
  );
});
