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

  it("TEST 19: CRM snapshot with masterInfo.academicAchievements maps to DocumentData.achievements", () => {
    const rawSnapshot: CrmSnapshot = {
      student: {
        personalDetails: {
          firstName: "Angad",
          lastName: "Deep",
          email: "angad@example.com",
        },
        masterInfo: {
          academicAchievements: `High School Achievements (Grades 9-12):
1. One of the Class 10 CBSE Board Exam toppers at K. D. B. Public School (2022-23).
2. 1st position in Computer Science and English Core, Grade 11 (academic year 2023-24).
3. One of the Top 3 performers out of 60+ interns, GeniusHub Web Development Internship (July 2024); Awards: Trophy, Certificate of Appreciation, a feature in Inspirin Magazine.

Other Competitive Achievements (Chess):
1. 4th place with Trophy, 4th Perados Chess Event, Adharsheela Global School (Nov 2022)`,
        },
      },
    };

    const normalized = mapCrmToNormalizedStudent(rawSnapshot);
    assert.ok(normalized.academics.achievements);
    assert.strictEqual(normalized.academics.achievements.length, 4);

    // Verify item 1
    const item1 = normalized.academics.achievements[0];
    assert.strictEqual(item1.dateYear, "2022-23");
    assert.ok(item1.title?.includes("Class 10 CBSE Board Exam toppers"));

    // Verify item 3
    const item3 = normalized.academics.achievements[2];
    assert.strictEqual(item3.dateYear, "July 2024");
    assert.ok(item3.title?.includes("GeniusHub Web Development Internship"));
    assert.ok(item3.description?.includes("Trophy, Certificate of Appreciation"));

    // Verify item 4 (chess)
    const item4 = normalized.academics.achievements[3];
    assert.strictEqual(item4.dateYear, "Nov 2022");
    assert.strictEqual(item4.category, "Other Competitive Achievements (Chess)");

    // Project to resume
    const { student } = mapNormalizedToResume(normalized);
    assert.ok(student.achievements);
    assert.strictEqual(student.achievements.length, 4);
    assert.strictEqual(student.achievements[0].title, item1.title);
    assert.strictEqual(student.achievements[0].dateYear, "2022-23");
  });

  it("TEST 20: CRM snapshot with empty academicAchievements does not create spurious achievements", () => {
    const emptySnapshot: CrmSnapshot = {
      student: {
        personalDetails: { firstName: "Test", lastName: "Student" },
        masterInfo: { academicAchievements: "" },
      },
    };

    const normalized = mapCrmToNormalizedStudent(emptySnapshot);
    assert.strictEqual(normalized.academics.achievements, undefined);

    const { student } = mapNormalizedToResume(normalized);
    assert.strictEqual(student.achievements, undefined);
  });
});

