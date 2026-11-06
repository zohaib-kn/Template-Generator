import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  processUnifiedMessage,
  findMatchingSection,
} from "../utils/unifiedAssistantEngine";
import { updateCoverLetterSectionWithField } from "../utils/coverLetterCleaner";
import type { HydratedDocumentData } from "../utils/documentHydrator";
import type { DocumentData } from "@/types";

describe("Cover Letter Unified Assistant Workflows (Workflows 1 & 2)", () => {
  const sampleCoverLetterSections = [
    {
      heading: "Recipient / Consulate",
      content: "To,\nThe Respected Visa Officer,\nEmbassy of Italy / Consulate General of Italy.",
    },
    {
      heading: "Subject Line",
      content: "Subject: Application for a Long-Term Type D Student Visa to Pursue Higher Education in Italy",
    },
    {
      heading: "Student Introduction",
      content: "My name is TARA NANDWANI, and I am from Sampleton, India. I completed my High School from Greenfield Public School.",
    },
    {
      heading: "Academic Background",
      content: "I have always enjoyed subjects that challenge me to think logically. Technology continues to evolve and I wish to contribute to engineering.",
    },
    {
      heading: "Why This University",
      content: "I chose the university because it has long stood as an esteemed centre of academic excellence, research, and high quality teaching.",
    },
    {
      heading: "Why Italy / Why This Country",
      content: "I chose Italy because it is home to prestigious academic institutions recognized internationally for their quality of education.",
    },
    {
      heading: "Future Academic Plan",
      content: "After completing my Bachelor's degree, I intend to further advance into specialized postgraduate studies.",
    },
    {
      heading: "Career Plan",
      content: "I aspire to build a career as a Systems Engineer designing reliable software infrastructure.",
    },
    {
      heading: "Financial Sponsorship",
      content: "My higher education and living expenses in Italy will be fully sponsored by my Father, ASHISH SAGAR NANDWANI.",
    },
    {
      heading: "Accommodation",
      content: "I have arranged university dormitory accommodation for my initial stay in Italy.",
    },
    {
      heading: "Closing Statement",
      content: "Thank you for considering my student visa application. I look forward to your positive response.",
    },
  ];

  const mockCoverLetterDoc: HydratedDocumentData = {
    id: "doc-cl-001",
    studentId: "student-001",
    studentName: "TARA NANDWANI",
    docType: "COVER_LETTER",
    title: "Italy Visa Cover Letter",
    sections: sampleCoverLetterSections,
    targetCountry: "Italy",
    targetUniversity: "Politecnico di Milano",
    targetCourse: "Computer Engineering",
    docTypeName: "Cover Letter",
    updatedAt: "Just now",
    route: "/studio",
    wordCount: 300,
    fieldValues: {},
  };

  const emptyCv: DocumentData = {
    personal: {
      fullName: "TARA NANDWANI",
      email: "riddhi@example.com",
    },
    skills: [],
    internships: [],
    education: [],
  };

  describe("findMatchingSection", () => {
    it("matches 'Why choose this university' to 'Why This University'", () => {
      const match = findMatchingSection(
        "Improve the Why choose this university section and humanize it",
        sampleCoverLetterSections
      );
      assert.equal(match, "Why This University");
    });

    it("matches 'Why Italy' to 'Why Italy / Why This Country'", () => {
      const match = findMatchingSection(
        "Humanize the why italy section",
        sampleCoverLetterSections
      );
      assert.equal(match, "Why Italy / Why This Country");
    });

    it("matches 'financial sponsorship' to 'Financial Sponsorship'", () => {
      const match = findMatchingSection(
        "Rewrite financial sponsorship section",
        sampleCoverLetterSections
      );
      assert.equal(match, "Financial Sponsorship");
    });

    it("matches 'student introduction' to 'Student Introduction'", () => {
      const match = findMatchingSection(
        "Make student introduction more concise and professional",
        sampleCoverLetterSections
      );
      assert.equal(match, "Student Introduction");
    });
  });

  describe("Workflow 1: Quoted Snippet Targeting", () => {
    it("targets snippet inside quotes and identifies exact section and snippet", async () => {
      const prompt =
        '"I chose the university because it has long stood as an esteemed centre" make this sound more persuasive and humanize it';
      const result = await processUnifiedMessage(
        prompt,
        mockCoverLetterDoc,
        emptyCv,
        null,
        null
      );

      assert.equal(result.success, true);
      assert.equal(result.actionType, "REWRITE_SECTION");
      assert.equal(result.needsAiRewrite, true);
      assert.equal(result.targetSection, "Why This University");
      assert.ok(result.targetAnchor);
      assert.equal(result.targetAnchor?.heading, "Why This University");
      assert.equal(
        result.targetAnchor?.snippet,
        "I chose the university because it has long stood as an esteemed centre"
      );
      assert.ok(result.reply.includes("Why This University"));
    });

    it("handles smart quotes in pasted snippet", async () => {
      const prompt =
        '“I chose Italy because it is home to prestigious academic institutions” humanize this';
      const result = await processUnifiedMessage(
        prompt,
        mockCoverLetterDoc,
        emptyCv,
        null,
        null
      );

      assert.equal(result.success, true);
      assert.equal(result.actionType, "REWRITE_SECTION");
      assert.equal(result.needsAiRewrite, true);
      assert.equal(result.targetSection, "Why Italy / Why This Country");
      assert.equal(
        result.targetAnchor?.snippet,
        "I chose Italy because it is home to prestigious academic institutions"
      );
    });

    it("targets financial sponsorship snippet when pasted in quotes", async () => {
      const prompt =
        'Enhance and fix: "My higher education and living expenses in Italy will be fully sponsored"';
      const result = await processUnifiedMessage(
        prompt,
        mockCoverLetterDoc,
        emptyCv,
        null,
        null
      );

      assert.equal(result.success, true);
      assert.equal(result.targetSection, "Financial Sponsorship");
      assert.equal(
        result.targetAnchor?.snippet,
        "My higher education and living expenses in Italy will be fully sponsored"
      );
    });
  });

  describe("Workflow 2: Named Section Targeting", () => {
    it("improves and humanizes section when user specifies 'Improve the Why choose this university section and humanize it'", async () => {
      const prompt =
        "Improve the Why choose this university section and humanize it";
      const result = await processUnifiedMessage(
        prompt,
        mockCoverLetterDoc,
        emptyCv,
        null,
        null
      );

      assert.equal(result.success, true);
      assert.equal(result.actionType, "REWRITE_SECTION");
      assert.equal(result.needsAiRewrite, true);
      assert.equal(result.targetSection, "Why This University");
      assert.equal(result.targetAnchor?.heading, "Why This University");
      assert.equal(result.targetAnchor?.snippet, "");
      assert.ok(result.reply.includes("Why This University"));
    });

    it("handles phrasing 'improve it more the student introduction section'", async () => {
      const prompt = "improve it more the student introduction section .";
      const result = await processUnifiedMessage(
        prompt,
        mockCoverLetterDoc,
        emptyCv,
        null,
        null
      );

      assert.equal(result.success, true);
      assert.equal(result.actionType, "REWRITE_SECTION");
      assert.equal(result.targetSection, "Student Introduction");
      assert.equal(result.targetAnchor?.heading, "Student Introduction");
    });

    it("handles 'Rewrite financial sponsorship to include my father savings'", async () => {
      const prompt =
        "Rewrite financial sponsorship to include my father's fixed deposit and savings";
      const result = await processUnifiedMessage(
        prompt,
        mockCoverLetterDoc,
        emptyCv,
        null,
        null
      );

      assert.equal(result.success, true);
      assert.equal(result.actionType, "REWRITE_SECTION");
      assert.equal(result.targetSection, "Financial Sponsorship");
    });
  });

  describe("Missing Details & Field Updates", () => {
    it("updates target university across Subject Line, Why This University, and Why Italy", () => {
      const updated = updateCoverLetterSectionWithField(
        sampleCoverLetterSections,
        "destination.university",
        "International Institute of Technology, Milan (Fictional)",
        null,
        {}
      );

      const subjectSec = updated.find((s) => s.heading.toLowerCase().includes("subject"));
      assert.ok(subjectSec);
      assert.ok(subjectSec?.content.includes("International Institute of Technology, Milan (Fictional)"));

      const whyUniSec = updated.find((s) => s.heading.toLowerCase().includes("why this university"));
      assert.ok(whyUniSec);
      assert.ok(whyUniSec?.content.includes("International Institute of Technology, Milan (Fictional)"));

      const whyItalySec = updated.find((s) => s.heading.toLowerCase().includes("why italy"));
      assert.ok(whyItalySec);
      assert.ok(whyItalySec?.content.includes("International Institute of Technology, Milan (Fictional)"));
    });
  });
});

