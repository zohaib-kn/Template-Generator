/**
 * services/ai/examples/exampleRetriever.ts
 *
 * Selects only the most relevant senior-approved examples based on:
 * 1. same document type (strictly required)
 * 2. same destination country
 * 3. same study area
 * 4. similar education level
 *
 * Maximum examples sent to Gemini: 2 or 3 (to minimize token usage on free API keys).
 * Structured so it can be swapped for vector/semantic search later without touching generation service.
 */

import { exampleRepository } from "./exampleRepository";
import { ApprovedDocumentExample, ExampleRetrievalQuery } from "./exampleTypes";

export async function retrieveRelevantExamples(
  query: ExampleRetrievalQuery
): Promise<ApprovedDocumentExample[]> {
  const { documentType, destinationCountry, studyArea, educationLevel, limit = 2 } = query;

  // 1. Filter by document type
  const allOfType = await exampleRepository.getApprovedExamples(documentType);
  if (allOfType.length === 0) {
    return [];
  }

  // 2. Score candidates based on relevance
  const scored = allOfType.map((ex) => {
    let score = 0;

    // Destination Country match
    if (
      destinationCountry &&
      ex.destinationCountry &&
      (ex.destinationCountry.toLowerCase() === destinationCountry.toLowerCase() ||
        ex.destinationCountry.toLowerCase() === "global")
    ) {
      score += 40;
    }

    // Study Area match
    if (studyArea && ex.studyArea) {
      const qLower = studyArea.toLowerCase();
      const exLower = ex.studyArea.toLowerCase();
      if (exLower === qLower) {
        score += 30;
      } else if (exLower.includes(qLower) || qLower.includes(exLower)) {
        score += 15;
      }
    }

    // Education Level match
    if (
      educationLevel &&
      ex.educationLevel &&
      ex.educationLevel.toLowerCase() === educationLevel.toLowerCase()
    ) {
      score += 15;
    }

    return { example: ex, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Return top N (max 2 or 3)
  const maxLimit = Math.min(limit, 3);
  return scored.slice(0, maxLimit).map((s) => s.example);
}

/**
 * Formats retrieved examples into a compact text block for the Gemini prompt.
 */
export function formatExamplesForPrompt(examples: ApprovedDocumentExample[]): string {
  if (examples.length === 0) return "";

  const formatted = examples
    .map((ex, i) => {
      return `--- APPROVED REFERENCE EXAMPLE ${i + 1} (${ex.documentType} | Country: ${
        ex.destinationCountry
      } | Field: ${ex.studyArea}) ---
[Reviewer Guidance: ${ex.reviewerNotes.join("; ")}]

${ex.approvedFinal}`;
    })
    .join("\n\n");

  return `RELEVANT SENIOR-APPROVED REFERENCE EXAMPLES (For Tone, Structure & Clarity Reference):
${formatted}`;
}
