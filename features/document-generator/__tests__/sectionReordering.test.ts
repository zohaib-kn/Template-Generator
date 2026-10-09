/**
 * features/document-generator/__tests__/sectionReordering.test.ts
 *
 * Unit test suite for Dynamic Section Reordering:
 * 1. Default section order completeness
 * 2. MOVE_SECTION up and down array swaps
 * 3. MOVE_SECTION boundary protection (start / end of array)
 * 4. SET_SECTION_ORDER and RESET_SECTION_ORDER reducer actions
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { documentReducer } from "../state/documentReducer";
import { DEFAULT_MOVABLE_SECTION_ORDER } from "@/types";
import type { DocumentData } from "@/types";

describe("Resume Section Dynamic Reordering Engine", () => {
  const initialData: DocumentData = {
    personal: { fullName: "Test Student" },
    education: [],
    internships: [],
    academicProjects: [],
  };

  it("should have all standard movable sections in DEFAULT_MOVABLE_SECTION_ORDER", () => {
    assert.ok(DEFAULT_MOVABLE_SECTION_ORDER.includes("aboutMe"));
    assert.ok(DEFAULT_MOVABLE_SECTION_ORDER.includes("education"));
    assert.ok(DEFAULT_MOVABLE_SECTION_ORDER.includes("internships"));
    assert.ok(DEFAULT_MOVABLE_SECTION_ORDER.includes("languages"));
    assert.ok(DEFAULT_MOVABLE_SECTION_ORDER.includes("englishCertificate"));
    assert.strictEqual(DEFAULT_MOVABLE_SECTION_ORDER.length, 15);
  });

  it("should move a section down when MOVE_SECTION direction is 'down'", () => {
    // Default: aboutMe (0), education (1), internships (2)...
    const state = documentReducer(initialData, {
      type: "MOVE_SECTION",
      payload: { sectionId: "education", direction: "down" },
    });

    assert.ok(state.sectionOrder);
    assert.strictEqual(state.sectionOrder[0], "aboutMe");
    assert.strictEqual(state.sectionOrder[1], "internships");
    assert.strictEqual(state.sectionOrder[2], "education");
  });

  it("should move a section up when MOVE_SECTION direction is 'up'", () => {
    // Start with education at index 1, move it up to index 0
    const state = documentReducer(initialData, {
      type: "MOVE_SECTION",
      payload: { sectionId: "education", direction: "up" },
    });

    assert.ok(state.sectionOrder);
    assert.strictEqual(state.sectionOrder[0], "education");
    assert.strictEqual(state.sectionOrder[1], "aboutMe");
  });

  it("should not move past the top boundary when already at index 0", () => {
    const state = documentReducer(initialData, {
      type: "MOVE_SECTION",
      payload: { sectionId: "aboutMe", direction: "up" },
    });

    // Should return state unchanged
    assert.strictEqual(state.sectionOrder, undefined);
  });

  it("should not move past the bottom boundary when already at the last index", () => {
    const lastSection = DEFAULT_MOVABLE_SECTION_ORDER[DEFAULT_MOVABLE_SECTION_ORDER.length - 1];
    const state = documentReducer(initialData, {
      type: "MOVE_SECTION",
      payload: { sectionId: lastSection, direction: "down" },
    });

    // Should return state unchanged
    assert.strictEqual(state.sectionOrder, undefined);
  });

  it("should support SET_SECTION_ORDER to directly assign a custom order", () => {
    const customOrder = ["languages", "education", "aboutMe"];
    const state = documentReducer(initialData, {
      type: "SET_SECTION_ORDER",
      payload: customOrder,
    });

    assert.deepStrictEqual(state.sectionOrder, customOrder);
  });

  it("should support RESET_SECTION_ORDER to revert back to default", () => {
    const customState: DocumentData = {
      ...initialData,
      sectionOrder: ["languages", "education", "aboutMe"],
    };

    const resetState = documentReducer(customState, {
      type: "RESET_SECTION_ORDER",
    });

    assert.strictEqual(resetState.sectionOrder, undefined);
  });
});
