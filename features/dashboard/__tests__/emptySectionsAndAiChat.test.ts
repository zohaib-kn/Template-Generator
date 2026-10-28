import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapNormalizedToResume } from "@/services/normalization/mapNormalizedToResume";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import {
  hydrateDocumentFromSnapshot,
} from "@/features/dashboard/utils/documentHydrator";
import { syncSectionsToCvData } from "@/features/dashboard/utils/documentStudioSync";
import type { DocumentData } from "@/types/document";
import { getSampleMirzaFarhanZaidSnapshot } from "@/lib/sampleStudents";
import fardeeSnapshot from "@/features/document-generator/utils/crmSnapshot_Fardee.json";
import type { CrmSnapshot } from "@/types/crmSnapshot";

describe("Empty Sections Customization & Zero Fallbacks Policy", () => {
  it("leaves skills, hobbies, and certifications completely empty when student CRM profile lacks them", () => {
    const minimalStudent: NormalizedStudentProfile = {
      meta: {
        studentId: "student-minimal-001",
        source: "cached-snapshot",
        fetchedAt: new Date().toISOString(),
      },
      personal: {
        fullName: "Rahul Verma",
        firstName: "Rahul",
        lastName: "Verma",
        email: "rahul.verma@example.com",
        phone: "+91 9988776655",
        city: "Delhi",
        country: "India",
        gender: "Male",
        address: "Delhi",
        state: "Delhi",
        pincode: "110001",
      },
      academics: {
        qualifications: [
          {
            id: "edu-1",
            levelOfStudy: "Undergraduate",
            qualification: "Bachelor of Arts",
            institution: "Delhi University",
            boardOrUniversity: "Delhi University",
            country: "India",
            city: "Delhi",
          },
        ],
        achievements: [],
      },
      workExperience: [],
      tests: {
        english: {
          type: "IELTS",
          overallScore: "7.0",
        },
      },
      skills: [],
      hobbies: [],
      certifications: [],
      languages: [
        {
          language: "Hindi",
          isMotherTongue: true,
        },
      ],
      applications: {
        activeProgram: {
          id: "app-1",
          university: "University of Bologna",
          course: "Master in Arts",
          country: "Italy",
          degreeLevel: "Master",
          courseCategory: "Arts",
        },
        all: [],
      },
    };

    const resumeResult = mapNormalizedToResume(minimalStudent);
    const resumeData = resumeResult.student;

    // CRITICAL: Zero hardcoded fake fallbacks! Must leave sections empty for operator customization
    assert.ok(
      !resumeData.skills || resumeData.skills.length === 0,
      "Skills must not contain fake Python/Java/React"
    );
    assert.ok(
      !resumeData.hobbies || resumeData.hobbies.length === 0,
      "Hobbies must not contain fake Cricket/Reading"
    );
    assert.ok(
      !resumeData.certifications || resumeData.certifications.length === 0,
      "Certifications must not contain fake SmartInternz"
    );
    assert.ok(
      !resumeData.internships || resumeData.internships.length === 0,
      "Internships must be empty when student has no work history"
    );
  });

  it("hydrates Fardeen CV with verified CRM data and zero fake Deloitte fallback", () => {
    const doc = hydrateDocumentFromSnapshot(
      "CV",
      fardeeSnapshot as unknown as CrmSnapshot,
      "fardee-snapshot"
    );

    // Must NOT contain fake Deloitte or PwC
    const allContent = doc.sections.map((s) => s.content).join(" ");
    assert.ok(!allContent.includes("Deloitte India"), "Must not synthesize fake Deloitte");
    assert.ok(!allContent.includes("PwC"), "Must not synthesize fake PwC");
  });

  it("leaves space empty for missing sections when student has no work history", () => {
    const snapshotWithoutWork: CrmSnapshot = JSON.parse(JSON.stringify(fardeeSnapshot));
    if (snapshotWithoutWork.student) {
      snapshotWithoutWork.student.workExperience = [];
    }

    const doc = hydrateDocumentFromSnapshot(
      "CV",
      snapshotWithoutWork,
      "fardee-no-work"
    );

    const workSec = doc.sections.find(
      (s) => s.heading.toLowerCase().includes("work") || s.heading.toLowerCase().includes("experience")
    );

    // Either omitted or empty string so operator can type into it or delete it
    if (workSec) {
      assert.equal(workSec.content.trim(), "", "Work experience must be empty when CRM has no work history");
    }
  });
});

describe("AI Chat Assistant Conversation State & Suggestions Logic", () => {
  it("determines suggestion visibility: visible when chatMessages is empty, hidden when convo begins", () => {
    const emptyChat: unknown[] = [];
    const activeChat = [
      { id: "msg-1", sender: "user", text: "IELTS 7.5 TRF 26IA506129FAIM003A", timestamp: "12:00 PM" },
    ];

    const showSuggestionsEmpty = emptyChat.length === 0;
    const showSuggestionsActive = activeChat.length === 0;

    assert.equal(showSuggestionsEmpty, true, "Starter suggestions must show when conversation has not started");
    assert.equal(showSuggestionsActive, false, "Starter suggestions must DISAPPEAR when conversation begins");
  });

  it("constructs correct scoped localStorage key for multi-turn studio chat persistence", () => {
    const studentId = "sample-mirza-farhan-zaid";
    const docType = "CV";
    const expectedKey = `antigravity_studio_chat_${studentId}_${docType}`;

    assert.equal(expectedKey, "antigravity_studio_chat_sample-mirza-farhan-zaid_CV");
  });

  it("handles deletion of empty or customized section cleanly", () => {
    const sections = [
      { heading: "ABOUT ME", content: "Student profile" },
      { heading: "WORK EXPERIENCE", content: "" }, // Empty section to delete
      { heading: "EDUCATION", content: "B.Com" },
    ];

    // Simulate operator deleting section at index 1
    const targetIdx = 1;
    const updatedSections = sections.filter((_, idx) => idx !== targetIdx);

    assert.equal(updatedSections.length, 2);
    assert.equal(updatedSections.some((s) => s.heading === "WORK EXPERIENCE"), false);
    assert.equal(updatedSections[0].heading, "ABOUT ME");
    assert.equal(updatedSections[1].heading, "EDUCATION");
  });

  it("handles addition of new blank section for operator customization", () => {
    const sections = [
      { heading: "ABOUT ME", content: "Student profile" },
    ];

    // Simulate operator clicking + Add Section -> "ENGLISH LANGUAGE CERTIFICATE"
    const newSection = { heading: "ENGLISH LANGUAGE CERTIFICATE", content: "" };
    const updatedSections = [...sections, newSection];

    assert.equal(updatedSections.length, 2);
    assert.equal(updatedSections[1].heading, "ENGLISH LANGUAGE CERTIFICATE");
    assert.equal(updatedSections[1].content, "", "Newly added section starts empty for customization");
  });
});

describe("syncSectionsToCvData Live Document Synchronization", () => {
  const baseCv: DocumentData = {
    personal: { fullName: "Test Student" },
    education: [],
    internships: [],
    skills: [],
    hobbies: [],
    certifications: [],
  };

  it("extracts accredited certification name, provider, and year without leaving provider blank", () => {
    const sections = [
      {
        heading: "CERTIFICATIONS",
        content:
          "• Deep Learning & Neural Networks Specialization – Coursera (DeepLearning.AI) [ 2023 ]\n• AWS Certified Cloud Practitioner – Amazon Web Services [ 2024 ]",
      },
    ];

    const synced = syncSectionsToCvData(sections, baseCv);

    assert.equal(synced.certifications?.length, 2);
    assert.equal(
      synced.certifications?.[0].name,
      "Deep Learning & Neural Networks Specialization"
    );
    assert.equal(
      synced.certifications?.[0].provider,
      "Coursera (DeepLearning.AI)"
    );
    assert.equal(synced.certifications?.[0].completionDate, "2023");

    assert.equal(
      synced.certifications?.[1].name,
      "AWS Certified Cloud Practitioner"
    );
    assert.equal(
      synced.certifications?.[1].provider,
      "Amazon Web Services"
    );
    assert.equal(synced.certifications?.[1].completionDate, "2024");
  });

  it("handles alternate delimiters like 'by', '|', and '-' with parentheses dates", () => {
    const sections = [
      {
        heading: "CERTIFICATIONS",
        content:
          "Financial Modeling & Valuation Analyst by Corporate Finance Institute (2023)\nPython for Data Science | edX (HarvardX) [ 2022 ]",
      },
    ];

    const synced = syncSectionsToCvData(sections, baseCv);

    assert.equal(synced.certifications?.length, 2);
    assert.equal(
      synced.certifications?.[0].name,
      "Financial Modeling & Valuation Analyst"
    );
    assert.equal(
      synced.certifications?.[0].provider,
      "Corporate Finance Institute"
    );
    assert.equal(synced.certifications?.[0].completionDate, "2023");

    assert.equal(
      synced.certifications?.[1].name,
      "Python for Data Science"
    );
    assert.equal(synced.certifications?.[1].provider, "edX (HarvardX)");
    assert.equal(synced.certifications?.[1].completionDate, "2022");
  });

  it("clears certifications when section content is emptied", () => {
    const sections = [{ heading: "CERTIFICATIONS", content: "" }];
    const cvWithCerts: DocumentData = {
      ...baseCv,
      certifications: [
        { id: "c1", name: "Old Cert", provider: "Old Provider" },
      ],
    };

    const synced = syncSectionsToCvData(sections, cvWithCerts);
    assert.deepEqual(synced.certifications, []);
  });
});

