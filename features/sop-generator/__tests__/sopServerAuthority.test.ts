/**
 * features/sop-generator/__tests__/sopServerAuthority.test.ts
 *
 * Phase 6 Test Suite: Server-Side Authority Redesign of /api/sop/generate
 *
 * Covers:
 * - Test 21: Server blocks sensitive section (why-course) with HTTP 403 on unresolved mismatch
 * - Test 22: Non-sensitive section (family-background, travel-history) is permitted during mismatch
 * - Test 25: Multiple programs: program-scoped resume draft isolation (no cross-program leakage)
 * - Test 26: Malicious client academic context: client sends Kaavya with tampered engineering qualifications,
 *            server loads authoritative CRM snapshot (Law), discards tampered context, returns HTTP 403
 * - Test 27: Fake client evidence: client sends fake skills/certs in body/context; server ignores them,
 *            finds no verified evidence in DB, returns HTTP 403
 * - Test 28: Stale resolution: resolution confirmed for Course A, student applies for Course B;
 *            server detects stale resolution and returns HTTP 403 with isStale: true
 * - Test 29: Confirmed transition with verified evidence packet injects guidance into Gemini prompt
 * - Test 30: Indeterminate / UNKNOWN domain blocks sensitive section generation with HTTP 403
 * - Test 31: Input validation: missing sectionId or context returns HTTP 400
 */

(process.env as Record<string, string | undefined>).NODE_ENV = "test";

import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  POST,
  setTestResolution,
  setTestResumeDraft,
  clearTestStore,
  getLastGeneratedPrompt,
} from "@/app/api/sop/generate/route";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";
import type { AcademicAlignmentResolutionRecord } from "@/models/AcademicAlignmentResolution";
import type { ResumeDraftRecord } from "@/features/document-generator/types/draft";

function createBaseContext(overrides?: {
  destination?: Partial<StudentDocumentContext["destination"]>;
  academics?: Partial<StudentDocumentContext["academics"]>;
  student?: Partial<StudentDocumentContext["student"]>;
  career?: Record<string, string>;
  sponsor?: Partial<StudentDocumentContext["sponsor"]>;
}): StudentDocumentContext {
  const base: StudentDocumentContext = {
    student: {
      fullName: "Jane Doe",
      dateOfBirth: "2000-01-01",
      placeOfBirth: "Mumbai",
      city: "Mumbai",
      country: "India",
      nationality: "Indian",
      passportNumber: "Z1234567",
      phone: "+919876543210",
      email: "jane.doe@example.com",
      address: "123 Marine Drive",
      gender: "Female",
      languages: "English, Hindi",
    },
    destination: {
      country: "Italy",
      university: "Politecnico di Milano",
      course: "Master in Mechanical Engineering",
      city: "Milan",
      degreeLevel: "Master's",
      duration: "2 Years",
      intakeMonth: "September",
      intakeYear: "2026",
      consulate: "Consulate General of Italy",
      consulateCity: "Mumbai",
      consulateAddress: "Mumbai, India",
    },
    academics: {
      latestQualification: "Bachelor of Commerce",
      institution: "Mumbai University",
      board: "State Board",
      percentage: "75%",
      completionYear: "2023",
      subjects: "Financial Accounting, Business Law",
    },
    tests: {
      ielts: {
        overall: "7.5",
        listening: "8.0",
        reading: "7.5",
        writing: "7.0",
        speaking: "7.5",
        dateTaken: "2024-01-15",
      },
    },
    career: {
      shortTermGoal: "Work as an engineer in automotive design",
      longTermGoal: "Lead vehicle R&D projects",
      returnIntention: "Return to home country immediately after degree completion",
    },
    finance: {
      educationLoanAmount: "€0",
      loanProvider: "N/A",
      bankName: "State Bank of India",
      accountHolderName: "Jane Doe",
      availableBalance: "€25,000",
      totalFundsAvailable: "€25,000",
      currency: "EUR",
    },
    accommodation: {
      name: "Milan Student Residence",
      type: "Student Residence",
      address: "Via Milano 10",
      city: "Milan",
      country: "Italy",
      fromDate: "2026-09-01",
      toDate: "2027-08-31",
      bookingReference: "BK-9912",
    },
    insurance: {
      provider: "Allianz Global",
      policyNumber: "POL-778899",
      type: "Comprehensive Health",
      fromDate: "2026-09-01",
      toDate: "2027-08-31",
      coverageAmount: "€30,000",
    },
    travel: {
      airline: "Emirates",
      flightNumber: "EK-501",
      origin: "Mumbai",
      destination: "Milan",
      travelDate: "2026-08-25",
      pnr: "PNR-12345",
    },
    sponsor: {
      name: "John Doe",
      relationship: "Father",
      occupation: "Business Owner",
      annualIncome: "₹1,500,000",
      incomeSource: "Business",
    },
  };

  return {
    ...base,
    ...overrides,
    student: { ...base.student, ...(overrides?.student || {}) },
    destination: { ...base.destination, ...(overrides?.destination || {}) },
    academics: { ...base.academics, ...(overrides?.academics || {}) },
    sponsor: { ...base.sponsor, ...(overrides?.sponsor || {}) },
    ...(overrides?.career ? { career: overrides.career } : {}),
  } as StudentDocumentContext;
}

function makeGenerateRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/sop/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 6: Server-Side Authority for /api/sop/generate", () => {
  beforeEach(() => {
    clearTestStore();
  });

  // ── Test 21 ──────────────────────────────────────────────────────────────
  test("Test 21: Server blocks sensitive section (why-course) with HTTP 403 on unresolved mismatch", async () => {
    const ctx = createBaseContext({
      destination: {
        course: "Master in Mechanical Engineering",
        degreeLevel: "Master's",
        university: "Politecnico di Milano",
        country: "Italy",
      },
      academics: {
        latestQualification: "Bachelor of Commerce",
        subjects: "Commerce, Business Management",
      },
    });

    const req = makeGenerateRequest({
      studentId: "student-bcom-unresolved",
      programId: "prog-mech-1",
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: ctx,
      documentType: "VISA_COVER_LETTER",
    });

    const res = await POST(req);
    assert.equal(res.status, 403);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, "ACADEMIC_MISMATCH_UNRESOLVED");
    assert.equal(data.error.status, "ACADEMIC_MISMATCH");
    assert.equal(data.error.isStale, false);
    assert.ok(
      data.error.message.includes("Transition requirements") ||
        data.error.message.includes("mismatch")
    );
  });

  // ── Test 22 ──────────────────────────────────────────────────────────────
  test("Test 22: Non-sensitive section (family-background) is permitted during mismatch (HTTP 200)", async () => {
    const ctx = createBaseContext({
      destination: {
        course: "Master in Mechanical Engineering",
        degreeLevel: "Master's",
        university: "Politecnico di Milano",
        country: "Italy",
      },
      academics: {
        latestQualification: "Bachelor of Commerce",
        subjects: "Commerce, Business Management",
      },
    });

    const req = makeGenerateRequest({
      studentId: "student-bcom-unresolved",
      programId: "prog-mech-1",
      sectionId: "family-background",
      sectionTitle: "Family Background & Ties",
      context: ctx,
      documentType: "VISA_COVER_LETTER",
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.sectionId, "family-background");
    assert.ok(data.text && data.text.length > 0);
  });

  // ── Test 25 ──────────────────────────────────────────────────────────────
  test("Test 25: Multiple programs: program-scoped resume draft isolation prevents evidence leakage", async () => {
    const studentId = "student-multi-app-123";
    const programAId = "prog-business-analytics";
    const programBId = "prog-mechanical-cad";

    // Resume draft exists specifically for Program B (Mechanical) with AutoCAD evidence
    const draftB: ResumeDraftRecord = {
      id: "draft-prog-b",
      studentId,
      programId: programBId,
      studentName: "Multi App Student",
      savedAt: new Date().toISOString(),
      data: {
        personal: { fullName: "Multi App Student" },
        education: [{ id: "e1", qualification: "Bachelor of Arts in English" }],
        skills: [{ id: "s1", name: "AutoCAD 3D" }, { id: "s2", name: "SolidWorks" }],
        academicProjects: [{ id: "p1", title: "Automotive Chassis Stress Simulation" }],
      },
    };
    setTestResumeDraft(draftB);

    // Context for Program A (MSc Business Analytics) with BA English qualification
    const ctx = createBaseContext({
      destination: {
        course: "MSc Business Analytics",
        degreeLevel: "Master's",
        university: "University of Warwick",
        country: "United Kingdom",
      },
      academics: {
        latestQualification: "Bachelor of Arts in English Literature",
        subjects: "English, History",
      },
    });

    // Requesting sensitive section for Program A
    const req = makeGenerateRequest({
      studentId,
      programId: programAId,
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: ctx,
      documentType: "VISA_COVER_LETTER",
    });

    const res = await POST(req);

    // Must be blocked because Program B's CAD draft must NOT leak into Program A
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error.code, "ACADEMIC_MISMATCH_UNRESOLVED");
  });

  // ── Test 26 ──────────────────────────────────────────────────────────────
  test("Test 26: Malicious client academic context: server discards client engineering context and uses CRM Law background", async () => {
    // Kaavya Girish Nair's real ID is 6a508a96af13bb33e9fc07ce in CRM fixtures (Rizvi Law College)
    const kaavyaId = "6a508a96af13bb33e9fc07ce";

    // Tampered client context claims Kaavya has a B.Tech in Mechanical Engineering
    const tamperedClientContext = createBaseContext({
      destination: {
        course: "MSc Automotive Engineering",
        degreeLevel: "Master's",
        university: "Brunel University",
        country: "United Kingdom",
      },
      academics: {
        latestQualification: "B.Tech Mechanical Engineering",
        subjects: "Automotive Powertrains, Thermodynamics",
        institution: "Fake Engineering Institute",
      },
    });

    const req = makeGenerateRequest({
      studentId: kaavyaId,
      programId: "prog-automotive-1",
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: tamperedClientContext,
      documentType: "VISA_COVER_LETTER",
    });

    const res = await POST(req);

    // Server must discard fake B.Tech Mechanical, load Kaavya's authoritative Law background,
    // detect Law -> Automotive Engineering mismatch, and block with 403
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error.code, "ACADEMIC_MISMATCH_UNRESOLVED");
    assert.equal(data.error.status, "ACADEMIC_MISMATCH");
  });

  // ── Test 27 ──────────────────────────────────────────────────────────────
  test("Test 27: Fake client evidence: client-sent skills/projects are not promoted to safeEvidencePacket", async () => {
    const studentId = "student-bcom-fake-evidence";
    const programId = "prog-cs-1";

    const ctx = createBaseContext({
      destination: {
        course: "Master of Science in Computer Science",
        degreeLevel: "Master's",
        university: "Trinity College Dublin",
        country: "Ireland",
      },
      academics: {
        latestQualification: "Bachelor of Commerce",
        subjects: "Accounting, Taxation",
      },
    });

    // Client maliciously attaches fake skills directly to the context / request body
    const req = makeGenerateRequest({
      studentId,
      programId,
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: {
        ...ctx,
        fakeSkills: ["Python", "Algorithms", "Data Structures"],
      } as unknown as StudentDocumentContext,
      skills: ["Python", "Distributed Systems"],
      documentType: "VISA_COVER_LETTER",
    });

    const res = await POST(req);

    // Blocked with 403 because no reviewed resume draft exists in the database
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error.code, "ACADEMIC_MISMATCH_UNRESOLVED");
  });

  // ── Test 28 ──────────────────────────────────────────────────────────────
  test("Test 28: Stale resolution: resolution confirmed for Course A, student applies for Course B (HTTP 403, isStale: true)", async () => {
    const studentId = "student-stale-test-1";
    const programId = "prog-stale-1";

    // Resolution confirmed for MSc Automotive Engineering
    const resolution: AcademicAlignmentResolutionRecord = {
      id: `res-${studentId}-${programId}`,
      studentId,
      programId,
      sourceQualificationSnapshot: "Bachelor of Commerce",
      targetCourseSnapshot: "MSc Automotive Engineering",
      resolution: "INTENTIONAL_CONFIRMED",
      confirmedAt: new Date().toISOString(),
      transitionContext: {
        reason: "Applicant attended automotive engineering bootcamps and completed relevant projects.",
      },
    };
    setTestResolution(resolution);

    // Current target program updated to MSc Data Science & Artificial Intelligence
    const ctx = createBaseContext({
      destination: {
        course: "MSc Data Science & Artificial Intelligence",
        degreeLevel: "Master's",
        university: "University of Liverpool",
        country: "United Kingdom",
      },
      academics: {
        latestQualification: "Bachelor of Commerce",
        subjects: "Accounting, Taxation",
      },
    });

    const req = makeGenerateRequest({
      studentId,
      programId,
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: ctx,
      documentType: "VISA_COVER_LETTER",
    });

    const res = await POST(req);
    assert.equal(res.status, 403);

    const data = await res.json();
    assert.equal(data.error.code, "ACADEMIC_MISMATCH_UNRESOLVED");
    assert.equal(data.error.isStale, true);
    assert.ok(data.error.staleReason);
    assert.ok(data.error.staleReason.includes("Automotive Engineering"));
    assert.ok(data.error.staleReason.includes("Data Science"));
  });

  // ── Test 29 ──────────────────────────────────────────────────────────────
  test("Test 29: Confirmed transition with verified evidence packet injects guidance into Gemini prompt", async () => {
    const studentId = "student-confirmed-ds-1";
    const programId = "prog-ds-1";
    const targetCourse = "Master of Science in Data Science";

    // 1. Confirmed resolution in store
    const resolution: AcademicAlignmentResolutionRecord = {
      id: `res-${studentId}-${programId}`,
      studentId,
      programId,
      sourceQualificationSnapshot: "Bachelor of Commerce",
      targetCourseSnapshot: targetCourse,
      resolution: "INTENTIONAL_CONFIRMED",
      confirmedAt: new Date().toISOString(),
      transitionContext: {
        reason: "Applicant completed verified data science coursework, advanced Python certifications, and predictive machine learning models.",
        selectedCertifications: ["IBM Professional Data Science Certificate"],
        selectedSkills: ["Python", "Machine Learning"],
        selectedProjects: ["Customer Churn Prediction Model"],
      },
    };
    setTestResolution(resolution);

    // 2. Program-scoped Resume draft in store with verified bridging items
    const resumeDraft: ResumeDraftRecord = {
      id: "draft-ds-verified",
      studentId,
      programId,
      studentName: "Confirmed Applicant",
      savedAt: new Date().toISOString(),
      data: {
        personal: { fullName: "Confirmed Applicant" },
        education: [{ id: "e1", qualification: "Bachelor of Commerce" }],
        certifications: [
          {
            id: "c1",
            name: "IBM Professional Data Science Certificate",
            provider: "IBM Coursera",
          },
        ],
        skills: [
          { id: "s1", name: "Python Programming" },
          { id: "s2", name: "Machine Learning" },
        ],
        academicProjects: [
          {
            id: "p1",
            title: "Customer Churn Prediction Model",
            description: "Built supervised learning models with scikit-learn in Python.",
          },
        ],
      },
    };
    setTestResumeDraft(resumeDraft);

    const ctx = createBaseContext({
      destination: {
        course: targetCourse,
        degreeLevel: "Master's",
        university: "University of Manchester",
        country: "United Kingdom",
      },
      academics: {
        latestQualification: "Bachelor of Commerce",
        subjects: "Financial Accounting, Taxation",
      },
    });

    const req = makeGenerateRequest({
      studentId,
      programId,
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: ctx,
      documentType: "VISA_COVER_LETTER",
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);

    // Verify prompt captured by server
    const capturedPrompt = getLastGeneratedPrompt();
    assert.ok(capturedPrompt, "Prompt must be generated and captured");
    assert.ok(
      capturedPrompt.includes("ACADEMIC TRANSITION GUIDANCE & VERIFIED BRIDGING EVIDENCE"),
      "Prompt must include the transition guidance section"
    );
    assert.ok(
      capturedPrompt.includes("verified data science coursework"),
      "Prompt must include the verified transition rationale"
    );
    assert.ok(
      capturedPrompt.includes("IBM Professional Data Science Certificate") ||
        capturedPrompt.includes("Python") ||
        capturedPrompt.includes("Customer Churn Prediction Model"),
      "Prompt must include verified bridging evidence items"
    );
  });

  // ── Test 30 ──────────────────────────────────────────────────────────────
  test("Test 30: Indeterminate / UNKNOWN domain blocks sensitive section generation with HTTP 403", async () => {
    const ctx = createBaseContext({
      destination: {
        course: "", // Empty course yields UNKNOWN target domain
        degreeLevel: "Master's",
      },
      academics: {
        latestQualification: "Bachelor of Commerce",
        subjects: "Commerce",
      },
    });

    const req = makeGenerateRequest({
      studentId: "student-unknown-domain",
      programId: "prog-unknown-1",
      sectionId: "why-course",
      sectionTitle: "Why This Course",
      context: ctx,
      documentType: "VISA_COVER_LETTER",
    });

    const res = await POST(req);
    assert.equal(res.status, 403);

    const data = await res.json();
    assert.equal(data.error.code, "ACADEMIC_MISMATCH_UNRESOLVED");
    assert.equal(data.error.status, "UNKNOWN");
  });

  // ── Test 31 ──────────────────────────────────────────────────────────────
  test("Test 31: Input validation: missing sectionId or context returns HTTP 400", async () => {
    const req1 = makeGenerateRequest({
      sectionTitle: "Missing Section ID",
      context: createBaseContext(),
    });
    const res1 = await POST(req1);
    assert.equal(res1.status, 400);

    const req2 = makeGenerateRequest({
      sectionId: "why-course",
      sectionTitle: "Missing Context",
    });
    const res2 = await POST(req2);
    assert.equal(res2.status, 400);
  });
});
