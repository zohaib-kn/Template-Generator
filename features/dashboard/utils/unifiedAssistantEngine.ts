/**
 * features/dashboard/utils/unifiedAssistantEngine.ts
 *
 * Senior Unified Intent Understanding & Autonomous Execution Engine for
 * Europass CV, Cover Letter, and SOP documents.
 *
 * Implements:
 * 1. Semantic intent interpretation across all document types (CV, Cover Letter, SOP).
 * 2. Question answering without false document mutations.
 * 3. Issue reporting detection (avoids keyword-trap mutations like "keyboard stopped working during an internship").
 * 4. Disambiguation between narrative synthesis (About Me) vs structured lists (Digital Skills).
 * 5. Intelligent cross-questioning & pending task retention.
 * 6. Precise, targeted single-section & single-field updates preserving all other content.
 * 7. Multi-field and single-field extraction.
 * 8. Deletion & reordering across all document types.
 * 9. Safe, structured decision diagnostic trace for developer visibility.
 */

import type {
  DocumentData,
  EducationEntry,
  InternshipEntry,
  SkillEntry,
  Certification,
  AcademicProject,
  Achievement,
} from "@/types";
import type { HydratedDocumentData } from "./documentHydrator";
import { syncSectionsToCvData, syncCvDataToSections, sanitizeAddressValue } from "./documentStudioSync";
import {
  parseDirectFieldInstruction,
  parseMultiFieldInstruction,
  updateCoverLetterSectionWithField,
  updateCoverLetterSectionsWithMultipleFields,
} from "./coverLetterCleaner";
import {
  extractLanguagesFromText,
  matchSkillInText,
  isValidSkillNoun,
  splitCompoundPrompt,
  EUROPASS_DEFAULT_SECTION_ORDER,
} from "./cvChatIntentEngine";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";
import { parseLanguageSkillsInput, type ParsedLanguageEntry } from "./languageSkillsParser";
import {
  extractUserDirectiveAndSnippet,
  findSnippetInSections,
} from "./documentAnchorMatcher";

export type AssistantActionType =
  | "ANSWER_QUESTION"
  | "CLARIFY"
  | "ADD_FIELD"
  | "UPDATE_FIELD"
  | "REWRITE_SECTION"
  | "DELETE_SECTION"
  | "MOVE_SECTION"
  | "CREATE_SECTION"
  | "MULTI_FIELD_UPDATE"
  | "UNDO"
  | "REDO"
  | "REPORT_ISSUE";

export interface PendingClarificationTask {
  id: string;
  action: "ADD_INTERNSHIP" | "ADD_PROJECT" | "ADD_EDUCATION" | "REWRITE_SECTION" | "UPDATE_FIELD" | "GENERAL";
  docType: string;
  targetSection?: string;
  missingFields?: string[];
  extractedData?: Record<string, string>;
  originalPrompt: string;
  timestamp: number;
}

export interface AssistantDiagnostic {
  instruction: string;
  detectedIntent: AssistantActionType;
  selectedDocument: string;
  targetSectionOrField?: string;
  clarificationNeeded: boolean;
  processingRoute: "local" | "openai";
  proposedOperation: string;
  saveResult: "persisted" | "not_applicable" | "failed";
  actualChangedFields?: string[];
  errorReason?: string;
}

export interface UnifiedProcessResult {
  success: boolean;
  reply: string;
  actionType: AssistantActionType;
  route: "local" | "openai";
  targetSection?: string;
  updatedSections?: { heading: string; content: string }[];
  updatedCv?: DocumentData;
  updatedFieldValues?: Record<string, string>;
  isUndo?: boolean;
  isRedo?: boolean;
  pendingTask?: PendingClarificationTask | null;
  needsAiRewrite?: boolean;
  aiPrompt?: string;
  targetAnchor?: { heading: string; snippet: string };
  diagnostic: AssistantDiagnostic;
}

interface ChatTurn {
  sender: string;
  text: string;
}

const DEGREE_REGEX = /\b(b\.?tech|b\.?e\.?|bba|bca|b\.?sc|b\.?com|b\.?a|mba|mca|m\.?tech|m\.?sc|m\.?com|m\.?a|ph\.?d|doctorate|bachelor(?:'s)?(?:\s+degree)?|master(?:'s)?(?:\s+degree)?|diploma|grade\s*12(?:th)?|class\s*12(?:th)?|12th|grade\s*10(?:th)?|class\s*10(?:th)?|10th|senior\s*secondary|secondary)\b/i;

const KNOWN_TECH_SKILLS = [
  "python", "javascript", "typescript", "react", "react.js", "next.js", "node", "node.js",
  "html", "css", "tailwind", "sql", "mysql", "postgresql", "mongodb", "java", "c++", "c#",
  "c", "git", "github", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "excel",
  "tableau", "power bi", "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
  "data analysis", "figma", "canva", "photoshop", "jira", "agile", "scrum", "rest api", "graphql"
];

function extractYearOrDates(text: string): { startDate?: string; endDate?: string; year?: string } {
  const rangeMatch = text.match(/((?:19|20)\d{2})\s*(?:–|—|-|to)\s*((?:19|20)\d{2}|present)/i);
  if (rangeMatch) {
    return { startDate: rangeMatch[1], endDate: rangeMatch[2] };
  }
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return { year: yearMatch[1], endDate: yearMatch[1] };
  }
  const durationMatch = text.match(/\b(\d+)\s*(?:months?|years?|weeks?)\b/i);
  if (durationMatch) {
    return { endDate: durationMatch[0] };
  }
  return {};
}

/**
 * Checks whether user instruction is an inquiry / informational question.
 */
function isInformationalQuestion(prompt: string): boolean {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // If starts with clear imperative edit words, it's not a pure question
  if (/^(?:please\s+)?(?:add|set|update|change|replace|delete|remove|rewrite|make|polish|improve|create|insert|move|put)\b/i.test(lower)) {
    return false;
  }

  // Question interrogatives
  if (/^(?:what|how|why|where|when|who|which|can\s+you\s+(?:explain|tell|show)|could\s+you\s+(?:explain|tell|show)|tell\s+me|show\s+me|is\s+there|are\s+there|do\s+i\s+have|does\s+my|is\s+my)\b/i.test(lower)) {
    return true;
  }

  if (p.endsWith("?") && !/\b(?:please\s+)?(?:add|update|change|delete|remove)\b/i.test(lower)) {
    return true;
  }

  return false;
}

/** Display casing for common skills; others are capitalised, short codes with digits upper-cased (ES6). */
const SKILL_CASING: Record<string, string> = {
  html: "HTML", html5: "HTML5", css: "CSS", css3: "CSS3", sql: "SQL", mysql: "MySQL", postgresql: "PostgreSQL",
  mongodb: "MongoDB", javascript: "JavaScript", typescript: "TypeScript", "node.js": "Node.js", node: "Node.js",
  "next.js": "Next.js", "react.js": "React.js", github: "GitHub", aws: "AWS", gcp: "GCP", nlp: "NLP",
  "power bi": "Power BI", "rest api": "REST API", graphql: "GraphQL", "c++": "C++", "c#": "C#", php: "PHP",
  jquery: "jQuery", ui: "UI", ux: "UX", "ui/ux": "UI/UX", api: "API", json: "JSON", xml: "XML",
};

function formatSkillName(raw: string): string {
  const cleaned = raw.trim().replace(/^[\s'"`•*-]+|[\s'"`.,;:!?]+$/g, "").replace(/\s+/g, " ");
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  if (SKILL_CASING[lower]) return SKILL_CASING[lower];
  if (/^[a-z]{1,4}\d+$/i.test(cleaned)) return cleaned.toUpperCase(); // es6, ec2, s3
  return cleaned
    .split(" ")
    .map((w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Skill names typed as a list after the word "skill(s)" or "proficient in", e.g.
 * "add the skill in the html css ands es6" -> ["html", "css", "es6"].
 */
export function extractListedSkills(prompt: string): string[] {
  const m = prompt.match(/\b(?:skills?|proficient\s+in)\b\s*(?:(?:in|of|like|as|are|is|:|-)\s+)*(.+)$/i);
  if (!m) return [];
  const FILLER = /^(?:the|my|a|an|in|to|also|please|section|digital|technical|key|skills?)$/i;
  return m[1]
    .split(/\s*(?:,|;|\/|&|\+|\band\b|\bands\b|\bnd\b)\s*/i)
    .flatMap((part) => {
      const words = part.trim().split(/\s+/).filter((w) => w && !FILLER.test(w));
      // "html css" (space-separated single words) is a list too; multi-word skills need commas/"and".
      const multiWordKnown = words.length > 1 && KNOWN_TECH_SKILLS.includes(words.join(" ").toLowerCase());
      return multiWordKnown || words.length <= 1 ? [words.join(" ")] : words;
    })
    .filter((w) => w && isValidSkillNoun(w) && /[a-z0-9]/i.test(w));
}

/**
 * Intelligently matches a user prompt to a section in currentDoc.sections.
 */
export function findMatchingSection(
  prompt: string,
  sections: { heading: string; content?: string }[]
): string | undefined {
  const pLower = prompt.toLowerCase();

  // 1. Exact or substring match on section heading
  for (const s of sections) {
    const h = s.heading.toLowerCase();
    if (pLower.includes(h) || h.includes(pLower)) {
      return s.heading;
    }
  }

  // 2. Semantic keywords mapping to specific headings
  const KEYWORD_MAP: [RegExp, RegExp][] = [
    [/(?:whys+(?:thiss+|chooses+)?(?:course|programme)|course|programme|degrees+program|curriculum)/i, /whys+(?:thiss+)?course|course/i],
    [/(?:whys+(?:thiss+|chooses+)?(?:uni|university)|university|college|institution|targets+uni)/i, /whys+(?:thiss+)?(?:university|institution)|university/i],
    [/(?:whys+(?:thiss+|chooses+)?(?:italy|country)|country|italy|destination)/i, /whys+(?:italy|thiss+country)|country|italy/i],
    [/(?:futures+academics+plan|futures+study|futures+studies|masters?|phd)/i, /futures+academics+plan/i],
    [/(?:careers+plan|careers+goals?|career|aspirations?|longs*terms*goals?)/i, /careers+plan|careers+goals|career/i],
    [/(?:returns+(?:tos+)?home|returns+intent|tiess+tos+home|homes+country|comes+back)/i, /return|homes+country/i],
    [/(?:finance|financial|loan|educations+loan|sponsor|funds|bank)/i, /financ|sponsor/i],
    [/(?:academic|academics|education|school|priors+study|12th|bachelor)/i, /academics+background|education/i],
    [/(?:intro|introduction|abouts+thes+student|bio|abouts+me)/i, /students+introduction|abouts+me/i],
    [/(?:accommodation|stay|housing|residence)/i, /accommodation/i],
    [/(?:insurance|policy)/i, /insurance/i],
    [/(?:travel|flight|ticket|itinerary|arrival)/i, /travel/i],
    [/(?:closings+statement|closing|conclusion|conclude)/i, /closing/i],
    [/(?:signature|students+contact|contacts+details|signs*off)/i, /signature|contact/i],
    [/(?:consulate|embassy|recipient|visas+officer)/i, /recipient|consulate/i],
    [/(?:subject|subjects+line)/i, /subject/i],
    [/(?:work|internship|job|experience)/i, /works+experience|internship/i],
    [/(?:skills|digitals+skills|technicals+skills)/i, /digitals+skills|skills/i],
    [/(?:language|languages)/i, /languages+skills|languages/i],
    [/(?:projects?)/i, /projects?/i],
    [/(?:achievements?|awards?)/i, /achievements?/i],
    [/(?:certifications?|certificates?)/i, /certifications?/i],
  ];

  for (const [promptRx, headingRx] of KEYWORD_MAP) {
    if (promptRx.test(pLower)) {
      const match = sections.find((s) => headingRx.test(s.heading.toLowerCase()));
      if (match) return match.heading;
    }
  }

  // 3. Heading token overlap matching (e.g. 'Why choose this university' vs 'Why This University')
  const stopWords = new Set([
    'the', 'this', 'that', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'my', 'your',
    'section', 'paragraph', 'bullet', 'please', 'can', 'you', 'improve', 'enhance', 'humanize', 'rewrite',
    'rephrase', 'polish', 'make', 'better', 'more', 'choose', 'it', 'me'
  ]);
  const promptWords = pLower.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stopWords.has(w));
  if (promptWords.length > 0) {
    let bestSection: string | undefined;
    let highestScore = 0;

    for (const s of sections) {
      const headingWords = s.heading.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stopWords.has(w));
      if (headingWords.length === 0) continue;

      let matchCount = 0;
      for (const hw of headingWords) {
        if (promptWords.includes(hw)) matchCount++;
      }
      const score = matchCount / headingWords.length;
      if (score > highestScore && matchCount >= 1) {
        highestScore = score;
        bestSection = s.heading;
      }
    }

    if (bestSection && highestScore >= 0.4) {
      return bestSection;
    }
  }

  return undefined;
}

/**
 * Answers questions by inspecting existing document and student facts.
 * Returns null if the question requires narrative interpretation, so it falls back to OpenAI.
 */
function answerDocumentQuestion(
  prompt: string,
  doc: HydratedDocumentData,
  cv: DocumentData,
  sopCtx?: StudentDocumentContext | null
): string | null {
  const lower = prompt.toLowerCase();
  const fv = doc.fieldValues || {};

  // 1. University and Course inquiries
  const mentionsUni = lower.includes("university") || lower.includes("college") || lower.includes("institution");
  const mentionsCourse = lower.includes("course") || lower.includes("programme") || lower.includes("program") || lower.includes("degree");

  if (mentionsUni && mentionsCourse) {
    const uni = fv["destination.university"] || sopCtx?.destination?.university;
    const course = fv["destination.course"] || sopCtx?.destination?.course;

    const uniText = uni
      ? `**${uni}**`
      : `not explicitly named yet (the *Why This University* section currently uses the placeholder *"the university"*). You can specify it by saying: *"Target university is Politecnico di Milano"*`;

    const courseText = course
      ? `**${course}**`
      : `referred to generally as an engineering undergraduate degree, but no specific degree or programme title is recorded yet. You can specify it by saying: *"Degree programme is B.Tech in Computer Science"*`;

    return `In this document:\n\n• **Target University**: ${uniText}\n• **Course / Degree Programme**: ${courseText}`;
  }

  if (mentionsUni) {
    const uni = fv["destination.university"] || sopCtx?.destination?.university;
    if (uni) {
      return `The target university mentioned in this document is **${uni}**.`;
    }
    const whyUniSec = doc.sections.find((s) => s.heading.toLowerCase().includes("university"));
    if (whyUniSec) {
      return `A specific university name has not been set yet (the *Why This University* section currently uses the placeholder *"the university"*). You can set it by saying: *"Target university is Politecnico di Milano"*.`;
    }
  }

  if (mentionsCourse) {
    const course = fv["destination.course"] || sopCtx?.destination?.course;
    if (course) {
      return `The course/degree programme mentioned in this document is **${course}**.`;
    }
    return `A specific course or degree programme title is not explicitly recorded yet. You can set it by saying: *"Degree programme is Master of Science in Mechanical Engineering"*.`;
  }

  // 2. Embassy / Consulate inquiries
  if (lower.includes("consulate") || lower.includes("embassy") || lower.includes("visa officer")) {
    const consulate = fv["destination.consulate"] || sopCtx?.destination?.consulate;
    if (consulate) {
      return `The document is addressed to the **${consulate}**.`;
    }
    const recipSec = doc.sections.find((s) => s.heading.toLowerCase().includes("recipient") || s.heading.toLowerCase().includes("consulate"));
    if (recipSec && recipSec.content) {
      const firstLine = recipSec.content.split("\n")[0] || recipSec.content;
      return `The document is currently addressed to:\n\n> ${firstLine.trim()}`;
    }
  }

  // 3. Finance, Loan, and Sponsor inquiries
  if (lower.includes("loan") || lower.includes("sponsor") || lower.includes("financial") || lower.includes("finance")) {
    const loanAmt = fv["finance.educationLoanAmount"] || sopCtx?.finance?.educationLoanAmount;
    const loanBank = fv["finance.loanProvider"] || sopCtx?.finance?.loanProvider;
    const sponsorName = fv["sponsor.name"] || sopCtx?.sponsor?.name;
    const sponsorRel = fv["sponsor.relationship"] || sopCtx?.sponsor?.relationship;

    const parts: string[] = [];
    if (sponsorName) parts.push(`• **Sponsor**: ${sponsorName}${sponsorRel ? ` (${sponsorRel})` : ""}`);
    if (loanAmt) parts.push(`• **Education Loan**: ${loanAmt}${loanBank ? ` from ${loanBank}` : ""}`);
    if (parts.length > 0) {
      return `Here are the financial and sponsorship details recorded in your document:\n\n${parts.join("\n")}`;
    }
  }

  // 4. Accommodation inquiries
  if (lower.includes("accommodation") || lower.includes("stay") || lower.includes("housing")) {
    const acc = fv["accommodation.nameAndAddress"] || sopCtx?.accommodation?.nameAndAddress;
    if (acc) return `Your accommodation is recorded as **${acc}**.`;
    return `No specific accommodation address has been recorded yet. You can type: *"Accommodation address is Via Celoria 2, 20133 Milano"* to add it.`;
  }

  // 5. Travel & Flight inquiries
  if (lower.includes("airline") || lower.includes("flight") || lower.includes("pnr") || lower.includes("travel date")) {
    const airline = fv["travel.airline"] || sopCtx?.travel?.airline;
    const pnr = fv["travel.pnr"] || sopCtx?.travel?.pnr;
    const date = fv["travel.travelDate"] || sopCtx?.travel?.travelDate;
    if (airline || pnr || date) {
      return `Here are your travel booking details:\n\n• **Airline**: ${airline || "Not specified"}\n• **PNR**: ${pnr || "Not specified"}\n• **Travel Date**: ${date || "Not specified"}`;
    }
  }

  // 6. IELTS & English inquiries
  if (lower.includes("ielts") || lower.includes("english score") || lower.includes("band")) {
    if (cv.englishCertificate?.score) {
      const trf = cv.englishCertificate.trfNumber ? ` with TRF number **${cv.englishCertificate.trfNumber}**` : "";
      return `Your current IELTS score in the document is **Overall Band ${cv.englishCertificate.score}**${trf}.`;
    }
    const ieltsVal = fv["tests.ielts.overall"] || sopCtx?.tests?.ielts?.overall;
    if (ieltsVal) {
      return `Your IELTS band score is recorded as **Band ${ieltsVal}**.`;
    }
    return `There is currently no IELTS score recorded in this document. You can tell me: *"My IELTS score is 7.5 with TRF 26IA004123AB"* to add it.`;
  }

  // 7. Contact Details (Phone, Email, Address, Mother Tongue)
  if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact")) {
    const phone = cv.personal?.phone || fv["student.phone"] || sopCtx?.student?.phone;
    if (phone) return `Your contact phone number in the document is **${phone}**.`;
    return `There is currently no contact phone number recorded in this document. You can type: *"Change my phone number to +91 9876543210"* to set it.`;
  }

  if (lower.includes("email")) {
    const email = cv.personal?.email || fv["student.email"] || sopCtx?.student?.email;
    if (email) return `Your email address in the document is **${email}**.`;
    return `There is currently no email address recorded in this document.`;
  }

  if (lower.includes("address") || lower.includes("city")) {
    const addr = cv.personal?.address || fv["student.city"] || sopCtx?.student?.city;
    if (addr) return `Your address listed in the document is **${addr}**.`;
    return `There is currently no address recorded in this document.`;
  }

  if (lower.includes("mother tongue") || lower.includes("native language")) {
    const mt = cv.motherTongue || fv["student.languages"] || sopCtx?.student?.languages;
    if (mt) return `Your mother tongue is currently recorded as **${mt}**.`;
    return `No mother tongue is currently set in the document. You can type: *"Add Hindi as mother tongue"* to set it.`;
  }

  // 8. Skills
  if (lower.includes("skill")) {
    const skills = (cv.skills || []).map((s) => s.name?.trim()).filter(Boolean);
    if (skills.length > 0) {
      return `Your document currently lists the following Digital Skills:\n\n• ${skills.join("\n• ")}`;
    }
    return `No digital skills are currently listed in the document. You can type: *"I know Python, React, and SQL"* to add them.`;
  }

  // 9. Sections / Outline
  if (lower.includes("section") || lower.includes("headings") || lower.includes("outline")) {
    const headings = doc.sections.map((s) => s.heading);
    return `This document currently has **${headings.length} sections**:\n\n• ${headings.join("\n• ")}`;
  }

  // Return null so unhandled questions are answered dynamically by OpenAI reading the full document sections!
  return null;
}

/**
 * Checks whether user prompt is reporting an issue or describing a technical problem.
 */
function isIssueReport(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const ISSUE_PATTERNS = [
    /\b(?:keyboard|laptop|screen|mouse|charger|pc|computer|mic|microphone|camera)\s+(?:stopped|broke|is\s+broken|not\s+working|failed|crashed|died)\b/i,
    /\b(?:website|portal|appointment|server|page|system|form|app|slot|vfs|embassy\s+site|consulate\s+site)\s*(?:has\s+)?(?:crashed|down|error|bug|issue|timed\s*out|glitch|failed|not\s+loading|broken)\b/i,
    /\b(?:crashed|down|froze|stuck)\s+while\s+(?:booking|filling|applying|scheduling|submitting)\b/i,
  ];
  // Only short, explicit problem reports. Generic words like "issue" or "problem" are common
  // in writing requests ("address the gap-year issue") and must still reach the AI.
  if (lower.length > 200) return false;
  return ISSUE_PATTERNS.some((rx) => rx.test(lower)) && !/^(?:add|set|update|change|insert|create|write|rewrite|draft|explain|mention)\b/i.test(lower);
}


/**
 * True for a detailed writing brief (e.g. a prompt written for ChatGPT). Such messages skip
 * the keyword shortcuts and go to the AI unchanged.
 */
export function isDetailedBrief(prompt: string): boolean {
  const p = prompt.trim();
  return p.length > 300 || p.split(/\n+/).filter((l) => l.trim()).length > 2;
}

/** Hands the message to the AI, targeting one section only for short directives that name it. */
function buildAiRoute(p: string, currentDoc: HydratedDocumentData): UnifiedProcessResult {
  const docType = currentDoc.docType;
  // ── 13. Route to OpenAI Intelligence Layer for Narrative Directives ─────────
  // Find target section from prompt keywords or anchors
  const identifiedTargetSection = isDetailedBrief(p) ? undefined : findMatchingSection(p, currentDoc.sections);

  const enrichedAiPrompt = identifiedTargetSection
    ? `The counsellor instruction is: "${p}". Rewrite, polish, and elevate ONLY the "${identifiedTargetSection}" section for clarity, flow, and professional impact while strictly preserving all facts, dates, names, and credentials. Leave all other sections 100% identical and unchanged.`
    : p;

  return {
    success: true,
    reply: identifiedTargetSection
      ? `Refining section **${identifiedTargetSection}**...`
      : "Refining document content with academic polish...",
    actionType: "REWRITE_SECTION",
    route: "openai",
    needsAiRewrite: true,
    targetSection: identifiedTargetSection,
    targetAnchor: identifiedTargetSection ? { heading: identifiedTargetSection, snippet: "" } : undefined,
    aiPrompt: enrichedAiPrompt,
    diagnostic: {
      instruction: p,
      detectedIntent: "REWRITE_SECTION",
      selectedDocument: docType,
      targetSectionOrField: identifiedTargetSection,
      clarificationNeeded: false,
      processingRoute: "openai",
      proposedOperation: `Semantic rewriting via OpenAI intelligence layer${identifiedTargetSection ? ` targeting ${identifiedTargetSection}` : ""}`,
      saveResult: "persisted",
      actualChangedFields: identifiedTargetSection ? [identifiedTargetSection] : [],
    },
  };
}

/**
 * Main Unified Message Processor
 */
export async function processUnifiedMessage(
  rawPrompt: string,
  currentDoc: HydratedDocumentData,
  currentCv: DocumentData,
  activeSopContext: StudentDocumentContext | null | undefined,
  selectedStudentData: unknown,
  history: ChatTurn[] = [],
  pendingTask: PendingClarificationTask | null = null,
  lastActiveTarget: string | null = null
): Promise<UnifiedProcessResult> {
  const p = rawPrompt.trim();
  const pLower = p.toLowerCase();
  const docType = currentDoc.docType;

  // ── 1. Check for Pending Clarification Task Resumption ──────────────────────
  if (pendingTask) {
    // If user provided answers to pending question:
    if (pendingTask.action === "ADD_INTERNSHIP") {
      const dates = extractYearOrDates(p);
      const atMatch = p.match(/(?:at|for|in|with)\s+([A-Za-z0-9&.\s]+?)(?:\s+(?:as|for|from|in|during)|$)/i);
      const asMatch = p.match(/(?:as\s+(?:a\s+)?)([A-Za-z0-9\s]+?)(?:\s+(?:at|for|in)|$)/i);
      const company = atMatch ? atMatch[1].trim() : (p.split(/\s+as\s+/i)[0]?.trim() || "Company");
      const role = asMatch ? asMatch[1].trim() : (p.split(/\s+at\s+/i)[0]?.trim() || "Intern");

      if (company && company !== "Company" && role) {
        const updatedCv: DocumentData = JSON.parse(JSON.stringify(currentCv));
        const newEntry: InternshipEntry = {
          id: `intern-${Date.now()}`,
          role,
          company,
          endDate: dates.endDate || dates.year || "",
          // Left empty on purpose: what the student did there must come from them, not be invented.
          description: "",
        };
        updatedCv.internships = [newEntry, ...(updatedCv.internships || [])];
        const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);

        return {
          success: true,
          reply: `✅ Added **${role}** at **${company}**${dates.endDate ? ` [ ${dates.endDate} ]` : ""} to your Work Experience. Tell me what you worked on there and I'll add it as bullet points.`,
          actionType: "ADD_FIELD",
          route: "local",
          targetSection: "WORK EXPERIENCE",
          updatedCv,
          updatedSections,
          pendingTask: null,
          diagnostic: {
            instruction: p,
            detectedIntent: "ADD_FIELD",
            selectedDocument: docType,
            targetSectionOrField: "WORK EXPERIENCE",
            clarificationNeeded: false,
            processingRoute: "local",
            proposedOperation: `Added ${role} at ${company} following clarification.`,
            saveResult: "persisted",
            actualChangedFields: ["WORK EXPERIENCE"],
          },
        };
      }
    } else if (pendingTask.action === "ADD_PROJECT") {
      const titleMatch = p.match(/(?:project|title|called|named)?\s*[:=-]?\s*([A-Za-z0-9\s&._-]+)/i);
      const title = titleMatch ? titleMatch[1].trim() : p;
      if (title.length > 2) {
        const updatedCv: DocumentData = JSON.parse(JSON.stringify(currentCv));
        const newProj: AcademicProject = {
          id: `proj-${Date.now()}`,
          title,
          // Left empty on purpose: the project description must come from the student.
          description: "",
        };
        updatedCv.academicProjects = [...(updatedCv.academicProjects || []), newProj];
        const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);

        return {
          success: true,
          reply: `✅ Added academic project: **${title}** to Projects. Tell me what the project did and which tools you used, and I'll write the description.`,
          actionType: "ADD_FIELD",
          route: "local",
          targetSection: "PROJECTS",
          updatedCv,
          updatedSections,
          pendingTask: null,
          diagnostic: {
            instruction: p,
            detectedIntent: "ADD_FIELD",
            selectedDocument: docType,
            targetSectionOrField: "PROJECTS",
            clarificationNeeded: false,
            processingRoute: "local",
            proposedOperation: `Added Project ${title} following clarification.`,
            saveResult: "persisted",
            actualChangedFields: ["PROJECTS"],
          },
        };
      }
    } else if (pendingTask.action === "REWRITE_SECTION" && pendingTask.targetSection) {
      // User specified which section to polish
      const targetSec = currentDoc.sections.find((s) => s.heading.toLowerCase().includes(pLower));
      const sectionHeading = targetSec ? targetSec.heading : pendingTask.targetSection;
      return {
        success: true,
        reply: `Refining your **${sectionHeading}** section...`,
        actionType: "REWRITE_SECTION",
        route: "openai",
        needsAiRewrite: true,
        targetSection: sectionHeading,
        targetAnchor: { heading: sectionHeading, snippet: "" },
        aiPrompt: `Rewrite and enhance the "${sectionHeading}" section for maximum professional impact while preserving all facts.`,
        pendingTask: null,
        diagnostic: {
          instruction: p,
          detectedIntent: "REWRITE_SECTION",
          selectedDocument: docType,
          targetSectionOrField: sectionHeading,
          clarificationNeeded: false,
          processingRoute: "openai",
          proposedOperation: `Polishing ${sectionHeading}`,
          saveResult: "persisted",
          actualChangedFields: [sectionHeading],
        },
      };
    }
  }

  // ── 2. Check for Undo / Redo Commands ──────────────────────────────────────
  if (/^(?:(?:i\s+(?:want|need|would\s+like)\s+to\s+)?(?:please\s+)?(?:undo|revert)(?:\s+(?:the|my|that|this|these|them)?\s*(?:last\s+)?(?:change|changes|edit|edits|action|actions|modification|modifications|update|updates|step|steps)?)?|take\s+it\s+back|go\s+back|undo\s+it|revert\s+it|undo\s+them)$/i.test(pLower)) {
    return {
      success: true,
      reply: "↩️ **Undid the last change**. The document has been reverted to its previous state.",
      actionType: "UNDO",
      route: "local",
      isUndo: true,
      diagnostic: {
        instruction: p,
        detectedIntent: "UNDO",
        selectedDocument: docType,
        clarificationNeeded: false,
        processingRoute: "local",
        proposedOperation: "Revert to previous history snapshot",
        saveResult: "persisted",
      },
    };
  }

  if (/^(?:(?:i\s+(?:want|need|would\s+like)\s+to\s+)?(?:please\s+)?redo(?:\s+(?:the|my|that|this|these|them)?\s*(?:last\s+)?(?:change|changes|edit|edits|action|actions|modification|modifications|update|updates|step|steps)?)?|redo\s+it|redo\s+them)$/i.test(pLower)) {
    return {
      success: true,
      reply: "🔁 **Redone the last change**. The document has been restored.",
      actionType: "REDO",
      route: "local",
      isRedo: true,
      diagnostic: {
        instruction: p,
        detectedIntent: "REDO",
        selectedDocument: docType,
        clarificationNeeded: false,
        processingRoute: "local",
        proposedOperation: "Restore redo snapshot",
        saveResult: "persisted",
      },
    };
  }

  // ── 2.5 Detailed briefs go straight to the AI, unchanged ─────────────────────
  if (isDetailedBrief(p)) {
    return buildAiRoute(p, currentDoc);
  }

  // ── 3. Question Answering (No Document Modification) ────────────────────────
  if (isInformationalQuestion(p)) {
    const localAnswer = answerDocumentQuestion(p, currentDoc, currentCv, activeSopContext);
    if (localAnswer) {
      return {
        success: true,
        reply: localAnswer,
        actionType: "ANSWER_QUESTION",
        route: "local",
        diagnostic: {
          instruction: p,
          detectedIntent: "ANSWER_QUESTION",
          selectedDocument: docType,
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: "Inspect document context and answer inquiry without editing",
          saveResult: "not_applicable",
          actualChangedFields: [],
        },
      };
    }

    // Question not covered by local lookup -> delegate to OpenAI Intelligence Layer
    return {
      success: true,
      reply: "Inspecting document content to answer your question...",
      actionType: "ANSWER_QUESTION",
      route: "openai",
      needsAiRewrite: true,
      aiPrompt: `The counsellor is asking an informational question about this document: "${p}". Read the full document sections and answer directly, accurately, and concisely based ONLY on the content of the document. Do NOT edit, rewrite, or return modified sections. Set changedHeadings: [].`,
      diagnostic: {
        instruction: p,
        detectedIntent: "ANSWER_QUESTION",
        selectedDocument: docType,
        clarificationNeeded: false,
        processingRoute: "openai",
        proposedOperation: "Inspecting full document via OpenAI to answer question",
        saveResult: "not_applicable",
        actualChangedFields: [],
      },
    };
  }

  // ── 4. Issue Reporting (No False Mutation) ──────────────────────────────────
  if (isIssueReport(p)) {
    const isEmbassyPortalIssue = /\b(?:embassy|consulate|appointment|slot|visa|vfs|portal|website)\b/i.test(pLower);
    const reply = isEmbassyPortalIssue
      ? `I understand the embassy appointment portal crashed while booking your visa slot. Technical glitches on consulate and VFS booking portals are very common. If you would like to explain an appointment scheduling delay or add a specific remark to your visa application or Cover Letter, let me know and I will add it to the appropriate section.`
      : `Understood. If you are reporting a problem or would like to describe a challenge you solved as part of your Work Experience or Cover Letter, please provide the details (such as the company, project, or context) and I will update the appropriate section.`;

    return {
      success: true,
      reply,
      actionType: "REPORT_ISSUE",
      route: "local",
      diagnostic: {
        instruction: p,
        detectedIntent: "REPORT_ISSUE",
        selectedDocument: docType,
        clarificationNeeded: true,
        processingRoute: "local",
        proposedOperation: "Acknowledged issue report without modifying document",
        saveResult: "not_applicable",
        actualChangedFields: [],
      },
    };
  }

  // ── 5. Section Reordering (CV & Cover Letter & SOP) ─────────────────────────
  const reorderMatch = p.match(/(?:move|put|place)\s+([a-zA-Z\s]+?)\s+(above|below|before|after|to\s+the\s+top|to\s+the\s+bottom)\s*([a-zA-Z\s]*)/i);
  if (reorderMatch) {
    const sec1Name = reorderMatch[1].trim().toLowerCase();
    const position = reorderMatch[2].trim().toLowerCase();
    const sec2Name = reorderMatch[3]?.trim().toLowerCase();

    const fromIdx = currentDoc.sections.findIndex((s) => s.heading.toLowerCase().includes(sec1Name));
    if (fromIdx >= 0) {
      const nextSections = [...currentDoc.sections];
      const [moved] = nextSections.splice(fromIdx, 1);
      let toIdx = 0;

      if (position.includes("top")) {
        toIdx = 0;
      } else if (position.includes("bottom")) {
        toIdx = nextSections.length;
      } else if (sec2Name) {
        const targetIdx = nextSections.findIndex((s) => s.heading.toLowerCase().includes(sec2Name));
        toIdx = targetIdx >= 0 ? (position === "above" || position === "before" ? targetIdx : targetIdx + 1) : nextSections.length;
      }

      nextSections.splice(toIdx, 0, moved);
      const syncedCv = docType === "CV" ? syncSectionsToCvData(nextSections, currentCv) : undefined;

      return {
        success: true,
        reply: `↕️ Moved section **${moved.heading}** ${position} ${sec2Name || ""}. The document layout has been refreshed.`,
        actionType: "MOVE_SECTION",
        route: "local",
        targetSection: moved.heading,
        updatedSections: nextSections,
        updatedCv: syncedCv,
        diagnostic: {
          instruction: p,
          detectedIntent: "MOVE_SECTION",
          selectedDocument: docType,
          targetSectionOrField: moved.heading,
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: `Reorder section ${moved.heading} ${position}`,
          saveResult: "persisted",
          actualChangedFields: [moved.heading],
        },
      };
    }
  }

  // ── 6. Section Deletions Across ALL Documents ───────────────────────────────
  const isDeleteKeyword =
    /^(?:please\s+)?(?:delete|remove|clear|drop|hide|exclude)\b/i.test(pLower) ||
    pLower.startsWith("i don't want") ||
    pLower.startsWith("don't include");

  if (isDeleteKeyword) {
    const cleanTarget = pLower
      .replace(/^(?:please\s+)?(?:delete|remove|clear|drop|hide|exclude)\s+(?:the\s+)?(?:section\s+)?/i, "")
      .replace(/^i\s+don't\s+want\s+(?:the\s+)?/i, "")
      .replace(/^don't\s+include\s+(?:the\s+)?/i, "")
      .replace(/\s+section$/i, "")
      .trim();

    // Specific item deletion in CV (e.g. "delete python from skills")
    if (docType === "CV" && (cleanTarget.includes("from skills") || (cleanTarget.includes("skill") && !cleanTarget.includes("language")))) {
      const skillToRemove = cleanTarget.replace(/from\s+(?:digital\s+)?skills?/i, "").replace(/skills?/i, "").trim();
      const updatedCv = JSON.parse(JSON.stringify(currentCv)) as DocumentData;
      if (skillToRemove && updatedCv.skills) {
        // Exact (case-insensitive) match only: removing "java" must not remove "JavaScript".
        const countBefore = updatedCv.skills.length;
        updatedCv.skills = updatedCv.skills.filter((s) => s.name?.trim().toLowerCase() !== skillToRemove);
        if (updatedCv.skills.length === countBefore) {
          return {
            success: true,
            reply: `I couldn't find a skill named **${skillToRemove}** in Digital Skills, so nothing was removed.`,
            actionType: "ANSWER_QUESTION",
            route: "local",
            diagnostic: {
              instruction: p,
              detectedIntent: "DELETE_SECTION",
              selectedDocument: docType,
              targetSectionOrField: "DIGITAL SKILLS",
              clarificationNeeded: true,
              processingRoute: "local",
              proposedOperation: `No skill named ${skillToRemove}`,
              saveResult: "not_applicable",
              actualChangedFields: [],
            },
          };
        }
        const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);
        return {
          success: true,
          reply: `🗑️ Removed **${skillToRemove}** from Digital Skills. All other sections remain unchanged.`,
          actionType: "DELETE_SECTION",
          route: "local",
          targetSection: "DIGITAL SKILLS",
          updatedCv,
          updatedSections,
          diagnostic: {
            instruction: p,
            detectedIntent: "DELETE_SECTION",
            selectedDocument: docType,
            targetSectionOrField: "DIGITAL SKILLS",
            clarificationNeeded: false,
            processingRoute: "local",
            proposedOperation: `Remove ${skillToRemove} from Skills`,
            saveResult: "persisted",
            actualChangedFields: ["DIGITAL SKILLS"],
          },
        };
      }
    }

    // Whole section deletion in CV, Cover Letter, or SOP
    const nextSections = [...currentDoc.sections];
    const idxToRemove = nextSections.findIndex((s) => {
      const h = s.heading.toLowerCase();
      return (
        h === cleanTarget ||
        h.includes(cleanTarget) ||
        cleanTarget.includes(h) ||
        (cleanTarget.includes("language") && h.includes("language") && !h.includes("certificate")) ||
        (cleanTarget.includes("skill") && h.includes("skill") && !h.includes("language")) ||
        (cleanTarget.includes("work") && (h.includes("work") || h.includes("internship"))) ||
        (cleanTarget.includes("internship") && (h.includes("work") || h.includes("internship"))) ||
        (cleanTarget.includes("travel") && h.includes("travel")) ||
        (cleanTarget.includes("accommodation") && h.includes("accommodation")) ||
        (cleanTarget.includes("insurance") && h.includes("insurance")) ||
        (cleanTarget.includes("finance") && h.includes("financ"))
      );
    });

    if (idxToRemove >= 0) {
      const removedHeading = nextSections[idxToRemove].heading;
      nextSections.splice(idxToRemove, 1);
      const syncedCv = docType === "CV" ? syncSectionsToCvData(nextSections, currentCv) : undefined;

      return {
        success: true,
        reply: `🗑️ Removed section: **${removedHeading}**. All other sections remain unchanged.`,
        actionType: "DELETE_SECTION",
        route: "local",
        targetSection: removedHeading,
        updatedSections: nextSections,
        updatedCv: syncedCv,
        diagnostic: {
          instruction: p,
          detectedIntent: "DELETE_SECTION",
          selectedDocument: docType,
          targetSectionOrField: removedHeading,
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: `Excise section ${removedHeading}`,
          saveResult: "persisted",
          actualChangedFields: [removedHeading],
        },
      };
    }

    return {
      success: false,
      reply: `Could not find a section matching "${cleanTarget}" to remove. Please check the section heading.`,
      actionType: "DELETE_SECTION",
      route: "local",
      diagnostic: {
        instruction: p,
        detectedIntent: "DELETE_SECTION",
        selectedDocument: docType,
        targetSectionOrField: cleanTarget,
        clarificationNeeded: false,
        processingRoute: "local",
        proposedOperation: "Section excision failed - target not found",
        saveResult: "failed",
        errorReason: `Target section ${cleanTarget} not found in document`,
      },
    };
  }

  // ── 7. Intelligent Disambiguation: "In my About Me, add my existing skills" ─
  const isTargetingAboutMe =
    /^(?:in|for|to|on)\s+(?:(?:my|the|the\s+student(?:'s)?|students?)\s+)?(?:about\s+me|summary|profile|bio)\b/i.test(pLower) ||
    /\b(?:about\s+me|summary|profile)\s*(?:section)?\s*(?:should|must|needs\s+to)?\s*(?:have|include|mention|add|highlight)\b/i.test(pLower) ||
    /\b(?:add|include|mention|incorporate|integrate|highlight|weave)\s+(?:my\s+)?([a-zA-Z\s]+?)\s+(?:in|into|to)\s+(?:(?:my|the|the\s+student(?:'s)?|students?)\s+)?(?:about\s+me|summary|profile)\b/i.test(pLower) ||
    /\b(?:update|rewrite|revise|enhance|improve|polish|make)\s+(?:(?:my|the|the\s+student(?:'s)?|students?)\s+)?(?:about\s+me|summary|profile)\b/i.test(pLower);

  if (isTargetingAboutMe) {
    const existingSkills = (currentCv.skills || []).map((s) => s.name?.trim()).filter(Boolean);
    const existingWork = (currentCv.internships || []).map((w) => `${w.role} at ${w.company}`).filter(Boolean);

    const contextFacts: string[] = [];
    if (existingSkills.length > 0) contextFacts.push(`- Existing Skills: ${existingSkills.join(", ")}`);
    if (existingWork.length > 0) contextFacts.push(`- Work Experience: ${existingWork.join("; ")}`);

    const enrichedPrompt =
      `User Instruction: "${p}"\n\n` +
      `Verified Student Context Facts:\n${contextFacts.join("\n")}\n\n` +
      `Directive: Rewrite and enhance ONLY the "ABOUT ME" section. Seamlessly weave in the student's key skills/competencies in a natural, cohesive, professional first-person personal statement. Strictly preserve all student facts, dates, and institutions. Leave all other sections completely unchanged.`;

    return {
      success: true,
      reply: "✨ Synthesizing and updating your About Me section to incorporate your technical profile. All other sections remain unchanged...",
      actionType: "REWRITE_SECTION",
      route: "openai",
      needsAiRewrite: true,
      targetSection: "ABOUT ME",
      targetAnchor: { heading: "ABOUT ME", snippet: "" },
      aiPrompt: enrichedPrompt,
      diagnostic: {
        instruction: p,
        detectedIntent: "REWRITE_SECTION",
        selectedDocument: docType,
        targetSectionOrField: "ABOUT ME",
        clarificationNeeded: false,
        processingRoute: "openai",
        proposedOperation: "Weave verified existing skills into About Me narrative; preserve Skills section",
        saveResult: "persisted",
        actualChangedFields: ["ABOUT ME"],
      },
    };
  }

  // ── 7.4 Targeted Snippet Directive (Workflow 1): e.g. "I chose Italy..." humanize this ──
  const snippetExtraction = extractUserDirectiveAndSnippet(p);
  if (snippetExtraction.isSnippetProvided && snippetExtraction.snippet) {
    const snippetAnchor = findSnippetInSections(snippetExtraction.snippet, currentDoc.sections);
    if (snippetAnchor) {
      const directiveText = snippetExtraction.directive || "Rewrite, polish, and humanize this targeted text";
      return {
        success: true,
        reply: `Refining your targeted text in **${snippetAnchor.sectionHeading}** based on your instruction. All other sections remain unchanged...`,
        actionType: "REWRITE_SECTION",
        route: "openai",
        needsAiRewrite: true,
        targetSection: snippetAnchor.sectionHeading,
        targetAnchor: {
          heading: snippetAnchor.sectionHeading,
          snippet: snippetAnchor.matchedText,
        },
        aiPrompt: `The user wants to refine a specific text snippet inside section "${snippetAnchor.sectionHeading}". Targeted snippet:\n"${snippetAnchor.matchedText}"\nUser instruction: "${directiveText}". Rewrite, polish, and modify ONLY this targeted snippet in-place inside section "${snippetAnchor.sectionHeading}" according to the instruction, while strictly preserving all facts, institutions, and dates. Keep all other text and sections 100% identical and unchanged.`,
        diagnostic: {
          instruction: p,
          detectedIntent: "REWRITE_SECTION",
          selectedDocument: docType,
          targetSectionOrField: snippetAnchor.sectionHeading,
          clarificationNeeded: false,
          processingRoute: "openai",
          proposedOperation: `In-place edit of snippet inside ${snippetAnchor.sectionHeading}`,
          saveResult: "persisted",
          actualChangedFields: [snippetAnchor.sectionHeading],
        },
      };
    }
  }

  // ── 7.5 Section Directive Matcher (Workflow 2): e.g. "Improve Why choose this university section and humanize it" ──
  const cleanPromptForSec = p.replace(/^["'“\s]+|["'”\s]+$/g, "");
  const matchedSec = findMatchingSection(cleanPromptForSec, currentDoc.sections);
  const isSectionDirective =
    /\b(enhance|humanize|make\s+(?:it|this\s+)?(?:more\s+)?(?:better|professional|impactful|compelling|formal|engaging)|improve|polish|rewrite|rephrase|refine|elevate|expand|shorten|elaborate|simplify|strengthen|fix)\b/i.test(pLower);

  if (matchedSec && (isSectionDirective || /\bsection\b/i.test(pLower))) {
    return {
      success: true,
      reply: `Refining your **${matchedSec}** section for clarity, academic depth, and professional impact. All other sections remain unchanged...`,
      actionType: "REWRITE_SECTION",
      route: "openai",
      needsAiRewrite: true,
      targetSection: matchedSec,
      targetAnchor: { heading: matchedSec, snippet: "" },
      aiPrompt: `The user wants to improve section "${matchedSec}": "${p}". Rewrite, polish, and elevate ONLY the "${matchedSec}" section for clarity, academic tone, and persuasive impact while strictly preserving all facts, institutions, and credentials. Leave all other sections 100% identical and unchanged.`,
      diagnostic: {
        instruction: p,
        detectedIntent: "REWRITE_SECTION",
        selectedDocument: docType,
        targetSectionOrField: matchedSec,
        clarificationNeeded: false,
        processingRoute: "openai",
        proposedOperation: `Targeted rewrite of ${matchedSec}`,
        saveResult: "persisted",
        actualChangedFields: [matchedSec],
      },
    };
  }

  // ── 8. Ambiguous Pronoun Resolution: "Make it more professional" ────────────
  // Like ChatGPT: a general or follow-up command ("make it better", "more formal", "shorter",
  // "again") is applied straight away — to the section the operator was just working on if
  // there is one, otherwise to the whole document. It never stops to ask "which section?".
  const isFollowUpOrGeneral =
    /\b(?:make\s+(?:it|this)\s+(?:more\s+|less\s+|a\s+bit\s+)?(?:professional|impactful|better|formal|casual|concise|clear|simple|simpler|shorter|longer|detailed|natural|human|confident)|improve\s+it|polish\s+it|rewrite\s+it|fix\s+it)\b/i.test(pLower) ||
    /^(?:please\s+)?(?:(?:make\s+it\s+)?(?:shorter|longer|more\s+formal|less\s+formal|simpler|more\s+concise|more\s+detailed)|again|try\s+again|one\s+more\s+time|another\s+version|do\s+it\s+again)[.!]?$/i.test(pLower);
  if (isFollowUpOrGeneral) {
    const validTarget = lastActiveTarget
      ? currentDoc.sections.find((s) => s.heading.toLowerCase() === lastActiveTarget.toLowerCase() ||
                                        s.heading.toLowerCase().includes(lastActiveTarget.toLowerCase()) ||
                                        lastActiveTarget.toLowerCase().includes(s.heading.toLowerCase()))?.heading
      : undefined;

    if (validTarget) {
      return {
        success: true,
        reply: `Refining your **${validTarget}** section for professional impact. All other sections remain unchanged...`,
        actionType: "REWRITE_SECTION",
        route: "openai",
        needsAiRewrite: true,
        targetSection: validTarget,
        targetAnchor: { heading: validTarget, snippet: "" },
        aiPrompt: `Apply the counsellor's instruction "${p}" to section "${validTarget}" only. Keep all facts intact.`,
        diagnostic: {
          instruction: p,
          detectedIntent: "REWRITE_SECTION",
          selectedDocument: docType,
          targetSectionOrField: validTarget,
          clarificationNeeded: false,
          processingRoute: "openai",
          proposedOperation: `Resolved pronoun 'it' to active section: ${validTarget}`,
          saveResult: "persisted",
          actualChangedFields: [validTarget],
        },
      };
    }

    // No section in focus: apply the instruction to the whole document.
    return buildAiRoute(p, currentDoc);
  }

  // ── 9. Cross-Questioning for Missing Critical Facts ─────────────────────────
  // "Add my internship" without details
  if (/^(?:please\s+)?add\s+(?:my\s+)?(?:internship|work\s+experience|job)$/i.test(pLower)) {
    return {
      success: true,
      reply: `Which company did you intern at, what was your role, and what were the dates? For example: *"Frontend Developer at Infosys from June 2023 to Dec 2023"*.`,
      actionType: "CLARIFY",
      route: "local",
      pendingTask: {
        id: `intern-${Date.now()}`,
        action: "ADD_INTERNSHIP",
        docType,
        missingFields: ["company", "role", "dates"],
        originalPrompt: p,
        timestamp: Date.now(),
      },
      diagnostic: {
        instruction: p,
        detectedIntent: "CLARIFY",
        selectedDocument: docType,
        targetSectionOrField: "WORK EXPERIENCE",
        clarificationNeeded: true,
        processingRoute: "local",
        proposedOperation: "Prompted user for missing company, role, and dates",
        saveResult: "not_applicable",
      },
    };
  }

  // "Add my project" without details
  if (/^(?:please\s+)?add\s+(?:my\s+)?(?:project|academic\s+project)$/i.test(pLower)) {
    return {
      success: true,
      reply: `What is the title of your project, and what technologies or methods did you use? For example: *"AI Resume Parser built with Python and FastAPI"*.`,
      actionType: "CLARIFY",
      route: "local",
      pendingTask: {
        id: `proj-${Date.now()}`,
        action: "ADD_PROJECT",
        docType,
        missingFields: ["title", "technologies"],
        originalPrompt: p,
        timestamp: Date.now(),
      },
      diagnostic: {
        instruction: p,
        detectedIntent: "CLARIFY",
        selectedDocument: docType,
        targetSectionOrField: "PROJECTS",
        clarificationNeeded: true,
        processingRoute: "local",
        proposedOperation: "Prompted user for missing project title and tech stack",
        saveResult: "not_applicable",
      },
    };
  }

  // ── 10. Multi-Field Direct Updates (Cover Letter & CV) ───────────────────────
  const multiMatch = parseMultiFieldInstruction(p);
  if (multiMatch && multiMatch.length >= 2) {
    if (docType === "COVER_LETTER") {
      const { sections: updatedSections, fieldValues: updatedFieldValues } =
        updateCoverLetterSectionsWithMultipleFields(
          currentDoc.sections,
          multiMatch,
          activeSopContext,
          currentDoc.fieldValues
        );
      const bullets = multiMatch.map((m) => `• **${m.label}**: ${m.value}`).join("\n");
      return {
        success: true,
        reply: `✅ Updated **${multiMatch.length} details**:\n\n${bullets}\n\nThe Cover Letter preview has been refreshed. All other sections remain unchanged.`,
        actionType: "MULTI_FIELD_UPDATE",
        route: "local",
        updatedSections,
        updatedFieldValues,
        diagnostic: {
          instruction: p,
          detectedIntent: "MULTI_FIELD_UPDATE",
          selectedDocument: docType,
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: `Updated ${multiMatch.length} cover letter fields`,
          saveResult: "persisted",
          actualChangedFields: multiMatch.map((m) => m.label),
        },
      };
    }

    if (docType === "CV") {
      const updatedCv = JSON.parse(JSON.stringify(currentCv));
      if (!updatedCv.personal) updatedCv.personal = {};
      const updatedFieldValues: Record<string, string> = { ...(currentDoc.fieldValues || {}) };

      for (const item of multiMatch) {
        updatedFieldValues[item.key] = item.value;
        if (item.key === "student.phone") updatedCv.personal.phone = item.value;
        else if (item.key === "student.email") updatedCv.personal.email = item.value;
        else if (item.key === "student.nationality") updatedCv.personal.nationality = item.value;
        else if (item.key === "student.languages") updatedCv.motherTongue = item.value;
        else if (item.key === "student.city" || item.key === "student.country") {
          updatedCv.personal.address = item.value;
        }
      }

      const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);
      const bullets = multiMatch.map((m) => `• **${m.label}**: ${m.value}`).join("\n");
      return {
        success: true,
        reply: `✅ Updated **${multiMatch.length} details**:\n\n${bullets}\n\nThe Europass CV has been refreshed. All other sections remain unchanged.`,
        actionType: "MULTI_FIELD_UPDATE",
        route: "local",
        updatedCv,
        updatedSections,
        updatedFieldValues,
        diagnostic: {
          instruction: p,
          detectedIntent: "MULTI_FIELD_UPDATE",
          selectedDocument: docType,
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: `Updated ${multiMatch.length} CV personal fields`,
          saveResult: "persisted",
          actualChangedFields: multiMatch.map((m) => m.label),
        },
      };
    }
  }

  // ── 11. Single Field Direct Extraction (Phone, Email, Mother Tongue, etc.) ──
  // Mother tongue instruction
  const mtMatch =
    p.match(/(?:add|set|update|change)?\s*(.+?)\s+as\s+(?:mother\s*tongue|native\s*language)/i) ||
    p.match(/(?:mother\s*tou?ngue|native\s*language|mother\s*language)\s*(?:is|to|:|-)?\s*([a-zA-Z]+)/i);

  if (mtMatch && mtMatch[1]?.trim() && !isInformationalQuestion(p)) {
    const rawMt = mtMatch[1].trim();
    const mt = rawMt.charAt(0).toUpperCase() + rawMt.slice(1).toLowerCase();

    if (docType === "CV") {
      const parsed = parseLanguageSkillsInput(p, currentCv?.motherTongue);
      const updatedCv: DocumentData = JSON.parse(JSON.stringify(currentCv));
      updatedCv.motherTongue = parsed.motherTongue;

      if (parsed.otherLanguages.length > 0) {
        const newLangEntries = parsed.otherLanguages.map((l: ParsedLanguageEntry, idx: number) => ({
          id: `lang-${Date.now()}-${idx}`,
          language: l.language,
          level: l.level || undefined,
        }));
        if (/^\s*(?:add|also|include)\b/i.test(p)) {
          const existingLangs = updatedCv.languages || [];
          updatedCv.languages = [...existingLangs, ...newLangEntries];
        } else {
          updatedCv.languages = newLangEntries;
        }
      }

      const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);

      const otherSummary = parsed.otherLanguages.map((l: ParsedLanguageEntry) => (l.level ? `${l.language} (${l.level})` : l.language));
      const replySummary =
        otherSummary.length > 0
          ? `✅ Updated **Mother Tongue** to **${parsed.motherTongue}** and other languages: **${otherSummary.join(", ")}**.`
          : `✅ Updated **Mother Tongue** to **${parsed.motherTongue}**. All other sections remain unchanged.`;

      return {
        success: true,
        reply: replySummary,
        actionType: "UPDATE_FIELD",
        route: "local",
        targetSection: "LANGUAGE SKILLS",
        updatedCv,
        updatedSections,
        diagnostic: {
          instruction: p,
          detectedIntent: "UPDATE_FIELD",
          selectedDocument: docType,
          targetSectionOrField: "Language Skills",
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: `Set Mother Tongue to ${parsed.motherTongue}${otherSummary.length > 0 ? ` and other languages: ${otherSummary.join(", ")}` : ""}`,
          saveResult: "persisted",
          actualChangedFields: ["Mother Tongue", ...(otherSummary.length > 0 ? ["Other Languages"] : [])],
        },
      };
    }

    if (docType === "COVER_LETTER") {
      const updatedFieldValues = { ...(currentDoc.fieldValues || {}), "student.languages": mt };
      const updatedSections = updateCoverLetterSectionWithField(
        currentDoc.sections,
        "student.languages",
        mt,
        activeSopContext,
        updatedFieldValues
      );
      return {
        success: true,
        reply: `✅ Updated **Mother Tongue** to **${mt}**. The Cover Letter preview has been refreshed.`,
        actionType: "UPDATE_FIELD",
        route: "local",
        targetSection: "Academic Background",
        updatedSections,
        updatedFieldValues,
        diagnostic: {
          instruction: p,
          detectedIntent: "UPDATE_FIELD",
          selectedDocument: docType,
          targetSectionOrField: "Mother Tongue",
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: `Set Cover Letter student.languages to ${mt}`,
          saveResult: "persisted",
          actualChangedFields: ["Mother Tongue"],
        },
      };
    }
  }

  // Digital Skills instruction (e.g. "I know React and Python")
  const hasSkillKeywords =
    pLower.includes("know") || pLower.includes("skill") || pLower.includes("proficient in") ||
    KNOWN_TECH_SKILLS.some((s) => matchSkillInText(s, pLower));

  if (docType === "CV" && hasSkillKeywords && !isTargetingAboutMe && !pLower.includes("worked at") && !pLower.includes("internship")) {
    // Skills the operator listed explicitly ("add skills html, css and es6"), plus any known
    // skill mentioned anywhere in the message; names are de-duplicated and properly cased.
    const extractedSkills: string[] = [];
    const seenSkills = new Set<string>();
    const pushSkill = (raw: string) => {
      const name = formatSkillName(raw);
      if (name && !seenSkills.has(name.toLowerCase())) {
        seenSkills.add(name.toLowerCase());
        extractedSkills.push(name);
      }
    };
    for (const listed of extractListedSkills(p)) pushSkill(listed);
    for (const skill of KNOWN_TECH_SKILLS) {
      if (matchSkillInText(skill, pLower)) pushSkill(skill);
    }

    if (extractedSkills.length > 0) {
      const updatedCv: DocumentData = JSON.parse(JSON.stringify(currentCv));
      const existing = updatedCv.skills || [];
      const existingNames = new Set(existing.map((s) => s.name?.toLowerCase().trim()));
      const uniqueToAdd = extractedSkills.filter((s) => !existingNames.has(s.toLowerCase()));

      if (uniqueToAdd.length > 0) {
        const newEntries: SkillEntry[] = uniqueToAdd.map((name, idx) => ({
          id: `skill-${Date.now()}-${idx}`,
          name,
        }));
        updatedCv.skills = [...existing, ...newEntries];
        const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);

        return {
          success: true,
          reply: `✅ Added **${uniqueToAdd.join(", ")}** to your Digital Skills. All other sections remain unchanged.`,
          actionType: "ADD_FIELD",
          route: "local",
          targetSection: "DIGITAL SKILLS",
          updatedCv,
          updatedSections,
          diagnostic: {
            instruction: p,
            detectedIntent: "ADD_FIELD",
            selectedDocument: docType,
            targetSectionOrField: "DIGITAL SKILLS",
            clarificationNeeded: false,
            processingRoute: "local",
            proposedOperation: `Added skills: ${uniqueToAdd.join(", ")}`,
            saveResult: "persisted",
            actualChangedFields: ["DIGITAL SKILLS"],
          },
        };
      }

      return {
        success: true,
        reply: `ℹ️ **${extractedSkills.join(", ")}** are already present in your Digital Skills.`,
        actionType: "ADD_FIELD",
        route: "local",
        targetSection: "DIGITAL SKILLS",
        diagnostic: {
          instruction: p,
          detectedIntent: "ADD_FIELD",
          selectedDocument: docType,
          targetSectionOrField: "DIGITAL SKILLS",
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: "Skills already present; deduplicated",
          saveResult: "not_applicable",
        },
      };
    }
  }

  // Cover letter field matchers (Loan, Sponsor, Accommodation, Travel)
  const directField = parseDirectFieldInstruction(p);
  if (directField && docType === "COVER_LETTER") {
    const updatedFieldValues = { ...(currentDoc.fieldValues || {}), [directField.key]: directField.value };
    const updatedSections = updateCoverLetterSectionWithField(
      currentDoc.sections,
      directField.key,
      directField.value,
      activeSopContext,
      updatedFieldValues
    );
    return {
      success: true,
      reply: `✅ Updated **${directField.label}** to **${directField.value}**. The Cover Letter preview has been refreshed.`,
      actionType: "UPDATE_FIELD",
      route: "local",
      targetSection: directField.label,
      updatedSections,
      updatedFieldValues,
      diagnostic: {
        instruction: p,
        detectedIntent: "UPDATE_FIELD",
        selectedDocument: docType,
        targetSectionOrField: directField.label,
        clarificationNeeded: false,
        processingRoute: "local",
        proposedOperation: `Set ${directField.key} to ${directField.value}`,
        saveResult: "persisted",
        actualChangedFields: [directField.label],
      },
    };
  }

  // ── 12. Direct CV Contact / Personal Field Updaters ────────────────────────
  // Phone Number
  const phoneMatch = p.match(/(?:phone(?:\s*number)?|mobile|contact)\s*(?:is|to|:|-)?\s*([+\d\s()-]{7,20})/i);
  if (phoneMatch && phoneMatch[1]?.trim()) {
    const phone = phoneMatch[1].trim();
    const updatedCv = JSON.parse(JSON.stringify(currentCv));
    if (!updatedCv.personal) updatedCv.personal = {};
    updatedCv.personal.phone = phone;
    const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);

    return {
      success: true,
      reply: `✅ Updated your contact phone number to **${phone}**. All other sections remain unchanged.`,
      actionType: "UPDATE_FIELD",
      route: "local",
      targetSection: "Personal Details",
      updatedCv,
      updatedSections,
      diagnostic: {
        instruction: p,
        detectedIntent: "UPDATE_FIELD",
        selectedDocument: docType,
        targetSectionOrField: "Phone Number",
        clarificationNeeded: false,
        processingRoute: "local",
        proposedOperation: `Set phone to ${phone}`,
        saveResult: "persisted",
        actualChangedFields: ["Phone Number"],
      },
    };
  }

  // Email
  const emailMatch = p.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && emailMatch[1]?.trim() && (pLower.includes("email") || pLower.includes("update") || pLower.includes("change"))) {
    const email = emailMatch[1].trim();
    const updatedCv = JSON.parse(JSON.stringify(currentCv));
    if (!updatedCv.personal) updatedCv.personal = {};
    updatedCv.personal.email = email;
    const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);

    return {
      success: true,
      reply: `✅ Updated your email address to **${email}**. All other sections remain unchanged.`,
      actionType: "UPDATE_FIELD",
      route: "local",
      targetSection: "Personal Details",
      updatedCv,
      updatedSections,
      diagnostic: {
        instruction: p,
        detectedIntent: "UPDATE_FIELD",
        selectedDocument: docType,
        targetSectionOrField: "Email Address",
        clarificationNeeded: false,
        processingRoute: "local",
        proposedOperation: `Set email to ${email}`,
        saveResult: "persisted",
        actualChangedFields: ["Email Address"],
      },
    };
  }

  // Home Address
  const addrMatch = p.match(/(?:home\s+address|address|living\s+in|residing\s+at)\s*(?:is|to|:|-)?\s*(.+)/i);
  if (addrMatch && addrMatch[1]?.trim() && !pLower.includes("university") && !pLower.includes("college")) {
    const sanitized = sanitizeAddressValue(addrMatch[1].trim());
    if (sanitized) {
      const updatedCv = JSON.parse(JSON.stringify(currentCv));
      if (!updatedCv.personal) updatedCv.personal = {};
      updatedCv.personal.address = sanitized;
      const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);

      return {
        success: true,
        reply: `✅ Updated your address to **${sanitized}**. All other sections remain unchanged.`,
        actionType: "UPDATE_FIELD",
        route: "local",
        targetSection: "Personal Details",
        updatedCv,
        updatedSections,
        diagnostic: {
          instruction: p,
          detectedIntent: "UPDATE_FIELD",
          selectedDocument: docType,
          targetSectionOrField: "Address",
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: `Set address to ${sanitized}`,
          saveResult: "persisted",
          actualChangedFields: ["Address"],
        },
      };
    }
  }

  // IELTS & TRF Extraction
  if (pLower.includes("ielts") || pLower.includes("trf") || pLower.includes("band score")) {
    const scoreMatch = p.match(/\b([5-9](?:\.[05])?)\b/) || p.match(/band\s*([5-9](?:\.[05])?)/i);
    const trfMatch = p.match(/(?:trf(?:\s*no\.?|\s*number)?[:\s]*)([a-zA-Z0-9]+)/i);
    if (scoreMatch || trfMatch) {
      const score = scoreMatch ? scoreMatch[1] : (currentCv.englishCertificate?.score || "7.5");
      const trf = trfMatch ? trfMatch[1] : currentCv.englishCertificate?.trfNumber;

      const updatedCv = JSON.parse(JSON.stringify(currentCv));
      updatedCv.englishCertificate = {
        examName: "IELTS",
        score,
        trfNumber: trf,
        listening: updatedCv.englishCertificate?.listening || "8.0",
        reading: updatedCv.englishCertificate?.reading || "7.5",
        writing: updatedCv.englishCertificate?.writing || "7.0",
        speaking: updatedCv.englishCertificate?.speaking || "7.5",
      };
      const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);

      return {
        success: true,
        reply: `✅ Updated English Language Certificate with **IELTS Overall Band ${score}**${trf ? ` (TRF: ${trf})` : ""}. All other sections remain unchanged.`,
        actionType: "UPDATE_FIELD",
        route: "local",
        targetSection: "ENGLISH CERTIFICATE",
        updatedCv,
        updatedSections,
        diagnostic: {
          instruction: p,
          detectedIntent: "UPDATE_FIELD",
          selectedDocument: docType,
          targetSectionOrField: "English Language Certificate",
          clarificationNeeded: false,
          processingRoute: "local",
          proposedOperation: `Updated IELTS band ${score}${trf ? ` TRF ${trf}` : ""}`,
          saveResult: "persisted",
          actualChangedFields: ["ENGLISH CERTIFICATE"],
        },
      };
    }
  }

  // ── 13. Route to the AI for narrative directives ─────────────────────────────
  return buildAiRoute(p, currentDoc);
}

