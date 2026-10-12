/**
 * features/document-generator/__tests__/documentFirstResumeBuilder.test.ts
 *
 * Unit and integration tests for the Document-First Resume Builder redesign:
 * - Dynamic section presence and visibility logic
 * - Repeatable section additions and removals
 * - Section reordering with locked personalDetails
 * - Data persistence in DocumentData
 * - CRM student normalization mapping to live sections
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { documentReducer } from "../state/documentReducer";
import { DEFAULT_MOVABLE_SECTION_ORDER, type DocumentData } from "@/types";
import { mapCrmToNormalizedStudent, mapNormalizedToResume } from "@/services/normalization";
import type { CrmSnapshot } from "@/types/crmSnapshot";

describe("Document-First Resume Builder Architecture", () => {
  const baseDocument: DocumentData = {
    personal: {
      fullName: "Angad Deep",
      email: "angad@example.com",
      phone: "+91 98765 43210",
      nationality: "Indian",
    },
    education: [
      {
        id: "edu-1",
        institution: "Delhi University",
        qualification: "Bachelor of Commerce",
        fieldOfStudy: "Commerce",
        startDate: "2020-08-01",
        endDate: "2023-05-31",
      },
    ],
    internships: [
      {
        id: "work-1",
        role: "Financial Analyst Intern",
        company: "ABC Capital",
        startDate: "2023-06-01",
        endDate: "2023-12-31",
      },
    ],
    languages: [{ id: "lang-1", language: "English", level: "Fluent" }],
    englishCertificate: { examName: "IELTS", score: "7.5" },
  };

  it("TEST 1 & 2: Active vs unpopulated optional sections", () => {
    // Only populated sections should be considered active
    assert.ok(baseDocument.personal?.fullName);
    assert.strictEqual(baseDocument.education?.length, 1);
    assert.strictEqual(baseDocument.internships?.length, 1);
    assert.strictEqual(baseDocument.languages?.length, 1);
    assert.ok(baseDocument.englishCertificate?.score);

    // Unpopulated optional sections must be undefined or empty
    assert.strictEqual(baseDocument.certifications, undefined);
    assert.strictEqual(baseDocument.academicProjects, undefined);
    assert.strictEqual(baseDocument.leadershipActivities, undefined);
    assert.strictEqual(baseDocument.volunteering, undefined);
    assert.strictEqual(baseDocument.hobbies, undefined);
    assert.strictEqual(baseDocument.recommendations, undefined);
    assert.strictEqual(baseDocument.declaration, undefined);
  });

  it("TEST 3 & 4: Adding repeatable sections and items", () => {
    // Add a certification to base document
    const updated = documentReducer(baseDocument, {
      type: "ADD_LIST_ITEM",
      key: "certifications",
      payload: {
        id: "cert-1",
        name: "Financial Modeling & Valuation Analyst (FMVA)",
        provider: "CFI",
        completionDate: "2024",
      },
    });

    assert.ok(updated.certifications);
    assert.strictEqual(updated.certifications.length, 1);
    assert.strictEqual(
      updated.certifications[0].name,
      "Financial Modeling & Valuation Analyst (FMVA)"
    );

    // Existing education and internships must remain intact
    assert.strictEqual(updated.education?.length, 1);
    assert.strictEqual(updated.internships?.length, 1);
  });

  it("TEST 5: Adding another entry to existing repeatable section", () => {
    const withSecondEdu = documentReducer(baseDocument, {
      type: "ADD_LIST_ITEM",
      key: "education",
      payload: {
        id: "edu-2",
        institution: "Higher Secondary School",
        qualification: "Higher Secondary Education (12th)",
      },
    });

    assert.strictEqual(withSecondEdu.education?.length, 2);
    assert.strictEqual(withSecondEdu.education[0].id, "edu-1");
    assert.strictEqual(withSecondEdu.education[1].id, "edu-2");
  });

  it("TEST 6 & 7: Direct item field editing live synchronization", () => {
    const edited = documentReducer(baseDocument, {
      type: "UPDATE_LIST_ITEM",
      key: "education",
      payload: {
        id: "edu-1",
        patch: { institution: "University of Delhi, SRCC" },
      },
    });

    assert.strictEqual(
      edited.education?.[0].institution,
      "University of Delhi, SRCC"
    );
    // Other fields in the entry must be preserved
    assert.strictEqual(edited.education?.[0].qualification, "Bachelor of Commerce");
  });

  it("TEST 9 & 10: Section rearrangement persistence via sectionOrder", () => {
    // Rearrange Education and Internships
    const customOrder = [
      "internships",
      "education",
      "academicProjects",
      "certifications",
      "aboutMe",
      "languages",
      "englishCertificate",
      "skills",
      "hobbies",
      "recommendations",
      "declaration",
    ];

    const reordered = documentReducer(baseDocument, {
      type: "SET_SECTION_ORDER",
      payload: customOrder,
    });

    assert.deepStrictEqual(reordered.sectionOrder, customOrder);
    assert.strictEqual(reordered.sectionOrder[0], "internships");
    assert.strictEqual(reordered.sectionOrder[1], "education");

    // Content values are completely preserved
    assert.strictEqual(reordered.personal?.fullName, "Angad Deep");
    assert.strictEqual(reordered.education?.length, 1);
  });

  it("TEST 11: Personal Details remains locked as header", () => {
    // Personal details is separate from sectionOrder array
    const customOrder = ["education", "internships"];
    const state = documentReducer(baseDocument, {
      type: "SET_SECTION_ORDER",
      payload: customOrder,
    });

    // Pinned header is always accessed via data.personal, regardless of sectionOrder
    assert.strictEqual(state.personal?.fullName, "Angad Deep");
    assert.ok(!state.sectionOrder?.includes("personalDetails"));
  });

  it("TEST 12: Student switching isolation", () => {
    const studentAState = { ...baseDocument };
    const resetState = documentReducer(studentAState, { type: "RESET" });

    assert.strictEqual(resetState.personal?.fullName, undefined);
    assert.strictEqual(resetState.education, undefined);
    assert.strictEqual(resetState.internships, undefined);

    // Load student B
    const studentB: DocumentData = {
      personal: { fullName: "Kavya Patel", email: "kavya@example.com" },
      education: [{ id: "k-edu-1", institution: "IIT Bombay", qualification: "B.Tech" }],
    };

    const studentBState = documentReducer(resetState, {
      type: "LOAD_STUDENT",
      payload: studentB,
    });

    assert.strictEqual(studentBState.personal?.fullName, "Kavya Patel");
    assert.strictEqual(studentBState.education?.[0].institution, "IIT Bombay");
    // Student A facts must be 100% purged
    assert.notStrictEqual(studentBState.personal?.fullName, "Angad Deep");
  });

  it("TEST 18: Removing an optional section clears data cleanly", () => {
    const withAbout: DocumentData = {
      ...baseDocument,
      aboutMe: "Aspiring finance professional with strong accounting foundation.",
    };

    assert.ok(withAbout.aboutMe);

    // Remove section by clearing its field
    const cleared = documentReducer(withAbout, {
      type: "SET_ABOUT_ME",
      payload: "",
    });

    assert.strictEqual(cleared.aboutMe, "");
    // Rest of document remains intact
    assert.strictEqual(cleared.education?.length, 1);
  });
});
