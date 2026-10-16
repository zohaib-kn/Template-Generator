/**
 * features/document-generator/__tests__/hobbiesMultiEntry.test.ts
 *
 * Unit test suite for single-box multi-hobby input parser and bullet point conversion.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseHobbiesInput } from "../forms/HobbiesForm";

describe("Hobbies Single-Box Multi-Entry Parser", () => {
  it("should parse comma-separated hobbies into distinct items", () => {
    const input = "reading, writing, photography";
    const result = parseHobbiesInput(input);
    assert.deepStrictEqual(result, ["reading", "writing", "photography"]);
  });

  it("should parse newline-separated hobbies into distinct items", () => {
    const input = "Reading\nWriting\nPhotography";
    const result = parseHobbiesInput(input);
    assert.deepStrictEqual(result, ["Reading", "Writing", "Photography"]);
  });

  it("should parse semicolon-separated hobbies into distinct items", () => {
    const input = "Chess; Basketball; Playing Guitar";
    const result = parseHobbiesInput(input);
    assert.deepStrictEqual(result, ["Chess", "Basketball", "Playing Guitar"]);
  });

  it("should strip bullet characters and excessive spaces", () => {
    const input = "• Reading, * Writing, - Cycling";
    const result = parseHobbiesInput(input);
    assert.deepStrictEqual(result, ["Reading", "Writing", "Cycling"]);
  });

  it("should handle mixed separators and trailing commas cleanly", () => {
    const input = "reading, writing;\nphotography,   ";
    const result = parseHobbiesInput(input);
    assert.deepStrictEqual(result, ["reading", "writing", "photography"]);
  });

  it("should return single item when no separator is used", () => {
    const input = "Traveling";
    const result = parseHobbiesInput(input);
    assert.deepStrictEqual(result, ["Traveling"]);
  });

  it("should return empty array for empty or whitespace-only input", () => {
    assert.deepStrictEqual(parseHobbiesInput(""), []);
    assert.deepStrictEqual(parseHobbiesInput("   "), []);
    assert.deepStrictEqual(parseHobbiesInput(",,,;;;\n\n"), []);
  });
});
