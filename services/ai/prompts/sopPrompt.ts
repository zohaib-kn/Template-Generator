/**
 * services/ai/prompts/sopPrompt.ts
 *
 * Specific prompt instructions for Statement of Purpose (SOP).
 */

import { CanonicalDocumentData } from "../documents/canonicalDocument";
import { DocumentPlan } from "../documents/documentPlanner";

export function buildSopPrompt(
  data: CanonicalDocumentData,
  plan: DocumentPlan
): string {
  const planInstructions = plan.paragraphs
    .map(
      (p, i) =>
        `${i + 1}. [Section: ${p.id}] ${p.title} (Target: ~${p.maxWords || 120} words)\n   Purpose: ${
          p.purpose
        }\n   Key Facts to Include: ${JSON.stringify(p.availableFacts)}`
    )
    .join("\n\n");

  return `DOCUMENT TYPE: STATEMENT OF PURPOSE (SOP)

OBJECTIVE:
Write a compelling, scholarly, and authentic Statement of Purpose for admission to "${data.course.officialName}" at "${data.university.officialName}".

STRUCTURAL PLAN:
Develop a cohesive, well-flowing academic essay following this blueprint:

${planInstructions}

CRITICAL RULES FOR STATEMENT OF PURPOSE:
1. Academic Perspective:
   - Written in the applicant's first-person voice ("I").
   - Tone: Reflective, academically driven, purposeful, and intellectually mature. Creativity: MEDIUM.
2. STRICT PROHIBITIONS:
   - NEVER mention bank account balances, financial net worth, tuition loans, or financial sponsorship.
   - NEVER mention visa insurance policies, health insurance coverage, flight tickets, PNR numbers, or accommodation lease bookings.
   - NEVER address a "Visa Officer" or "Consulate General". The audience is the Academic Admissions Committee.
   - DO NOT use childish opening clichés (e.g. "Ever since I was a child", "Since time immemorial").
3. Facts & Specificity:
   - Ground academic discussion in actual subjects studied (${data.education.subjects.join(", ") || "core disciplines"}) and the target curriculum.
   - If projects or work experience are provided, discuss their technical substance, methodologies, and lessons learned.
   - If projects or work experience are NOT provided, do NOT invent fictional companies, clients, or research papers. Focus on academic coursework and problem-solving.
4. Natural Semantic Variation & Syntax:
   - Vary sentence structures naturally. Avoid repeatedly starting sentences with "I chose", "I want", "I intend", or "My goal is".
   - Avoid generic marketing buzzwords ("prestigious institution", "world-class", "perfectly aligns", "transformative journey", "academic excellence").
5. Official Names:
   - The official course name ("${data.course.officialName}") and university name ("${data.university.officialName}") must remain consistent on first reference.

OUTPUT FORMAT:
Return a cohesive, multi-paragraph Statement of Purpose with clean paragraph breaks.
Do not use markdown bolding within body sentences.
Do not include commentary or meta-text.`;
}
