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

test("Deterministic Parser: preserves unknown sections as customSections (never discards content)", () => {
  const sampleResume = `
Aarav Patel
aarav.patel@domain.org

Profile
Dedicated data science researcher with focus on computer vision.

Education
B.Tech in Artificial Intelligence
2019 - 2023

PUBLICATIONS & CONFERENCES
- "Real-Time Object Detection on Edge TPUs", IEEE CVPR Workshop 2023
- "Contrastive Learning for Low-Resource Languages", NeurIPS 2022

PATENTS
- Smart Optical System for Automated Quality Inspection (US Patent App 17/123,456)
`;

  const result = parseDocumentDeterministically(sampleResume);

  assert.strictEqual(result.personal.fullName, "Aarav Patel");
  assert.strictEqual(result.personal.email, "aarav.patel@domain.org");
  assert.ok(result.candidateData.aboutMe?.includes("Dedicated data science researcher"), "Generic 'Profile' should map to aboutMe");

  // Verify unknown sections preserved
  assert.ok(result.unknownSectionChunks.length >= 2, "Should capture unknown headings");
  assert.ok(result.candidateData.customSections && result.candidateData.customSections.length >= 2, "Should create customSections");

  const pubSection = result.candidateData.customSections?.find((cs) => cs.title.includes("PUBLICATIONS"));
  assert.ok(pubSection, "Publications section must be preserved");
  assert.ok(pubSection.content.includes("Real-Time Object Detection"), "Content of Publications must be preserved verbatim");
  assert.ok(pubSection.content.includes("NeurIPS 2022"), "Bullet points preserved");

  const patentSection = result.candidateData.customSections?.find((cs) => cs.title.includes("PATENTS"));
  assert.ok(patentSection, "Patents section must be preserved");
  assert.ok(patentSection.content.includes("Smart Optical System"), "Content of Patents must be preserved");
});

test("Deterministic Parser: does not fabricate missing contact info or dates", () => {
  const minimalCv = `
Vikram Rao

WORK EXPERIENCE
Research Assistant at AI Lab
Assisted with dataset curation.
`;

  const result = parseDocumentDeterministically(minimalCv);

  assert.strictEqual(result.personal.fullName, "Vikram Rao");
  assert.strictEqual(result.personal.email, undefined);
  assert.strictEqual(result.personal.phone, undefined);
  assert.strictEqual(result.personal.address, undefined);
  assert.strictEqual(result.personal.passportNumber, undefined);
});
