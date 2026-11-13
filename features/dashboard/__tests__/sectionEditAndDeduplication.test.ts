import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { processUnifiedMessage } from "../utils/unifiedAssistantEngine";
import {
  extractUserDirectiveAndSnippet,
  findSnippetInSections,
} from "../utils/documentAnchorMatcher";
import {
  parseStudioResponse,
  buildStudioPrompt,
  type StudioEditRequest,
} from "@/services/ai/studio/studioEdit";
import { buildCoverLetterLayout } from "@/lib/export/coverLetterLayout";
import type { HydratedDocumentData } from "../utils/documentHydrator";
import type { DocumentData } from "@/types";

const mockCoverLetterDoc: HydratedDocumentData = {
  id: "doc-cl-1",
  studentId: "student-1",
  studentName: "Angad Deep",
  docType: "COVER_LETTER",
  title: "Italy Visa Cover Letter",
  sections: [
    {
      heading: "Recipient / Consulate",
      content: "To,\nThe Respected Visa Officer,\nEmbassy of Italy / Consulate General of Italy.",
    },
    {
      heading: "Subject Line",
      content: "Subject: Application for a Long-Term Type D Student Visa to Pursue Computer Engineering at the University of Cassino",
    },
    {
      heading: "Student Introduction",
      content: "My name is Angad Deep, and I am from Bhopal, India. I completed my schooling with distinction.",
    },
    {
      heading: "Why choose this course",
      content: "I have always enjoyed subjects that challenge me to think logically, especially Computer Engineering.",
    },
    {
      heading: "Why choose this university",
      content: "I chose the University of Cassino because it has long stood as an esteemed centre of academic excellence and higher learning.",
    },
    {
      heading: "Why Italy",
      content: "I chose Italy because it is home to the University of Cassino, the institution that best matched my academic interests and career goals. Italy is internationally recognized for the quality of its higher education.",
    },
    {
      heading: "Future Academic Plan",
      content: "After completing Computer Engineering, I intend to further advance my academic knowledge by pursuing postgraduate studies in the specialization that best aligns with my interests.",
    },
    {
      heading: "Career Plan",
      content: "In the short term, upon completing my higher education, I hope to secure an entry-level role related to Computer Engineering where I can apply my knowledge.",
    },
    {
      heading: "Return / Home Country Intent",
      content: "I have strong family and social ties in India. My parents and immediate family reside here, and I intend to return to India after completing my higher education in Italy to pursue professional opportunities and contribute to the growing Indian technology sector.",
    },
    {
      heading: "Financial Sponsorship",
      content: "My higher education and living expenses in Italy will be fully sponsored by my Father, who will cover all tuition and living expenses.",
    },
    {
      heading: "Student Contact & Signature",
      content: "Sincerely,\nAngad Deep\nEmail: angad@example.com",
    },
  ],
  targetCountry: "Italy",
  targetUniversity: "University of Cassino",
  targetCourse: "Computer Engineering",
  docTypeName: "Cover Letter",
  updatedAt: "Just now",
  route: "/studio",
  wordCount: 300,
  fieldValues: {},
};

const emptyCv: DocumentData = {
  personal: { fullName: "Angad Deep" },
  skills: [],
  internships: [],
  education: [],
} as unknown as DocumentData;

describe("Section-Level AI Editing & Duplication Prevention", () => {
  it("Scenario 1: User provides only section title with a directive", async () => {
    const prompt = "Why choose this university: humanize this section and make it sound natural";
    const res = await processUnifiedMessage(prompt, mockCoverLetterDoc, emptyCv, null, null);

    assert.equal(res.actionType, "REWRITE_SECTION");
    assert.equal(res.needsAiRewrite, true);
    assert.equal(res.targetSection, "Why choose this university");
    assert.equal(res.targetAnchor?.heading, "Why choose this university");
    assert.ok(res.aiPrompt?.includes('Rewrite, polish, and elevate ONLY the "Why choose this university" section'));
  });

  it("Scenario 2: User provides section title without colon e.g. 'Humanize Why choose this university section'", async () => {
    const prompt = "Humanize Why choose this university section and make it more professional";
    const res = await processUnifiedMessage(prompt, mockCoverLetterDoc, emptyCv, null, null);

    assert.equal(res.actionType, "REWRITE_SECTION");
    assert.equal(res.targetSection, "Why choose this university");
    assert.equal(res.targetAnchor?.heading, "Why choose this university");
  });

  it("Scenario 3: User pastes the complete section content with a directive on a newline", async () => {
    const pastedText =
      "I have strong family and social ties in India. My parents and immediate family reside here, and I intend to return to India after completing my higher education in Italy to pursue professional opportunities and contribute to the growing Indian technology sector.\n\nHumanize and rewrite this section in a more natural and professional way.";

    const res = await processUnifiedMessage(pastedText, mockCoverLetterDoc, emptyCv, null, null);

    assert.equal(res.actionType, "REWRITE_SECTION");
    assert.equal(res.needsAiRewrite, true);
    assert.equal(res.targetSection, "Return / Home Country Intent");
    assert.equal(res.targetAnchor?.heading, "Return / Home Country Intent");
    assert.ok(res.targetAnchor?.snippet.length > 50);
  });

  it("Scenario 4: User pastes raw section content directly into chat without directive or quotes", async () => {
    const rawContent =
      "I have strong family and social ties in India. My parents and immediate family reside here, and I intend to return to India after completing my higher education in Italy to pursue professional opportunities and contribute to the growing Indian technology sector.";

    const res = await processUnifiedMessage(rawContent, mockCoverLetterDoc, emptyCv, null, null);

    assert.equal(res.actionType, "REWRITE_SECTION");
    assert.equal(res.needsAiRewrite, true);
    assert.equal(res.targetSection, "Return / Home Country Intent");
    assert.equal(res.targetAnchor?.heading, "Return / Home Country Intent");
  });

  it("Scenario 5: User asks to modify a section that does not exist in the document", async () => {
    const prompt = "Humanize the Publications section and make it sound natural";
    const res = await processUnifiedMessage(prompt, mockCoverLetterDoc, emptyCv, null, null);

    assert.equal(res.actionType, "CLARIFY");
    assert.equal(res.needsAiRewrite, false);
    assert.match(res.reply, /couldn't find a section named "Publications"/i);
    assert.match(res.reply, /Why choose this university/i);
  });

  it("Scenario 6: parseStudioResponse preserves all non-target sections 100% byte-for-byte", () => {
    const editReq: StudioEditRequest = {
      docType: "COVER_LETTER",
      title: "Cover Letter",
      sections: mockCoverLetterDoc.sections,
      instruction: "Humanize Why choose this university section",
      targetAnchor: {
        heading: "Why choose this university",
        snippet: "",
      },
    };

    const mockAiOutput = JSON.stringify({
      reply: "I have refined the Why choose this university section.",
      sections: [
        {
          heading: "Why choose this university",
          content: "### Why choose this university\nHere is the rewritten section:\nThe University of Cassino stands out as an exceptional academic environment that fosters scholarly inquiry and hands-on engineering excellence.\n\nI hope this helps!",
        },
        // Model erroneously modified other sections:
        {
          heading: "Why Italy",
          content: "MUTATED_ITALY_CONTENT_THAT_SHOULD_BE_REVERTED",
        },
        {
          heading: "Financial Sponsorship",
          content: "MUTATED_FINANCE_CONTENT_THAT_SHOULD_BE_REVERTED",
        },
      ],
      changedHeadings: ["Why choose this university", "Why Italy"],
    });

    const parsed = parseStudioResponse(mockAiOutput, editReq);

    // Section count & order strictly preserved
    assert.equal(parsed.sections.length, mockCoverLetterDoc.sections.length);

    // Target section updated and cleaned of markdown and preambles
    const updatedUni = parsed.sections.find((s) => s.heading === "Why choose this university");
    assert.ok(updatedUni);
    assert.ok(!updatedUni.content.includes("###"));
    assert.ok(!updatedUni.content.includes("Here is the rewritten section:"));
    assert.ok(!updatedUni.content.includes("I hope this helps!"));
    assert.ok(updatedUni.content.includes("The University of Cassino stands out as an exceptional academic environment"));

    // Other sections strictly preserved
    const italySec = parsed.sections.find((s) => s.heading === "Why Italy");
    const origItaly = mockCoverLetterDoc.sections.find((s) => s.heading === "Why Italy");
    assert.equal(italySec?.content, origItaly?.content);

    const financeSec = parsed.sections.find((s) => s.heading === "Financial Sponsorship");
    const origFinance = mockCoverLetterDoc.sections.find((s) => s.heading === "Financial Sponsorship");
    assert.equal(financeSec?.content, origFinance?.content);
  });

  it("Scenario 7: parseStudioResponse cleans cross-section contamination and duplicate sentences", () => {
    const editReq: StudioEditRequest = {
      docType: "COVER_LETTER",
      title: "Cover Letter",
      sections: mockCoverLetterDoc.sections,
      instruction: "Humanize Future Academic Plan",
      targetAnchor: {
        heading: "Future Academic Plan",
        snippet: "",
      },
    };

    // The AI erroneously copied sentences from "Why Italy" into "Future Academic Plan"
    const contaminatedAiContent =
      "I chose Italy because it is home to the University of Cassino, the institution that best matched my academic interests and career goals. " +
      "Italy is internationally recognized for the quality of its higher education. " +
      "After completing my degree in Computer Engineering, my objective is to undertake postgraduate studies in distributed systems.";

    const mockAiOutput = JSON.stringify({
      reply: "Rewrote Future Academic Plan.",
      sections: [
        {
          heading: "Future Academic Plan",
          content: contaminatedAiContent,
        },
      ],
      changedHeadings: ["Future Academic Plan"],
    });

    const parsed = parseStudioResponse(mockAiOutput, editReq);
    const updatedPlan = parsed.sections.find((s) => s.heading === "Future Academic Plan");

    assert.ok(updatedPlan);
    // Verifies cross-contaminated "Why Italy" sentences were purged from "Future Academic Plan"
    assert.ok(!updatedPlan.content.includes("I chose Italy because it is home to the University of Cassino"));
    assert.ok(updatedPlan.content.includes("After completing my degree in Computer Engineering"));
  });

  it("Scenario 8: Cover Letter Layout eliminates duplicate sentences across paragraphs on canvas", () => {
    const sectionsWithDuplicates = [
      {
        title: "Why Italy",
        content: "I chose Italy because it is home to the University of Cassino, which aligns closely with my academic interests.",
      },
      {
        title: "Future Academic Plan",
        content: "I chose Italy because it is home to the University of Cassino, which aligns closely with my academic interests. After graduation, I intend to pursue specialized master courses.",
      },
      {
        title: "Financial Sponsorship",
        content: "My higher education and living expenses will be fully sponsored by my Father. I will obtain travel and health insurance.",
      },
      {
        title: "Travel & Health Insurance",
        content: "I will obtain travel and health insurance.",
      },
    ];

    const layout = buildCoverLetterLayout(sectionsWithDuplicates);

    // Check that "I chose Italy because..." appears only once across all paragraphs
    const allText = layout.paragraphs.join("\n\n");
    const occurrences = (allText.match(/I chose Italy because it is home to the University of Cassino/g) || []).length;
    assert.equal(occurrences, 1, "Why Italy sentence must not be duplicated in Future Academic Plan paragraph");

    const insuranceOccurrences = (allText.match(/I will obtain travel and health insurance/g) || []).length;
    assert.equal(insuranceOccurrences, 1, "Insurance sentence must not be duplicated in logistics paragraph");
  });

  it("Scenario 9: Colon prompt 'Future Academic Plan: make this section more professional' matches Future Academic Plan and NOT Why choose this course", async () => {
    const prompt = "Future Academic Plan: make this section more professional and convincing";
    const res = await processUnifiedMessage(prompt, mockCoverLetterDoc, emptyCv, null, null);

    assert.equal(res.actionType, "REWRITE_SECTION");
    assert.equal(res.needsAiRewrite, true);
    assert.equal(res.targetSection, "Future Academic Plan");
    assert.equal(res.targetAnchor?.heading, "Future Academic Plan");
    assert.ok(!res.reply.includes("Why choose this course"));
    assert.ok(res.reply.includes("Future Academic Plan"));
  });

  it("Scenario 10: 'Humanize the Why choose this university section' targets Why choose this university and NEVER Closing Statement", async () => {
    const prompt = "Humanize the Why choose this university section and make it sound natural";
    const res = await processUnifiedMessage(prompt, mockCoverLetterDoc, emptyCv, null, null);

    assert.equal(res.actionType, "REWRITE_SECTION");
    assert.equal(res.needsAiRewrite, true);
    assert.equal(res.targetSection, "Why choose this university");
    assert.equal(res.targetAnchor?.heading, "Why choose this university");
    assert.ok(!res.reply.includes("Closing Statement"));
    assert.ok(res.reply.includes("Why choose this university"));
  });

  it("Scenario 11: Comprehensive Future Academic Plan suppresses appending legacy duplicate Career Plan and Return Intent sections", () => {
    const sectionsWithComprehensiveFuturePlan = [
      {
        title: "Future Academic Plan",
        content:
          "Upon completing my degree in Computer Engineering, I am committed to deepening my expertise by pursuing postgraduate studies in a specialization that closely aligns with my evolving interests and long-term professional objectives. My immediate goal after graduation is to return to my home country and embark on my professional career. I aim to secure an entry-level position in the field of Computer Engineering, where I can leverage the advanced knowledge and international perspective gained during my studies in Italy. Over time, I aspire to advance into roles of greater responsibility, making a meaningful impact within my profession and contributing to the growth of my home country. Returning home is also a personal priority, as I value the opportunity to build my future near my family.",
      },
      {
        title: "Career Plan",
        content:
          "In the short term, upon completing my higher education, I intend to return to my home country and begin my professional career. I hope to secure an entry-level role related to Computer Engineering where I can apply the knowledge gained in Italy.",
      },
      {
        title: "Return / Home Country Intent",
        content:
          "Returning to my home country is also a personal priority, as I wish to build my future close to my family while making a meaningful contribution to my home country.",
      },
    ];

    const layout = buildCoverLetterLayout(sectionsWithComprehensiveFuturePlan);
    const plansParagraph = layout.paragraphs[0]; // first body paragraph here since only plans were provided

    // Verify plansParagraph uses the comprehensive future plan and did not append duplicate return sentences
    assert.ok(plansParagraph.includes("Upon completing my degree in Computer Engineering"));
    assert.ok(plansParagraph.includes("Returning home is also a personal priority"));
    assert.ok(!plansParagraph.includes("In the short term, upon completing my higher education, I intend to return to my home country"));
  });
});

