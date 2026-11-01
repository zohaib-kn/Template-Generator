import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildStudioPrompt,
  parseStudioResponse,
  type StudioEditRequest,
} from "../studio/studioEdit";

describe("Studio Edit — In-Place Contextual Text Enhancement & Replacement", () => {
  const baseRequest: StudioEditRequest = {
    docType: "CV",
    title: "Europass Academic CV",
    sections: [
      {
        heading: "ABOUT ME",
        content:
          "I am a software engineer dedicated to building high-performance web applications.",
      },
      {
        heading: "WORK EXPERIENCE",
        content:
          "Web Development Intern\nGeniushub [ 01/06/2024 - 31/07/2024 ]\n• I built three projects in HTML, CSS and JavaScript: a portfolio page, an interactive profile card component, and a testimonials webpage.\n• Tested across devices and recognized as top performer.",
      },
    ],
    instruction:
      "Make this bullet more impactful and humanize it: I built three projects in HTML, CSS and JavaScript",
    targetAnchor: {
      heading: "WORK EXPERIENCE",
      snippet:
        "I built three projects in HTML, CSS and JavaScript: a portfolio page, an interactive profile card component, and a testimonials webpage.",
    },
  };

  it("buildStudioPrompt injects targeted in-place anchor directive into prompt", () => {
    const prompt = buildStudioPrompt(baseRequest);
    assert.ok(prompt.includes("TARGETED IN-PLACE EDIT"));
    assert.ok(prompt.includes('inside section "WORK EXPERIENCE"'));
    assert.ok(
      prompt.includes(
        "I built three projects in HTML, CSS and JavaScript: a portfolio page"
      )
    );
  });

  it("parseStudioResponse validates and preserves in-place section structure", () => {
    const mockModelResponse = JSON.stringify({
      reply:
        "Enhanced and humanized the Geniushub web development bullet point in-place.",
      sections: [
        {
          heading: "ABOUT ME",
          content:
            "I am a software engineer dedicated to building high-performance web applications.",
        },
        {
          heading: "WORK EXPERIENCE",
          content:
            "Web Development Intern\nGeniushub [ 01/06/2024 - 31/07/2024 ]\n• Engineered three production-grade web interfaces utilizing HTML5, CSS3, and modern JavaScript, including an interactive portfolio and responsive component suite.\n• Tested across devices and recognized as top performer.",
        },
      ],
      changedHeadings: ["WORK EXPERIENCE"],
    });

    const result = parseStudioResponse(mockModelResponse, baseRequest);
    assert.equal(result.sections.length, 2);
    assert.equal(result.changedHeadings[0], "WORK EXPERIENCE");
    assert.ok(
      result.sections[1].content.includes("Engineered three production-grade web interfaces")
    );
    // Verified: First section was preserved byte-for-byte
    assert.equal(result.sections[0].content, baseRequest.sections[0].content);
  });
});

