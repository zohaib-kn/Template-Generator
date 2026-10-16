/**
 * features/document-generator/__tests__/editableDateRange.test.ts
 *
 * Unit tests for EditableDateRange parser and date formatting helper.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDateRange, formatDateDMY } from "../components/inline/EditableDateRange";

describe("EditableDateRange — parseDateRange", () => {
  it("parses en-dash separated date ranges cleanly", () => {
    const input = "01/08/2022 – 31/05/2025";
    const result = parseDateRange(input);
    assert.deepStrictEqual(result, {
      startDate: "01/08/2022",
      endDate: "31/05/2025",
    });
  });

  it("parses hyphen-separated date ranges with spaces", () => {
    const input = "01/08/2022 - 31/05/2025";
    const result = parseDateRange(input);
    assert.deepStrictEqual(result, {
      startDate: "01/08/2022",
      endDate: "31/05/2025",
    });
  });

  it("parses 'to' separated date ranges (case-insensitive)", () => {
    const input = "August 2022 TO May 2025";
    const result = parseDateRange(input);
    assert.deepStrictEqual(result, {
      startDate: "August 2022",
      endDate: "May 2025",
    });
  });

  it("strips wrapping Europass brackets [ ] automatically", () => {
    const input = "[ 01/08/2022 – 31/05/2025 ]";
    const result = parseDateRange(input);
    assert.deepStrictEqual(result, {
      startDate: "01/08/2022",
      endDate: "31/05/2025",
    });
  });

  it("parses 4-digit year ranges like 2022-2025 and 2022-Present", () => {
    const range1 = parseDateRange("2022-2025");
    assert.deepStrictEqual(range1, {
      startDate: "2022",
      endDate: "2025",
    });

    const range2 = parseDateRange("2022 – Present");
    assert.deepStrictEqual(range2, {
      startDate: "2022",
      endDate: "Present",
    });
  });

  it("handles single date or single year input gracefully", () => {
    const singleYear = parseDateRange("2024");
    assert.deepStrictEqual(singleYear, {
      startDate: "2024",
      endDate: "",
    });

    const singleDate = parseDateRange("15/07/2023");
    assert.deepStrictEqual(singleDate, {
      startDate: "15/07/2023",
      endDate: "",
    });
  });

  it("handles empty or whitespace strings", () => {
    assert.deepStrictEqual(parseDateRange(""), { startDate: "", endDate: "" });
    assert.deepStrictEqual(parseDateRange("   "), { startDate: "", endDate: "" });
    assert.deepStrictEqual(parseDateRange("[]"), { startDate: "", endDate: "" });
  });
});

describe("EditableDateRange — formatDateDMY", () => {
  it("converts YYYY-MM-DD into DD/MM/YYYY", () => {
    assert.strictEqual(formatDateDMY("2003-07-18"), "18/07/2003");
    assert.strictEqual(formatDateDMY("2022-08-01"), "01/08/2022");
  });

  it("preserves already formatted DD/MM/YYYY strings", () => {
    assert.strictEqual(formatDateDMY("18/07/2003"), "18/07/2003");
  });

  it("returns empty string for undefined or empty input", () => {
    assert.strictEqual(formatDateDMY(undefined), "");
    assert.strictEqual(formatDateDMY(""), "");
  });

  it("preserves non-standard text such as 'Present' or '2024'", () => {
    assert.strictEqual(formatDateDMY("Present"), "Present");
    assert.strictEqual(formatDateDMY("2024"), "2024");
  });
});
