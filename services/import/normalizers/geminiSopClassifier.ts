/**
 * services/import/normalizers/geminiSopClassifier.ts
 *
 * Semantic classification engine using Gemini Flash with retry mechanisms,
 * timeouts, and strict non-rewriting invariants.
 *
 * Responsibilities:
 * - Maps segmented paragraph blocks to the 16 standard SOP template sections.
 * - Extracts structured student factual claims (degrees, institutions, scores, sponsors).
 * - Identifies ambiguous matches and suggests candidate alternative sections.
 * - Strictly preserves original text verbatim without modifying, polishing, or expanding.
 */

import { geminiService } from "@/services/ai/gemini/geminiClient";
import type {
  SopParagraphBlock,
  ExtractedSopFacts,
} from "@/features/sop-generator/types/import";
import type { RawParagraphBlock } from "./sopParagraphSegmenter";
import { generateId } from "@/lib/generateId";

export interface SopClassificationResult {
  classifiedParagraphs: SopParagraphBlock[];
  extractedFacts: ExtractedSopFacts;
  success: boolean;
  modelUsed?: string;
  errorMessage?: string;
}

const SYSTEM_INSTRUCTION = `You are an SOP document extraction and classification engine.
Your sole job is to classify the candidate's existing paragraphs into predefined template sections and extract factual student entities.

CRITICAL INVARIANTS:
1. DO NOT rewrite, rephrase, improve, polish, summarize, or humanize any wording.
2. DO NOT invent information, claims, or scores.
3. Preserve original sentences, dates, institutions, scores, and names verbatim.
4. Output valid JSON only conforming to the requested schema.
5. If a paragraph's classification is borderline (e.g. academic background vs why course, or career plan vs future academic plan), mark "isAmbiguous": true and list "candidateSections".
6. If a paragraph does not fit any of the 16 template sections, set "assignedSectionId": "unmapped".`;

const TARGET_SECTIONS_GUIDE = `
Available Template Section IDs and Descriptions:
1. "recipient": Embassy/Consulate address, "To The Respected Visa Officer", consulate destination.
2. "subject": "Subject: Application for Student Visa to pursue...", course & university title.
3. "student-introduction": Formal introduction, applicant name, passport number, city, applying for visa.
4. "academic-background": Prior education history, school/college names, board/university, completion year, marks/percentage, English proficiency / IELTS test results.
5. "why-course": Intellectual motivation for this specific course, syllabus modules, academic interest.
6. "why-university": Reasons for choosing this specific university (reputation, faculty, labs, curriculum).
7. "why-italy": Reasons for choosing the destination country (Italy/European education, academic tradition).
8. "future-academic-plan": Intentions for further research, master's or PhD progression.
9. "career-plan": Career goals, target job roles, industries, domestic career aspirations.
10. "return-intent": Ties to home country, family roots, firm intent to return after study.
11. "financial-sponsorship": Sponsor details (father/mother), occupation, annual income, education loan, bank balance.
12. "accommodation": Housing arrangements, student dormitory, lease address, booking dates, confirmation ref.
13. "insurance": Health & travel insurance provider, policy number, coverage amount, validity dates.
14. "travel": Flight booking, airline, flight number, departure/arrival dates, PNR number.
15. "closing-statement": Formal concluding paragraph requesting favorable visa review.
16. "signature": Signoff ("Sincerely", "Yours faithfully"), applicant name, contact info, passport number.
`;

function buildPrompt(blocks: RawParagraphBlock[]): string {
  const blocksPayload = blocks.map((b) => ({
    id: b.id,
    sourceIndex: b.sourceIndex,
    text: b.text,
  }));

  return `Classify the following SOP/cover letter paragraph blocks and extract factual entities.

${TARGET_SECTIONS_GUIDE}

Document Paragraph Blocks:
${JSON.stringify(blocksPayload, null, 2)}

Return a single RAW JSON object with this exact shape:
{
  "classifiedParagraphs": [
    {
      "id": "p-1-...",
      "assignedSectionId": "recipient" | "subject" | "student-introduction" | "academic-background" | "why-course" | "why-university" | "why-italy" | "future-academic-plan" | "career-plan" | "return-intent" | "financial-sponsorship" | "accommodation" | "insurance" | "travel" | "closing-statement" | "signature" | "unmapped",
      "isAmbiguous": false,
      "candidateSections": ["why-course", "career-plan"],
      "reason": "Brief explanation if ambiguous"
    }
  ],
  "extractedFacts": {
    "fullName": "...",
    "nationality": "...",
    "passportNumber": "...",
    "qualification": "...",
    "institution": "...",
    "board": "...",
    "completionYear": "...",
    "percentage": "...",
    "ieltsScore": "...",
    "ieltsListening": "...",
    "ieltsReading": "...",
    "ieltsWriting": "...",
    "ieltsSpeaking": "...",
    "targetUniversity": "...",
    "targetCourse": "...",
    "sponsorName": "...",
    "sponsorRelationship": "...",
    "sponsorOccupation": "...",
    "educationLoanAmount": "...",
    "bankName": "..."
  }
}

Remember: Output RAW JSON only. Do not wrap in markdown backticks.`;
}

function parseJsonClean(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
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

export async function classifySopWithGemini(
  blocks: RawParagraphBlock[],
  maxRetries = 2
): Promise<SopClassificationResult> {
  if (!blocks || blocks.length === 0) {
    return {
      classifiedParagraphs: [],
      extractedFacts: {},
      success: true,
    };
  }

  const prompt = buildPrompt(blocks);
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
        if (
          attempt < maxRetries &&
          (result.error.statusCode === 429 || result.error.statusCode === 503)
        ) {
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

      const rawClassified = Array.isArray(parsed.classifiedParagraphs)
        ? parsed.classifiedParagraphs
        : [];
      const rawFacts = (parsed.extractedFacts as Record<string, string>) || {};

      // Map classifications back to original blocks to guarantee 100% text integrity
      const classifiedParagraphs: SopParagraphBlock[] = blocks.map((b) => {
        const match = rawClassified.find(
          (c: Record<string, unknown>) => c.id === b.id
        );
        const assignedSectionId = typeof match?.assignedSectionId === "string"
          ? match.assignedSectionId
          : "unmapped";
        const isAmbiguous = Boolean(match?.isAmbiguous);
        const candidateSections = Array.isArray(match?.candidateSections)
          ? (match.candidateSections as string[])
          : [];
        const reason = typeof match?.reason === "string" ? match.reason : undefined;

        return {
          id: b.id,
          originalText: b.text,
          assignedSectionId,
          isAmbiguous,
          candidateSections,
          reason,
          sourceIndex: b.sourceIndex,
        };
      });

      const extractedFacts: ExtractedSopFacts = {
        fullName: rawFacts.fullName || undefined,
        nationality: rawFacts.nationality || undefined,
        passportNumber: rawFacts.passportNumber || undefined,
        qualification: rawFacts.qualification || undefined,
        institution: rawFacts.institution || undefined,
        board: rawFacts.board || undefined,
        completionYear: rawFacts.completionYear || undefined,
        percentage: rawFacts.percentage || undefined,
        ieltsScore: rawFacts.ieltsScore || undefined,
        ieltsListening: rawFacts.ieltsListening || undefined,
        ieltsReading: rawFacts.ieltsReading || undefined,
        ieltsWriting: rawFacts.ieltsWriting || undefined,
        ieltsSpeaking: rawFacts.ieltsSpeaking || undefined,
        targetUniversity: rawFacts.targetUniversity || undefined,
        targetCourse: rawFacts.targetCourse || undefined,
        sponsorName: rawFacts.sponsorName || undefined,
        sponsorRelationship: rawFacts.sponsorRelationship || undefined,
        sponsorOccupation: rawFacts.sponsorOccupation || undefined,
        educationLoanAmount: rawFacts.educationLoanAmount || undefined,
        bankName: rawFacts.bankName || undefined,
      };

      return {
        classifiedParagraphs,
        extractedFacts,
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

  // Graceful degradation: Assign all blocks as unmapped so counsellor can manually review
  const fallbackParagraphs: SopParagraphBlock[] = blocks.map((b) => ({
    id: b.id,
    originalText: b.text,
    assignedSectionId: "unmapped",
    isAmbiguous: true,
    candidateSections: ["student-introduction", "academic-background", "why-course"],
    reason: "AI classification fallback due to service timeout.",
    sourceIndex: b.sourceIndex,
  }));

  return {
    classifiedParagraphs: fallbackParagraphs,
    extractedFacts: {},
    success: false,
    errorMessage: lastError || "Failed to classify SOP text with AI.",
  };
}
