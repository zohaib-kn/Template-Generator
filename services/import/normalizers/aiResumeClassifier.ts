/**
 * services/import/normalizers/aiResumeClassifier.ts
 *
 * Semantic classification engine using OpenAI with retry mechanisms,
 * timeouts, and strict non-rewriting invariants.
 *
 * Responsibilities:
 * - Parses unstructured text blocks into structured DocumentData lists (education, internships, projects, etc.).
 * - Flags ambiguous blocks (e.g. Leadership vs Volunteering).
 * - Preserves unknown sections as customSections — never discards content.
 * - Returns sectionOrder reflecting the original document ordering.
 * - Never modifies, rewrites, or embellishes applicant wording.
 */

<<<<<<< HEAD:services/import/normalizers/aiResumeClassifier.ts
import { aiService } from "@/services/ai/openaiClient";
import type { DocumentData } from "@/types";
=======
import { geminiService } from "@/services/ai/gemini/geminiClient";
import type { DocumentData, CustomSectionEntry } from "@/types";
>>>>>>> 0f0cc8a (address chnages , UI changes , rearranginf order changes):services/import/normalizers/geminiResumeClassifier.ts
import type { AmbiguousItem } from "@/features/document-generator/types/import";
import { generateId } from "@/lib/generateId";

export interface AiClassificationResult {
  data: Partial<DocumentData>;
  ambiguousItems: AmbiguousItem[];
  success: boolean;
  modelUsed?: string;
  errorMessage?: string;
}

const SYSTEM_INSTRUCTION = `You are a factual Resume Data Extraction and Classification Engine.
Your sole job is to extract and classify the candidate's existing text into predefined schema categories.
CRITICAL INVARIANTS:
1. DO NOT rewrite, rephrase, improve, polish, summarize, or humanize any wording.
2. Preserve exact job titles, dates, organisation names, metrics, and bullet points verbatim.
3. Output valid JSON only, conforming to the requested schema.
4. If an experience or item could belong to multiple categories (e.g. Student Club President could be Leadership or Volunteering or Project), classify it under the most appropriate category and ALSO add it to the ambiguousItems list.
5. If information is missing for a field, leave it undefined/empty string. NEVER invent or hallucinate facts.
6. Any heading you cannot confidently map to a known schema section MUST be preserved as a customSections entry. Do NOT discard unrecognised content.
7. The sectionOrder array must reflect the order in which sections appear in the original document.`;

function buildPrompt(rawText: string): string {
  return `Extract and classify the following resume text into structured JSON.

Resume Content:
"""
${rawText.slice(0, 12000)}
"""

Return a single JSON object with this exact shape:
{
  "personal": {
    "fullName": "...",
    "email": "...",
    "phone": "...",
    "nationality": "...",
    "dateOfBirth": "ISO date or as written",
    "placeOfBirth": "...",
    "gender": "...",
    "address": "...",
    "passportNumber": "...",
    "linkedinUrl": "URL if present",
    "portfolioUrl": "URL if present",
    "githubUrl": "URL if present"
  },
  "aboutMe": "verbatim profile summary / about me text if found",
  "education": [
    {
      "institution": "...",
      "qualification": "degree/diploma title verbatim",
      "fieldOfStudy": "...",
      "startDate": "...",
      "endDate": "...",
      "address": "city/country if present",
      "finalGrade": "CGPA or percentage or grade verbatim if present",
      "description": "verbatim subjects, description, or additional info if present"
    }
  ],
  "internships": [
    {
      "role": "exact job title verbatim",
      "company": "...",
      "location": "...",
      "startDate": "...",
      "endDate": "...",
      "description": "verbatim bullet points and description — do NOT summarize or collapse bullets"
    }
  ],
  "academicProjects": [
    {
      "title": "...",
      "role": "...",
      "dateYear": "...",
      "skills": "technologies/skills used",
      "description": "verbatim description",
      "link": "URL if present"
    }
  ],
  "certifications": [
    {
      "name": "...",
      "provider": "...",
      "completionDate": "...",
      "credentialLink": "...",
      "description": "..."
    }
  ],
  "achievements": [
    {
      "title": "...",
      "organisation": "...",
      "dateYear": "...",
      "description": "..."
    }
  ],
  "leadershipActivities": [
    {
      "activity": "...",
      "organisation": "...",
      "duration": "...",
      "description": "..."
    }
  ],
  "volunteering": [
    {
      "organization": "...",
      "role": "...",
      "startDate": "...",
      "endDate": "...",
      "description": "..."
    }
  ],
  "languages": [
    {
      "language": "...",
      "level": "e.g. Native, B2, Intermediate",
      "listening": "CEFR level if present",
      "reading": "CEFR level if present",
      "writing": "CEFR level if present",
      "spokenProduction": "CEFR level if present",
      "spokenInteraction": "CEFR level if present"
    }
  ],
  "skills": [
    { "name": "exact skill name verbatim", "proficiency": "level if stated" }
  ],
  "hobbies": [
    { "name": "...", "description": "..." }
  ],
  "motherTongue": "native/mother tongue language if explicitly stated, else omit this field",
  "declaration": "exact verbatim declaration text if a Declaration section is present, else omit",
  "englishCertificate": {
    "examName": "IELTS or TOEFL or PTE or other",
    "score": "overall band/score e.g. 7.5",
    "dateTaken": "...",
    "listening": "subscore if present",
    "reading": "subscore if present",
    "writing": "subscore if present",
    "speaking": "subscore if present"
  },
  "customSections": [
    {
      "title": "exact original heading from document verbatim",
      "content": "verbatim full text content of this section, preserving all bullets and structure"
    }
  ],
  "sectionOrder": ["aboutMe", "education", "internships", "skills"],
  "ambiguousItems": [
    {
      "originalText": "...",
      "suggestedSection": "leadershipActivities",
      "candidateSections": ["leadershipActivities", "volunteering", "academicProjects"],
      "reason": "..."
    }
  ]
}

SECTION MAPPING RULES (map these headings to their schema key in sectionOrder):
- "ABOUT ME", "PROFILE", "SUMMARY", "PROFESSIONAL SUMMARY", "CAREER OBJECTIVE", "EXECUTIVE SUMMARY", "ACADEMIC PROFILE" → key: "aboutMe"
- "EDUCATION", "EDUCATION AND TRAINING", "ACADEMIC BACKGROUND", "ACADEMIC QUALIFICATIONS", "QUALIFICATIONS", "DEGREES" → key: "education"
- "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "EMPLOYMENT HISTORY", "INTERNSHIPS", "INTERNSHIPS & WORK EXPERIENCE", "CAREER HISTORY", "WORK HISTORY" → key: "internships"
- "SKILLS", "TECHNICAL SKILLS", "CORE SKILLS", "KEY SKILLS", "ACADEMIC & TRANSFERABLE SKILLS", "COMPETENCIES", "AREAS OF EXPERTISE", "TECHNOLOGIES" → key: "skills"
- "LANGUAGES", "LANGUAGE SKILLS", "LANGUAGE PROFICIENCY", "LANGUAGES KNOWN" → key: "languages"
- "PROJECTS", "ACADEMIC PROJECTS", "PERSONAL PROJECTS", "KEY PROJECTS", "CAPSTONE PROJECTS", "TECHNICAL PROJECTS" → key: "academicProjects"
- "CERTIFICATIONS", "CERTIFICATES", "PROFESSIONAL CERTIFICATIONS", "COURSES & CERTIFICATIONS", "LICENSES" → key: "certifications"
- "ACHIEVEMENTS", "AWARDS", "ACHIEVEMENTS & AWARDS", "HONORS", "KEY ACHIEVEMENTS" → key: "achievements"
- "LEADERSHIP", "LEADERSHIP ACTIVITIES", "EXTRACURRICULAR ACTIVITIES", "LEADERSHIP & EXTRACURRICULAR", "POSITIONS OF RESPONSIBILITY" → key: "leadershipActivities"
- "VOLUNTEERING", "VOLUNTEER EXPERIENCE", "COMMUNITY SERVICE", "SOCIAL WORK" → key: "volunteering"
- "HOBBIES", "INTERESTS", "HOBBIES AND INTERESTS", "HOBBIES & PERSONAL INTERESTS", "LEISURE ACTIVITIES", "PERSONAL INTERESTS" → key: "hobbies"
- "DECLARATION" → key: "declaration"
- "RECOMMENDATIONS", "REFERENCES", "REFEREES" → key: "recommendations"
- "ACADEMIC INTERESTS", "RESEARCH INTERESTS", "AREAS OF INTEREST", "FIELDS OF INTEREST" → key: "academicInterests"
- Any heading NOT matched above → add as a customSections entry AND use "customSection:<OriginalTitle>" in sectionOrder

RULES FOR sectionOrder:
- List the mapped schema key for each recognised section in document order.
- For unrecognised sections, use the string "customSection:<OriginalTitle>" (e.g. "customSection:Publications & Conferences").
- Personal details (name, contact) are always pinned first and are NOT included in sectionOrder.
- Include every section that appears in the document, in order.

PRESERVATION RULES:
- Do NOT rewrite, improve, summarize, or paraphrase any candidate text.
- Preserve bullet points as "\\n- item" within description strings.
- Preserve exact dates, organisation names, role titles.
- If a field is not present in the CV, omit it — NEVER invent values.
- customSections: include ALL sections whose heading is not recognised. NEVER discard content.
- If englishCertificate is not present, omit the entire field.

Remember: Output RAW JSON only. Do not wrap in markdown or backticks.`;
}

function parseJsonClean(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    // Attempt markdown block extraction
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

<<<<<<< HEAD:services/import/normalizers/aiResumeClassifier.ts
export async function classifyResumeWithAi(
=======
/**
 * Builds the imported sectionOrder from the AI response.
 * Converts "customSection:<Title>" keys into the customSections id-based format
 * used by the existing DocumentData sectionOrder architecture.
 */
function buildSectionOrder(
  rawOrder: unknown,
  customSections: CustomSectionEntry[]
): string[] | undefined {
  if (!Array.isArray(rawOrder) || rawOrder.length === 0) return undefined;

  const result: string[] = [];
  for (const key of rawOrder) {
    if (typeof key !== "string") continue;
    if (key.startsWith("customSection:")) {
      // Map "customSection:<Title>" to the custom section's id
      const title = key.replace(/^customSection:/, "").trim();
      const matched = customSections.find(
        (cs) => cs.title.toLowerCase() === title.toLowerCase()
      );
      if (matched) {
        result.push(`custom_${matched.id}`);
      }
    } else {
      result.push(key);
    }
  }
  return result.length > 0 ? result : undefined;
}

export async function classifyResumeWithGemini(
>>>>>>> 0f0cc8a (address chnages , UI changes , rearranginf order changes):services/import/normalizers/geminiResumeClassifier.ts
  rawText: string,
  maxRetries = 2
): Promise<AiClassificationResult> {
  const prompt = buildPrompt(rawText);

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await aiService.generate({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
        temperature: 0.0,
        maxOutputTokens: 6144,
        timeoutMs: 30000,
      });

      if (!result.success) {
        lastError = result.error.message;
        // Exponential backoff if transient error and retries remain
        if (attempt < maxRetries && (result.error.statusCode === 429 || result.error.statusCode === 503)) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        break;
      }

      const parsed = parseJsonClean(result.text);
      if (!parsed) {
        lastError = "AI response was not valid JSON.";
        continue;
      }

      // Add unique IDs to list items
      const addIds = <T extends { id?: string }>(items: unknown): T[] => {
        if (!Array.isArray(items)) return [];
        return items.map((item) => ({ ...item, id: generateId() }));
      };

      // Parse customSections — these preserve unknown headings verbatim
      const rawCustomSections = Array.isArray(parsed.customSections)
        ? parsed.customSections
        : [];
      const customSections: CustomSectionEntry[] = rawCustomSections
        .filter(
          (cs: unknown): cs is Record<string, unknown> =>
            cs !== null && typeof cs === "object"
        )
        .map((cs: Record<string, unknown>) => ({
          id: generateId(),
          title: String(cs.title || "Custom Section"),
          content: String(cs.content || ""),
        }));

      // Parse sectionOrder preserving original document ordering
      const sectionOrder = buildSectionOrder(parsed.sectionOrder, customSections);

      const structuredData: Partial<DocumentData> = {
        personal: parsed.personal as DocumentData["personal"],
        aboutMe: typeof parsed.aboutMe === "string" ? parsed.aboutMe : undefined,
        education: addIds(parsed.education),
        internships: addIds(parsed.internships),
        academicProjects: addIds(parsed.academicProjects),
        certifications: addIds(parsed.certifications),
        achievements: addIds(parsed.achievements),
        leadershipActivities: addIds(parsed.leadershipActivities),
        volunteering: addIds(parsed.volunteering),
        languages: addIds(parsed.languages),
        skills: addIds(parsed.skills),
        hobbies: addIds(parsed.hobbies),
        motherTongue:
          typeof parsed.motherTongue === "string" && parsed.motherTongue.trim()
            ? parsed.motherTongue.trim()
            : undefined,
        declaration:
          typeof parsed.declaration === "string" && parsed.declaration.trim()
            ? parsed.declaration.trim()
            : undefined,
        englishCertificate:
          parsed.englishCertificate &&
          typeof parsed.englishCertificate === "object"
            ? (parsed.englishCertificate as DocumentData["englishCertificate"])
            : undefined,
        customSections: customSections.length > 0 ? customSections : undefined,
        sectionOrder,
      };

      const rawAmbiguous = Array.isArray(parsed.ambiguousItems) ? parsed.ambiguousItems : [];
      const ambiguousItems: AmbiguousItem[] = rawAmbiguous.map((amb: Record<string, unknown>) => ({
        id: generateId(),
        originalText: String(amb.originalText || ""),
        suggestedSection: (amb.suggestedSection as keyof DocumentData) || "leadershipActivities",
        candidateSections: (Array.isArray(amb.candidateSections)
          ? amb.candidateSections
          : ["leadershipActivities", "volunteering"]) as (keyof DocumentData)[],
        reason: String(amb.reason || "Ambiguous section classification"),
      }));

      return {
        data: structuredData,
        ambiguousItems,
        success: true,
        modelUsed: result.model,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // Graceful degradation: return failure with explanation
  return {
    data: {},
    ambiguousItems: [],
    success: false,
    errorMessage: lastError || "Failed to classify resume text with AI.",
  };
}
