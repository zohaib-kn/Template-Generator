/**
 * services/ai/prompts/lorPrompt.ts
 *
 * Specific prompt instructions for Letters of Recommendation (LOR).
 */

import { CanonicalDocumentData } from "../documents/canonicalDocument";
import { DocumentPlan } from "../documents/documentPlanner";

export function buildLorPrompt(
  data: CanonicalDocumentData,
  plan: DocumentPlan
): string {
  const recommenderName = data.recommender?.name || "Recommender";
  const recommenderTitle = data.recommender?.title || "Professor / Mentor";
  const applicantName = data.applicant.name;

  const planInstructions = plan.paragraphs
    .map(
      (p, i) =>
        `${i + 1}. [Section: ${p.id}] ${p.title} (Target: ~${p.maxWords || 110} words)\n   Purpose: ${
          p.purpose
        }\n   Key Facts to Include: ${JSON.stringify(p.availableFacts)}`
    )
    .join("\n\n");

  return `DOCUMENT TYPE: LETTER OF RECOMMENDATION (LOR)

OBJECTIVE:
Write an authoritative, credible Letter of Recommendation for ${applicantName} in support of their application to "${data.course.officialName}" at "${data.university.officialName}".

RECOMMENDER IDENTITY:
- Written strictly from the perspective of: ${recommenderName} (${recommenderTitle}${
    data.recommender?.department ? `, Department of ${data.recommender.department}` : ""
  }${data.recommender?.institution ? `, ${data.recommender.institution}` : ""})

STRUCTURAL PLAN:
Follow this structured blueprint:

${planInstructions}

CRITICAL RULES FOR LETTERS OF RECOMMENDATION:
1. Recommender Voice:
   - Must be written entirely from the third-person perspective evaluating the student ("I have known ${applicantName}...", "In my capacity as...").
   - NEVER slip into the applicant's first-person voice. The student must NOT recommend themselves.
2. ZERO FABRICATION (STRICTEST RULE):
   - NEVER invent or assert class rankings (e.g. "top 1%", "top 5%", "best student in 10 years") unless explicitly provided in source data.
   - NEVER invent fictional projects, laboratory experiments, or research papers not in the student's profile.
   - If specific projects are supplied (${
     data.projects.map((p) => p.title).join(", ") || "coursework assignments"
   }), reference them accurately. If not supplied, focus on analytical curiosity, coursework discipline, and conceptual understanding.
   - NEVER invent awards, prizes, or leadership positions not verified in the input facts.
3. Tone:
   - Authoritative, professional, scholarly, evaluative, and encouraging.
   - Avoid generic, hollow praise ("pleasant personality", "shining star", "invaluable asset to mankind"). Use substantive observations about problem-solving and academic engagement.
4. Specific Prohibitions:
   - DO NOT include student visa logistics, bank loans, financial numbers, flight itineraries, or consular requests.
   - DO NOT use AI marketing clichés ("prestigious institution", "world-class", "technical acumen", "beacon of excellence").

OUTPUT FORMAT:
Return the complete letter of recommendation text with formal salutation ("To the Graduate Admissions Committee,"), structured body paragraphs, and formal closing with the recommender's sign-off block.
Do not use markdown bolding within body sentences.`;
}
