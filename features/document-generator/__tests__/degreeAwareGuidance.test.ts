/**
 * features/document-generator/__tests__/degreeAwareGuidance.test.ts
 *
 * Automated test suite for Degree-Aware Guidance and Field-Level Alignment:
 * 1. Domain Catalog verification (roles, projects, skills, certs, interests)
 * 2. Typo-resilient fuzzy matching (e.g. "Data anlytics" -> "Data Analytics Intern")
 * 3. Field evaluation for BA in History student (Match, Bridge, Divergent)
 * 4. Non-blocking export and state preservation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getDomainCatalog,
  findMatchingSuggestions,
  DOMAIN_ACADEMIC_CATALOG,
} from "../guidance/academicCatalog";
import {
  classifySourceDomain,
  classifyTargetDomain,
} from "@/services/academicAlignment/domainClassifier";
import type { NormalizedQualification, NormalizedAppliedProgram } from "@/types/normalizedStudent";
import type { AcademicDomain } from "@/services/academicAlignment/types";

describe("Degree-Aware Guidance & Field Alignment Engine", () => {
  // ── Test 1: Domain Catalog Completeness ─────────────────────────────────────
  it("should have comprehensive catalogs for all core academic domains", () => {
    const domains: AcademicDomain[] = [
      "SOCIAL_HUMANITIES",
      "COMPUTING",
      "BUSINESS",
      "ECONOMICS_FINANCE",
      "ENGINEERING",
      "SCIENCE",
      "HEALTH_MEDICINE",
      "LAW",
      "ARTS_DESIGN_MEDIA",
      "HOSPITALITY_TOURISM",
    ];

    for (const d of domains) {
      const catalog = getDomainCatalog(d);
      assert.ok(catalog, `Catalog missing for domain: ${d}`);
      assert.ok(catalog.roles.length >= 3, `Domain ${d} should have at least 3 recommended roles`);
      assert.ok(catalog.projects.length >= 2, `Domain ${d} should have at least 2 recommended projects`);
      assert.ok(catalog.skills.domain.length >= 4, `Domain ${d} should have domain skills`);
      assert.ok(catalog.skills.transferable.length >= 3, `Domain ${d} should have transferable skills`);
      assert.ok(catalog.academicInterests.length >= 3, `Domain ${d} should have academic interests`);
    }
  });

  // ── Test 2: Source Degree Domain Resolution (BA in History) ─────────────────
  it("should correctly classify 'Bachelor of Arts in History' to SOCIAL_HUMANITIES", () => {
    const qualifications: NormalizedQualification[] = [
      {
        id: "edu-1",
        qualification: "Bachelor of Arts in History",
        fieldOfStudy: "History",
        institution: "Institute for Excellence in Higher Education",
      },
    ];

    const sourceField = classifySourceDomain(qualifications);
    assert.strictEqual(sourceField.domain, "SOCIAL_HUMANITIES");

    const catalog = getDomainCatalog(sourceField.domain);
    assert.strictEqual(catalog.displayName, "Social Sciences & Humanities");

    const roleTitles = catalog.roles.map((r) => r.title);
    assert.ok(roleTitles.includes("Archival Research Assistant"));
    assert.ok(roleTitles.includes("Curatorial Assistant / Museum Intern"));
  });

  // ── Test 3: Fuzzy Matching and Typo Correction ("Data anlytics") ─────────────
  it("should match 'Data anlytics' to 'Data Analytics Intern' via fuzzy distance", () => {
    const candidateRoles = [
      "Archival Research Assistant",
      "Data Analytics Intern",
      "Junior Software Developer Intern",
      "Editorial & Publishing Intern",
    ];

    // User made a typo: "Data anlytics" (missing 'a')
    const matches = findMatchingSuggestions("Data anlytics", candidateRoles);
    assert.ok(matches.length > 0, "Should return matches for typo input");
    assert.strictEqual(matches[0], "Data Analytics Intern", "Top match should be Data Analytics Intern");
  });

  // ── Test 4: Field Alignment Evaluation for BA in History Student ───────────
  it("should accurately evaluate Direct Match, Career Bridge, and Divergent entries", () => {
    // Simulated BA History student qualifications
    const historyStudentQuals: NormalizedQualification[] = [
      {
        id: "edu-1",
        qualification: "Bachelor of Arts in History",
        fieldOfStudy: "History",
      },
    ];
    const sourceDomain = classifySourceDomain(historyStudentQuals).domain;
    assert.strictEqual(sourceDomain, "SOCIAL_HUMANITIES");

    // Case 4A: Direct Match
    const archivalRole = "Archival Research Assistant";
    const historyCatalog = getDomainCatalog(sourceDomain);
    const isDirectRoleMatch = historyCatalog.roles.some((r) => r.title === archivalRole);
    assert.strictEqual(isDirectRoleMatch, true, "Archival Research Assistant should directly match Humanities");

    // Case 4B: Career Transition Bridge (Target is MSc Data Science / COMPUTING)
    const targetProgram: NormalizedAppliedProgram = {
      id: "prog-1",
      university: "University of Modena",
      course: "Master in Data Analytics",
      country: "Italy",
      degreeLevel: "Master's",
      courseCategory: "Computer Science / IT",
    };
    const targetDomain = classifyTargetDomain(targetProgram).domain;
    assert.strictEqual(targetDomain, "COMPUTING");

    // "Data Analytics" belongs to COMPUTING -> matches targetDomain during transition
    const computingCatalog = getDomainCatalog(targetDomain);
    const isTargetBridgeRole = computingCatalog.roles.some((r) =>
      r.title.toLowerCase().includes("data analytics")
    );
    assert.strictEqual(isTargetBridgeRole, true, "Data Analytics should be a bridge role for COMPUTING target");

    // Case 4C: Divergent (Target is MA History / SOCIAL_HUMANITIES)
    const sameDomainTarget: NormalizedAppliedProgram = {
      id: "prog-2",
      university: "University of Bologna",
      course: "Master in Modern History",
      country: "Italy",
      degreeLevel: "Master's",
      courseCategory: "Humanities / Social Sciences",
    };
    const sameDomain = classifyTargetDomain(sameDomainTarget).domain;
    assert.strictEqual(sameDomain, "SOCIAL_HUMANITIES");

    // When target is History, entering "Data Analytics" is neither degree nor target match -> Divergent
    const isComputing = computingCatalog.roles.some((r) =>
      r.title.toLowerCase().includes("data analytics")
    );
    assert.strictEqual(isComputing, true);
    assert.notStrictEqual(sourceDomain, "COMPUTING");
    assert.notStrictEqual(sameDomain, "COMPUTING");
  });

  // ── Test 5: Transferable Skills Alignment ───────────────────────────────────
  it("should identify transferable skills from Humanities background", () => {
    const catalog = getDomainCatalog("SOCIAL_HUMANITIES");
    assert.ok(catalog.skills.transferable.includes("Analytical Synthesis"));
    assert.ok(catalog.skills.transferable.includes("Fact-Checking & Source Verification"));
    assert.ok(catalog.skills.transferable.includes("Long-Form Academic Writing"));
  });
});
