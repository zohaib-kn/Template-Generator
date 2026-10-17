/**
 * features/document-generator/__tests__/descriptionParser.test.ts
 *
 * Unit tests for descriptionParser and stripLeadingMarkers:
 * - Prevents multiple stacked bullets ("• • •")
 * - Cleans single-line descriptions with bullet prefixes
 * - Parses multiline and sentence-based bullet lists cleanly
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseDescriptionToBullets,
  stripLeadingMarkers,
} from "@/templates/europass/utils/descriptionParser";

describe("descriptionParser — stripLeadingMarkers", () => {
  it("strips a single bullet marker", () => {
    assert.strictEqual(stripLeadingMarkers("• Hello world"), "Hello world");
    assert.strictEqual(stripLeadingMarkers("- Hello world"), "Hello world");
    assert.strictEqual(stripLeadingMarkers("* Hello world"), "Hello world");
    assert.strictEqual(stripLeadingMarkers("● Hello world"), "Hello world");
  });

  it("strips multiple stacked bullets and dots cleanly", () => {
    assert.strictEqual(
      stripLeadingMarkers("• • • I designed, developed, and launched the full website"),
      "I designed, developed, and launched the full website"
    );
    assert.strictEqual(
      stripLeadingMarkers("••• Three bullets"),
      "Three bullets"
    );
    assert.strictEqual(
      stripLeadingMarkers("• - • Mixed bullets"),
      "Mixed bullets"
    );
    assert.strictEqual(
      stripLeadingMarkers("... Leading dots"),
      "Leading dots"
    );
  });

  it("handles empty or whitespace strings gracefully", () => {
    assert.strictEqual(stripLeadingMarkers(""), "");
    assert.strictEqual(stripLeadingMarkers("   "), "");
    assert.strictEqual(stripLeadingMarkers("•   "), "");
  });
});

describe("descriptionParser — parseDescriptionToBullets", () => {
  it("handles single-line text with multiple leading bullets without duplicating bullets", () => {
    const raw =
      "• • • I designed, developed, and launched the full website for Project Prabhav from scratch (starting), including every page, and made IT fully responsive across phones, tablets and desktops";
    const bullets = parseDescriptionToBullets(raw);

    assert.strictEqual(bullets.length, 1);
    assert.strictEqual(
      bullets[0],
      "I designed, developed, and launched the full website for Project Prabhav from scratch (starting), including every page, and made IT fully responsive across phones, tablets and desktops"
    );
    // Crucially: no bullet marker at the start of bullets[0]
    assert.ok(!/^[\u2022\-\*\u25CF\.\s]/.test(bullets[0]));
  });

  it("handles single-line text with a single leading bullet", () => {
    const raw = "• Built a React application from scratch";
    const bullets = parseDescriptionToBullets(raw);

    assert.strictEqual(bullets.length, 1);
    assert.strictEqual(bullets[0], "Built a React application from scratch");
  });

  it("parses multiline bullet points cleanly", () => {
    const raw = "• First responsibility\n• Second responsibility\n• Third responsibility";
    const bullets = parseDescriptionToBullets(raw);

    assert.strictEqual(bullets.length, 3);
    assert.strictEqual(bullets[0], "First responsibility");
    assert.strictEqual(bullets[1], "Second responsibility");
    assert.strictEqual(bullets[2], "Third responsibility");
  });

  it("parses multiple sentences when no manual bullets exist", () => {
    const raw =
      "Developed end-to-end payment workflows using Stripe. Created comprehensive unit test coverage with Jest and Playwright. Optimized database queries for PostgreSQL.";
    const bullets = parseDescriptionToBullets(raw);

    assert.strictEqual(bullets.length, 3);
    assert.strictEqual(bullets[0], "Developed end-to-end payment workflows using Stripe");
    assert.strictEqual(bullets[1], "Created comprehensive unit test coverage with Jest and Playwright");
    assert.strictEqual(bullets[2], "Optimized database queries for PostgreSQL");
  });

  it("never returns empty array for non-empty text", () => {
    const bullets = parseDescriptionToBullets("Short text");
    assert.ok(bullets.length >= 1);
    assert.strictEqual(bullets[0], "Short text");
  });
});
