/**
 * services/ai/prompts/studentVoiceGuidelines.ts
 *
 * Centralized natural student voice guidelines, level-aware prompt adaptation,
 * section-specific instructions, humanization checklist pass, and rewrite-natural mode.
 *
 * TARGET VOICE:
 * Professional, sincere, clear, personal, and naturally student-written.
 * Sounds like a real college student applying for higher studies abroad — NOT an
 * academic consultant, marketing writer, professor, or corporate AI.
 */

import type { StudentDocumentContext, SopDocumentType } from "@/features/sop-generator/types/sop-generator";

// ---------------------------------------------------------------------------
// Core Reusable Guidelines
// ---------------------------------------------------------------------------

export const STUDENT_VOICE_GUIDELINES = `
TARGET VOICE & PERSONA:
- Write strictly from the student's natural first-person perspective ("I").
- The student sounds like:
  * a serious, academically motivated student
  * thoughtful about their future and realistic next steps
  * reasonably confident and genuinely interested in their chosen subject
  * capable of writing clear, correct, and respectful English
  * NOT like a university professor, academic consultant, marketing writer, lawyer, or AI system.
- The writing must feel believable for a student applying for undergraduate or postgraduate studies abroad.

NATURAL STUDENT LANGUAGE:
- Prefer simple, natural, and direct student expressions:
  * "I became interested in..."
  * "I have always enjoyed..."
  * "What attracted me to this course was..."
  * "I chose this programme because..."
  * "I believe this course will help me..."
  * "During my studies, I developed..."
  * "I want to learn more about..."
  * "This interested me because..."
  * "In the future, I hope to..."
  * "After completing my studies, I plan to..."
- Use these naturally and variably, never mechanically.

AVOID OVERLY ACADEMIC & CONSULTANT JARGON (STRICT PROHIBITIONS):
- Do NOT use inflated, pretentious, or robotic vocabulary. Strictly avoid:
  * "rigorous analytical foundation"
  * "comprehensive training tailored to contemporary technical standards"
  * "practical execution of modern information systems"
  * "complex infrastructural networks"
  * "mathematical rigor"
  * "sophisticated technical framework"
  * "multidisciplinary ecosystem"
  * "dynamic technological landscape"
  * "transformative academic journey"
  * "cutting-edge environment"
  * "prestigious institution"
  * "unparalleled opportunity"
  * "beacon of excellence"
  * "perfectly aligns"
- Only use technical terms when strictly necessary to identify actual subjects or course areas.
- Use everyday academic English:
  * Instead of: "Having developed a rigorous analytical foundation through my higher secondary studies..."
    Prefer: "My interest in technical subjects grew during my higher secondary studies, especially while studying Physics and Mathematics."
  * Instead of: "The programme directly addresses my academic motivations..."
    Prefer: "The course interested me because it combines areas such as electronics, computer systems, communication and automation."

KEEP THE STUDENT'S PERSONAL CONNECTION:
- Every paragraph must answer:
  * Why does THIS specific student care about this?
  * What interested them personally?
  * How does their prior education connect?
  * What do they want to learn?
  * How will this course help their future career?
- Keep the student's personal perspective central. Do NOT turn the paragraph into a course catalog or university marketing brochure.

REALISTIC SENTENCE STRUCTURE & RHYTHM:
- Do NOT make every sentence long, complex, or clause-heavy.
- Mix sentence lengths naturally: short sentences (8-14 words), medium sentences (15-22 words), and occasional longer sentences.
- Use natural transitional phrases:
  * "This is one of the reasons..."
  * "At the same time..."
  * "As I learned more about the field..."
  * "What interested me most..."
  * "For me..."
  * "I also feel..."
  * "This will help me..."
- Do NOT overuse formulaic connectors (e.g. "Furthermore", "Moreover", "In addition" in every sentence).

AVOID ARTIFICIAL SYMMETRY:
- Do NOT force every paragraph into the same rigid structure (e.g. statement -> technical explanation -> curriculum explanation -> career goal).
- Allow a natural progression of thought, just like a thoughtful student writes.

PROFESSIONAL DOES NOT MEAN COMPLEX:
- Maintain correct grammar, clear sentence structure, respectful tone, appropriate vocabulary, and logical flow.
- Do NOT attempt to impress the admissions committee with advanced dictionary words. Clarity, authenticity, and directness are far more persuasive.

STRICT FACTUAL FIDELITY (NEVER ALTER OR INVENT FACTS):
- Preserve every verified fact exactly as provided in the student context:
  * marks, percentages, and CGPA (e.g., if source says 88.6%, keep "88.6%", never round or alter)
  * IELTS or language test scores and sub-scores
  * previous qualifications, boards, institutions, and completion years
  * target university, target course name, degree level, city, country, intake
  * sponsor name, sponsor relationship, and sponsor occupation
  * dates, passport numbers, and addresses
- AI must ONLY improve the narrative surrounding these facts.

ZERO INVENTED PERSONAL EXPERIENCES:
- Do NOT invent fictional anecdotes or experiences:
  * NO stories about childhood fascination with computers or repairing broken electronics
  * NO fictional school projects, clubs, or competitions not mentioned in the source
  * NO unverified internships, jobs, or research papers
  * NO fake family inspirations or dramatic turning points
- If supporting data does not provide a project or work experience, focus genuinely on coursework, academic subjects, and logical motivations.

RESPECTFUL ENGLISH QUALITY (NO ARTIFICIAL MISTAKES):
- Do NOT introduce intentional typos, grammatical errors, slang, broken English, or conversational fillers ("umm", "well").
- Natural human student writing means clear, authentic thought and straightforward phrasing — not bad English.
`.trim();

// ---------------------------------------------------------------------------
// Age / Education Level Detection & Guidance
// ---------------------------------------------------------------------------

export type EducationLevelType =
  | "BACHELORS_APPLICANT"
  | "MASTERS_APPLICANT"
  | "PROFESSIONAL_APPLICANT";

export function detectEducationLevel(ctx: StudentDocumentContext): {
  level: EducationLevelType;
  guidance: string;
} {
  const latestQual = (ctx.academics.latestQualification || "").toLowerCase();
  const targetDegree = (ctx.destination.degreeLevel || "").toLowerCase();
  const prevDegree = (ctx.academics.previousDegree || "").toLowerCase();

  const isBachelorsApplicant =
    targetDegree.includes("bachelor") ||
    targetDegree.includes("undergraduate") ||
    latestQual.includes("12") ||
    latestQual.includes("secondary") ||
    latestQual.includes("intermediate") ||
    latestQual.includes("high school") ||
    latestQual.includes("cbse") ||
    latestQual.includes("icse");

  const isMastersApplicant =
    targetDegree.includes("master") ||
    targetDegree.includes("postgraduate") ||
    targetDegree.includes("msc") ||
    targetDegree.includes("mba") ||
    latestQual.includes("bachelor") ||
    latestQual.includes("b.tech") ||
    latestQual.includes("b.e.") ||
    latestQual.includes("b.sc") ||
    prevDegree.length > 0;

  if (isBachelorsApplicant && !isMastersApplicant) {
    return {
      level: "BACHELORS_APPLICANT",
      guidance: `
APPLICANT LEVEL: High School / Class XII Graduate applying for a Bachelor's Degree.
- Tone: Exploratory, curious, eager to learn, and future-oriented.
- Voice: The student has foundational knowledge from high school subjects (e.g. Physics, Chemistry, Mathematics, Commerce) and wants to build their foundation.
- Career Realism: The student should NOT sound like a senior technical architect or corporate strategist.
  Prefer: "After completing my studies, I would like to begin my career in the technology sector, gain practical experience, and gradually specialise in an area that matches my interests."
  NEVER: "I intend to architect and manage advanced information infrastructure across emerging technological ecosystems."`,
    };
  }

  if (isMastersApplicant) {
    return {
      level: "MASTERS_APPLICANT",
      guidance: `
APPLICANT LEVEL: University Graduate applying for a Master's / Postgraduate Degree.
- Tone: Focused, academic, purposeful, and career-directed.
- Voice: The student has completed an undergraduate degree and now seeks specialised knowledge, deeper practical skills, or research methodologies.
- Career Realism: The student should outline realistic early-to-mid career roles (e.g. software engineer, data analyst, financial specialist) upon returning home.`,
    };
  }

  return {
    level: "PROFESSIONAL_APPLICANT",
    guidance: `
APPLICANT LEVEL: Advanced / Mature applicant.
- Tone: Confident, practical, and specialized.
- Voice: Grounded in completed studies and concrete motivations for international higher education.`,
  };
}

// ---------------------------------------------------------------------------
// Section-Specific Voice Instructions
// ---------------------------------------------------------------------------

export function getSectionVoiceInstruction(
  sectionId: string,
  ctx: StudentDocumentContext,
  domain: string,
  documentType: SopDocumentType = "VISA_COVER_LETTER"
): string {
  const { student, academics, destination, career, sponsor } = ctx;

  switch (sectionId) {
    case "why-course":
      return `
SECTION: WHY THIS COURSE ("${destination.course}")
Target length: 95–130 words.
Focus strictly on:
1. Student's previous subjects and genuine academic interests (${academics.subjects || "prior coursework"}).
2. What naturally attracted the student to "${destination.course}" (e.g., how it combines relevant subjects, its balance of concepts and practical coursework).
3. What the student expects to learn during the degree.
4. A simple, realistic connection with their future career.
CRITICAL RULES:
- Do NOT turn this into a curriculum brochure or catalog description.
- Keep every topic strictly within ${domain}.
- Do NOT use phrases like "rigorous analytical foundation" or "comprehensive training tailored to contemporary technical standards".
- Style reference: "My interest in technical subjects grew during my higher secondary studies, where I studied Physics, Chemistry and Mathematics and scored ${academics.percentage || "well"}. I chose the ${destination.degreeLevel || "Bachelor's"} in ${destination.course} because I was interested in a course that combines areas such as computer systems, electronics and communication rather than focusing on only one field. I believe studying these subjects will give me a strong base for my future studies and help me build a career in the technology sector when I return to India."`;

    case "why-university":
      return `
SECTION: WHY THIS UNIVERSITY ("${destination.university}" in ${destination.city}, ${destination.country})
Target length: 85–115 words.
Focus strictly on:
1. Why this university fits the student's chosen degree in "${destination.course}".
2. 1–2 verified characteristics (e.g., well-structured curriculum, experienced faculty, modern laboratories or learning resources, international student community).
3. What the student personally hopes to gain from studying at this specific institution.
CRITICAL RULES:
- Avoid exaggerated marketing praise. Do NOT write "world-renowned prestigious institution offering unparalleled excellence" or "beacon of academic scholarship".
- Ground the reason in the student's personal educational needs.`;

    case "why-italy":
      return `
SECTION: WHY THIS COUNTRY (${destination.country || "Italy"} / ${destination.city || "the host city"})
Target length: 75–100 words.
Focus strictly on practical academic reasoning:
1. Academic learning environment and European degree framework (recognized globally).
2. Quality and structure of English-taught programs in this discipline.
3. International learning exposure and academic environment in ${destination.city || "the university city"}.
CRITICAL RULES:
- Avoid tourism-style language (do NOT talk about food, scenery, vacation spots, or generic "rich cultural tapestry").
- Focus on why this country is the right place for this student's specific academic goals.`;

    case "interest-motivation":
      return `
SECTION: INTEREST / MOTIVATION
Target length: 90–125 words.
Audience: Academic Admissions Committee.
Focus strictly on:
1. How prior coursework and subjects (${academics.subjects || "prior studies"}) sparked genuine academic curiosity.
2. The logical progression from foundational concepts to deciding to pursue higher studies in "${destination.course}".
3. What specific questions, problems, or academic areas within this discipline the student wants to explore.
CRITICAL RULES:
- Do NOT invent childhood stories (e.g. repairing household gadgets, fascinated since age five).
- Do NOT invent unverified competitions, school clubs, or dramatic turning points.
- Keep the reasoning direct, sincere, and intellectually grounded.`;

    case "academic-fit":
      return `
SECTION: ACADEMIC FIT
Target length: 90–120 words.
Audience: Academic Admissions Committee.
Focus strictly on:
1. Demonstrating preparedness for the academic rigor of "${destination.course}" at "${destination.university}".
2. Citing verified previous qualifications (${academics.latestQualification || "prior studies"}), subjects (${academics.subjects || "core coursework"}), and performance (${academics.percentage || "academic standing"}).
3. Readiness to engage with university-level coursework, analytical assignments, and peer collaboration.
CRITICAL RULES:
- Ground in verified academic facts; never invent research papers, unverified internships, or awards.`;

    case "career-goals":
    case "career-plan":
      return `
SECTION: CAREER GOALS / CAREER PLAN
Target length: 80–110 words.
Focus strictly on:
1. Realistic next steps appropriate for the student's current stage upon graduation.
2. Concrete early-career roles appropriate for ${domain} (e.g. entry-level developer, technical associate, business analyst).
3. How the knowledge gained during the degree will help them succeed professionally.
CRITICAL RULES:
- A bachelor's applicant must NOT sound like an enterprise architect or corporate executive.
- Prefer: "After completing my studies, I plan to begin my career in the technology sector. I would like to gain practical experience in software and systems development, and gradually take on more responsibility as my skills grow."
- Never use buzzwords like "spearhead digital transformation" or "orchestrate strategic synergies".`;

    case "future-academic-plan":
      return `
SECTION: FUTURE ACADEMIC PLAN
Target length: 45–70 words.
Focus strictly on:
- Sincere, focused academic progression following the degree in "${destination.course}" (e.g., exploring advanced postgraduate study or professional certifications in this specific field).
- Dedicated, realistic, and forward-looking student voice.`;

    case "return-intent":
      return `
SECTION: RETURN / HOME COUNTRY INTENT
Target length: 75–105 words.
Focus strictly on:
- Sincere, unwavering commitment to return home to ${student.country || "India"} immediately upon completing studies.
- Concrete reasons to return: family roots (supported by sponsor ${sponsor.name || "family"}), familiarity with the expanding domestic job market, and personal career goals at home.
- Respectful, firm, and convincing student voice.`;

    case "contribution-vision":
      return `
SECTION: CONTRIBUTION / FUTURE VISION
Target length: 60–90 words.
Audience: Academic Admissions Committee.
Focus strictly on:
- Realistic student contribution to the university environment: active participation in seminars, collaborative coursework with peers, and contribution to departmental academic activities.
- Applying international training responsibly in future professional endeavours.
CRITICAL RULES:
- Do NOT invent grandiose social-impact crusades or philanthropic campaigns.`;

    case "student-introduction":
      if (documentType === "UNIVERSITY_SOP") {
        const intakePart = [destination.intakeMonth, destination.intakeYear].filter(Boolean).join(" ");
        return `
SECTION: STUDENT INTRODUCTION (University SOP)
Target length: 75–100 words.
Audience: Academic Admissions Committee.
Focus strictly on:
- Stating the applicant's name (${student.fullName}), home city and country (${student.city || ""}, ${student.country || ""}), and current academic background (${academics.latestQualification || ""} from ${academics.institution || ""}).
- Formally stating the purpose: applying for admission to the "${destination.course}" programme at "${destination.university}"${intakePart ? ` for ${intakePart}` : ""}.
- Articulating clear intent to pursue higher education in this discipline.
CRITICAL RULES:
- Address the Academic Admissions Committee; NEVER mention visa officer, consulate, passport number, or visa types.`;
      }
      return `
SECTION: STUDENT INTRODUCTION (Visa Cover Letter)
Target length: 75–100 words.
Focus strictly on:
- Stating the applicant's name (${student.fullName}), citizenship (${student.nationality || "Indian"}, ${student.country || "India"}), passport number (${student.passportNumber || ""}), and residential address (${student.address || ""}).
- Respectfully explaining the purpose: applying for a Long-Term Student Visa to study "${destination.course}" at "${destination.university}"${[destination.intakeMonth, destination.intakeYear].filter(Boolean).length > 0 ? `, commencing ${[destination.intakeMonth, destination.intakeYear].filter(Boolean).join(" ")}` : ""}.
- Respectful, formal, clear, and direct.`;

    case "closing-statement":
      if (documentType === "UNIVERSITY_SOP") {
        return `
SECTION: CLOSING (University SOP)
Target length: 40–60 words.
Audience: Academic Admissions Committee.
Focus strictly on:
- Polite, professional expression of gratitude to the Admissions Committee for considering the application.
- Affirming readiness to meet the academic standards of "${destination.university}" in "${destination.course}".
- Do NOT summarize or re-hash the entire essay.`;
      }
      return `
SECTION: CLOSING STATEMENT (Visa Cover Letter)
Target length: 40–60 words.
- Professional closing thanking the visa officer and stating availability for any further documentation.`;

    default:
      return `
SECTION: ${sectionId.toUpperCase()}
Target length: 80–110 words.
- Write a clear, sincere, and natural student-written paragraph directly addressing the section topic.
- Accurately reference "${destination.course}" at "${destination.university}".`;
  }
}

// ---------------------------------------------------------------------------
// 8-Point Internal Humanization Pass Checklist
// ---------------------------------------------------------------------------

export const HUMANIZATION_PASS_CHECKLIST = `
INTERNAL HUMANIZATION REVISION PASS (Apply before finalizing):
1. Does this sound like something this particular student could realistically say?
2. Is the vocabulary unnecessarily advanced or stiff? If so, simplify it into clear student English.
3. Are there too many abstract nouns (framework, methodologies, ecosystem, paradigm)? Replace with concrete skills or actions.
4. Is the paragraph describing the university or course more than the student's personal motivation? Keep the student central.
5. Are sentences unnecessarily long or clause-heavy? Split long compound sentences into balanced, readable sentences.
6. Does every sentence sound equally polished and uniform? Mix sentence lengths to create natural rhythm.
7. Did we introduce any unsupported fact, fake project, or unverified story? Remove immediately if not in verified context.
8. Could any phrase be written more simply without losing professionalism? If yes, simplify it.
`.trim();

// ---------------------------------------------------------------------------
// Master Prompt Builders
// ---------------------------------------------------------------------------

export interface NaturalStudentPromptOptions {
  sectionId: string;
  sectionTitle: string;
  context: StudentDocumentContext;
  currentContent?: string;
  mode?: "generate" | "rewrite-natural";
  documentType?: SopDocumentType;
}

/**
 * Builds the complete prompt for Gemini to generate or rewrite an SOP section
 * in an authentic, natural, professional student voice.
 */
export function buildNaturalStudentPrompt(
  options: NaturalStudentPromptOptions
): string {
  const {
    sectionId,
    sectionTitle,
    context,
    currentContent,
    mode = "generate",
    documentType = "VISA_COVER_LETTER",
  } = options;

  const student = context.student ?? ({} as any);
  const academics = context.academics ?? ({} as any);
  const destination = context.destination ?? ({} as any);
  const career = (context as any).career ?? {};
  const sponsor = context.sponsor ?? ({} as any);
  const levelInfo = detectEducationLevel(context);
  const isUniversitySop = documentType === "UNIVERSITY_SOP";

  const intakeParts = [destination.intakeMonth, destination.intakeYear].filter(Boolean);
  const intakeLine = intakeParts.length > 0 ? `- Target Intake: ${intakeParts.join(" ")}\n` : "";

  const verifiedStudentContext = `
VERIFIED STUDENT CONTEXT (PRESERVE ALL FACTS EXACTLY):
- Full Name: ${student.fullName || "Applicant"}
- Nationality / Home Country: ${student.nationality || "Indian"}, ${student.country || "India"}
- Previous Qualification: ${academics.latestQualification || "Higher Secondary"} from ${academics.institution || "School/College"} (${academics.board || "CBSE"}, ${academics.completionYear || ""})
- Previous Academic Stream / Subjects: ${academics.subjects || "Core Subjects"}
- Previous Score / Result: ${academics.percentage || "Merit"} (Preserve exact percentage without rounding)
- Language Proficiency: IELTS Overall ${context.tests?.ielts?.overall || "N/A"} (L: ${context.tests?.ielts?.listening || "N/A"}, R: ${context.tests?.ielts?.reading || "N/A"}, W: ${context.tests?.ielts?.writing || "N/A"}, S: ${context.tests?.ielts?.speaking || "N/A"})
- Target Course & Degree: ${destination.degreeLevel || "Degree"} in "${destination.course || ""}" (${destination.duration || "Full-time"})
- Target University: "${destination.university || ""}", ${destination.city || "City"}, ${destination.country || "Destination Country"}
${intakeLine}- Career Aspirations: ${career?.shortTermGoal || "Work in the field"}${career?.longTermGoal ? `; ${career.longTermGoal}` : ""}
${isUniversitySop ? "" : `- Return Intention: ${career?.returnIntention || "Return home immediately after graduation"}\n- Sponsor: ${sponsor?.name || "Parents"} (${sponsor?.relationship || "Father"}${sponsor?.occupation ? `, ${sponsor.occupation}` : ""})`}
`.trim();

  // Mode: "rewrite-natural"
  if (mode === "rewrite-natural" && currentContent && currentContent.trim().length > 0) {
    return `You are helping a real international student rewrite an existing ${isUniversitySop ? "Statement of Purpose" : "Visa Cover Letter"} paragraph so that it sounds authentically student-written.

${verifiedStudentContext}

EXISTING DRAFT TO REWRITE:
"""
${currentContent.trim()}
"""

YOUR TASK:
Rewrite the above paragraph in a genuine, believable student voice for the section "${sectionTitle}" (${sectionId}).

${isUniversitySop ? 'AUDIENCE: Academic Admissions Committee. NEVER mention visa officers, consulates, embassy submissions, or financial sponsorship.' : 'AUDIENCE: Visa / Consular Officer.'}

REWRITE RULES:
1. Strip away all overly academic, consultant, brochure-like, or AI-generated jargon (e.g. "rigorous analytical foundation", "comprehensive training tailored to contemporary technical standards", "complex infrastructural networks", "multidisciplinary ecosystem", "transformative journey").
2. Replace inflated wording with sincere, clear, professional student English (e.g. "My interest in technical subjects grew during my higher secondary studies...", "I chose this course because...").
3. PRESERVE EVERY FACT: Keep every single score (${academics.percentage || ""}), qualification, subject, institution, course name ("${destination.course}"), university name ("${destination.university}"), city, country, and personal detail intact.
4. ZERO NEW FACTS: Do NOT add any new facts, projects, experiences, or stories not present in the draft or verified context.
5. Realistic Rhythm: Mix short, medium, and occasional longer sentences.
6. Tone: Serious, motivated, respectful, and authentic student.

${levelInfo.guidance}

${STUDENT_VOICE_GUIDELINES}

${HUMANIZATION_PASS_CHECKLIST}

FINAL OUTPUT INSTRUCTIONS:
- Return ONLY the rewritten, continuous paragraph text.
- Do NOT include markdown bolding (**text**), bullet points, headers, quotes, or meta commentary.`;
  }

  // Mode: "generate"
  // Filter out static legacy template placeholder drafts from confusing the generator
  const isDefaultStaticDraft =
    currentContent &&
    (currentContent.includes("automation and embedded systems") ||
      currentContent.includes("engineering education, modern laboratory") ||
      currentContent.includes("robotics to prepare for specialized") ||
      currentContent.includes("Padova in particular offers") ||
      currentContent.includes("As the only daughter in my family"));

  const draftContext =
    currentContent && !isDefaultStaticDraft
      ? `\nPRIOR SECTION DRAFT FOR REFERENCE:\n"""\n${currentContent.trim()}\n"""\n`
      : "";

  const sectionVoice = getSectionVoiceInstruction(
    sectionId,
    context,
    destination.course || "the target discipline",
    documentType
  );

  return `You are generating a ${isUniversitySop ? "Statement of Purpose" : "Visa Cover Letter"} section for an international student.
Write from the perspective of the STUDENT themself.

${verifiedStudentContext}
${draftContext}

${levelInfo.guidance}

${sectionVoice}

${STUDENT_VOICE_GUIDELINES}

${HUMANIZATION_PASS_CHECKLIST}

STRICT OUTPUT RULES:
1. Return ONLY the finalized, continuous paragraph text.
2. Do NOT use markdown bold (**text**), bullet points, section headings, or quotation marks.
3. Ground every sentence in the student's verified facts and chosen discipline ("${destination.course}").
4. Never invent projects, awards, childhood stories, or unverified achievements.
5. Sound like a capable, motivated student explaining their real choices clearly.`;
}
