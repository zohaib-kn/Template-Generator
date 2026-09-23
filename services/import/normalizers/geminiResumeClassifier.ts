/**
 * services/import/normalizers/geminiResumeClassifier.ts
 *
 * Semantic classification engine using Gemini Flash with retry mechanisms,
 * timeouts, and strict non-rewriting invariants.
 *
 * Responsibilities:
 * - Parses unstructured text blocks into structured DocumentData lists (education, internships, projects, etc.).
 * - Flags ambiguous blocks (e.g. Leadership vs Volunteering).
 * - Never modifies, rewrites, or embellishes applicant wording.
 */

import { geminiService } from "@/services/ai/gemini/geminiClient";
import type { DocumentData } from "@/types";
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
2. Preserve exact job titles, dates, organisation names, metrics, and bullet points.
3. Output valid JSON only, conforming to the requested schema.
4. If an experience or item could belong to multiple categories (e.g. Student Club President could be Leadership or Volunteering or Project), classify it under the most appropriate category and ALSO add it to the ambiguousItems list.
5. If information is missing for a field, leave it undefined/empty string. NEVER invent or hallucinate facts.`;

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
    "dateOfBirth": "...",
    "address": "..."
  },
  "aboutMe": "profile summary text if found",
  "education": [
    {
      "institution": "...",
      "qualification": "...",
      "fieldOfStudy": "...",
      "startDate": "...",
      "endDate": "...",
      "description": "..."
    }
  ],
  "internships": [
    {
      "role": "...",
      "company": "...",
      "location": "...",
      "startDate": "...",
      "endDate": "...",
      "description": "..."
    }
  ],
  "academicProjects": [
    {
      "title": "...",
      "role": "...",
      "dateYear": "...",
      "skills": "...",
      "description": "...",
      "link": "..."
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
    { "language": "...", "level": "..." }
  ],
  "skills": [
    { "name": "...", "proficiency": "..." }
  ],
  "englishCertificate": {
    "examName": "IELTS or TOEFL or PTE",
    "score": "e.g. 7.5",
    "dateTaken": "..."
  },
  "ambiguousItems": [
    {
      "originalText": "...",
      "suggestedSection": "leadershipActivities",
      "candidateSections": ["leadershipActivities", "volunteering", "academicProjects"],
      "reason": "..."
    }
  ]
}

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

export async function classifyResumeWithGemini(
  rawText: string,
  maxRetries = 2
): Promise<AiClassificationResult> {
  const prompt = buildPrompt(rawText);

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await geminiService.generate({
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
        temperature: 0.0,
        maxOutputTokens: 4096,
        timeoutMs: 25000,
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
        englishCertificate: parsed.englishCertificate as DocumentData["englishCertificate"],
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
