import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getTemplate,
  getDefaultTemplate,
  getTemplatesByDocumentType,
  getAllTemplates,
} from "../templateRegistry";
import { validateDocumentContext } from "../validateDocumentContext";
import { buildNaturalStudentPrompt } from "../../../../services/ai/prompts/studentVoiceGuidelines";
import { saveDraft, getDraftById, deleteDraft } from "../sopDraftStorage";
import { getStudentDocumentContext } from "../applicationService";
import type { StudentDocumentContext } from "../../types/sop-generator";

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

const mockContext: StudentDocumentContext = getStudentDocumentContext();

describe("University SOP Integration & Core Requirements", () => {
  it("Requirement 1: templateRegistry is the single source of truth", () => {
    const allTemplates = getAllTemplates();
    assert.equal(allTemplates.length >= 2, true);

    const visaDefault = getDefaultTemplate("VISA_COVER_LETTER");
    assert.equal(visaDefault.id, "italy-type-d-student-visa-cover-letter");
    assert.equal(visaDefault.documentType, "VISA_COVER_LETTER");
    assert.equal(visaDefault.sections.length, 16);

    const sopDefault = getDefaultTemplate("UNIVERSITY_SOP");
    assert.equal(sopDefault.id, "university-statement-of-purpose");
    assert.equal(sopDefault.documentType, "UNIVERSITY_SOP");
    assert.equal(sopDefault.sections.length, 9);

    const visaList = getTemplatesByDocumentType("VISA_COVER_LETTER");
    assert.equal(visaList.some((t) => t.id === "italy-type-d-student-visa-cover-letter"), true);

    const sopList = getTemplatesByDocumentType("UNIVERSITY_SOP");
    assert.equal(sopList.some((t) => t.id === "university-statement-of-purpose"), true);
  });

  it("Requirement 2: University SOP contains exact 9 sections and 4 groups", () => {
    const sop = getTemplate("university-statement-of-purpose");
    const sectionIds = sop.sections.map((s) => s.id);

    const expectedIds = [
      "student-introduction",
      "academic-background",
      "interest-motivation",
      "why-course",
      "why-university",
      "academic-fit",
      "career-goals",
      "contribution-vision",
      "closing-statement",
    ];

    assert.deepEqual(sectionIds, expectedIds);
    assert.equal(sop.sidebarGroups?.length, 4);

    const groupIds = sop.sidebarGroups?.map((g) => g.id);
    assert.deepEqual(groupIds, ["foundation", "motivation-fit", "future", "closing"]);
  });

  it("Requirement 3: Template configuration drives UI & PDF properties", () => {
    const sop = getTemplate("university-statement-of-purpose");
    const visa = getTemplate("italy-type-d-student-visa-cover-letter");

    assert.equal(sop.documentHeaderTitle, "STATEMENT OF PURPOSE");
    assert.equal(sop.canvasMasthead, "Statement of Purpose · Academic Admissions");
    assert.equal(sop.salutation, "Dear Admissions Committee,");
    assert.equal(sop.pdfDocumentType, "Statement_of_Purpose");
    assert.equal(sop.showLogisticsInContext, false);

    assert.equal(visa.documentHeaderTitle, "COVER LETTER");
    assert.equal(visa.canvasMasthead, "Visa Cover Letter · Embassy Submission");
    assert.equal(visa.pdfDocumentType, "Visa_Cover_Letter");
    assert.equal(visa.showLogisticsInContext, true);
  });

  it("Requirement 4: Validation skips visa logistics for UNIVERSITY_SOP but validates academic fields", () => {
    // Missing visa logistics (sponsor, finance, travel, accommodation, insurance)
    const contextWithoutVisaLogistics: StudentDocumentContext = {
      ...mockContext,
      sponsor: {
        name: "",
        relationship: "",
        occupation: "",
        annualIncome: "",
        incomeSource: "",
      },
      finance: {
        totalFundsAvailable: "",
        educationLoanAmount: "",
        loanProvider: "",
        bankName: "",
        accountHolderName: "",
        availableBalance: "",
        currency: "EUR",
      },
      accommodation: {
        type: "",
        name: "",
        address: "",
        city: "",
        country: "",
        fromDate: "",
        toDate: "",
        bookingReference: "",
      },
      insurance: {
        provider: "",
        policyNumber: "",
        type: "",
        fromDate: "",
        toDate: "",
        coverageAmount: "",
      },
      travel: {
        airline: "",
        flightNumber: "",
        origin: "",
        destination: "",
        travelDate: "",
        pnr: "",
      },
    };

    // For Visa, should fail with errors for finance, sponsor, accommodation, insurance, travel
    const visaIssues = validateDocumentContext(contextWithoutVisaLogistics, "VISA_COVER_LETTER");
    const visaErrors = visaIssues.filter((i) => i.severity === "error");
    assert.equal(visaErrors.length > 0, true);

    // For University SOP, should pass without visa logistic errors
    const sopIssues = validateDocumentContext(contextWithoutVisaLogistics, "UNIVERSITY_SOP");
    const sopErrors = sopIssues.filter((i) => i.severity === "error");
    assert.equal(sopErrors.length, 0);

    // But if student name or university or qualification is missing in SOP, it should report errors
    const brokenSopContext: StudentDocumentContext = {
      ...contextWithoutVisaLogistics,
      destination: { ...contextWithoutVisaLogistics.destination, university: "" },
    };
    const brokenIssues = validateDocumentContext(brokenSopContext, "UNIVERSITY_SOP");
    assert.equal(brokenIssues.some((i) => i.id === "destination-university-missing"), true);
  });

  it("Requirement 5: AI prompt builder targets Admissions Committee and never invents Autumn 2026", () => {
    const prompt = buildNaturalStudentPrompt({
      sectionId: "interest-motivation",
      sectionTitle: "Interest & Motivation",
      context: mockContext,
      documentType: "UNIVERSITY_SOP",
      mode: "generate",
    });

    assert.equal(prompt.includes("Admissions Committee"), true);
    assert.equal(prompt.includes("Embassy"), false);
    assert.equal(prompt.includes("Visa Officer"), false);
    assert.equal(prompt.includes("Autumn 2026"), false);
  });

  it("Requirement 6: Draft storage round-trips documentType correctly", () => {
    (global as any).window = {
      localStorage: new MockLocalStorage(),
    };

    const saved = saveDraft({
      studentName: "Elena Rostova",
      course: "M.Sc. in Computer Science",
      university: "Politecnico di Milano",
      templateId: "university-statement-of-purpose",
      documentType: "UNIVERSITY_SOP",
      sectionContents: { "student-introduction": "Hello admissions team" },
      sectionStatuses: { "student-introduction": "APPROVED" },
      docApproved: true,
      ctx: mockContext,
      currentSource: "test-data",
    });

    const retrieved = getDraftById(saved.id);
    assert.ok(retrieved);
    assert.equal(retrieved.documentType, "UNIVERSITY_SOP");
    assert.equal(retrieved.templateId, "university-statement-of-purpose");
    assert.equal(retrieved.sectionContents["student-introduction"], "Hello admissions team");

    deleteDraft(saved.id);
  });
});
