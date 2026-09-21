/**
 * features/sop-generator/lib/__tests__/sopDraftStorage.test.ts
 *
 * Unit tests for the local draft storage module.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  getAllDrafts,
  getDraftById,
  getLatestDraft,
  saveDraft,
  deleteDraft,
  clearAllDrafts,
} from "../sopDraftStorage";
import type { StudentDocumentContext, DataSource } from "../../types/sop-generator";

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
// Set up global window with localStorage
(globalThis as unknown as { window: { localStorage: MockLocalStorage } }).window = {
  localStorage: mockStorage,
};

import { getStudentDocumentContext } from "../../lib/applicationService";

const mockCtx: StudentDocumentContext = getStudentDocumentContext();

test("SOP Draft Storage — starts empty", () => {
  mockStorage.clear();
  const drafts = getAllDrafts();
  assert.equal(drafts.length, 0);
  assert.equal(getLatestDraft(), null);
});

test("SOP Draft Storage — saves new draft and retrieves it", () => {
  mockStorage.clear();

  const saved = saveDraft({
    studentName: "Aafia Ahmed",
    course: "MS in Data Science",
    university: "University of Padua",
    templateId: "visa-cover-letter-v1",
    sectionContents: { "academic-background": "Edited narrative..." },
    sectionStatuses: { "academic-background": "APPROVED" },
    docApproved: false,
    ctx: mockCtx,
    currentSource: "test-data" as DataSource,
  });

  assert.ok(saved.id);
  assert.ok(saved.savedAt);
  assert.equal(saved.studentName, "Aafia Ahmed");

  const drafts = getAllDrafts();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].id, saved.id);

  const byId = getDraftById(saved.id);
  assert.ok(byId);
  assert.equal(byId?.sectionContents["academic-background"], "Edited narrative...");
  assert.equal(byId?.sectionStatuses["academic-background"], "APPROVED");
});

test("SOP Draft Storage — updates existing draft when ID matches", () => {
  mockStorage.clear();

  const saved1 = saveDraft({
    id: "draft-test-1",
    studentName: "Aafia Ahmed",
    course: "MS in Data Science",
    university: "University of Padua",
    templateId: "visa-cover-letter-v1",
    sectionContents: { sec1: "Initial text" },
    sectionStatuses: { sec1: "NOT_REVIEWED" },
    docApproved: false,
    ctx: mockCtx,
    currentSource: "test-data" as DataSource,
  });

  // Update same draft
  const saved2 = saveDraft({
    id: "draft-test-1",
    studentName: "Aafia Ahmed",
    course: "MS in Data Science",
    university: "University of Padua",
    templateId: "visa-cover-letter-v1",
    sectionContents: { sec1: "Updated text after review" },
    sectionStatuses: { sec1: "APPROVED" },
    docApproved: true,
    ctx: mockCtx,
    currentSource: "test-data" as DataSource,
  });

  const drafts = getAllDrafts();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].sectionContents["sec1"], "Updated text after review");
  assert.equal(drafts[0].docApproved, true);
});

test("SOP Draft Storage — deletes draft by id", () => {
  mockStorage.clear();

  const d1 = saveDraft({
    id: "draft-1",
    studentName: "Student One",
    course: "Course 1",
    university: "Uni 1",
    templateId: "t1",
    sectionContents: {},
    sectionStatuses: {},
    docApproved: false,
    ctx: mockCtx,
    currentSource: "test-data" as DataSource,
  });

  const d2 = saveDraft({
    id: "draft-2",
    studentName: "Student Two",
    course: "Course 2",
    university: "Uni 2",
    templateId: "t1",
    sectionContents: {},
    sectionStatuses: {},
    docApproved: false,
    ctx: mockCtx,
    currentSource: "test-data" as DataSource,
  });

  assert.equal(getAllDrafts().length, 2);

  deleteDraft("draft-1");
  const remaining = getAllDrafts();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, "draft-2");
});
