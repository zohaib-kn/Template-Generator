/**
 * features/document-generator/__tests__/academicProfileSummary.test.ts
 *
 * Unit tests for the 5-point Academic Profile / About Me summary generator:
 * 1. Student Name
 * 2. Origin City & Geographic Context
 * 3. Family Background & Values
 * 4. Target Degree Being Pursued (accurate level: Bachelor's vs Master's)
 * 5. Impactful Closing Line
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAcademicProfileSummary } from "../utils/buildAcademicProfileSummary";

describe("buildAcademicProfileSummary generator", () => {
  it("TEST 1: Builds full profile for single-mother household student (Angad Deep)", () => {
    const summary = buildAcademicProfileSummary({
      studentName: "Angad Deep",
      city: "Ghaziabad",
      country: "India",
      parents: {
        father: { name: "N.a.", occupation: "" },
        mother: { name: "Daljeet Kaur", occupation: "Management Trainee at Genpact" },
      },
      primaryDegree: "Grade 12th",
      domainName: "Computer Science & IT",
      strengths: ["Algorithmic Problem Solving", "Systematic Debugging"],
      targetCourse: "Computer Engineering",
      degreeLevel: "Bachelor's",
      targetDomainName: "Engineering",
    });

    // 1. Student name
    assert.ok(summary.includes("Angad Deep"), "Must include student name");

    // 2. City & Country
    assert.ok(summary.includes("Ghaziabad, India"), "Must include city and country");

    // 3. Family background
    assert.ok(summary.includes("Daljeet Kaur"), "Must include mother's name");
    assert.ok(summary.includes("Management Trainee at Genpact"), "Must include mother's occupation");
    assert.ok(!summary.includes("N.a."), "Must not print 'N.a.' as father's name");

    // 4. Target degree (Bachelor's, not postgraduate)
    assert.ok(summary.includes("Bachelor's degree in Computer Engineering"), "Must specify Bachelor's degree");
    assert.ok(!summary.toLowerCase().includes("postgraduate"), "Must not call high school graduate postgraduate");

    // 5. Closing line
    assert.ok(summary.includes("Committed to academic excellence"), "Must include purposeful closing line");
  });

  it("TEST 2: Builds profile for student with both parents and postgraduate target", () => {
    const summary = buildAcademicProfileSummary({
      studentName: "Aarav Mehta",
      city: "Bhopal",
      country: "India",
      parents: {
        father: { name: "Rajesh Mehta", occupation: "Senior Accountant" },
        mother: { name: "Sunita Mehta", occupation: "Teacher" },
      },
      primaryDegree: "Bachelor of Business Administration",
      domainName: "Business & Management",
      strengths: ["Financial Analysis", "Market Research"],
      targetCourse: "MSc International Business",
      degreeLevel: "Master's",
      targetDomainName: "Business",
    });

    assert.ok(summary.includes("Aarav Mehta"));
    assert.ok(summary.includes("Bhopal, India"));
    assert.ok(summary.includes("Rajesh Mehta (Senior Accountant)"));
    assert.ok(summary.includes("Sunita Mehta (Teacher)"));
    assert.ok(summary.includes("Master's degree in MSc International Business"));
    assert.ok(summary.includes("Committed to academic excellence"));
  });

  it("TEST 3: Gracefully handles missing parental information without 'undefined'", () => {
    const summary = buildAcademicProfileSummary({
      studentName: "Kavya Sharma",
      city: "Mumbai",
      country: "India",
      primaryDegree: "Grade 12th",
      targetCourse: "Design",
      degreeLevel: "Bachelor",
    });

    assert.ok(summary.includes("Kavya Sharma"));
    assert.ok(summary.includes("Mumbai, India"));
    assert.ok(summary.includes("Coming from a supportive family background in Mumbai"));
    assert.ok(!summary.includes("undefined"));
    assert.ok(summary.includes("Bachelor's degree in Design"));
  });
});
