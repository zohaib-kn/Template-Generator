import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDirectCvSectionInstruction } from "../utils/cvDirectSectionParser";
import {
  extractUserDirectiveAndSnippet,
  findSnippetInSections,
} from "../utils/documentAnchorMatcher";

describe("Direct CV Section Directives & Natural Suffix Routing", () => {
  const userFullPrompt = `add this text 'Social Media Management
Pitl FL Institute
October 2024 - December 2024
• Formulated and implemented detailed marketing strategies and initiatives to support organizational goals.
• Guided and managed social media activities to improve brand visibility and audience engagement.
• Used content strategies to increase social media reach and engagement.
• Supported collaborative efforts and maintained a performance-oriented work environment' into my Work experience /internship`;

  it("parses the user's full Work Experience prompt into workExperience sectionKey with stripped quotes", () => {
    const res = parseDirectCvSectionInstruction(userFullPrompt);
    assert.ok(res, "Expected prompt to be parsed by parseDirectCvSectionInstruction");
    assert.equal(res?.sectionKey, "workExperience");
    assert.equal(res?.heading, "WORK EXPERIENCE");

    // Must not have leading/trailing single quotes
    assert.ok(!res?.content.startsWith("'"), "Should strip leading single quote");
    assert.ok(!res?.content.endsWith("'"), "Should strip trailing single quote");

    // Content should start with Social Media Management
    assert.ok(res?.content.startsWith("Social Media Management"));
    assert.ok(res?.content.includes("Pitl FL Institute"));
    assert.ok(res?.content.includes("October 2024 - December 2024"));
    assert.ok(res?.content.includes("Formulated and implemented detailed marketing strategies"));
  });

  it("extractUserDirectiveAndSnippet treats 'add ... into section' as an add directive, not an in-place snippet replacement", () => {
    const extracted = extractUserDirectiveAndSnippet(userFullPrompt);
    assert.equal(
      extracted.isSnippetProvided,
      false,
      "Add directive must return isSnippetProvided: false to prevent hijacking in-place snippet editing"
    );
  });

  it("findSnippetInSections does not falsely match EDUCATION AND TRAINING for unrelated job entries", () => {
    const sections = [
      {
        heading: "ABOUT ME",
        content: "Aspirant software engineer focused on distributed cloud computing.",
      },
      {
        heading: "EDUCATION AND TRAINING",
        content:
          "Bachelor of Business Administration in Management\nABC University [ 2020 - 2023 ]\n• Relevant coursework in Management and Strategic Planning.",
      },
      {
        heading: "WORK EXPERIENCE",
        content:
          "German Language Instructor\nZaariz Education [ February 2025 – August 2025 ]\n• Delivered German language instruction.",
      },
    ];

    const extracted = `Social Media Management
Pitl FL Institute
October 2024 - December 2024
• Formulated and implemented detailed marketing strategies and initiatives to support organizational goals.
• Guided and managed social media activities to improve brand visibility and audience engagement.`;

    const match = findSnippetInSections(extracted, sections);
    // Should NOT falsely match EDUCATION AND TRAINING
    if (match) {
      assert.notEqual(
        match.sectionHeading,
        "EDUCATION AND TRAINING",
        "Should not falsely match EDUCATION AND TRAINING due to short common token 'Management'"
      );
    }
  });

  it("parses suffix directives for other sections (Certifications, Skills, Hobbies, Education)", () => {
    const certPrompt = "add this text 'AWS Solutions Architect - Amazon [2024]' into my Certifications";
    const certRes = parseDirectCvSectionInstruction(certPrompt);
    assert.ok(certRes);
    assert.equal(certRes?.sectionKey, "certifications");
    assert.equal(certRes?.content, "AWS Solutions Architect - Amazon [2024]");

    const skillsPrompt = "add this entry 'Python, React, TypeScript, Docker' to my digital skills";
    const skillsRes = parseDirectCvSectionInstruction(skillsPrompt);
    assert.ok(skillsRes);
    assert.equal(skillsRes?.sectionKey, "skills");
    assert.equal(skillsRes?.content, "Python, React, TypeScript, Docker");

    const hobbiesPrompt = "add this text 'Gym, Reading, Chess' into my Hobbies and Interests";
    const hobbiesRes = parseDirectCvSectionInstruction(hobbiesPrompt);
    assert.ok(hobbiesRes);
    assert.equal(hobbiesRes?.sectionKey, "hobbies");
    assert.equal(hobbiesRes?.content, "Gym, Reading, Chess");

    const eduPrompt = "add this text 'B.Tech in Computer Science, Politecnico di Milano [2020 - 2024]' into education and training";
    const eduRes = parseDirectCvSectionInstruction(eduPrompt);
    assert.ok(eduRes);
    assert.equal(eduRes?.sectionKey, "education");
    assert.equal(eduRes?.content, "B.Tech in Computer Science, Politecnico di Milano [2020 - 2024]");
  });
});
