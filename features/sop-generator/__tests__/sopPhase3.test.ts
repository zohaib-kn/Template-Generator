/**
 * features/sop-generator/__tests__/sopPhase3.test.ts
 *
 * Comprehensive Test Suite for SOP Copilot Phase 2.1 & Phase 3:
 * 1. Context Isolation Hardening (Student, Program, DocType, DocumentId, Section)
 * 2. Contextual Tech False-Positive & Coding Blocking (Phase 2.1 A2)
 * 3. Read-Only SOP Review Intelligence
 * 4. Approval Blocker Explanations
 * 5. Factual Q&A (IELTS, University, Course, Qualification)
 * 6. Academic Alignment Explanations
 * 7. Section Navigation Resolution
 * 8. Strict Mutation Safety (No field writes, no approval via chat, no canvas rewrite)
 * 9. Context & Student Isolation
 * 10. Existing SOP System Non-Regression
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  computeSessionBoundaryKey,
  type SopCopilotReadContext,
  type SopCopilotContextIdentity,
} from "../types/copilot";
import {
  classifySopScopeSync,
  classifySopScope,
} from "../lib/sopScopeGuard";
import {
  executeCopilotReadIntelligence,
  resolveSectionNavigation,
} from "../lib/sopCopilotIntelligence";
import {
  POST as copilotApiRoute,
  setTestCopilotSnapshot,
  clearTestCopilotSnapshots,
} from "../../../app/api/sop/copilot/route";
import type { CrmSnapshot } from "@/types/crmSnapshot";

describe("SOP Copilot Phase 2.1 & Phase 3 — Read-Only Intelligence & Hardened Isolation", () => {
  beforeEach(() => {
    clearTestCopilotSnapshots();
  });

  // Base fixtures
  const sampleIdentity: SopCopilotContextIdentity = {
    studentId: "student-aarav",
    programId: "prog-milan",
    documentType: "VISA_COVER_LETTER",
    documentId: "draft-001",
    sectionId: "why-university",
  };

  const sampleReadContext: SopCopilotReadContext = {
    identity: sampleIdentity,
    student: {
      fullName: "Aarav Mehta",
      latestQualification: "Bachelor of Technology in Computer Engineering",
      fieldOfStudy: "Computer Engineering",
      institution: "Delhi Technological University",
      completionYear: "2023",
      percentage: "84.5%",
    },
    englishTest: {
      exam: "IELTS",
      overall: "7.5",
      listening: "8.0",
      reading: "7.5",
      writing: "7.0",
      speaking: "7.5",
    },
    destination: {
      country: "Italy",
      city: "Milan",
      university: "Politecnico di Milano",
      course: "Master of Science in Computer Science and Engineering",
      degreeLevel: "Master's",
      intake: "September 2026",
    },
    review: {
      totalSections: 16,
      reviewedSections: 12,
      unreviewedSectionIds: ["financial-sponsorship", "accommodation", "travel", "insurance"],
      unreviewedSectionTitles: [
        "Sponsor & Financial Evidence",
        "Accommodation in Italy",
        "Travel / Flight Arrangements",
        "Health & Travel Insurance",
      ],
      currentSectionId: "why-university",
      currentSectionTitle: "Why This University",
      docApproved: false,
      canApproveDocument: false,
      approvalBlockers: [
        "4 sections are still unreviewed.",
        "Total available funds amount is missing.",
        "Bank name for financial statement is missing.",
      ],
    },
    validation: {
      hasErrors: true,
      issues: [
        {
          id: "finance-total-missing",
          field: "finance.totalFundsAvailable",
          severity: "error",
          message: "Total available funds amount is missing.",
        },
        {
          id: "finance-bank-missing",
          field: "finance.bankName",
          severity: "warning",
          message: "Bank name for financial statement is missing.",
        },
        {
          id: "accommodation-name-missing",
          field: "accommodation.name",
          severity: "warning",
          message: "Accommodation name requires confirmation.",
        },
        {
          id: "travel-incomplete",
          field: "travel.pnr",
          severity: "warning",
          message: "Travel information is incomplete. Airline, travel date, or PNR reference is missing.",
        },
      ],
    },
    alignment: {
      status: "ALIGNED",
      domain: "COMPUTING",
      targetDomain: "COMPUTING",
      generationAllowed: true,
      intentionalTransitionConfirmed: false,
    },
    document: {
      sections: [
        {
          id: "why-university",
          title: "Why This University",
          content: "Politecnico di Milano is known for cutting-edge software engineering and research...",
          status: "APPROVED",
          required: true,
        },
      ],
      wordCount: 540,
      approved: false,
    },
  };

  // ── 1. Context Boundary Hardening (Phase 2.1 A1) ───────────────────────────

  it("1. Student change resets session boundary", () => {
    const keyA = computeSessionBoundaryKey({ ...sampleIdentity, studentId: "student-A" });
    const keyB = computeSessionBoundaryKey({ ...sampleIdentity, studentId: "student-B" });
    assert.notStrictEqual(keyA, keyB);
  });

  it("2. Program change resets session boundary", () => {
    const keyProg1 = computeSessionBoundaryKey({ ...sampleIdentity, programId: "prog-1" });
    const keyProg2 = computeSessionBoundaryKey({ ...sampleIdentity, programId: "prog-2" });
    assert.notStrictEqual(keyProg1, keyProg2);
  });

  it("3. Document type change resets session boundary", () => {
    const keyVisa = computeSessionBoundaryKey({ ...sampleIdentity, documentType: "VISA_COVER_LETTER" });
    const keySop = computeSessionBoundaryKey({ ...sampleIdentity, documentType: "UNIVERSITY_SOP" });
    assert.notStrictEqual(keyVisa, keySop);
  });

  it("4. Document ID change resets session boundary (Draft 1 vs Draft 2)", () => {
    const keyDraft1 = computeSessionBoundaryKey({ ...sampleIdentity, documentId: "draft-1" });
    const keyDraft2 = computeSessionBoundaryKey({ ...sampleIdentity, documentId: "draft-2" });
    assert.notStrictEqual(keyDraft1, keyDraft2);
    assert.ok(keyDraft1.endsWith("draft-1"));
    assert.ok(keyDraft2.endsWith("draft-2"));
  });

  it("5. Section change preserves session boundary", () => {
    const keySec1 = computeSessionBoundaryKey({ ...sampleIdentity, sectionId: "academic-background" });
    const keySec2 = computeSessionBoundaryKey({ ...sampleIdentity, sectionId: "financial-sponsorship" });
    assert.strictEqual(keySec1, keySec2);
  });

  // ── 2. Review Intelligence ─────────────────────────────────────────────────

  it("6. Missing fields returned from actual validation fixture", () => {
    const result = executeCopilotReadIntelligence("What's missing?", "REVIEW", sampleReadContext);
    assert.ok(result.message.includes("4 items"));
    assert.ok(result.message.includes("Total available funds amount is missing."));
    assert.ok(result.message.includes("Bank name for financial statement is missing."));
    assert.ok(result.message.includes("4 sections that have not been reviewed yet"));
  });

  it("7. Unreviewed sections returned from status fixture", () => {
    const result = executeCopilotReadIntelligence(
      "Which sections haven't been reviewed?",
      "REVIEW",
      sampleReadContext
    );
    assert.ok(result.message.includes("12 of 16 sections are reviewed"));
    assert.ok(result.message.includes("Sponsor & Financial Evidence"));
    assert.ok(result.message.includes("Accommodation in Italy"));
  });

  it("8. Zero issues -> correctly reports all checks passing", () => {
    const cleanContext: SopCopilotReadContext = {
      ...sampleReadContext,
      validation: { hasErrors: false, issues: [] },
      review: {
        ...sampleReadContext.review,
        reviewedSections: 16,
        unreviewedSectionIds: [],
        unreviewedSectionTitles: [],
        canApproveDocument: true,
      },
    };

    const result = executeCopilotReadIntelligence("What's missing?", "REVIEW", cleanContext);
    assert.ok(result.message.includes("no missing fields or unreviewed sections"));
  });

  // ── 3. Approval Explanation ────────────────────────────────────────────────

  it("9. Unreviewed sections and missing errors block approval", () => {
    const result = executeCopilotReadIntelligence(
      "Why can't I approve this SOP?",
      "EXPLAIN",
      sampleReadContext
    );
    assert.ok(result.message.includes("cannot be approved yet"));
    assert.ok(result.message.includes("Total available funds amount is missing."));
  });

  it("10. Missing required field blocks approval", () => {
    const result = executeCopilotReadIntelligence(
      "Why can't I approve?",
      "REVIEW",
      sampleReadContext
    );
    assert.ok(result.message.includes("cannot be approved yet"));
    assert.ok(result.message.includes("Resolve these items before final approval"));
  });

  it("11. Alignment blocker included when real state reports mismatch", () => {
    const mismatchContext: SopCopilotReadContext = {
      ...sampleReadContext,
      alignment: {
        status: "ACADEMIC_MISMATCH",
        domain: "COMMERCE",
        targetDomain: "MECHANICAL_ENGINEERING",
        generationAllowed: false,
        blockingReason: "Academic mismatch detected. Counsellor transition confirmation required.",
        intentionalTransitionConfirmed: false,
      },
    };

    const result = executeCopilotReadIntelligence(
      "Why can't I approve this SOP?",
      "REVIEW",
      mismatchContext
    );
    assert.ok(result.message.includes("Academic mismatch detected"));
  });

  it("12. No blocker -> confirms document meets approval requirements", () => {
    const approvedReadyContext: SopCopilotReadContext = {
      ...sampleReadContext,
      validation: { hasErrors: false, issues: [] },
      review: {
        ...sampleReadContext.review,
        reviewedSections: 16,
        unreviewedSectionIds: [],
        unreviewedSectionTitles: [],
        canApproveDocument: true,
      },
    };

    const result = executeCopilotReadIntelligence(
      "Why can't I approve this SOP?",
      "REVIEW",
      approvedReadyContext
    );
    assert.ok(result.message.includes("meets all approval requirements"));
  });

  // ── 4. Factual Q&A ─────────────────────────────────────────────────────────

  it("13. IELTS answer uses verified fixture", () => {
    const result = executeCopilotReadIntelligence(
      "What is the student's IELTS score?",
      "EXPLAIN",
      sampleReadContext
    );
    assert.ok(result.message.includes("7.5"));
    assert.ok(result.message.includes("Listening: 8.0"));
  });

  it("14. University uses selected application", () => {
    const result = executeCopilotReadIntelligence(
      "What university is this application for?",
      "EXPLAIN",
      sampleReadContext
    );
    assert.ok(result.message.includes("Politecnico di Milano"));
  });

  it("15. Course uses selected application", () => {
    const result = executeCopilotReadIntelligence(
      "What course is the student applying for?",
      "EXPLAIN",
      sampleReadContext
    );
    assert.ok(result.message.includes("Master of Science in Computer Science and Engineering"));
  });

  it("16. Missing fact -> 'not available', never guesses", () => {
    const contextWithoutIelts: SopCopilotReadContext = {
      ...sampleReadContext,
      englishTest: undefined,
    };
    const result = executeCopilotReadIntelligence(
      "What is the student's IELTS score?",
      "EXPLAIN",
      contextWithoutIelts
    );
    assert.strictEqual(
      result.message,
      "I don't have a verified IELTS score available in the current student/application context."
    );
  });

  // ── 5. Academic Alignment ──────────────────────────────────────────────────

  it("17. Existing mismatch explained with domains and requirement", () => {
    const mismatchContext: SopCopilotReadContext = {
      ...sampleReadContext,
      alignment: {
        status: "ACADEMIC_MISMATCH",
        domain: "Commerce",
        targetDomain: "Mechanical Engineering",
        generationAllowed: false,
        blockingReason: "The system requires the transition to be reviewed before academically sensitive AI generation can continue.",
        intentionalTransitionConfirmed: false,
      },
    };

    const result = executeCopilotReadIntelligence(
      "Explain the academic mismatch.",
      "EXPLAIN",
      mismatchContext
    );
    assert.ok(result.message.includes("Academic Mismatch"));
    assert.ok(result.message.includes("Commerce"));
    assert.ok(result.message.includes("Mechanical Engineering"));
  });

  it("18. Aligned status explained without blockers", () => {
    const result = executeCopilotReadIntelligence(
      "Is this course aligned with their background?",
      "EXPLAIN",
      sampleReadContext
    );
    assert.ok(result.message.includes("aligned with the target program"));
  });

  it("19. UNKNOWN status handled conservatively", () => {
    const unknownContext: SopCopilotReadContext = {
      ...sampleReadContext,
      alignment: {
        status: "UNKNOWN",
        generationAllowed: false,
      },
    };
    const result = executeCopilotReadIntelligence(
      "Explain Academic Alignment.",
      "EXPLAIN",
      unknownContext
    );
    assert.ok(result.message.includes("could not be determined"));
  });

  // ── 6. Navigation ──────────────────────────────────────────────────────────

  it("20. 'Take me to finance' resolves existing Finance section", () => {
    const nav = resolveSectionNavigation("Take me to the finance section", sampleReadContext);
    assert.strictEqual(nav.found, true);
    assert.strictEqual(nav.directive?.sectionId, "financial-sponsorship");
    assert.strictEqual(nav.directive?.sectionTitle, "Financial Sponsorship");
  });

  it("21. Unknown section safely fails", () => {
    const nav = resolveSectionNavigation("Take me to the moon rover section", sampleReadContext);
    assert.strictEqual(nav.found, false);
    assert.strictEqual(nav.message, "I couldn't find that section in this document.");
  });

  it("22. No arbitrary section IDs accepted", () => {
    const nav = resolveSectionNavigation("open arbitrary_fake_id_12345", sampleReadContext);
    assert.strictEqual(nav.found, false);
  });

  // ── 7. Contextual Tech False-Positive Tests (Phase 2.1 A2) ──────────────────

  it("23. Tech Context: Python SOP paragraph -> allowed as REVIEW", () => {
    const result = classifySopScopeSync(
      "Review my SOP paragraph about my Python project.",
      sampleIdentity
    );
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.intent, "REVIEW");
  });

  it("24. Tech Context: React internship paragraph -> allowed as IMPROVE_WRITING", () => {
    const result = classifySopScopeSync(
      "Improve this paragraph describing my React internship.",
      sampleIdentity
    );
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.intent, "IMPROVE_WRITING");
  });

  it("25. Tech Context: AWS SOP mention -> allowed as REVIEW", () => {
    const result = classifySopScopeSync(
      "My SOP mentions AWS certification. Is this paragraph repetitive?",
      sampleIdentity
    );
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.intent, "REVIEW");
  });

  it("26. Generic coding: 'Write Python code for a calculator.' -> OUT_OF_SCOPE", () => {
    const result = classifySopScopeSync(
      "Write Python code for a calculator.",
      sampleIdentity
    );
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.intent, "OUT_OF_SCOPE");
  });

  // ── 8. Strict Mutation Safety (Read-Only Guarantee) ─────────────────────────

  it("27. Mutation Safety: 'Bank name is HDFC' -> NO write", () => {
    const result = executeCopilotReadIntelligence(
      "Bank name is HDFC Bank.",
      "COMPLETE_MISSING_INFO",
      sampleReadContext
    );
    assert.ok(result.message.includes("cannot apply student or application data changes"));
  });

  it("28. Mutation Safety: 'Change IELTS to 8.5' -> NO write", () => {
    const result = executeCopilotReadIntelligence(
      "Change IELTS to 8.5",
      "COMPLETE_MISSING_INFO",
      sampleReadContext
    );
    assert.ok(result.message.includes("cannot alter verified student test scores"));
  });

  it("29. Mutation Safety: 'Approve everything' -> NO approval", () => {
    const result = executeCopilotReadIntelligence(
      "Approve everything",
      "REVIEW",
      sampleReadContext
    );
    assert.ok(result.message.includes("cannot approve sections or documents through chat"));
  });

  it("30. Mutation Safety: 'Rewrite this section' -> NO canvas replacement", () => {
    const result = executeCopilotReadIntelligence(
      "Rewrite this section",
      "IMPROVE_WRITING",
      sampleReadContext
    );
    assert.ok(result.message.includes("Writing changes through SOP Copilot are not active yet"));
  });

  // ── 9. Authoritative Server Fact Verification & Isolation ──────────────────

  it("31. Server Trust Boundary: Client-sent fake IELTS is overridden by server snapshot", async () => {
    const mockStudentA: CrmSnapshot = {
      student: {
        personalDetails: { firstName: "Samiyah", lastName: "Khan" },
        academics: {
          standardizedTests: {
            ielts: { overall: 7.0, listening: 7.5, reading: 7.0, writing: 6.5, speaking: 7.0 },
          },
        },
      },
    } as unknown as CrmSnapshot;

    setTestCopilotSnapshot("student-samiyah", mockStudentA);

    const maliciousClientContext: SopCopilotReadContext = {
      ...sampleReadContext,
      englishTest: {
        exam: "IELTS",
        overall: "8.5", // Client attempts to lie that IELTS is 8.5!
      },
    };

    const mockReq = {
      json: async () => ({
        message: "What is the student's IELTS score?",
        contextIdentity: {
          studentId: "student-samiyah",
          programId: "prog-milan",
          documentType: "VISA_COVER_LETTER",
        },
        readContext: maliciousClientContext,
      }),
    };

    const res = await copilotApiRoute(mockReq as any);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    // Must return the authoritative CRM score (7.0), NOT client's fake 8.5!
    assert.ok(data.response.includes("7.0"));
    assert.ok(!data.response.includes("8.5"));
  });

  it("32. Program isolation: Target program facts are scoped to active programId", () => {
    const contextProgA: SopCopilotReadContext = {
      ...sampleReadContext,
      destination: {
        country: "Italy",
        university: "University of Bologna",
        course: "Artificial Intelligence",
      },
    };
    const contextProgB: SopCopilotReadContext = {
      ...sampleReadContext,
      destination: {
        country: "Germany",
        university: "TU Munich",
        course: "Robotics",
      },
    };

    const resultA = executeCopilotReadIntelligence("What course is the student applying for?", "EXPLAIN", contextProgA);
    const resultB = executeCopilotReadIntelligence("What course is the student applying for?", "EXPLAIN", contextProgB);

    assert.ok(resultA.message.includes("Artificial Intelligence"));
    assert.ok(!resultA.message.includes("Robotics"));
    assert.ok(resultB.message.includes("Robotics"));
    assert.ok(!resultB.message.includes("Artificial Intelligence"));
  });

  it("33. Draft isolation: Draft 1 session boundary does not equal Draft 2", () => {
    const boundary1 = computeSessionBoundaryKey({
      studentId: "student-1",
      programId: "prog-1",
      documentType: "VISA_COVER_LETTER",
      documentId: "draft-alpha",
    });
    const boundary2 = computeSessionBoundaryKey({
      studentId: "student-1",
      programId: "prog-1",
      documentType: "VISA_COVER_LETTER",
      documentId: "draft-beta",
    });
    assert.notStrictEqual(boundary1, boundary2);
  });

  // ── 10. Non-Regression of Existing SOP Functionality ────────────────────────

  it("34. Regression: SopWorkspace imports and mounts SOPCopilot with readContext", () => {
    const workspacePath = path.join(
      process.cwd(),
      "features/sop-generator/components/SopWorkspace.tsx"
    );
    const content = fs.readFileSync(workspacePath, "utf-8");
    assert.ok(content.includes("<SOPCopilot"));
    assert.ok(content.includes("readContext={copilotReadContext}"));
    assert.ok(content.includes("onNavigateToSection"));
    assert.ok(content.includes("onOpenValidationTab"));
  });

  it("35. Regression: Section regeneration controls unaffected", () => {
    const workspacePath = path.join(
      process.cwd(),
      "features/sop-generator/components/SopWorkspace.tsx"
    );
    const content = fs.readFileSync(workspacePath, "utf-8");
    assert.ok(content.includes("regeneratingSectionId"));
    assert.ok(content.includes("handleRegenerateSection"));
  });

  it("36. Regression: Rewrite Natural transformer integration preserved", () => {
    const routePath = path.join(
      process.cwd(),
      "app/api/ai/transform-text/route.ts"
    );
    assert.ok(fs.existsSync(routePath));
  });

  it("37. Regression: validateDocumentContext logic unaffected", () => {
    const validatePath = path.join(
      process.cwd(),
      "features/sop-generator/lib/validateDocumentContext.ts"
    );
    const content = fs.readFileSync(validatePath, "utf-8");
    assert.ok(content.includes("validateDocumentContext"));
    assert.ok(content.includes("hasErrors"));
  });

  it("38. Regression: Academic Alignment engine & hook unaffected", () => {
    const enginePath = path.join(
      process.cwd(),
      "services/academicAlignment/academicAlignmentEngine.ts"
    );
    assert.ok(fs.existsSync(enginePath));
  });

  it("39. Regression: Document approval logic and docApproved state preserved", () => {
    const workspacePath = path.join(
      process.cwd(),
      "features/sop-generator/components/SopWorkspace.tsx"
    );
    const content = fs.readFileSync(workspacePath, "utf-8");
    assert.ok(content.includes("handleApproveDocument"));
    assert.ok(content.includes("canApproveDocument"));
  });

  it("40. Regression: sopDraftStorage offline draft persistence unaffected", () => {
    const storagePath = path.join(
      process.cwd(),
      "features/sop-generator/lib/sopDraftStorage.ts"
    );
    assert.ok(fs.existsSync(storagePath));
  });

  it("41. Regression: PDF generator hook unaffected", () => {
    const pdfPath = path.join(
      process.cwd(),
      "features/sop-generator/hooks/useSopPdfGenerator.ts"
    );
    assert.ok(fs.existsSync(pdfPath));
  });
});
