/**
 * services/import/__tests__/deterministicParser.test.ts
 *
 * Automated tests for deterministic resume parsing (regex, contacts, sections).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { parseDocumentDeterministically } from "../normalizers/deterministicParser";

test("Deterministic Parser: extracts email, phone, and name from header", () => {
  const sampleResume = `
Aadya Sharma
Software Engineer
Email: aadya.sharma@example.com
Phone: +91 98765 43210
LinkedIn: https://linkedin.com/in/aadyasharma

Professional Summary
Experienced full-stack developer with 3 years of experience building modern web apps.

Education
B.Tech in Computer Science
University of Delhi
2020 - 2024

Work Experience
Frontend Engineer at Tech Corp
2024 - Present
Developed React components and Next.js applications.

Skills
React, TypeScript, Next.js, Node.js, MongoDB, TailwindCSS
`;

  const result = parseDocumentDeterministically(sampleResume);

  assert.strictEqual(result.personal.fullName, "Aadya Sharma");
  assert.strictEqual(result.personal.email, "aadya.sharma@example.com");
  assert.ok(result.personal.phone?.includes("98765"));

  // Check section chunks detected
  const chunkKeys = result.sectionChunks.map((c) => c.key);
  assert.ok(chunkKeys.includes("aboutMe"), "Should detect aboutMe / summary");
  assert.ok(chunkKeys.includes("education"), "Should detect education");
  assert.ok(chunkKeys.includes("internships"), "Should detect internships / work experience");
  assert.ok(chunkKeys.includes("skills"), "Should detect skills");

  // Check candidate skills parsed
  assert.ok(result.candidateData.skills && result.candidateData.skills.length >= 5);
  const skillNames = result.candidateData.skills?.map((s) => s.name);
  assert.ok(skillNames?.includes("React"));
  assert.ok(skillNames?.includes("TypeScript"));
});

test("Deterministic Parser: handles resume without phone or summary gracefully", () => {
  const sampleResume = `
John Doe
john.doe@domain.org

Education
Master of Science
2022 - 2024
`;

  const result = parseDocumentDeterministically(sampleResume);

  assert.strictEqual(result.personal.fullName, "John Doe");
  assert.strictEqual(result.personal.email, "john.doe@domain.org");
  assert.strictEqual(result.personal.phone, undefined);
  assert.strictEqual(result.candidateData.aboutMe, undefined);
});
