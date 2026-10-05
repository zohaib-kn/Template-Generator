/**
 * services/ai/prompts/sopPrompt.ts
 *
 * Specific prompt instructions for Statement of Purpose (SOP).
 */

import { CanonicalDocumentData } from "../documents/canonicalDocument";
import { DocumentPlan } from "../documents/documentPlanner";
import { STUDENT_VOICE_GUIDELINES, HUMANIZATION_PASS_CHECKLIST } from "./studentVoiceGuidelines";

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

  const transitionInstructions = data.academicTransition?.isTransition
    ? `\nACADEMIC TRANSITION & BRIDGE EVIDENCE DIRECTIVES:
- Transition Context: The applicant is pivoting disciplines from ${data.education.qualification} (${data.academicTransition.sourceDomain || "Prior Field"}) to ${data.course.officialName} (${data.academicTransition.targetDomain || "Target Field"}).
- Counsellor Transition Rationale: "${data.academicTransition.reason || "Candidate prepared for this transition through focused practical experience."}"
- Verified Bridging Evidence: ${data.academicTransition.bridgeEvidence && data.academicTransition.bridgeEvidence.length > 0 ? data.academicTransition.bridgeEvidence.join(", ") : "Relevant internships and practical projects"}
- Narrative Directive: Explicitly demonstrate how foundational skills from their undergraduate study combine with their practical bridge experiences to qualify them for this specific curriculum.\n`
    : "";

  return `DOCUMENT TYPE: STATEMENT OF PURPOSE (SOP)

OBJECTIVE:
Write an authentic, sincere, and compelling Statement of Purpose for admission to "${data.course.officialName}" at "${data.university.officialName}".
The essay must sound like it was written by a real, motivated student applying for higher studies abroad.

STRUCTURAL PLAN:
Develop a cohesive, well-flowing essay following this blueprint:

${planInstructions}
${transitionInstructions}
${STUDENT_VOICE_GUIDELINES}

CRITICAL SOP AUDIENCE & ADMISSIONS RULES:
1. Academic Perspective:
   - Written in the applicant's first-person voice ("I").
   - Serious, thoughtful, motivated, and capable student tone.
2. STRICT PROHIBITIONS:
   - NEVER mention bank account balances, financial net worth, tuition loans, or financial sponsorship.
   - NEVER mention visa insurance policies, health insurance coverage, flight tickets, PNR numbers, or accommodation lease bookings.
   - NEVER address a "Visa Officer" or "Consulate General". The audience is the Academic Admissions Committee.
   - DO NOT use childish opening clichés (e.g. "Ever since I was a child", "Since time immemorial").
3. Facts & Specificity:
   - Ground academic discussion in actual subjects studied (${data.education.subjects.join(", ") || "core disciplines"}) and the target curriculum.
   - If projects or work experience are provided, discuss their actual substance, tools, and lessons learned.
   - If projects or work experience are NOT provided, do NOT invent fictional companies, clients, or research papers. Focus on academic coursework, personal motivation, and problem-solving.
4. Natural Semantic Variation & Syntax:
   - Vary sentence structures naturally. Mix short, medium, and longer sentences.
   - Strictly avoid overly academic jargon and corporate buzzwords ("rigorous analytical foundation", "comprehensive training tailored to contemporary technical standards", "prestigious institution", "world-class", "perfectly aligns", "transformative journey").
5. Official Names:
   - The official course name ("${data.course.officialName}") and university name ("${data.university.officialName}") must remain consistent on first reference.

${HUMANIZATION_PASS_CHECKLIST}

OUTPUT FORMAT:
Return a cohesive, multi-paragraph Statement of Purpose with clean paragraph breaks.
Do not use markdown bolding within body sentences.
Do not include commentary or meta-text.`;
}
