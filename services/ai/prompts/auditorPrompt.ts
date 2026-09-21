/**
 * services/ai/prompts/auditorPrompt.ts
 *
 * Second-pass auditor and rewriter prompt for targeted repair of failed validation issues.
 * Enforces plain language, capable student voice, locked fact preservation, and zero fluff.
 */

import { LockedFact } from "../validators/lockedFactExtractor";

export interface AuditorIssue {
  type:
    | "LOCKED_FACT_MISSING"
    | "AI_CLICHE_DETECTED"
    | "PROMOTIONAL_DENSITY"
    | "ABSTRACT_LANGUAGE"
    | "PLAIN_LANGUAGE_REQUIRED"
    | "ZERO_INFORMATION_FILLER"
    | "REPETITIVE_SENTENCE_OPENING"
    | "SENTENCE_TOO_LONG"
    | "UNNECESSARY_REPETITION"
    | "PROHIBITED_CONTENT"
    | "DOCUMENT_TOO_LONG"
    | "MISSING_DIRECT_SENTENCE"
    | "SECTION_OVER_WORD_LIMIT"
    | "COUNTRY_TOURISM_FLUFF"
    | "SECTION_OWNERSHIP_VIOLATION";
  description: string;
  expected?: string;
  found?: string | number;
  paragraphIndex?: number;
}

export function buildAuditorPrompt(params: {
  documentType: string;
  originalDraft: string;
  issues: AuditorIssue[];
  lockedFacts: LockedFact[];
}): string {
  const issuesFormatted = params.issues
    .map((issue, idx) => {
      let line = `${idx + 1}. [${issue.type}] ${issue.description}`;
      if (issue.paragraphIndex) line += ` (Paragraph ${issue.paragraphIndex})`;
      if (issue.expected) line += ` | Required exact value: "${issue.expected}"`;
      if (issue.found !== undefined) line += ` | Found / Offending: "${issue.found}"`;
      return line;
    })
    .join("\n");

  const lockedFactsList = params.lockedFacts
    .map((lf) => `- [${lf.field}]: "${lf.value}"`)
    .join("\n");

  return `You are an expert editorial auditor reviewing a document created by another writer.

DOCUMENT TYPE: ${params.documentType}

TASK:
Rewrite only the failed paragraphs using simpler, more direct language.
Do not replace difficult words with other difficult synonyms.
Do NOT unnecessarily rewrite sections that already pass validation.

Semantic variation means natural references such as:
University of Padua → the university
Physics, Chemistry and Mathematics → these subjects → this academic background

It does NOT mean escalating simple language into academic or corporate vocabulary.
Preserve every locked fact.

STUDENT VOICE REQUIREMENTS:
- The document must sound like an earnest, capable student explaining real decisions clearly.
- It must NOT sound like:
  * a corporate consultant (do NOT use "leveraging synergies", "vital competencies", "advanced execution", "high-impact career")
  * an academic researcher (do NOT use "theoretical rigor", "pioneering research methodology")
  * university marketing material (do NOT use "prestigious institution", "remarkable legacy", "world-class")
  * an immigration lawyer (do NOT use stiff legalese)

SIMPLICITY RULE — TRANSFORMATIONS TO APPLY:
- "build an impactful professional career" → "begin my career"
- "rigorous technical training and analytical methodologies" → "technical knowledge and practical skills"
- "leverage the competencies acquired" → "use what I learned"
- "contribute to the rapidly expanding technological ecosystem" → "work in the technology sector"
- "acquire advanced competencies" → "develop my skills"
- "prestigious European diploma" → "degree"
- "world-class traditions of rigorous engineering scholarship" → "engineering education"
- "optimize commercial decision-making" → "help businesses make better decisions"
- "equip me with essential competencies" → "help me develop the skills"
- "leverage the technical precision and analytical methodologies" → "use the technical knowledge and practical skills"
- "build a high-impact technical career" → "begin my professional career"
- "advanced technical execution" → "practical engineering work"
- "translate these quantitative foundations into advanced technical execution" → "apply my mathematics background to practical engineering work"
- "comprehensive curriculum perfectly balances theoretical rigor" → "curriculum covers both theory and practical coursework"
- "vital technical competencies" → "practical technical skills"
- "remarkable academic legacy" → "established academic history"
- "exceptional standing" → "academic standing"
- "remarkably well-structured curriculum" → "well-structured coursework"
- "seamlessly integrates" → "combines"
- "distinguished faculty" → "experienced faculty"
- "pioneering research" → "ongoing research"
- "globally enriching perspective" → "broader perspective"
- "exceptional framework" → "effective curriculum"
- "academically stimulating environment" → "focused study environment"
- "robust foundation" → "solid foundation"
- "unwavering support" → "full financial support"
- "resolutely committed" → "fully committed"
- "steadfast dedication" → "dedication"

DO NOT MAKE EVERY SENTENCE IMPRESSIVE:
Every paragraph must contain at least one direct, simple sentence of approximately 8-16 words.
Example: "My plan is to return to India after completing my degree."
Do NOT rewrite simple sentences into complex ones.

SECTION OWNERSHIP & WORD LIMITS (FOR VISA COVER LETTERS):
- Why Course (80-110 words): background, course interest, relevant topics, skills to develop. No university prestige, Italy, family, or finances.
- Why University (70-90 words): university-specific academic reasons only. Do NOT repeat course explanation.
- Why Country (60-80 words): 2-3 educational reasons only. NO tourism praise (safe, beautiful, vibrant, historic, culturally rich).
- Career Plan (90-120 words): realistic starting roles, degree support, return intent. Do NOT repeat course/university reasons.

CONTROL PROMOTIONAL ADJECTIVES:
Ensure no paragraph contains more than one evaluative adjective.

INFORMATION-VALUE RULE:
Remove or ground any zero-information promotional filler. Every sentence must communicate a verified fact, a genuine personal reason, a logical connection, or a formal consular statement.

SENTENCE LENGTH RULE:
Keep editorial sentences concise (preferred 12-24 words; maximum 30 words). Do not damage factual lists (finances, itinerary, enclosed documents) merely to count words.

VALIDATION ISSUES REQUIRING REPAIR:
${issuesFormatted}

LOCKED FACT INVENTORY (MUST REMAIN EXACT):
${lockedFactsList}

ORIGINAL DRAFT UNDER AUDIT:
"""
${params.originalDraft}
"""

OUTPUT:
Return ONLY the complete finalized, repaired document text. Do not include commentary, explanations, apologies, or markdown code fences.`;
}
