/**
 * services/import/__tests__/sopConflictDetector.test.ts
 *
 * Automated unit tests for SOP CRM conflict detection.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { detectSopCrmConflicts } from "../normalizers/sopConflictDetector";
import type { ExtractedSopFacts } from "@/features/sop-generator/types/import";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";

test("SOP Conflict Detector: detects IELTS score discrepancy without silent overwrite", () => {
  const extractedFacts: ExtractedSopFacts = {
    fullName: "Kaavya Patel",
    ieltsScore: "7.0",
    institution: "Barkatullah University",
    percentage: "72%",
  };

  const mockCrmProfile: NormalizedStudentProfile = {
    meta: {
      studentId: "student_123",
      source: "senior-crm-api",
      fetchedAt: new Date().toISOString(),
    },
    personal: {
      fullName: "Kaavya Patel",
      firstName: "Kaavya",
      lastName: "Patel",
    },
    academics: {
      qualifications: [],
      latest: {
        qualification: "Bachelor of Commerce",
        institution: "Barkatullah University",
        board: "MP Board",
        completionYear: "2023",
        score: "72%",
      },
    },
    workExperience: [],
    tests: {
      english: {
        type: "IELTS",
        overallScore: "7.5", // CRM has 7.5, uploaded SOP claims 7.0
      },
    },
    applications: { all: [] },
  };

  const conflicts = detectSopCrmConflicts(extractedFacts, mockCrmProfile);

  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].field, "ieltsScore");
  assert.strictEqual(conflicts[0].crmValue, "7.5");
  assert.strictEqual(conflicts[0].uploadedValue, "7.0");
  assert.strictEqual(conflicts[0].resolution, "USE_CRM");
});

test("SOP Conflict Detector: detects past institution and passport number discrepancies", () => {
  const extractedFacts: ExtractedSopFacts = {
    fullName: "Kaavya Patel",
    passportNumber: "Z9999999",
    institution: "Delhi University",
  };

  const mockCrmProfile: NormalizedStudentProfile = {
    meta: {
      studentId: "student_123",
      source: "senior-crm-api",
      fetchedAt: new Date().toISOString(),
    },
    personal: {
      fullName: "Kaavya Patel",
      firstName: "Kaavya",
      lastName: "Patel",
      passportNumber: "A1111111",
    },
    academics: {
      qualifications: [],
      latest: {
        qualification: "B.Com",
        institution: "Barkatullah University",
        board: "Board",
        completionYear: "2023",
      },
    },
    workExperience: [],
    tests: {},
    applications: { all: [] },
  };

  const conflicts = detectSopCrmConflicts(extractedFacts, mockCrmProfile);

  assert.strictEqual(conflicts.length, 2);
  const fields = conflicts.map((c) => c.field);
  assert.ok(fields.includes("passportNumber"));
  assert.ok(fields.includes("institution"));
});

test("SOP Conflict Detector: returns empty array when facts match CRM", () => {
  const extractedFacts: ExtractedSopFacts = {
    fullName: "Kaavya Patel",
    ieltsScore: "7.5",
    institution: "Barkatullah University",
    percentage: "72%",
  };

  const mockCrmProfile: NormalizedStudentProfile = {
    meta: {
      studentId: "student_123",
      source: "senior-crm-api",
      fetchedAt: new Date().toISOString(),
    },
    personal: {
      fullName: "Kaavya Patel",
      firstName: "Kaavya",
      lastName: "Patel",
    },
    academics: {
      qualifications: [],
      latest: {
        qualification: "Bachelor of Commerce",
        institution: "Barkatullah University",
        board: "MP Board",
        completionYear: "2023",
        score: "72%",
      },
    },
    workExperience: [],
    tests: {
      english: {
        overallScore: "7.5",
      },
    },
    applications: { all: [] },
  };

  const conflicts = detectSopCrmConflicts(extractedFacts, mockCrmProfile);
  assert.deepStrictEqual(conflicts, []);
});
