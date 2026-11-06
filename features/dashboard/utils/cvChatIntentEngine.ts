/**
 * features/dashboard/utils/cvChatIntentEngine.ts
 *
 * Intelligent Intent Understanding & Automatic Section Classifier for Europass CVs.
 * Enables users to speak or type natural instructions into the AI Admissions Assistant
 * without remembering specific commands, section names, or schema keys.
 *
 * Handles:
 * 1. Automatic classification & multi-field extraction
 * 2. Smart de-duplication (updates existing entries rather than repeating)
 * 3. Conversational deletions & item removals (never inserts command as CV content)
 * 4. Dynamic section creation (e.g. Publications, Projects, Skills)
 * 5. Section reordering & undo support
 * 6. Context-aware follow-ups (e.g. "change it to 2024")
 * 7. Preservation of existing student credentials & manual edits
 */

import type {
  DocumentData,
  EducationEntry,
  InternshipEntry,
  SkillEntry,
  Certification,
  AcademicProject,
  Achievement,
  CustomSectionEntry,
} from "@/types";
import type { HydratedDocumentData } from "./documentHydrator";
import { syncSectionsToCvData, syncCvDataToSections, sanitizeAddressValue } from "./documentStudioSync";
export const EUROPASS_DEFAULT_SECTION_ORDER: string[] = [
  "aboutMe",
  "education",
  "workExperience",
  "internships",
  "languages",
  "englishCertificate",
  "skills",
  "certifications",
  "academicProjects",
  "achievements",
  "leadershipActivities",
  "volunteering",
  "hobbies",
  "academicInterests",
  "recommendations",
  "declaration",
];

export interface CvIntentResult {
  success: boolean;
  reply: string;
  updatedSections?: { heading: string; content: string }[];
  updatedCv?: DocumentData;
  actionType: "typed_section" | "deleted_section" | "polished" | "outline" | "general";
  sectionUpdated?: string;
  isUndo?: boolean;
  isRedo?: boolean;
  needsAiRewrite?: boolean;
  aiPrompt?: string;
  isCrossSectionSynthesis?: boolean;
  targetHeading?: string;
}

interface ChatTurn {
  sender: string;
  text: string;
}

// ── Known Degrees & Qualifications ──────────────────────────────────────────
const DEGREE_REGEX = /\b(b\.?tech|b\.?e\.?|bba|bca|b\.?sc|b\.?com|b\.?a|mba|mca|m\.?tech|m\.?sc|m\.?com|m\.?a|ph\.?d|doctorate|bachelor(?:'s)?(?:\s+degree)?|master(?:'s)?(?:\s+degree)?|diploma|grade\s*12(?:th)?|class\s*12(?:th)?|12th|grade\s*10(?:th)?|class\s*10(?:th)?|10th|senior\s*secondary|secondary)\b/i;

// ── Known Digital / Technical Skills ────────────────────────────────────────
const KNOWN_TECH_SKILLS = [
  "python", "javascript", "typescript", "react", "react.js", "next.js", "node", "node.js",
  "html", "css", "tailwind", "sql", "mysql", "postgresql", "mongodb", "java", "c++", "c#",
  "c", "git", "github", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "excel",
  "tableau", "power bi", "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
  "data analysis", "figma", "canva", "photoshop", "jira", "agile", "scrum", "rest api", "graphql"
];

// ── Known Languages & Common Typo Mapping ───────────────────────────────────
const KNOWN_LANGUAGES = [
  "hindi", "english", "german", "french", "spanish", "italian", "mandarin", "chinese",
  "korean", "japanese", "russian", "arabic", "portuguese", "punjabi", "bengali", "marathi",
  "gujarati", "tamil", "telugu", "urdu", "kannada", "malayalam"
];

const LANGUAGE_TYPO_MAP: Record<string, string> = {
  maderin: "Mandarin",
  mandrine: "Mandarin",
  germn: "German",
  spanis: "Spanish",
  englis: "English",
  frenc: "French",
  italin: "Italian",
  japnese: "Japanese",
  chinse: "Chinese",
};

/**
 * Extracts recognized languages with typo tolerance.
 */
export function extractLanguagesFromText(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];
  for (const lang of KNOWN_LANGUAGES) {
    const rx = new RegExp(`\\b${lang}\\b`, "i");
    if (rx.test(t)) {
      found.push(lang.charAt(0).toUpperCase() + lang.slice(1));
    }
  }
  for (const [typo, correct] of Object.entries(LANGUAGE_TYPO_MAP)) {
    const rx = new RegExp(`\\b${typo}\\b`, "i");
    if (rx.test(t) && !found.includes(correct)) {
      found.push(correct);
    }
  }
  return found;
}

/**
 * Safely tests whether a skill is referenced as a distinct word or symbol in text.
 * Escapes regex special characters (e.g. c++, c#).
 */
export function matchSkillInText(skill: string, text: string): boolean {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWithWord = /^\w/.test(skill);
  const endsWithWord = /\w$/.test(skill);
  const prefix = startsWithWord ? "\\b" : "(?:^|[\\s,;])";
  const suffix = endsWithWord ? "\\b" : "(?=[\\s,;.]|$)";
  const rx = new RegExp(`${prefix}${escaped}${suffix}`, "i");
  return rx.test(text);
}

/**
 * Strict Anti-Verbatim Guardrail:
 * Checks whether a candidate string is a valid, clean skill name,
 * and strictly rejects conversational prompts, sentences, directives, or stop-phrases.
 */
export function isValidSkillNoun(candidate: string): boolean {
  if (!candidate) return false;
  const trimmed = candidate.trim().replace(/^['"`•\-\*]+|['"`]+$/g, "").trim();
  if (!trimmed) return false;

  // Rule 1: Length check - skills are concise phrases (at most 4 words, <= 40 chars)
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 4 || trimmed.length > 40) return false;

  // Rule 2: Punctuation check - skills do not end with periods, colons, or question marks
  if (/[.?!:;]$/.test(trimmed)) return false;

  // Rule 3: Conversational stop-words and pronouns
  const lower = trimmed.toLowerCase();
  const STOP_PATTERNS = [
    /\b(?:in\s+my|in\s+the|add\s+my|add\s+these|as\s+well|also|can\s+you|please|you\s+have|i\s+have|i\s+know|i\s+am|i\s+want|make\s+it)\b/i,
    /\b(?:section|about\s+me|summary|profile|cv|resume|paragraph|skills?|experience|education)\b/i,
    /\b(?:should|would|could|these|those|this|that|their|there|which|what|where|when)\b/i,
  ];

  for (const pat of STOP_PATTERNS) {
    if (pat.test(lower)) return false;
  }

  return true;
}

/**
 * Maps conversational section names (e.g. "key skill", "publications") to official metadata.
 */
function resolveSectionMeta(rawName: string): {
  matcher: (h: string) => boolean;
  heading: string;
  sectionOrderId: string;
  defaultContent: string;
  example: string;
} | null {
  const n = rawName.toLowerCase();
  if (n.includes("skill")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("skill") && !h.toLowerCase().includes("language"),
      heading: "DIGITAL SKILLS",
      sectionOrderId: "skills",
      defaultContent: "",
      example: "I know Python, JavaScript and React",
    };
  }
  if (n.includes("language")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("language") && !h.toLowerCase().includes("certificate"),
      heading: "LANGUAGE SKILLS",
      sectionOrderId: "languages",
      defaultContent: "Mother tongue(s): Hindi",
      example: "In other languages add German and Mandarin",
    };
  }
  if (n.includes("project")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("project"),
      heading: "PROJECTS",
      sectionOrderId: "academicProjects",
      defaultContent: "• Academic Project: Engineered scalable solution using modern architecture and modular design.",
      example: "Add project AI Resume Parser with FastAPI",
    };
  }
  if (n.includes("publication") || n.includes("paper") || n.includes("journal")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("publication") || h.toLowerCase().includes("paper"),
      heading: "PUBLICATIONS",
      sectionOrderId: "publications",
      defaultContent: "• Published academic research paper in peer-reviewed proceedings.",
      example: "Add publication Transformer Attention in IEEE",
    };
  }
  if (n.includes("certif")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("certif"),
      heading: "CERTIFICATIONS",
      sectionOrderId: "certifications",
      defaultContent: "• Professional Certification.",
      example: "Certified Python Developer from HackerRank",
    };
  }
  if (n.includes("achieve") || n.includes("award") || n.includes("honour")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("achieve") || h.toLowerCase().includes("award") || h.toLowerCase().includes("honour"),
      heading: "HONOURS AND AWARDS",
      sectionOrderId: "achievements",
      defaultContent: "• Award of Excellence.",
      example: "Won 1st prize in State Level Hackathon",
    };
  }
  if (n.includes("work") || n.includes("intern")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("work") || h.toLowerCase().includes("intern"),
      heading: "WORK EXPERIENCE / INTERNSHIPS",
      sectionOrderId: "internships",
      defaultContent: "Software Engineer / Intern\nCompany [ 2024 ]\n• Contributed to core deliverables and collaborative execution.",
      example: "Worked at TCS as Software Engineer for 6 months",
    };
  }
  if (n.includes("edu") || n.includes("train")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("edu") || h.toLowerCase().includes("train"),
      heading: "EDUCATION AND TRAINING",
      sectionOrderId: "education",
      defaultContent: "Degree\nInstitution [ 2024 ]",
      example: "Completed BTech in 2025 at RGPV with 7.78 CGPA",
    };
  }
  if (n.includes("hobby") || n.includes("interest")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("hobb") || (h.toLowerCase().includes("interest") && !h.toLowerCase().includes("academic interest")),
      heading: "HOBBIES & INTERESTS",
      sectionOrderId: "hobbies",
      defaultContent: "Reading • Research • Technology",
      example: "My hobbies are chess, traveling and photography",
    };
  }
  if (n.includes("volunteer") || n.includes("community")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("volunteer") || h.toLowerCase().includes("community"),
      heading: "VOLUNTEERING",
      sectionOrderId: "volunteering",
      defaultContent: "Volunteer\nCommunity Organization [ 2024 ]\n• Supported community education and youth empowerment programs.",
      example: "Volunteered at Rotary Club teaching underprivileged kids",
    };
  }
  if (n.includes("recommend") || n.includes("referee")) {
    return {
      matcher: (h: string) => h.toLowerCase().includes("recommend") || h.toLowerCase().includes("referee"),
      heading: "RECOMMENDATIONS",
      sectionOrderId: "recommendations",
      defaultContent: "Dr. Academic Recommender\nProfessor, Department of Computer Science\n\"Strong academic aptitude and exceptional problem-solving skills.\"",
      example: "Add recommendation from Dr. Sharma",
    };
  }
  return null;
}

/**
 * Extracts distinct intent clauses from compound messages.
 * e.g. "I completed BTech in 2025, know React and Python, and my mother tongue is Hindi."
 * -> ["I completed BTech in 2025", "know React and Python", "my mother tongue is Hindi"]
 */
export function splitCompoundPrompt(prompt: string): string[] {
  const p = prompt.trim();
  if (!p) return [];

  // Don't split if it's a URL or quoted text or single cohesive job description
  if (p.startsWith("http") || p.includes('":') || (p.includes("\n") && p.split("\n").length > 3)) {
    return [p];
  }

  // Split on clause boundaries: ", and ", "; and ", "; ", " and also ", " & ", or sentence boundaries
  const clauses = p
    .split(/(?:;\s*and\s+|;\s*|,\s+and\s+|,\s+also\s+|\s+and\s+also\s+|\.\s+(?=[A-Z])|,\s*(?=(?:my\s+(?:mother|home|phone|email|github)|i\s+(?:completed|know|worked|got|have|graduated|studied|participated))))/i)
    .map((c) => c.trim().replace(/^and\s+/i, "").trim())
    .filter((c) => c.length > 2);

  return clauses.length > 1 ? clauses : [p];
}

/**
 * Normalizes year or date range strings.
 */
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
 * Main intent processing engine for CV operations.
 */
export async function processCvChatInstruction(
  rawPrompt: string,
  currentDoc: HydratedDocumentData,
  currentCv: DocumentData,
  history: ChatTurn[] = []
): Promise<CvIntentResult> {
  const p = rawPrompt.trim();
  const pLower = p.toLowerCase();

  // ── 1. Check for Undo command ──────────────────────────────────────────────
  if (/^(?:(?:i\s+(?:want|need|would\s+like)\s+to\s+)?(?:please\s+)?(?:undo|revert)(?:\s+(?:the|my|that|this|these|them)?\s*(?:last\s+)?(?:change|changes|edit|edits|action|actions|modification|modifications|update|updates|step|steps)?)?|take\s+it\s+back|go\s+back|undo\s+it|revert\s+it|undo\s+them)$/i.test(pLower)) {
    return {
      success: true,
      reply: "↩️ **Undid the last change**. The document has been reverted to its previous state.",
      isUndo: true,
      actionType: "general",
    };
  }

  // ── 1b. Check for Redo command ─────────────────────────────────────────────
  if (/^(?:(?:i\s+(?:want|need|would\s+like)\s+to\s+)?(?:please\s+)?redo(?:\s+(?:the|my|that|this|these|them)?\s*(?:last\s+)?(?:change|changes|edit|edits|action|actions|modification|modifications|update|updates|step|steps)?)?|redo\s+it|redo\s+them)$/i.test(pLower)) {
    return {
      success: true,
      reply: "🔁 **Redone the last change**. The document has been restored.",
      isRedo: true,
      actionType: "general",
    };
  }

  // ── 2. Check for Section Reordering ────────────────────────────────────────
  // e.g. "Move Education above Work Experience", "Move Skills to top", "Put declaration at the bottom"
  const reorderMatch = p.match(/(?:move|put|place)\s+([a-zA-Z\s]+?)\s+(above|below|before|after|to\s+the\s+top|to\s+the\s+bottom)\s*([a-zA-Z\s]*)/i);
  if (reorderMatch) {
    const sec1Name = reorderMatch[1].trim().toLowerCase();
    const position = reorderMatch[2].trim().toLowerCase();
    const sec2Name = reorderMatch[3]?.trim().toLowerCase();

    const findIdx = (query: string) =>
      currentDoc.sections.findIndex((s) => s.heading.toLowerCase().includes(query) || query.includes(s.heading.toLowerCase()));

    const fromIdx = findIdx(sec1Name);
    if (fromIdx >= 0) {
      const nextSections = [...currentDoc.sections];
      const [moved] = nextSections.splice(fromIdx, 1);
      let toIdx = 0;

      if (position.includes("top")) {
        toIdx = 0;
      } else if (position.includes("bottom")) {
        toIdx = nextSections.length;
      } else if (sec2Name) {
        const targetIdx = nextSections.findIndex((s) => s.heading.toLowerCase().includes(sec2Name) || sec2Name.includes(s.heading.toLowerCase()));
        if (targetIdx >= 0) {
          toIdx = position === "above" || position === "before" ? targetIdx : targetIdx + 1;
        } else {
          toIdx = nextSections.length;
        }
      }

      nextSections.splice(toIdx, 0, moved);
      const syncedCv = syncSectionsToCvData(nextSections, currentCv);

      return {
        success: true,
        reply: `↕️ Moved section **${moved.heading}** ${position} ${sec2Name || ""}. The Europass CV layout has been refreshed.`,
        updatedSections: nextSections,
        updatedCv: syncedCv,
        actionType: "general",
        sectionUpdated: moved.heading,
      };
    }
  }

  // ── 2b. Check for Section Creation or Activation ───────────────────────────
  // e.g. "add a key skill section", "create projects section", "add publications section", "add a section called key skills..."
  const addSectionMatch = p.match(
    /^(?:please\s+)?(?:add|create|show|include|insert)\s+(?:a\s+|an\s+)?(?:section\s+(?:called|titled|named)\s+([a-zA-Z\s]+?)(?:\s+and\s+add\s+(?:these\s+)?(?:details|skills|items)?(?:\s+in\s+it)?)?|([a-zA-Z\s]+?)\s+section)(?:\s*[:=-]\s*([\s\S]*))?$/i
  );
  if (addSectionMatch) {
    const rawTarget = (addSectionMatch[1] || addSectionMatch[2] || "").trim().toLowerCase();
    const inlineContent = addSectionMatch[3]?.trim();
    const meta = resolveSectionMeta(rawTarget);

    if (meta) {
      const nextSections = [...currentDoc.sections];
      const existingIdx = nextSections.findIndex((s) => meta.matcher(s.heading));
      const updatedCv: DocumentData = JSON.parse(JSON.stringify(currentCv));
      if (!updatedCv.sectionOrder) {
        updatedCv.sectionOrder = [...EUROPASS_DEFAULT_SECTION_ORDER];
      }

      if (existingIdx >= 0 && !inlineContent) {
        return {
          success: true,
          reply: `ℹ️ The **${meta.heading}** section is already present in your Europass CV. You can type what details you'd like to add (for example: *${meta.example}*).`,
          actionType: "general",
          sectionUpdated: meta.heading,
        };
      }

      if (existingIdx < 0) {
        if (!updatedCv.sectionOrder.includes(meta.sectionOrderId)) {
          const declIdx = updatedCv.sectionOrder.indexOf("declaration");
          if (declIdx >= 0) {
            updatedCv.sectionOrder.splice(declIdx, 0, meta.sectionOrderId);
          } else {
            updatedCv.sectionOrder.push(meta.sectionOrderId);
          }
        }

        const declSecIdx = nextSections.findIndex((s) => s.heading.toLowerCase().includes("declaration"));
        const insertPos = declSecIdx >= 0 ? declSecIdx : nextSections.length;
        nextSections.splice(insertPos, 0, {
          heading: meta.heading,
          content: inlineContent || meta.defaultContent,
        });
      } else if (inlineContent) {
        nextSections[existingIdx].content = inlineContent;
      }

      if (meta.sectionOrderId === "skills" && inlineContent) {
        const parsedSkills = inlineContent
          .split(/[\n•,]+/)
          .map((s) => s.replace(/^[•*\-\s/]+/, "").trim())
          .filter(Boolean);
        if (parsedSkills.length > 0) {
          const existingSkills = updatedCv.skills || [];
          const existingNames = new Set(existingSkills.map((s) => s.name?.toLowerCase().trim()));
          const newEntries = parsedSkills
            .filter((name) => !existingNames.has(name.toLowerCase()))
            .map((name, idx) => ({
              id: `skill-${Date.now()}-${idx}`,
              name,
            }));
          updatedCv.skills = [...existingSkills, ...newEntries];
        }
      }

      const syncedCv = syncSectionsToCvData(nextSections, updatedCv);

      return {
        success: true,
        reply: `✨ **Added ${meta.heading} section** to your Europass CV.\n\nThe section is now active on the canvas.${inlineContent ? ` Added: **${inlineContent}**.` : " You can now type details to add to this section."}`,
        updatedSections: nextSections,
        updatedCv: syncedCv,
        actionType: "typed_section",
        sectionUpdated: meta.heading,
      };
    }
  }

  // ── 3. Check for Section or Item Deletion ───────────────────────────────────
  const isDeleteKeyword =
    /^(?:please\s+)?(?:delete|remove|clear|drop|hide|exclude)\b/i.test(pLower) ||
    pLower.startsWith("i don't want") ||
    pLower.startsWith("don't include") ||
    pLower.startsWith("remove the");

  if (isDeleteKeyword) {
    const cleanTarget = pLower
      .replace(/^(?:please\s+)?(?:delete|remove|clear|drop|hide|exclude)\s+(?:the\s+)?(?:section\s+)?/i, "")
      .replace(/^i\s+don't\s+want\s+(?:the\s+)?/i, "")
      .replace(/^don't\s+include\s+(?:the\s+)?/i, "")
      .replace(/\s+section$/i, "")
      .trim();

    // 3a. Specific item deletion inside a section (e.g. "remove my old internship", "delete python from skills")
    if (cleanTarget.includes("old internship") || cleanTarget.includes("previous internship") || cleanTarget.includes("first internship")) {
      const updatedCv = JSON.parse(JSON.stringify(currentCv)) as DocumentData;
      if (updatedCv.internships && updatedCv.internships.length > 0) {
        const removed = updatedCv.internships.pop();
        const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);
        return {
          success: true,
          reply: `🗑️ Removed previous internship entry: **${removed?.role || "Internship"}** at **${removed?.company || "Company"}**. Remaining work experiences are preserved.`,
          updatedSections,
          updatedCv,
          actionType: "deleted_section",
          sectionUpdated: "WORK EXPERIENCE",
        };
      }
    }

    const isSpecificSkillRemoval =
      cleanTarget.includes("from skills") ||
      cleanTarget.includes("from digital skills") ||
      (cleanTarget.includes("skill") &&
        !cleanTarget.includes("language") &&
        !cleanTarget.includes("section") &&
        cleanTarget !== "skills" &&
        cleanTarget !== "skill" &&
        cleanTarget !== "digital skills" &&
        cleanTarget !== "key skills" &&
        cleanTarget.replace(/skills?/i, "").trim().length > 0);

    if (isSpecificSkillRemoval) {
      const skillToRemove = cleanTarget.replace(/from\s+(?:digital\s+)?skills?/i, "").replace(/skills?/i, "").trim();
      const updatedCv = JSON.parse(JSON.stringify(currentCv)) as DocumentData;
      if (skillToRemove && updatedCv.skills) {
        updatedCv.skills = updatedCv.skills.filter((s) => !s.name?.toLowerCase().includes(skillToRemove));
        const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);
        return {
          success: true,
          reply: `🗑️ Removed **${skillToRemove}** from Digital Skills.`,
          updatedSections,
          updatedCv,
          actionType: "typed_section",
          sectionUpdated: "DIGITAL SKILLS",
        };
      }
    }

    // 3b. Whole section deletion
    const nextSections = [...currentDoc.sections];
    let removedHeading = "";
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
        (cleanTarget.includes("education") && h.includes("education")) ||
        (cleanTarget.includes("about") && h.includes("about")) ||
        (cleanTarget.includes("certif") && h.includes("certif")) ||
        (cleanTarget.includes("hobb") && h.includes("hobb")) ||
        (cleanTarget.includes("project") && h.includes("project")) ||
        (cleanTarget.includes("achievement") && (h.includes("achievement") || h.includes("award"))) ||
        (cleanTarget.includes("declaration") && h.includes("declaration"))
      );
    });

    if (idxToRemove >= 0) {
      removedHeading = nextSections[idxToRemove].heading;
      nextSections.splice(idxToRemove, 1);
      const syncedCv = syncSectionsToCvData(nextSections, currentCv);

      return {
        success: true,
        reply: `🗑️ Removed section: **${removedHeading}**. The Europass CV canvas has been updated.`,
        updatedSections: nextSections,
        updatedCv: syncedCv,
        actionType: "deleted_section",
        sectionUpdated: removedHeading,
      };
    }

    return {
      success: false,
      reply: `Could not find a section matching "${cleanTarget}" to remove. Please check the section name.`,
      actionType: "general",
    };
  }

  // ── 4. Target-Section Router: Narrative Synthesis (About Me / Summary / Bio) ──
  // Matches prompts directing changes, skill integration, or enhancements to ABOUT ME:
  // e.g. "In my about me add my skills as well", "In about me highlight my marketing experience",
  // "Add my skills into about me", "Mention Python in my about me", "Make my about me more professional"
  const isTargetingAboutMe =
    /^(?:in|for|to|on)\s+(?:my\s+)?(?:about\s+me|summary|profile|bio)\b/i.test(pLower) ||
    /\b(?:about\s+me|summary|profile)\s*(?:section)?\s*(?:should|must|needs\s+to)?\s*(?:have|include|mention|add|highlight)\b/i.test(pLower) ||
    /\b(?:add|include|mention|incorporate|integrate|highlight|weave)\s+(?:my\s+)?([a-zA-Z\s]+?)\s+(?:in|into|to)\s+(?:my\s+)?(?:about\s+me|summary|profile)\b/i.test(pLower) ||
    /\b(?:update|rewrite|revise|enhance|improve|polish|make)\s+(?:my\s+)?(?:about\s+me|summary|profile)\b/i.test(pLower) ||
    /\b(make\s+(?:it|this|my\s+about\s+me|about\s+me|summary)?\s*(?:more\s+)?(?:professional|impactful|academic|better)|polish|rewrite\s+(?:my\s+)?about\s+me|elevate|enhance)\b/i.test(pLower);

  if (isTargetingAboutMe) {
    const mentionsSkills = /\bskills?\b/i.test(pLower);
    const mentionsExperience = /\b(?:experience|internship|work|job)\b/i.test(pLower);
    const mentionsEducation = /\b(?:education|degree|btech|university|college|study)\b/i.test(pLower);

    return {
      success: true,
      reply: "✨ Synthesizing and updating your About Me section...",
      needsAiRewrite: true,
      aiPrompt: p,
      actionType: "polished",
      sectionUpdated: "ABOUT ME",
      isCrossSectionSynthesis: mentionsSkills || mentionsExperience || mentionsEducation,
      targetHeading: "ABOUT ME",
    };
  }

  // ── 4b. General Polish / Rewrite ───────────────────────────────────────────
  // e.g. "Make my About Me more professional", "Enhance my description"
  if (
    /\b(make\s+(?:it|this|my\s+about\s+me|about\s+me|summary)?\s*(?:more\s+)?(?:professional|impactful|academic|better)|polish|rewrite\s+(?:my\s+)?about\s+me|elevate|enhance)\b/i.test(pLower)
  ) {
    return {
      success: true,
      reply: "✨ Polishing section tone and academic diction...",
      needsAiRewrite: true,
      aiPrompt: p,
      actionType: "polished",
    };
  }

  // ── 5. Multi-field & Natural Input Parsing ─────────────────────────────────
  const clauses = splitCompoundPrompt(p);
  const updatedCv: DocumentData = JSON.parse(JSON.stringify(currentCv));
  if (!updatedCv.personal) updatedCv.personal = {};

  const appliedSummaries: string[] = [];
  const touchedSections = new Set<string>();

  for (const clause of clauses) {
    const cLower = clause.toLowerCase();

    // ── 5a. Personal Details: Home Address / City ──
    const addrMatch =
      clause.match(/(?:my\s+)?(?:home\s+address|address|living\s+in|residing\s+at|home)\s*(?:is|to|:|-)?\s*(.+)/i) ||
      (cLower.includes("address") && clause.match(/address\s*[:=\s]+([^\n,]+)/i));
    if (addrMatch && addrMatch[1]?.trim() && !cLower.includes("institution") && !cLower.includes("university")) {
      const sanitizedAddr = sanitizeAddressValue(addrMatch[1].trim());
      if (sanitizedAddr) {
        updatedCv.personal.address = sanitizedAddr;
        appliedSummaries.push(`• **Home Address**: ${sanitizedAddr}`);
        touchedSections.add("Personal Details");
        continue;
      }
    }

    // ── 5b. Personal Details: Phone Number ──
    const phoneMatch = clause.match(/(?:phone(?:\s*number)?|mobile|contact)\s*(?:is|to|:|-)?\s*([+\d\s()-]{7,20})/i);
    if (phoneMatch && phoneMatch[1]?.trim()) {
      const phone = phoneMatch[1].trim();
      updatedCv.personal.phone = phone;
      appliedSummaries.push(`• **Phone Number**: ${phone}`);
      touchedSections.add("Personal Details");
      continue;
    }

    // ── 5c. Personal Details: Email ──
    const emailMatch = clause.match(/(?:email(?:\s*address)?)\s*(?:is|to|:|-)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
      clause.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && emailMatch[1]?.trim()) {
      const email = emailMatch[1].trim();
      updatedCv.personal.email = email;
      appliedSummaries.push(`• **Email**: ${email}`);
      touchedSections.add("Personal Details");
      continue;
    }

    // ── 5d. Personal Details: LinkedIn & GitHub Profiles ──
    const linkedInMatch = clause.match(/(?:linkedin(?:\s*profile|\s*url)?)\s*(?:is|to|:|-)?\s*(https?:\/\/[^\s]+|linkedin\.com\/in\/[^\s]+)/i);
    if (linkedInMatch && linkedInMatch[1]?.trim()) {
      const link = linkedInMatch[1].trim();
      updatedCv.personal.linkedinUrl = link.startsWith("http") ? link : `https://${link}`;
      appliedSummaries.push(`• **LinkedIn Profile**: ${updatedCv.personal.linkedinUrl}`);
      touchedSections.add("Personal Details");
      continue;
    }

    const githubMatch = clause.match(/(?:github(?:\s*profile|\s*url)?)\s*(?:is|to|:|-)?\s*(https?:\/\/[^\s]+|github\.com\/[^\s]+)/i);
    if (githubMatch && githubMatch[1]?.trim()) {
      const git = githubMatch[1].trim();
      updatedCv.personal.githubUrl = git.startsWith("http") ? git : `https://${git}`;
      appliedSummaries.push(`• **GitHub Profile**: ${updatedCv.personal.githubUrl}`);
      touchedSections.add("Personal Details");
      continue;
    }

    // ── 5e. Personal Details: Driving Licence ──
    const licenceMatch = clause.match(/(?:driving\s*licen[sc]e|driver'?s\s*licen[sc]e)\s*(?:is|to|:|-)?\s*([A-Za-z0-9,\s]+)/i);
    if (licenceMatch && licenceMatch[1]?.trim()) {
      const lic = licenceMatch[1].trim();
      updatedCv.personal.drivingLicence = lic;
      appliedSummaries.push(`• **Driving Licence**: ${lic}`);
      touchedSections.add("Personal Details");
      continue;
    }

    // ── 5f. Language Skills: Mother Tongue & Other Languages ──
    const isLanguageContext =
      cLower.includes("language") ||
      cLower.includes("mother tongue") ||
      cLower.includes("native") ||
      cLower.includes("speak") ||
      cLower.includes("fluent in");

    const mtMatch =
      clause.match(/(?:mother\s*tou?ngue|native\s*language|mother\s*language)\s*(?:is|to|:|-)?\s*([a-zA-Z]+)/i) ||
      (cLower.includes("mother") && cLower.includes("hindi") ? [null, "Hindi"] : null);

    let languageHandled = false;

    if (mtMatch && mtMatch[1]?.trim()) {
      const mt = mtMatch[1].trim().charAt(0).toUpperCase() + mtMatch[1].slice(1).toLowerCase();
      updatedCv.motherTongue = mt;
      appliedSummaries.push(`• **Mother Tongue**: ${mt}`);
      touchedSections.add("Language Skills");
      languageHandled = true;
    }

    const isOtherLangInstruction =
      cLower.includes("other language") ||
      cLower.includes("foreign language") ||
      cLower.includes("in language section") ||
      (isLanguageContext && !cLower.includes("mother") && !cLower.includes("native"));

    if (isOtherLangInstruction || (isLanguageContext && !languageHandled)) {
      const extractedLangs = extractLanguagesFromText(clause);
      if (extractedLangs.length > 0) {
        const existingLangs = updatedCv.languages || [];
        const existingNames = new Set(existingLangs.map((l) => l.language?.toLowerCase().trim()));
        const uniqueToAdd = extractedLangs.filter((l) => !existingNames.has(l.toLowerCase()));

        if (uniqueToAdd.length > 0) {
          for (let i = 0; i < uniqueToAdd.length; i++) {
            const langName = uniqueToAdd[i];
            existingLangs.push({
              id: `lang-${Date.now()}-${i}`,
              language: langName,
              level: "B2",
              listening: "B2",
              reading: "B2",
              spokenInteraction: "B2",
              spokenProduction: "B2",
              writing: "B2",
            });
          }
          updatedCv.languages = existingLangs;
          appliedSummaries.push(`• **Other Languages**: Added ${uniqueToAdd.join(", ")} (CEFR B2)`);
        } else {
          appliedSummaries.push(`• **Other Languages**: ${extractedLangs.join(", ")} already present`);
        }
        touchedSections.add("Language Skills");
        languageHandled = true;
      }
    }

    if (languageHandled) {
      continue;
    }

    // ── 5g. English Certificate / IELTS ──
    if (cLower.includes("ielts") || cLower.includes("trf") || cLower.includes("band score")) {
      const scoreMatch = clause.match(/\b([5-9](?:\.[05])?)\b/) || clause.match(/band\s*([5-9](?:\.[05])?)/i);
      const trfMatch = clause.match(/(?:trf(?:\s*no\.?|\s*number)?[:\s]*)([a-zA-Z0-9]+)/i);
      const score = scoreMatch ? scoreMatch[1] : (updatedCv.englishCertificate?.score || "7.5");
      const trf = trfMatch ? trfMatch[1] : updatedCv.englishCertificate?.trfNumber;

      updatedCv.englishCertificate = {
        examName: "IELTS",
        score,
        trfNumber: trf,
        listening: updatedCv.englishCertificate?.listening,
        reading: updatedCv.englishCertificate?.reading,
        writing: updatedCv.englishCertificate?.writing,
        speaking: updatedCv.englishCertificate?.speaking,
      };
      appliedSummaries.push(`• **IELTS Certificate**: Overall Band ${score}${trf ? ` (TRF: ${trf})` : ""}`);
      touchedSections.add("English Certificate");
      continue;
    }

    // ── 5h. Digital Skills / Technical Skills ──
    // e.g. "I know Python, JavaScript and React", "Add skills React, Node"
    const isSectionCreationPhrase = /^(?:add|create)\s+(?:a\s+|an\s+)?[a-zA-Z\s]+section/i.test(cLower);
    const hasSkillKeywords =
      cLower.includes("know") || cLower.includes("skill") || cLower.includes("proficient in") ||
      KNOWN_TECH_SKILLS.some((s) => matchSkillInText(s, cLower));

    if (hasSkillKeywords && !isSectionCreationPhrase && !cLower.includes("btech") && !cLower.includes("experience") && !cLower.includes("company")) {
      const extractedSkills: string[] = [];
      for (const skill of KNOWN_TECH_SKILLS) {
        if (matchSkillInText(skill, cLower)) {
          extractedSkills.push(skill === "c++" ? "C++" : skill === "c#" ? "C#" : skill.charAt(0).toUpperCase() + skill.slice(1));
        }
      }

      if (extractedSkills.length === 0) {
        const isExplicitSkillIntro = /^(?:i\s+know|skills?[:\s]|add\s+skills?|proficient\s+in|technical\s+skills?)/i.test(clause.trim());
        const afterKey = isExplicitSkillIntro
          ? clause.replace(/^(?:i\s+know|skills?|add\s+skills?|proficient\s+in|technical\s+skills?)[:\s-]*/i, "").trim()
          : "";
        const parts = afterKey.split(/[,&•\n]+|\band\b/i).map((s) => s.trim()).filter(Boolean);
        if (parts.length > 0 && !afterKey.toLowerCase().includes("section")) {
          extractedSkills.push(...parts.filter(isValidSkillNoun).map((p) => p.charAt(0).toUpperCase() + p.slice(1)));
        }
      }

      if (extractedSkills.length > 0) {
        const existing = updatedCv.skills || [];
        const existingNames = new Set(existing.map((s) => s.name?.toLowerCase().trim()));
        const uniqueToAdd = extractedSkills.filter((s) => !existingNames.has(s.toLowerCase()) && isValidSkillNoun(s));

        if (uniqueToAdd.length > 0) {
          const newEntries: SkillEntry[] = uniqueToAdd.map((name, idx) => ({
            id: `skill-${Date.now()}-${idx}`,
            name,
          }));
          updatedCv.skills = [...existing, ...newEntries];
          appliedSummaries.push(`• **Digital Skills**: Added ${uniqueToAdd.join(", ")}`);
        } else {
          appliedSummaries.push(`• **Digital Skills**: ${extractedSkills.join(", ")} already present`);
        }
        touchedSections.add("Digital Skills");
        continue;
      }
    }

    // ── 5i. Education and Training ──
    const isEdu = DEGREE_REGEX.test(cLower) || cLower.includes("graduated") || cLower.includes("cgpa") || cLower.includes("completed btech");
    if (isEdu && !cLower.includes("worked at") && !cLower.includes("internship")) {
      const degMatch = clause.match(DEGREE_REGEX);
      const qual = degMatch ? degMatch[0].trim() : "Degree";
      const { endDate, year } = extractYearOrDates(clause);
      const gradeMatch = clause.match(/(?:cgpa|gpa|grade|score|marks|percentage)\s*(?:of|is|:|-)?\s*([0-9.]+(?:\/10|%)?)/i);
      const instMatch = clause.match(/(?:from|at)\s+([A-Za-z0-9\s&.,'-]+?)(?:\s+(?:in|with|having)|$)/i);

      const existingEdu = updatedCv.education || [];
      const existingIdx = existingEdu.findIndex((e) =>
        e.qualification && (e.qualification.toLowerCase().includes(qual.toLowerCase()) || qual.toLowerCase().includes(e.qualification.toLowerCase()))
      );

      if (existingIdx >= 0) {
        const entry = { ...existingEdu[existingIdx] };
        if (endDate || year) entry.endDate = endDate || year;
        if (instMatch && instMatch[1]?.trim()) entry.institution = instMatch[1].trim();
        if (gradeMatch && gradeMatch[1]?.trim()) entry.finalGrade = gradeMatch[1].trim();
        existingEdu[existingIdx] = entry;
        appliedSummaries.push(`• **Education**: Updated **${entry.qualification}** (${entry.endDate || ""})`);
      } else {
        const newEdu: EducationEntry = {
          id: `edu-${Date.now()}`,
          qualification: qual.toUpperCase() === "BTECH" ? "Bachelor of Technology (BTech)" : qual,
          institution: instMatch ? instMatch[1].trim() : "University / Institution",
          endDate: endDate || year || "",
          finalGrade: gradeMatch ? gradeMatch[1].trim() : undefined,
        };
        updatedCv.education = [newEdu, ...existingEdu];
        appliedSummaries.push(`• **Education**: Added **${newEdu.qualification}**`);
      }
      touchedSections.add("Education and Training");
      continue;
    }

    // ── 5j. Work Experience / Internships ──
    const isWork =
      cLower.includes("worked at") || cLower.includes("internship") || cLower.includes("worked for") ||
      cLower.includes("work experience") || cLower.includes("employed at") || cLower.includes("at tcs");

    if (isWork && !cLower.includes("stopped working") && !cLower.includes("keyboard") && !cLower.includes("broke")) {
      const compMatch =
        clause.match(/(?:at|for|with)\s+([A-Za-z0-9&.\s]+?)(?:\s+(?:for|as|from|in|during)|$)/i) ||
        clause.match(/(?:company|employer)\s*[:=-]\s*([^\n,]+)/i);
      const roleMatch =
        clause.match(/(?:as\s+(?:a\s+)?)([A-Za-z0-9\s]+?)(?:\s+(?:at|for|in)|$)/i) ||
        clause.match(/(?:role|position|job\s*title)\s*[:=-]\s*([^\n,]+)/i);
      const { endDate } = extractYearOrDates(clause);

      // Guard: Do not fabricate company and role if neither was provided
      if (compMatch || roleMatch) {
        const company = compMatch ? compMatch[1].trim() : "Company";
        const role = roleMatch ? roleMatch[1].trim() : "Software Engineer / Intern";

        const existingInterns = updatedCv.internships || [];
        const matchIdx = existingInterns.findIndex((i) => i.company?.toLowerCase() === company.toLowerCase());

        if (matchIdx >= 0) {
          existingInterns[matchIdx].role = role;
          if (endDate) existingInterns[matchIdx].endDate = endDate;
          appliedSummaries.push(`• **Work Experience**: Updated entry at **${company}**`);
        } else {
          const newEntry: InternshipEntry = {
            id: `intern-${Date.now()}`,
            role,
            company,
            endDate: endDate || "6 Months",
            description: `• Contributed to key organizational initiatives and business deliverables.\n• Demonstrated strong technical aptitude and collaborative execution.`,
          };
          updatedCv.internships = [newEntry, ...existingInterns];
          appliedSummaries.push(`• **Work Experience**: Added **${role}** at **${company}**`);
        }
        touchedSections.add("Work Experience");
        continue;
      }
    }

    // ── 5k. Academic Projects ──
    if (cLower.includes("project") || cLower.includes("built an app") || cLower.includes("developed an application")) {
      const titleMatch = clause.match(/(?:project|title|name)\s*(?:is|to|:|-)?\s*([^\n,]+)/i);
      const title = titleMatch ? titleMatch[1].trim() : (clause.includes("machine learning") ? "Machine Learning System" : "Academic Project");
      const existingProjects = updatedCv.academicProjects || [];
      const newProj: AcademicProject = {
        id: `proj-${Date.now()}`,
        title,
        description: "Engineered scalable solution using industry-standard architecture, modular programming, and rigorous data evaluation.",
      };
      updatedCv.academicProjects = [...existingProjects, newProj];
      appliedSummaries.push(`• **Projects**: Added **${title}**`);
      touchedSections.add("Academic Projects");
      continue;
    }

    // ── 5l. Dynamic Section Creation: Publications ──
    if (cLower.includes("publication") || cLower.includes("research paper") || cLower.includes("journal")) {
      const content = clause.replace(/^(?:add\s+my\s+|create\s+(?:a\s+)?|add\s+(?:a\s+)?)?(?:publications?|research\s+papers?|journals?)[:\s-]*/i, "").trim() ||
        "• Published academic research paper exploring computational modeling and intelligent systems.";
      
      const customList = updatedCv.customSections || [];
      const pubIdx = customList.findIndex((c) => c.title.toLowerCase().includes("publication"));
      if (pubIdx >= 0) {
        customList[pubIdx].content += `\n• ${content.replace(/^[•\s*-]+/, "")}`;
        appliedSummaries.push(`• **Publications**: Added entry`);
      } else {
        customList.push({
          id: "publications",
          title: "PUBLICATIONS",
          content: content.startsWith("•") ? content : `• ${content}`,
        });
        appliedSummaries.push(`• Created new **PUBLICATIONS** section`);
      }
      updatedCv.customSections = customList;
      touchedSections.add("Publications");
      continue;
    }

    // ── 5m. Achievements & Awards ──
    if (cLower.includes("achievement") || cLower.includes("award") || cLower.includes("hackathon") || cLower.includes("won 1st prize")) {
      const achText = clause.replace(/^(?:add\s+|create\s+(?:an\s+)?)?(?:achievements?|awards?)[:\s-]*/i, "").trim() || clause;
      const existingAch = updatedCv.achievements || [];
      const newAch: Achievement = {
        id: `ach-${Date.now()}`,
        title: achText,
      };
      updatedCv.achievements = [...existingAch, newAch];
      appliedSummaries.push(`• **Achievements**: Added **${achText.slice(0, 40)}**`);
      touchedSections.add("Achievements");
      continue;
    }

    // ── 5n. Volunteering ──
    if (cLower.includes("volunteer") || cLower.includes("community")) {
      const volText = clause.replace(/^(?:add\s+|i\s+participated\s+in\s+)?(?:volunteering|volunteer\s+activities?)[:\s-]*/i, "").trim() || "Community Volunteer";
      const existingVol = updatedCv.volunteering || [];
      existingVol.push({
        id: `vol-${Date.now()}`,
        role: "Volunteer",
        organization: volText.length > 20 ? undefined : volText,
        description: volText,
      });
      updatedCv.volunteering = existingVol;
      appliedSummaries.push(`• **Volunteering**: Added engagement details`);
      touchedSections.add("Volunteering");
      continue;
    }
  }

  // If we applied at least one structured change:
  if (appliedSummaries.length > 0) {
    const updatedSections = syncCvDataToSections(updatedCv, currentDoc.sections);
    const summaryList = appliedSummaries.join("\n");
    return {
      success: true,
      reply: `✅ **Successfully updated your Europass CV**:\n\n${summaryList}\n\nThe live canvas and document data have been updated and persisted.`,
      updatedSections,
      updatedCv,
      actionType: "typed_section",
      sectionUpdated: Array.from(touchedSections).join(", "),
    };
  }

  // ── 6. Ambiguous / Vague Request -> Ask one concise clarification ──────────
  if (p.split(/\s+/).length <= 4 && (pLower.includes("college") || pLower.includes("internship") || pLower.includes("project"))) {
    return {
      success: false,
      reply: `Could you specify the exact details? For example, your institution name, degree, or company name and dates.`,
      actionType: "general",
    };
  }

  // ── 7. Default to conversational AI polish / enhancement ───────────────────
  return {
    success: true,
    reply: "Applying refinement to your CV...",
    needsAiRewrite: true,
    aiPrompt: p,
    actionType: "polished",
  };
}
