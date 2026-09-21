/**
 * services/ai/prompts/coverLetterPrompt.ts
 *
 * Specific prompt instructions for Student Visa Cover Letters.
 * Enforces the complete VISA WRITING — PLAIN PROFESSIONAL LANGUAGE POLICY.
 */

import { CanonicalDocumentData } from "../documents/canonicalDocument";
import { DocumentPlan } from "../documents/documentPlanner";

export function buildCoverLetterPrompt(
  data: CanonicalDocumentData,
  plan: DocumentPlan
): string {
  const planInstructions = plan.paragraphs
    .map(
      (p, i) =>
        `${i + 1}. [Section: ${p.id}] ${p.title} (Target: ~${p.maxWords || 100} words)\n   Purpose: ${
          p.purpose
        }\n   Key Facts to Include: ${JSON.stringify(p.availableFacts)}`
    )
    .join("\n\n");

  return `DOCUMENT TYPE: STUDENT VISA COVER LETTER

OBJECTIVE:
Write a complete, formal, and consular-ready Student Visa Cover Letter based strictly on the applicant's verified facts.

==================================================
VISA WRITING — PLAIN PROFESSIONAL LANGUAGE POLICY
==================================================
Prioritize SIMPLE PROFESSIONAL ENGLISH over impressive, academic, corporate, promotional, or highly polished English.
The applicant should sound like an educated student explaining real decisions clearly.

The applicant should NOT sound like:
- a marketing writer
- a management consultant
- a university brochure
- an academic researcher
- a corporate executive
- an immigration lawyer

1. SIMPLICITY RULE:
Whenever two expressions communicate the same meaning, choose the simpler and more natural expression:
- "begin my career" instead of "build an impactful professional career"
- "technical knowledge and practical skills" instead of "rigorous technical training and analytical methodologies"
- "use what I learned" instead of "leverage the competencies acquired"
- "work in the technology sector" instead of "contribute to the rapidly expanding technological ecosystem"
- "develop my skills" instead of "acquire advanced competencies"
- "degree" instead of "prestigious European diploma"
- "engineering education" instead of "world-class traditions of rigorous engineering scholarship"
- "help businesses make better decisions" instead of "optimize commercial decision-making"

2. DO NOT MAKE EVERY SENTENCE IMPRESSIVE:
A natural paragraph must contain a mixture of:
- simple sentences
- factual sentences
- personal explanations
- moderately detailed sentences
Do NOT make every sentence sound sophisticated.
EVERY paragraph must contain at least one direct, simple sentence of approximately 8-16 words.
Example: "My plan is to return to India after completing my degree." (GOOD).
Do NOT rewrite it into: "My long-term professional objective remains firmly centred on returning to my home country following the successful completion of my academic programme."

3. CONTROL ABSTRACT LANGUAGE:
Avoid stacking abstract nouns such as:
methodologies, competencies, frameworks, infrastructure, innovation, transformation, expertise, execution, advancement, integration, perspectives, ecosystem, foundation.
One may be acceptable when genuinely necessary. Do NOT combine several in the same sentence.
BAD: "The rigorous analytical methodologies and advanced technical competencies will enable me to contribute to India's digital transformation and technological innovation."
BETTER: "The programme will help me develop the technical skills I need to begin my career in India."

4. CONTROL PROMOTIONAL ADJECTIVES:
Avoid unnecessary combinations of:
prestigious, renowned, exceptional, remarkable, distinguished, world-class, rigorous, comprehensive, vibrant, dynamic, inspiring, robust, impactful, pioneering, globally recognized.
A paragraph should normally contain NO MORE THAN ONE evaluative adjective unless facts genuinely require more.

5. PERSONAL REASON > GENERAL PRAISE:
Never answer: "Why is this university/country excellent?"
Instead answer: "Why did THIS STUDENT choose it?"
BAD: "Italy has a rich academic heritage and world-class educational traditions."
BETTER: "I chose Italy because the University of Padua offers the Information Engineering programme that matches my academic interests."
BAD: "The prestigious institution provides an exceptional academic environment."
BETTER: "The programme covers computing, electronics and communication systems, which are areas I want to study further."

6. SECTION OWNERSHIP (STRICT BOUNDARIES & WORD LIMITS):
Each section has ONE primary job:

- WHY COURSE (Target: 80-110 words):
  Explain student's previous academic background, what interested them in the subject, relevant parts of the course, and skills they want to develop.
  Do NOT discuss university prestige, Italy, family ties, or finances.

- WHY UNIVERSITY (Target: 70-90 words):
  Explain why this particular university using only verified university-specific reasons and how they help the student's academic goal.
  Do NOT repeat the complete course explanation.

- WHY COUNTRY (Target: 60-80 words):
  Explain why this country makes sense for this student's education (maximum 2-3 meaningful reasons).
  Do NOT write tourism or promotional content. Avoid words like: safe, beautiful, vibrant, historic, culturally rich, prestigious, inspiring.

- CAREER PLAN (Target: 90-120 words):
  Explain realistic post-graduation starting roles, how the degree supports those plans, long-term direction, and return-to-home-country plan.
  Do NOT repeat why the course, university, or country was chosen.

7. CAREER REALISM:
Use realistic early-career language:
Prefer: "begin my career", "gain practical experience", "work as a software developer", "develop my technical skills", "learn from experienced professionals", "take on greater responsibility over time".
Avoid: "high-impact career", "drive technological innovation", "lead digital transformation", "create sustainable competitive advantage", "navigate complex global ecosystems".

8. SEMANTIC VARIATION (SMOOTHER, NOT MORE SOPHISTICATED):
GOOD:
- University of Padua → the university
- Bachelor's Degree in Information Engineering → the programme → the degree
- Physics, Chemistry and Mathematics → these subjects → this academic background
BAD:
- academic background → quantitative foundation → analytical framework → intellectual methodology
Do NOT escalate simple vocabulary into abstract corporate or academic vocabulary.

9. SENTENCE LENGTH:
- Preferred: 12-24 words
- 25-30 words: acceptable occasionally
- Over 30 words: rewrite where practical (for editorial sentences)
Do NOT damage factual/legal sentences (logistics, financial figures, enclosures) merely to satisfy word counts.

10. INFORMATION VALUE RULE:
Every sentence must:
- provide a verified fact,
- explain a personal reason,
- connect two verified facts,
- explain a realistic future plan, or
- provide necessary formal consular information.
If a sentence does none of these, remove it. Generic praise is not useful information.

11. 5-PASS FINAL SELF-EDIT:
Before outputting each paragraph:
Pass 1: Remove promotional language.
Pass 2: Replace unnecessarily complex expressions with simpler alternatives.
Pass 3: Remove concepts already explained in another section.
Pass 4: Check that the paragraph sounds like an earnest, capable student speaking professionally.
Pass 5: Preserve all verified facts exactly (Name: ${data.applicant.name}, Passport: ${data.applicant.passportNumber}, University: ${data.university.officialName}, Course: ${data.course.officialName}, financial figures, logistics).

Do NOT intentionally introduce grammar mistakes.
Do NOT mention AI, AI detection, humanization, or this editing policy anywhere in the document.

STRUCTURAL PLAN:
${planInstructions}

OUTPUT FORMAT:
Return the complete, continuous cover letter text with formal paragraph breaks.
Do not use markdown bolding within body sentences unless separating section titles or formal letterhead.
Do not include conversational filler before or after the letter.`;
}
