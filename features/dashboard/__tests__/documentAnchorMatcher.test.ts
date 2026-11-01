import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractUserDirectiveAndSnippet,
  findSnippetInSections,
  normalizeSearchText,
} from "../utils/documentAnchorMatcher";

describe("Document Anchor Matcher", () => {
  const sampleSections = [
    {
      heading: "ABOUT ME",
      content:
        "I am an enthusiastic computer science aspirant committed to developing scalable web architectures.",
    },
    {
      heading: "WORK EXPERIENCE",
      content:
        "Web Development Intern\nGeniushub [ 01/06/2024 - 31/07/2024 ]\n• I built three projects in HTML, CSS and JavaScript: a portfolio page, an interactive profile card, and a testimonials webpage.\n• Tested cross-device responsiveness and received a trophy for top performance.",
    },
    {
      heading: "MOTIVATION AND ACADEMIC OBJECTIVES",
      content:
        "My long-standing passion for distributed systems drives my intention to pursue a Bachelor of Science at Politecnico di Torino.",
    },
  ];

  it("extracts directive and snippet when formatted with colon prefix", () => {
    const prompt =
      'Enhance this text: "I built three projects in HTML, CSS and JavaScript: a portfolio page"';
    const res = extractUserDirectiveAndSnippet(prompt);
    assert.equal(res.isSnippetProvided, true);
    assert.equal(res.directive.toLowerCase(), "enhance");
    assert.equal(
      res.snippet,
      "I built three projects in HTML, CSS and JavaScript: a portfolio page"
    );
  });

  it("extracts directive and snippet with humanize phrasing", () => {
    const prompt =
      "Make this better and humanize it: I built three projects in HTML, CSS and JavaScript";
    const res = extractUserDirectiveAndSnippet(prompt);
    assert.equal(res.isSnippetProvided, true);
    assert.ok(res.directive.toLowerCase().includes("humanize"));
    assert.equal(
      res.snippet,
      "I built three projects in HTML, CSS and JavaScript"
    );
  });

  it("identifies exact section when snippet matches content", () => {
    const snippet =
      "I built three projects in HTML, CSS and JavaScript: a portfolio page";
    const anchor = findSnippetInSections(snippet, sampleSections);
    assert.ok(anchor);
    assert.equal(anchor?.sectionHeading, "WORK EXPERIENCE");
    assert.ok(anchor?.confidence && anchor.confidence >= 0.9);
  });

  it("identifies section using fuzzy token matching when bullet points or punctuation differ", () => {
    const snippet =
      "Tested cross device responsiveness and received trophy for top performance";
    const anchor = findSnippetInSections(snippet, sampleSections);
    assert.ok(anchor);
    assert.equal(anchor?.sectionHeading, "WORK EXPERIENCE");
    assert.ok(anchor?.confidence && anchor.confidence >= 0.6);
  });

  it("identifies paragraph in cover letter motivation section", () => {
    const snippet = "passion for distributed systems drives my intention";
    const anchor = findSnippetInSections(snippet, sampleSections);
    assert.ok(anchor);
    assert.equal(
      anchor?.sectionHeading,
      "MOTIVATION AND ACADEMIC OBJECTIVES"
    );
  });

  it("returns isSnippetProvided = false for generic conversational prompts", () => {
    const prompt = "Improve the overall tone of my work experience";
    const res = extractUserDirectiveAndSnippet(prompt);
    assert.equal(res.isSnippetProvided, false);
    assert.equal(res.directive, prompt);
  });
});

