/**
 * features/document-generator/__tests__/portfolioSection.test.ts
 *
 * Unit test suite for Student Portfolio URL feature in Resume Generator.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { documentReducer } from "../state/documentReducer";
import { createEmptyDocumentData } from "../utils/documentDefaults";
import { RESUME_SECTION_METADATA } from "../components/ResumeSectionSidebar";

describe("Student Portfolio Feature", () => {
  it("should initialize empty document with undefined portfolioUrl", () => {
    const initial = createEmptyDocumentData();
    assert.strictEqual(initial.personal?.portfolioUrl, undefined);
  });

  it("should update personal details with portfolioUrl via SET_PERSONAL action", () => {
    const initial = createEmptyDocumentData();
    const updated = documentReducer(initial, {
      type: "SET_PERSONAL",
      payload: {
        portfolioUrl: "https://github.com/student-dev",
      },
    });

    assert.strictEqual(updated.personal?.portfolioUrl, "https://github.com/student-dev");
  });

  it("should preserve other personal details when updating portfolioUrl", () => {
    const initial = createEmptyDocumentData();
    const withName = documentReducer(initial, {
      type: "SET_PERSONAL",
      payload: {
        fullName: "Angad Deep",
        email: "angad@example.com",
        phone: "+91 9876543210",
      },
    });

    const withPortfolio = documentReducer(withName, {
      type: "SET_PERSONAL",
      payload: {
        portfolioUrl: "https://angaddeep.dev",
      },
    });

    assert.strictEqual(withPortfolio.personal?.fullName, "Angad Deep");
    assert.strictEqual(withPortfolio.personal?.email, "angad@example.com");
    assert.strictEqual(withPortfolio.personal?.phone, "+91 9876543210");
    assert.strictEqual(withPortfolio.personal?.portfolioUrl, "https://angaddeep.dev");
  });

  it("should clear portfolioUrl without affecting other fields", () => {
    const initial = createEmptyDocumentData();
    const withPortfolio = documentReducer(initial, {
      type: "SET_PERSONAL",
      payload: {
        fullName: "Jane Doe",
        portfolioUrl: "https://janedoe.com",
      },
    });

    const cleared = documentReducer(withPortfolio, {
      type: "SET_PERSONAL",
      payload: {
        portfolioUrl: "",
      },
    });

    assert.strictEqual(cleared.personal?.fullName, "Jane Doe");
    assert.strictEqual(cleared.personal?.portfolioUrl, "");
  });

  it("should define portfolio in RESUME_SECTION_METADATA", () => {
    assert.ok(RESUME_SECTION_METADATA.portfolio);
    assert.strictEqual(RESUME_SECTION_METADATA.portfolio.title, "Portfolio");
    assert.strictEqual(RESUME_SECTION_METADATA.portfolio.group, "profile");
  });
});
