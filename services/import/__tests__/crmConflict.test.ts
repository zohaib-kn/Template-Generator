/**
 * services/import/__tests__/crmConflict.test.ts
 *
 * Automated tests for CRM conflict detection against verified student profile.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { detectCrmConflicts } from "../normalizers/crmConflictDetector";
import type { DocumentData } from "@/types";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";

test("CRM Conflict Detector: detects IELTS score discrepancy without silent overwrite", () => {
  const uploadedData: DocumentData = {
    personal: {
      fullName: "Kaavya Patel",
      email: "kaavya.patel@gmail.com",
    },
    englishCertificate: {
      examName: "IELTS",
      score: "7.0",
    },
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
      email: "kaavya.patel@gmail.com",
    },
    academics: { qualifications: [] },
    workExperience: [],
    tests: {
      english: {
        type: "IELTS",
        overallScore: "7.5", // CRM has 7.5, resume has 7.0
      },
    },
    applications: {
      all: [],
    },
  };

  const conflicts = detectCrmConflicts(uploadedData, mockCrmProfile);

  assert.strictEqual(conflicts.length, 1);
  assert.strictEqual(conflicts[0].field, "englishScore");
  assert.strictEqual(conflicts[0].crmValue, "7.5");
  assert.strictEqual(conflicts[0].uploadedValue, "7.0");
  assert.strictEqual(conflicts[0].resolution, "USE_CRM");
});

test("CRM Conflict Detector: detects email and phone discrepancies", () => {
  const uploadedData: DocumentData = {
    personal: {
      fullName: "Kaavya Patel",
      email: "new.kaavya@personal.com",
      phone: "+91 99999 88888",
    },
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
      email: "kaavya.patel@gmail.com",
      phone: "+91 11111 22222",
    },
    academics: { qualifications: [] },
    workExperience: [],
    tests: {},
    applications: { all: [] },
  };

  const conflicts = detectCrmConflicts(uploadedData, mockCrmProfile);

  assert.strictEqual(conflicts.length, 2);
  const fields = conflicts.map((c) => c.field);
  assert.ok(fields.includes("email"));
  assert.ok(fields.includes("phone"));
});

test("CRM Conflict Detector: returns empty list when CRM profile is null", () => {
  const uploadedData: DocumentData = {
    personal: { fullName: "Aadya" },
  };

  const conflicts = detectCrmConflicts(uploadedData, null);
  assert.deepStrictEqual(conflicts, []);
});
