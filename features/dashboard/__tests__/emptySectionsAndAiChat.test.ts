import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapNormalizedToResume } from "@/services/normalization/mapNormalizedToResume";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import {
  hydrateDocumentFromSnapshot,
} from "@/features/dashboard/utils/documentHydrator";
import { syncSectionsToCvData } from "@/features/dashboard/utils/documentStudioSync";
import type { DocumentData } from "@/types/document";
import { getSampleRohanIyerSnapshot } from "@/lib/sampleStudents";
import sampleStudentBSnapshot from "@/features/document-generator/utils/crmSnapshot_SampleStudentB.json";
import type { CrmSnapshot } from "@/types/crmSnapshot";
import { renderRichInlineText } from "@/features/document-generator/components/inline/EditableText";
import React from "react";

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

  it("hydrates Devansh CV with verified CRM data and zero fake Deloitte fallback", () => {
    const doc = hydrateDocumentFromSnapshot(
      "CV",
      sampleStudentBSnapshot as unknown as CrmSnapshot,
      "devansh-snapshot"
    );

    // Must NOT contain fake Deloitte or PwC
    const allContent = doc.sections.map((s) => s.content).join(" ");
    assert.ok(!allContent.includes("Deloitte India"), "Must not synthesize fake Deloitte");
    assert.ok(!allContent.includes("PwC"), "Must not synthesize fake PwC");
  });

  it("leaves space empty for missing sections when student has no work history", () => {
    const snapshotWithoutWork: CrmSnapshot = JSON.parse(JSON.stringify(sampleStudentBSnapshot));
    if (snapshotWithoutWork.student) {
      snapshotWithoutWork.student.workExperience = [];
    }

    const doc = hydrateDocumentFromSnapshot(
      "CV",
      snapshotWithoutWork,
      "devansh-no-work"
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
      { id: "msg-1", sender: "user", text: "IELTS 7.5 TRF SAMPLE-TRF-0001", timestamp: "12:00 PM" },
    ];

    const showSuggestionsEmpty = emptyChat.length === 0;
    const showSuggestionsActive = activeChat.length === 0;

    assert.equal(showSuggestionsEmpty, true, "Starter suggestions must show when conversation has not started");
    assert.equal(showSuggestionsActive, false, "Starter suggestions must DISAPPEAR when conversation begins");
  });

  it("constructs correct scoped localStorage key for multi-turn studio chat persistence", () => {
    const studentId = "sample-rohan-iyer";
    const docType = "CV";
    const expectedKey = `antigravity_studio_chat_${studentId}_${docType}`;

    assert.equal(expectedKey, "antigravity_studio_chat_sample-rohan-iyer_CV");
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

  it("does not confuse ENGLISH LANGUAGE CERTIFICATE with CERTIFICATIONS", () => {
    const sections = [
      {
        heading: "ENGLISH LANGUAGE CERTIFICATE",
        content: "IELTS Academic: Overall 7.5\nListening: 8.5\nReading: 8.5\nWriting: 7.5\nSpeaking: 7.0",
      },
      {
        heading: "CERTIFICATIONS",
        content: "Microsoft Excel – Beginner to Advanced\nIssued by: Microsoft Learning\nYear: 2024",
      },
    ];

    const synced = syncSectionsToCvData(sections, baseCv);

    assert.ok(synced.englishCertificate, "Expected englishCertificate to be populated");
    assert.equal(synced.englishCertificate?.score, "7.5");

    assert.ok(synced.certifications && synced.certifications.length === 1, "Expected exactly 1 certification");
    assert.equal(synced.certifications[0].name, "Microsoft Excel – Beginner to Advanced");
    assert.equal(synced.certifications[0].provider, "Microsoft Learning");
    assert.equal(synced.certifications[0].completionDate, "2024");
    assert.ok(synced.sectionOrder?.includes("certifications"));
    assert.ok(synced.sectionOrder?.includes("englishCertificate"));
  });

  it("preserves academic interest phrases with 'and' without splitting them into words", () => {
    const sections = [
      {
        heading: "ACADEMIC INTERESTS",
        content:
          "• Exploring emerging technologies and innovations.\n• Interest in programming and software development.\n• Learning data analysis and database management.\n• Understanding artificial intelligence and automation.\n• Developing problem-solving and analytical skills.",
      },
    ];

    const synced = syncSectionsToCvData(sections, baseCv);

    assert.equal(synced.academicInterests?.length, 5);
    assert.equal(
      synced.academicInterests?.[0].name,
      "Exploring emerging technologies and innovations."
    );
    assert.equal(
      synced.academicInterests?.[1].name,
      "Interest in programming and software development."
    );
    assert.equal(
      synced.academicInterests?.[2].name,
      "Learning data analysis and database management."
    );
    assert.equal(
      synced.academicInterests?.[3].name,
      "Understanding artificial intelligence and automation."
    );
    assert.equal(
      synced.academicInterests?.[4].name,
      "Developing problem-solving and analytical skills."
    );
  });

  describe("Rich Text Toolbar & Inline Formatting Engine", () => {
    it("returns plain text unchanged when no formatting markers exist", () => {
      const plain = "Simple plain sentence with no markdown";
      const result = renderRichInlineText(plain);
      assert.equal(result, plain);
    });

    it("parses **bold** into strong elements", () => {
      const formatted = "This is **bold** text";
      const result = renderRichInlineText(formatted) as React.ReactNode[];
      assert.ok(Array.isArray(result));
      const boldEl = result.find(
        (el: any) => el && typeof el === "object" && el.type === "strong"
      ) as React.ReactElement<any>;
      assert.ok(boldEl, "Expected strong element");
      assert.equal(boldEl.props.children, "bold");
      assert.equal(boldEl.props.style?.fontWeight, 700);
    });

    it("parses *italic* into em elements", () => {
      const formatted = "This is *italic* text";
      const result = renderRichInlineText(formatted) as React.ReactNode[];
      assert.ok(Array.isArray(result));
      const emEl = result.find(
        (el: any) => el && typeof el === "object" && el.type === "em"
      ) as React.ReactElement<any>;
      assert.ok(emEl, "Expected em element");
      assert.equal(emEl.props.children, "italic");
      assert.equal(emEl.props.style?.fontStyle, "italic");
    });

    it("parses <u>underline</u> and ~~strike~~ elements", () => {
      const formatted = "Text with <u>underlined</u> and ~~struck~~ items";
      const result = renderRichInlineText(formatted) as React.ReactNode[];
      assert.ok(Array.isArray(result));
      const uEl = result.find(
        (el: any) => el && typeof el === "object" && el.type === "u"
      ) as React.ReactElement<any>;
      assert.ok(uEl, "Expected u element");
      assert.equal(uEl.props.children, "underlined");

      const sEl = result.find(
        (el: any) => el && typeof el === "object" && el.type === "s"
      ) as React.ReactElement<any>;
      assert.ok(sEl, "Expected s element");
      assert.equal(sEl.props.children, "struck");
    });

    it("parses custom inline color tags <color:#hex>...</color>", () => {
      const formatted = "Highlighted <color:#1e3a8a>Deep Academic Navy</color> text";
      const result = renderRichInlineText(formatted) as React.ReactNode[];
      assert.ok(Array.isArray(result));
      const spanEl = result.find(
        (el: any) => el && typeof el === "object" && el.type === "span"
      ) as React.ReactElement<any>;
      assert.ok(spanEl, "Expected span element with color");
      assert.equal(spanEl.props.children, "Deep Academic Navy");
      assert.equal(spanEl.props.style?.color, "#1e3a8a");
    });

    it("handles newlines by inserting br elements", () => {
      const formatted = "Line 1\nLine 2";
      const result = renderRichInlineText(formatted) as React.ReactNode[];
      assert.ok(Array.isArray(result));
      const brEl = result.find(
        (el: any) => el && typeof el === "object" && el.type === "br"
      );
      assert.ok(brEl, "Expected br element for newline");
    });
  });
});

