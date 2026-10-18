/**
 * features/document-generator/__tests__/academicProfileSummary.test.ts
 *
 * Unit tests for the First-Person Academic Profile / About Me summary generator:
 * 1. First-person voice ("My name is...")
 * 2. Origin City & Geographic Context
 * 3. NO parental names, employers, or private family details
 * 4. Accurate target degree (Bachelor's vs Master's)
 * 5. Simple, clear, student-authentic English
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAcademicProfileSummary } from "../utils/buildAcademicProfileSummary";

describe("buildAcademicProfileSummary generator", () => {
  it("TEST 1: Builds clean first-person profile for Class 12 student (Angad Deep) without parents' names", () => {
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
      destinationCountry: "Europe",
    });

    // 1. First-person voice & name & origin
    assert.ok(summary.startsWith("My name is Angad Deep, and I am from Ghaziabad, India."));

    // 2. Class 12 education foundation
    assert.ok(summary.includes("completed my Class 12 education with a focus on Computer Science & IT"));

    // 3. Strictly NO parents' names or occupations
    assert.ok(!summary.includes("Daljeet Kaur"), "Must not include mother's name");
    assert.ok(!summary.includes("Genpact"), "Must not include mother's employer");
    assert.ok(!summary.includes("N.a."), "Must not print 'N.a.'");
    assert.ok(!summary.toLowerCase().includes("mother"), "Must not mention mother");
    assert.ok(!summary.toLowerCase().includes("father"), "Must not mention father");

    // 4. Target degree: Bachelor's in Europe (NOT pursuing Master's!)
    assert.ok(summary.includes("Bachelor’s degree in Computer Engineering in Europe"));
    assert.ok(!summary.toLowerCase().includes("pursuing a master"), "Must not say pursuing a Master's degree");
    assert.ok(!summary.toLowerCase().includes("postgraduate"), "Must not refer to postgraduate studies");
  });

  it("TEST 2: Builds profile for university graduate with Master's target without parental details", () => {
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

    assert.ok(summary.startsWith("My name is Aarav Mehta, and I am from Bhopal, India."));
    assert.ok(summary.includes("completed my Bachelor of Business Administration"));
    assert.ok(summary.includes("Master’s degree in MSc International Business"));

    // Strictly NO parents' names
    assert.ok(!summary.includes("Rajesh Mehta"));
    assert.ok(!summary.includes("Sunita Mehta"));
    assert.ok(!summary.includes("Senior Accountant"));
  });

  it("TEST 3: Gracefully handles missing location and options without 'undefined'", () => {
    const summary = buildAcademicProfileSummary({
      studentName: "Kavya Sharma",
      city: "Mumbai",
      country: "India",
      primaryDegree: "Grade 12th",
      targetCourse: "Design",
      degreeLevel: "Bachelor",
    });

    assert.ok(summary.startsWith("My name is Kavya Sharma, and I am from Mumbai, India."));
    assert.ok(!summary.includes("undefined"));
    assert.ok(summary.includes("Bachelor’s degree in Design"));
  });
});
