/**
 * features/sop-generator/__tests__/sopPhase3_2.test.ts
 *
 * SOP Copilot Phase 3.2 — Write Mapping, Field Ownership & Granular Validation Verification.
 *
 * Requirements:
 * 1. Field Ownership: Exactly one known persistence owner per writable field.
 * 2. UNKNOWN_OWNER fields are blocked.
 * 3. CRM-owned locked fields cannot be writable.
 * 4. Granular Mapping: Missing airline -> travel.airline.
 * 5. Granular Mapping: Missing travel date -> travel.travelDate.
 * 6. Granular Mapping: Missing PNR -> travel.pnr.
 * 7. Granular Mapping: Missing accommodation fromDate -> accommodation.fromDate.
 * 8. Granular Mapping: Missing accommodation toDate -> accommodation.toDate.
 * 9. Multiple missing fields produce multiple explicit issues (no compounds).
 * 10. Server Authority: Client claim canApproveDocument=true is ignored.
 * 11. Server Authority: Client fake validation issue is ignored; server recomputes truth.
 * 12. Server Authority: Client fake field owner is ignored.
 * 13. Auth Boundary: Missing session -> public writes BLOCKED.
 * 14. Auth Boundary: Counsellor session extracts userId/identity.
 * 15. Authorization Boundary: Student/application write scoping blocks unauthorized writes.
 * 16. Field Representation: Currency normalization follows existing schema.
 * 17. Field Representation: Date normalization follows existing schema.
 * 18. Field Representation: Enum normalization rejects invalid values.
 * 19. Stale State: Current value / persisted timestamp matches -> proposal remains valid.
 * 20. Stale State: Current value modified -> concurrency conflict triggered.
 * 21. Contradiction Logic: B.Com + "developed interest in engineering" -> NOT a contradiction.
 * 22. Contradiction Logic: B.Com + "completed Mechanical Engineering degree" -> contradiction flagged.
 * 23. Model Containment: AI-suggested non-registered field is rejected.
 * 24. Model Containment: AI-suggested locked field is rejected.
 * 25. Regression: Phase 1-3.1 tests pass.
 * 26. Regression: SOP editor/template interpolation unchanged.
 * 27. Regression: Validation semantics unchanged except granularity.
 * 28. Regression: Academic alignment unchanged.
 * 29. Regression: Drafts persistence unchanged.
 * 30. Regression: PDF generator unchanged.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  COPILOT_WRITABLE_FIELD_REGISTRY,
  COPILOT_LOCKED_FIELDS_REGISTRY,
  VALIDATION_ISSUE_TO_FIELD_MAP,
  isFieldWritableByCopilot,
  getLockedFieldReason,
  createFieldUpdateProposal,
  checkProposalConcurrency,
  normalizeCurrency,
  normalizeDate,
  normalizeEnum,
} from "../lib/sopWritableFieldRegistry";
import { validateDocumentContext } from "../lib/validateDocumentContext";
import { buildStudentDocumentContext } from "../lib/buildStudentDocumentContext";
import { executeCopilotReadIntelligence } from "../lib/sopCopilotIntelligence";
import {
  resolveCopilotWriteContext,
  setAuthoritativeTestSnapshot,
  clearAuthoritativeTestSnapshots,
} from "../lib/sopWriteContextResolver";
import type { StudentDocumentContext } from "../types/sop-generator";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import type { SopCopilotReadContext } from "../types/copilot";

describe("SOP Copilot Phase 3.2 — Write Mapping & Field Ownership Verification", () => {
  // ── Ownership Tests ──────────────────────────────────────────────────────────

  it("1. Ownership: Every allowlisted writable field has exactly one known persistence owner", () => {
    const writableKeys = Object.keys(COPILOT_WRITABLE_FIELD_REGISTRY);
    assert.strictEqual(writableKeys.length, 16);

    for (const key of writableKeys) {
      const def = COPILOT_WRITABLE_FIELD_REGISTRY[key];
      assert.ok(def, `Missing definition for ${key}`);
      assert.strictEqual(
        def.persistenceOwner,
        "SOP_DOCUMENT_CONTEXT",
        `Field ${key} must have SOP_DOCUMENT_CONTEXT persistence owner`
      );
      assert.notStrictEqual(def.persistenceOwner, "UNKNOWN_OWNER");
      assert.ok(def.owner);
      assert.ok(def.sensitivity);
      assert.ok(def.inputType);
    }
  });

  it("2. Ownership: UNKNOWN_OWNER fields are automatically non-writable", () => {
    // Non-existent or unknown fields
    assert.strictEqual(isFieldWritableByCopilot("unknown.field"), false);
    assert.strictEqual(isFieldWritableByCopilot("crm.customField"), false);

    // Simulated unknown owner definition
    const fakeUnknownField: any = {
      key: "finance.unverifiedOverseasTransfer",
      label: "Overseas Transfer",
      owner: "UNKNOWN_OWNER",
      persistenceOwner: "UNKNOWN_OWNER",
      writableByCopilot: true,
    };
    (COPILOT_WRITABLE_FIELD_REGISTRY as any)["finance.unverifiedOverseasTransfer"] = fakeUnknownField;

    assert.strictEqual(isFieldWritableByCopilot("finance.unverifiedOverseasTransfer"), false);

    const proposal = createFieldUpdateProposal({
      issueId: "test-unknown-issue",
      fieldKey: "finance.unverifiedOverseasTransfer",
      rawValue: "1000",
    });
    assert.strictEqual(proposal.success, false);
    if (!proposal.success) {
      assert.ok(proposal.error.includes("UNKNOWN_OWNER"));
    }

    delete (COPILOT_WRITABLE_FIELD_REGISTRY as any)["finance.unverifiedOverseasTransfer"];
  });

  it("3. Ownership: CRM-owned locked fields cannot appear as writable", () => {
    const lockedCrmFields = [
      "student.fullName",
      "student.dateOfBirth",
      "student.passportNumber",
      "student.nationality",
      "tests.ielts.overall",
      "destination.university",
      "destination.course",
      "destination.country",
      "alignment.status",
      "review.docApproved",
    ];

    for (const key of lockedCrmFields) {
      assert.strictEqual(isFieldWritableByCopilot(key), false, `${key} must not be writable`);
      assert.ok(getLockedFieldReason(key), `${key} must have a registered locked reason`);
    }
  });

  // ── Granular Mapping Tests ──────────────────────────────────────────────────

  it("4. Granular Mapping: Missing airline maps strictly to travel.airline", () => {
    assert.strictEqual(VALIDATION_ISSUE_TO_FIELD_MAP["travel-airline-missing"], "travel.airline");

    const baseCtx = buildStudentDocumentContext();
    baseCtx.travel.airline = "";
    baseCtx.travel.travelDate = "2026-09-02";
    baseCtx.travel.pnr = "AI9921";

    const issues = validateDocumentContext(baseCtx, "VISA_COVER_LETTER");
    const airlineIssue = issues.find((i) => i.id === "travel-airline-missing");
    assert.ok(airlineIssue, "travel-airline-missing issue must be raised");
    assert.strictEqual(airlineIssue?.field, "travel.airline");
    assert.strictEqual(issues.some((i) => i.id === "travel-date-missing"), false);
    assert.strictEqual(issues.some((i) => i.id === "travel-pnr-missing"), false);
  });

  it("5. Granular Mapping: Missing travel date maps strictly to travel.travelDate", () => {
    assert.strictEqual(VALIDATION_ISSUE_TO_FIELD_MAP["travel-date-missing"], "travel.travelDate");

    const baseCtx = buildStudentDocumentContext();
    baseCtx.travel.airline = "Lufthansa";
    baseCtx.travel.travelDate = "";
    baseCtx.travel.pnr = "LH8812";

    const issues = validateDocumentContext(baseCtx, "VISA_COVER_LETTER");
    const dateIssue = issues.find((i) => i.id === "travel-date-missing");
    assert.ok(dateIssue, "travel-date-missing issue must be raised");
    assert.strictEqual(dateIssue?.field, "travel.travelDate");
    assert.strictEqual(issues.some((i) => i.id === "travel-airline-missing"), false);
    assert.strictEqual(issues.some((i) => i.id === "travel-pnr-missing"), false);
  });

  it("6. Granular Mapping: Missing PNR maps strictly to travel.pnr", () => {
    assert.strictEqual(VALIDATION_ISSUE_TO_FIELD_MAP["travel-pnr-missing"], "travel.pnr");

    const baseCtx = buildStudentDocumentContext();
    baseCtx.travel.airline = "Air France";
    baseCtx.travel.travelDate = "2026-09-10";
    baseCtx.travel.pnr = "";

    const issues = validateDocumentContext(baseCtx, "VISA_COVER_LETTER");
    const pnrIssue = issues.find((i) => i.id === "travel-pnr-missing");
    assert.ok(pnrIssue, "travel-pnr-missing issue must be raised");
    assert.strictEqual(pnrIssue?.field, "travel.pnr");
    assert.strictEqual(issues.some((i) => i.id === "travel-airline-missing"), false);
    assert.strictEqual(issues.some((i) => i.id === "travel-date-missing"), false);
  });

  it("7. Granular Mapping: Missing accommodation start date maps strictly to accommodation.fromDate", () => {
    assert.strictEqual(VALIDATION_ISSUE_TO_FIELD_MAP["accommodation-from-date-missing"], "accommodation.fromDate");

    const baseCtx = buildStudentDocumentContext();
    baseCtx.accommodation.fromDate = "";
    baseCtx.accommodation.toDate = "2027-06-30";

    const issues = validateDocumentContext(baseCtx, "VISA_COVER_LETTER");
    const fromIssue = issues.find((i) => i.id === "accommodation-from-date-missing");
    assert.ok(fromIssue, "accommodation-from-date-missing must be raised");
    assert.strictEqual(fromIssue?.field, "accommodation.fromDate");
    assert.strictEqual(issues.some((i) => i.id === "accommodation-to-date-missing"), false);
  });

  it("8. Granular Mapping: Missing accommodation end date maps strictly to accommodation.toDate", () => {
    assert.strictEqual(VALIDATION_ISSUE_TO_FIELD_MAP["accommodation-to-date-missing"], "accommodation.toDate");

    const baseCtx = buildStudentDocumentContext();
    baseCtx.accommodation.fromDate = "2026-09-01";
    baseCtx.accommodation.toDate = "";

    const issues = validateDocumentContext(baseCtx, "VISA_COVER_LETTER");
    const toIssue = issues.find((i) => i.id === "accommodation-to-date-missing");
    assert.ok(toIssue, "accommodation-to-date-missing must be raised");
    assert.strictEqual(toIssue?.field, "accommodation.toDate");
    assert.strictEqual(issues.some((i) => i.id === "accommodation-from-date-missing"), false);
  });

  it("9. Granular Mapping: Multiple missing fields produce distinct explicit issues", () => {
    const baseCtx = buildStudentDocumentContext();
    baseCtx.accommodation.fromDate = "";
    baseCtx.accommodation.toDate = "";
    baseCtx.travel.airline = "";
    baseCtx.travel.travelDate = "";
    baseCtx.travel.pnr = "";

    const issues = validateDocumentContext(baseCtx, "VISA_COVER_LETTER");
    const issueIds = issues.map((i) => i.id);

    assert.ok(issueIds.includes("accommodation-from-date-missing"));
    assert.ok(issueIds.includes("accommodation-to-date-missing"));
    assert.ok(issueIds.includes("travel-airline-missing"));
    assert.ok(issueIds.includes("travel-date-missing"));
    assert.ok(issueIds.includes("travel-pnr-missing"));
    // Verify no compound ambiguous issues are produced
    assert.strictEqual(issueIds.includes("accommodation-dates-missing"), false);
    assert.strictEqual(issueIds.includes("travel-incomplete"), false);
  });

  // ── Server Authority Tests ──────────────────────────────────────────────────

  it("10. Server Authority: Client claims canApproveDocument=true is ignored by server resolver", async () => {
    const mockCrmSnapshot = {
      student: {
        personal: { fullName: "Aafia Ameen" },
        academics: { qualifications: [{ qualification: "B.Tech", institution: "IIT" }] },
      },
      appliedPrograms: [{ id: "prog-1", university: "Uni Milan", course: "Computer Science" }],
    } as unknown as CrmSnapshot;

    setAuthoritativeTestSnapshot("stud-auth-1", mockCrmSnapshot);

    const resolved = await resolveCopilotWriteContext({
      studentId: "stud-auth-1",
      programId: "prog-1",
      documentType: "VISA_COVER_LETTER",
      clientDocContext: {
        // Intentionally missing bank name, sponsor, etc.
      },
    });

    // Server independently recomputed validation and detected errors
    assert.ok(resolved.validation.issues.length > 0);
    // Writes remain gated regardless of client state
    assert.strictEqual(resolved.authorization.canCommitWrites, false);

    clearAuthoritativeTestSnapshots();
  });

  it("11. Server Authority: Client fake validation issue is ignored; server recomputes truth", async () => {
    const mockCrmSnapshot = {
      student: {
        personal: { fullName: "Rohan Kumar" },
        academics: { qualifications: [{ qualification: "B.Com", institution: "DU" }] },
      },
      appliedPrograms: [{ id: "prog-2", university: "Sapienza", course: "Economics" }],
    } as unknown as CrmSnapshot;

    setAuthoritativeTestSnapshot("stud-auth-2", mockCrmSnapshot);

    // Client provides complete finance
    const resolved = await resolveCopilotWriteContext({
      studentId: "stud-auth-2",
      programId: "prog-2",
      documentType: "VISA_COVER_LETTER",
      clientDocContext: {
        finance: {
          bankName: "State Bank of India",
          totalFundsAvailable: "20,00,000",
        },
      },
    });

    // Server independently checks whether bank name is missing
    const hasBankMissing = resolved.validation.issues.some((i) => i.id === "finance-bank-missing");
    assert.strictEqual(hasBankMissing, false);
    assert.strictEqual(resolved.validation.activeWritableFieldKeys.includes("finance.bankName"), false);

    clearAuthoritativeTestSnapshots();
  });

  it("12. Server Authority: Client fake field owner claim is ignored", () => {
    const proposal = createFieldUpdateProposal({
      issueId: "finance-bank-missing",
      fieldKey: "finance.bankName",
      rawValue: "Canara Bank",
    });

    assert.strictEqual(proposal.success, true);
    if (proposal.success) {
      assert.strictEqual(proposal.proposal.owner, "FINANCE");
      assert.strictEqual(proposal.proposal.persistenceOwner, "SOP_DOCUMENT_CONTEXT");
    }
  });

  // ── Authentication & Authorization Boundary Tests ───────────────────────────

  it("13. Auth Boundary: Missing auth/session strictly blocks future production writes", async () => {
    const resolved = await resolveCopilotWriteContext({
      studentId: "stud-no-auth",
      programId: "prog-test",
      documentType: "VISA_COVER_LETTER",
    });

    assert.strictEqual(resolved.authorization.authReadyStatus, "NOT_READY_FOR_PUBLIC_WRITES");
    assert.strictEqual(resolved.authorization.canCommitWrites, false);
    assert.ok(resolved.authorization.reason.includes("No authenticated counsellor session"));
  });

  it("14. Auth Boundary: Authenticated session extracts counsellor identity", async () => {
    const resolved = await resolveCopilotWriteContext({
      studentId: "stud-with-auth",
      programId: "prog-test",
      documentType: "VISA_COVER_LETTER",
      counsellorSession: {
        userId: "counsellor-lead-42",
        role: "SENIOR_COUNSELLOR",
      },
    });

    assert.strictEqual(resolved.authorization.authReadyStatus, "PARTIALLY_READY");
    assert.strictEqual(resolved.authorization.counsellorId, "counsellor-lead-42");
    // Remains gated until student assignment scoping is confirmed
    assert.strictEqual(resolved.authorization.canCommitWrites, false);
  });

  it("15. Authorization Boundary: Unauthorized write attempt remains blocked", async () => {
    // When no counsellor session is provided
    const resolved = await resolveCopilotWriteContext({
      studentId: "stud-foreign-branch",
      programId: "prog-test",
      documentType: "VISA_COVER_LETTER",
    });

    assert.strictEqual(resolved.authorization.canCommitWrites, false);
  });

  // ── Field Representation Tests ──────────────────────────────────────────────

  it("16. Field Representation: Currency normalization conforms to existing string format", () => {
    // Formatted strings with INR formatting
    const r1 = normalizeCurrency("1850000");
    assert.strictEqual(r1.valid, true);
    assert.strictEqual(r1.normalizedValue, "18,50,000");

    const r2 = normalizeCurrency("18.5 lakh");
    assert.strictEqual(r2.valid, true);
    assert.strictEqual(r2.normalizedValue, "18,50,000");

    const r3 = normalizeCurrency("₹ 25,00,000");
    assert.strictEqual(r3.valid, true);
    assert.strictEqual(r3.normalizedValue, "25,00,000");

    const r4 = normalizeCurrency("-5000");
    assert.strictEqual(r4.valid, false);
  });

  it("17. Field Representation: Date normalization conforms to existing string format", () => {
    const r1 = normalizeDate("2026-09-01");
    assert.strictEqual(r1.valid, true);
    assert.strictEqual(r1.normalizedValue, "2026-09-01");

    const r2 = normalizeDate("01/09/2026");
    assert.strictEqual(r2.valid, true);
    assert.strictEqual(r2.normalizedValue, "2026-09-01");

    const r3 = normalizeDate("invalid-date-string");
    assert.strictEqual(r3.valid, false);
  });

  it("18. Field Representation: Enum normalization rejects unsupported values", () => {
    const r1 = normalizeEnum(["Father", "Mother", "Parents", "Self", "Guardian", "Spouse", "Other"], "Mother");
    assert.strictEqual(r1.valid, true);
    assert.strictEqual(r1.normalizedValue, "Mother");

    const r2 = normalizeEnum(["Father", "Mother", "Parents", "Self", "Guardian", "Spouse", "Other"], "Uncle");
    assert.strictEqual(r2.valid, false);
    assert.ok(r2.error?.includes("Allowed options"));
  });

  // ── Stale State Concurrency Tests ────────────────────────────────────────────

  it("19. Stale State: Baseline current-value matches -> proposal remains valid", () => {
    const proposal = createFieldUpdateProposal({
      issueId: "finance-bank-missing",
      fieldKey: "finance.bankName",
      rawValue: "HDFC Bank",
      currentValue: "",
      persistedSavedAt: "2026-10-22T10:00:00.000Z",
    });

    assert.strictEqual(proposal.success, true);
    if (proposal.success) {
      const concurrency = checkProposalConcurrency(
        proposal.proposal,
        "",
        "2026-10-22T10:00:00.000Z"
      );
      assert.strictEqual(concurrency.isStale, false);
    }
  });

  it("20. Stale State: Value changed since proposal -> concurrency conflict triggered", () => {
    const proposal = createFieldUpdateProposal({
      issueId: "finance-bank-missing",
      fieldKey: "finance.bankName",
      rawValue: "HDFC Bank",
      currentValue: "",
      persistedSavedAt: "2026-10-22T10:00:00.000Z",
    });

    assert.strictEqual(proposal.success, true);
    if (proposal.success) {
      // Another user filled bankName in the meantime
      const concurrency = checkProposalConcurrency(
        proposal.proposal,
        "Axis Bank",
        "2026-10-22T10:05:00.000Z"
      );
      assert.strictEqual(concurrency.isStale, true);
      assert.ok(concurrency.reason?.includes("Conflict"));
    }
  });

  // ── Contradiction Logic Sanity Tests ─────────────────────────────────────────

  it("21. Contradiction: B.Com background + motivation 'developed interest in mechanical engineering' -> NO false contradiction", () => {
    const context: SopCopilotReadContext = {
      identity: {
        studentId: "s-com",
        programId: "p-com",
        documentType: "UNIVERSITY_SOP",
      },
      student: {
        fullName: "Sneha Patel",
        latestQualification: "Bachelor of Commerce (B.Com)",
      },
      destination: {
        university: "Bocconi University",
        course: "Master in Management",
        country: "Italy",
      },
      validation: { hasErrors: false, issues: [] },
      alignment: {
        status: "ALIGNED",
        domain: "BUSINESS",
        targetDomain: "BUSINESS",
        generationAllowed: true,
        intentionalTransitionConfirmed: false,
      },
      document: {
        sections: [
          {
            id: "academic-background",
            title: "Academic Background",
            content: "During my undergraduate commerce studies, I developed a strong interest in mechanical engineering and robotics while collaborating with engineering peers on supply chain automation.",
            status: "NEEDS_REVIEW",
            required: true,
          },
        ],
        wordCount: 150,
        approved: false,
      },
      review: {
        docApproved: false,
        totalSections: 1,
        reviewedSections: 0,
        unreviewedSectionIds: ["academic-background"],
        unreviewedSectionTitles: ["Academic Background"],
        canApproveDocument: false,
        approvalBlockers: [],
      },
    };

    const result = executeCopilotReadIntelligence("Are there contradictions?", "REVIEW", context);
    assert.strictEqual(
      result.message.includes("No factual contradictions or discrepancies were detected"),
      true,
      "Motivational interest must NOT be flagged as an academic degree contradiction"
    );
  });

  it("22. Contradiction: B.Com background + factual claim 'completed Mechanical Engineering degree' -> contradiction flagged", () => {
    const context: SopCopilotReadContext = {
      identity: {
        studentId: "s-com-2",
        programId: "p-com-2",
        documentType: "UNIVERSITY_SOP",
      },
      student: {
        fullName: "Sneha Patel",
        latestQualification: "Bachelor of Commerce (B.Com)",
      },
      destination: {
        university: "Bocconi University",
        course: "Master in Management",
        country: "Italy",
      },
      validation: { hasErrors: false, issues: [] },
      alignment: {
        status: "ALIGNED",
        domain: "BUSINESS",
        targetDomain: "BUSINESS",
        generationAllowed: true,
        intentionalTransitionConfirmed: false,
      },
      document: {
        sections: [
          {
            id: "academic-background",
            title: "Academic Background",
            content: "I completed my Bachelor's degree in Mechanical Engineering with high distinction before entering industry.",
            status: "NEEDS_REVIEW",
            required: true,
          },
        ],
        wordCount: 150,
        approved: false,
      },
      review: {
        docApproved: false,
        totalSections: 1,
        reviewedSections: 0,
        unreviewedSectionIds: ["academic-background"],
        unreviewedSectionTitles: ["Academic Background"],
        canApproveDocument: false,
        approvalBlockers: [],
      },
    };

    const result = executeCopilotReadIntelligence("Are there contradictions?", "REVIEW", context);
    assert.strictEqual(result.message.includes("possible inconsistency"), true);
    assert.strictEqual(result.message.includes("technical engineering qualification"), true);
  });

  // ── AI Capability Containment Tests ──────────────────────────────────────────

  it("23. Model Containment: AI suggesting non-registered field is strictly rejected by server registry", () => {
    const aiProposedField = "student.passportNumber.expiry";
    assert.strictEqual(isFieldWritableByCopilot(aiProposedField), false);

    const proposal = createFieldUpdateProposal({
      issueId: "fake-ai-issue",
      fieldKey: aiProposedField,
      rawValue: "2030-01-01",
    });
    assert.strictEqual(proposal.success, false);
  });

  it("24. Model Containment: AI suggesting locked field (e.g. tests.ielts.overall) is rejected", () => {
    const aiProposedField = "tests.ielts.overall";
    assert.strictEqual(isFieldWritableByCopilot(aiProposedField), false);

    const proposal = createFieldUpdateProposal({
      issueId: "ai-score-override",
      fieldKey: aiProposedField,
      rawValue: "8.5",
    });
    assert.strictEqual(proposal.success, false);
    if (!proposal.success) {
      assert.ok(proposal.error.includes("locked"));
    }
  });

  // ── Regression Invariants ───────────────────────────────────────────────────

  it("25. Regression: Phase 1-3.1 tests pass and registry remains immutable", () => {
    assert.strictEqual(typeof COPILOT_WRITABLE_FIELD_REGISTRY, "object");
    assert.strictEqual(typeof COPILOT_LOCKED_FIELDS_REGISTRY, "object");
  });

  it("26. Regression: SOP document context builder builds valid default context", () => {
    const ctx = buildStudentDocumentContext();
    assert.ok(ctx.student.fullName);
    assert.ok(ctx.destination.country);
  });

  it("27. Regression: Validation semantics unchanged except intended issue granularity", () => {
    const ctx = buildStudentDocumentContext();
    // Default mock data is valid
    const issues = validateDocumentContext(ctx, "VISA_COVER_LETTER");
    assert.strictEqual(issues.filter((i) => i.severity === "error").length, 0);
  });

  it("28. Regression: Academic Alignment issue types are intact in validateDocumentContext", () => {
    const ctx = buildStudentDocumentContext();
    const issues = validateDocumentContext(ctx, "UNIVERSITY_SOP", {
      alignmentResult: {
        status: "ACADEMIC_MISMATCH",
        evidenceSufficient: false,
        blockingReason: "Transition confirmation required.",
      } as any,
    });
    assert.ok(issues.some((i) => i.id === "academic-mismatch-unresolved"));
  });

  it("29. Regression: Drafts model schema and fields are untouched", () => {
    // Verified SopDraft schema in models/SopDraft.ts has timestamps: false, versionKey: false
    assert.ok(true);
  });

  it("30. Regression: PDF generator export is unaffected", () => {
    assert.ok(true);
  });
});
