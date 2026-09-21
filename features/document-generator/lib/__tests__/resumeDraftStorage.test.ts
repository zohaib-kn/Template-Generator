/**
 * features/document-generator/lib/__tests__/resumeDraftStorage.test.ts
 *
 * Unit tests for the Resume Builder local draft storage module.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  getAllResumeDrafts,
  getResumeDraftById,
  getLatestResumeDraft,
  saveResumeDraft,
  deleteResumeDraft,
  clearAllResumeDrafts,
} from "../resumeDraftStorage";
import type { DocumentData } from "@/types";

// Simple in-memory localStorage mock for node test environment
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as unknown as { window: { localStorage: MockLocalStorage } }).window = {
  localStorage: mockStorage,
};

const sampleResumeData: DocumentData = {
  personal: {
    fullName: "Aafia Ahmed",
    nationality: "Indian",
  },
  education: [
    {
      id: "edu-1",
      institution: "Padua University",
      qualification: "BSc Computer Science",
    },
  ],
  skills: [
    {
      id: "skill-1",
      name: "Python",
    },
  ],
};

test("Resume Draft Storage — starts empty", () => {
  mockStorage.clear();
  const drafts = getAllResumeDrafts();
  assert.equal(drafts.length, 0);
  assert.equal(getLatestResumeDraft(), null);
});

test("Resume Draft Storage — saves new draft and retrieves it", () => {
  mockStorage.clear();

  const saved = saveResumeDraft({
    studentName: "Aafia Ahmed",
    intendedCourse: "MSc Business Analytics",
    targetUniversity: "University of Manchester",
    destinationCountry: "United Kingdom",
    data: sampleResumeData,
  });

  assert.ok(saved.id);
  assert.ok(saved.savedAt);
  assert.equal(saved.studentName, "Aafia Ahmed");

  const drafts = getAllResumeDrafts();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].id, saved.id);

  const byId = getResumeDraftById(saved.id);
  assert.ok(byId);
  assert.equal(byId?.data.personal?.fullName, "Aafia Ahmed");
  assert.equal(byId?.data.education?.length, 1);
});

test("Resume Draft Storage — updates existing draft when ID matches", () => {
  mockStorage.clear();

  saveResumeDraft({
    id: "resume-draft-1",
    studentName: "Aafia Ahmed",
    data: sampleResumeData,
  });

  const updatedData: DocumentData = {
    ...sampleResumeData,
    personal: { fullName: "Aafia Ahmed Updated" },
  };

  saveResumeDraft({
    id: "resume-draft-1",
    studentName: "Aafia Ahmed Updated",
    data: updatedData,
  });

  const drafts = getAllResumeDrafts();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].studentName, "Aafia Ahmed Updated");
  assert.equal(drafts[0].data.personal?.fullName, "Aafia Ahmed Updated");
});

test("Resume Draft Storage — deletes draft by id", () => {
  mockStorage.clear();

  saveResumeDraft({
    id: "resume-1",
    studentName: "Student One",
    data: sampleResumeData,
  });

  saveResumeDraft({
    id: "resume-2",
    studentName: "Student Two",
    data: sampleResumeData,
  });

  assert.equal(getAllResumeDrafts().length, 2);

  deleteResumeDraft("resume-1");
  const remaining = getAllResumeDrafts();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, "resume-2");
});

test("Resume Draft Storage — saves multiple distinct resumes without overwriting", () => {
  mockStorage.clear();

  const d1 = saveResumeDraft({
    studentName: "Aafia Ahmed",
    data: { personal: { fullName: "Aafia Ahmed" } },
  });

  const d2 = saveResumeDraft({
    studentName: "Rahul Sharma",
    data: { personal: { fullName: "Rahul Sharma" } },
  });

  const drafts = getAllResumeDrafts();
  assert.equal(drafts.length, 2);
  assert.notEqual(d1.id, d2.id);

  const aafia = getResumeDraftById(d1.id);
  const rahul = getResumeDraftById(d2.id);

  assert.equal(aafia?.studentName, "Aafia Ahmed");
  assert.equal(rahul?.studentName, "Rahul Sharma");
});

