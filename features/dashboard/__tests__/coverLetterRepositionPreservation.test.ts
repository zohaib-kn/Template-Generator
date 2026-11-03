import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { docSectionsToHtml } from "../utils/docSectionsToHtml";
import { hydrateDocumentFromSnapshot } from "../utils/documentHydrator";
import { getSampleAafiaAmeenSnapshot } from "@/lib/sampleStudents";
import { updateCoverLetterSectionWithField } from "../utils/coverLetterCleaner";
import {
  syncCoverLetterHtmlToSections,
  updateLiveCoverLetterHtml,
} from "../utils/coverLetterHtmlSync";

describe("Cover Letter Repositioning & Formatting Preservation Across AI Updates", () => {
  const snap = getSampleAafiaAmeenSnapshot();
  const doc = hydrateDocumentFromSnapshot("COVER_LETTER", snap, "sample-aafia-ameen");
  const initialHtml = docSectionsToHtml(doc.sections, doc.docType, doc.title);

  it("preserves manual indentation and removed 'To,' across single-field AI chatbot updates", () => {
    // User repositions recipient in Tiptap: indents it and deletes "To,"
    const userCustomRecipient = "   The Respected Visa Officer,\n   Consulate General of Italy,\n   Mumbai, India.";
    const userHtml = initialHtml.replace(
      "To,\nThe Respected Visa Officer,\nConsulate General of Italy,\nMumbai, India.",
      userCustomRecipient
    );

    assert.ok(userHtml.includes("   The Respected Visa Officer"), "Initial user HTML should have custom indentation");
    assert.ok(!userHtml.includes("To,\n"), "Initial user HTML should not have 'To,'");

    // User chats with bot to update father's occupation to "Government Employee"
    const updatedSections = updateCoverLetterSectionWithField(
      doc.sections,
      "family.fatherOccupation",
      "Government Employee",
      null,
      {}
    );

    // Apply update using updateLiveCoverLetterHtml
    const resultHtml = updateLiveCoverLetterHtml(userHtml, doc.sections, updatedSections);

    // 1. Target field must be updated in the body paragraph
    assert.ok(resultHtml.includes("Government Employee"), "Must contain updated father occupation 'Government Employee'");

    // 2. Repositioned recipient must NOT snap back or lose indentation
    assert.ok(
      resultHtml.includes("   The Respected Visa Officer"),
      "Must preserve the user's manual indentation on 'The Respected Visa Officer'"
    );

    // 3. 'To,' must NOT be re-introduced
    assert.ok(!resultHtml.includes("To,\n"), "'To,' must not be re-introduced by the AI update");
  });

  it("preserves manual formatting across multi-turn chatbot conversations", () => {
    // User customizes recipient layout
    const userCustomRecipient = "   The Respected Visa Officer,\n   Consulate General of Italy,\n   Mumbai, India.";
    let liveHtml = initialHtml.replace(
      "To,\nThe Respected Visa Officer,\nConsulate General of Italy,\nMumbai, India.",
      userCustomRecipient
    );

    // Turn 1: Update Father's Occupation
    const turn1Sections = updateCoverLetterSectionWithField(
      doc.sections,
      "family.fatherOccupation",
      "Government Employee",
      null,
      {}
    );
    liveHtml = updateLiveCoverLetterHtml(liveHtml, doc.sections, turn1Sections);

    assert.ok(liveHtml.includes("Government Employee"));
    assert.ok(liveHtml.includes("   The Respected Visa Officer"));

    // Turn 2: Update Sibling Details to "1 younger brother, studying in Class 8"
    const turn2Sections = updateCoverLetterSectionWithField(
      turn1Sections,
      "family.siblingText",
      "1 younger brother, studying in Class 8",
      null,
      { "family.fatherOccupation": "Government Employee" }
    );
    liveHtml = updateLiveCoverLetterHtml(liveHtml, turn1Sections, turn2Sections);

    // Both updates should be present in the body
    assert.ok(liveHtml.includes("Government Employee"), "Turn 2 should retain Turn 1 update");
    assert.ok(
      liveHtml.includes("1 younger brother, studying in Class 8"),
      "Turn 2 should contain the new sibling details"
    );

    // Custom repositioning remains intact
    assert.ok(
      liveHtml.includes("   The Respected Visa Officer"),
      "Turn 2 must still retain the user's manual indentation"
    );
    assert.ok(!liveHtml.includes("To,\n"), "Turn 2 must still not contain 'To,'");
  });

  it("syncCoverLetterHtmlToSections syncs user's custom recipient back to document sections", () => {
    const userCustomRecipient = "   The Respected Visa Officer,\n   Consulate General of Italy,\n   Mumbai, India.";
    const userHtml = initialHtml.replace(
      "To,\nThe Respected Visa Officer,\nConsulate General of Italy,\nMumbai, India.",
      userCustomRecipient
    );

    const synced = syncCoverLetterHtmlToSections(userHtml, doc.sections);
    const recipSec = synced.find((s) => s.heading.toLowerCase().includes("recipient"));

    assert.ok(recipSec, "Recipient section must exist in synced sections");
    assert.ok(
      recipSec.content.includes("The Respected Visa Officer"),
      "Recipient section must contain the customized recipient"
    );
    assert.ok(!recipSec.content.includes("To,"), "Synced recipient must not have 'To,' if user deleted it");
  });
});

