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

  it("wraps newly filled missing detail in <u class='ai-filled-detail'> for editor visual feedback", () => {
    const updatedSections = updateCoverLetterSectionWithField(
      doc.sections,
      "family.fatherOccupation",
      "Government Employee",
      null,
      {}
    );

    const resultHtml = updateLiveCoverLetterHtml(
      initialHtml,
      doc.sections,
      updatedSections,
      "Government Employee"
    );

    assert.ok(
      resultHtml.includes('<u class="ai-filled-detail"'),
      "Updated HTML should contain the editor underline mark"
    );
    assert.ok(
      resultHtml.includes("Government Employee</u>"),
      "The newly filled detail must be wrapped inside the underline tag"
    );

    // Verify syncCoverLetterHtmlToSections strips the <u> tag for clean state & PDF export
    const synced = syncCoverLetterHtmlToSections(resultHtml, updatedSections);
    const academicSec = synced.find((s) => s.heading.toLowerCase().includes("academic"));
    assert.ok(academicSec, "Academic / family section must exist");
    assert.ok(academicSec.content.includes("Government Employee"), "Content has the value");
    assert.ok(!academicSec.content.includes("<u"), "Underline tag is stripped from underlying section content");
  });

  it("updates Return / Home Country Intent (and NOT Why Italy) with underline when family return reason is answered", () => {
    const returnReason = "I have strong family and social ties in India";
    const updatedSections = updateCoverLetterSectionWithField(
      doc.sections,
      "student.returnFamilyReason",
      returnReason,
      null,
      {}
    );

    const returnSec = updatedSections.find((s) => s.heading.toLowerCase().includes("return"));
    assert.ok(returnSec, "Return intent section must exist");
    assert.ok(returnSec.content.includes(returnReason), "Return intent section must contain the return reason");
    assert.ok(!returnSec.content.includes("I chose Italy because it is home to"), "Return section must NOT be replaced by Why Italy");

    const resultHtml = updateLiveCoverLetterHtml(
      initialHtml,
      doc.sections,
      updatedSections,
      returnReason
    );

    assert.ok(resultHtml.includes('<u class="ai-filled-detail"'), "Must contain underline tag");
    assert.ok(resultHtml.includes(`${returnReason}</u>`), "Return reason must be underlined");
  });

  it("updates Sibling Details in Academic Background with underline", () => {
    const siblingText = "an elder brother who works as a software engineer";
    const updatedSections = updateCoverLetterSectionWithField(
      doc.sections,
      "family.siblingText",
      siblingText,
      null,
      {}
    );

    const academicSec = updatedSections.find((s) => s.heading.toLowerCase().includes("academic"));
    assert.ok(academicSec, "Academic background section must exist");
    assert.ok(academicSec.content.includes(siblingText), "Academic section must contain sibling details");

    const resultHtml = updateLiveCoverLetterHtml(
      initialHtml,
      doc.sections,
      updatedSections,
      siblingText
    );

    assert.ok(resultHtml.includes('<u class="ai-filled-detail"'), "Must contain underline tag");
    assert.ok(resultHtml.includes(`${siblingText}</u>`), "Sibling text must be underlined");
  });

  it("never places body paragraphs above Recipient or Subject across multi-turn missing details updates", () => {
    let currentSections = doc.sections;
    let liveHtml = initialHtml.replace(/<div\b[^>]*>/gi, "<p>").replace(/<\/div>/gi, "</p>");

    // Turn 1: Add City
    currentSections = syncCoverLetterHtmlToSections(liveHtml, currentSections);
    let u1 = updateCoverLetterSectionWithField(currentSections, "student.city", "Bhopal", null, {});
    liveHtml = updateLiveCoverLetterHtml(liveHtml, currentSections, u1, "Bhopal");
    currentSections = u1;

    // Turn 2: Add Return Reason
    currentSections = syncCoverLetterHtmlToSections(liveHtml, currentSections);
    let u2 = updateCoverLetterSectionWithField(
      currentSections,
      "student.returnFamilyReason",
      "I have strong family ties in India",
      null,
      {}
    );
    liveHtml = updateLiveCoverLetterHtml(liveHtml, currentSections, u2, "I have strong family ties in India");
    currentSections = u2;

    // Turn 3: Add Favorite Subjects
    currentSections = syncCoverLetterHtmlToSections(liveHtml, currentSections);
    const favSubjects = "Data Structures, Algorithms and Cloud Computing";
    let u3 = updateCoverLetterSectionWithField(
      currentSections,
      "academics.favoriteSubjects",
      favSubjects,
      null,
      {}
    );
    liveHtml = updateLiveCoverLetterHtml(liveHtml, currentSections, u3, favSubjects);

    // Verify Recipient & Subject position
    const recipIdx = liveHtml.indexOf("To,");
    const subjIdx = liveHtml.indexOf("Subject:");
    const favIdx = liveHtml.indexOf("Data Structures");

    assert.ok(recipIdx !== -1, "Recipient 'To,' must be present");
    assert.ok(subjIdx !== -1, "Subject must be present");
    assert.ok(favIdx !== -1, "Favorite subjects must be present");

    assert.ok(recipIdx < subjIdx, "Recipient must be before Subject");
    assert.ok(subjIdx < favIdx, "Subject must be before body paragraphs (Favorite subjects)");

    // Ensure no body text exists before 'To,'
    const textBeforeTo = liveHtml.slice(0, recipIdx).replace(/<[^>]+>/g, "").replace(/COVER\s*LETTER/gi, "").trim();
    assert.strictEqual(textBeforeTo, "", "No body text or about me text must exist before 'To,'");
  });

  it("heals and restores correct structural layout if body text was corrupted before Recipient", () => {
    const corruptedHtml = `
      <p>My name is Angad Deep, and I am from bhopal. I have always enjoyed subjects that challenge me...</p>
      <p>To,<br>The Respected Visa Officer,<br>Embassy of Italy / Consulate General of Italy.</p>
      <p>Subject: Application for a Long-Term Type D Student Visa to Pursue Computer Engineering at the University of Cassino</p>
      <p>My name is Angad Deep, I completed my Artificial Intelligence...</p>
    `;

    const u = updateCoverLetterSectionWithField(doc.sections, "student.city", "Bhopal", null, {});
    const healed = updateLiveCoverLetterHtml(corruptedHtml, doc.sections, u, "Bhopal");

    const recipIdx = healed.indexOf("To,");
    const textBeforeTo = healed.slice(0, recipIdx).replace(/<[^>]+>/g, "").replace(/COVER\s*LETTER/gi, "").trim();
    assert.strictEqual(textBeforeTo, "", "Healing check must remove any corrupted body text before 'To,'");
  });
});

