/**
 * services/ai/transforms/textTransformationService.ts
 *
 * Core Text Transformation Service for converting Indian Hinglish or informal draft
 * text into natural, professional English suitable for Resumes and SOPs.
 *
 * STRICT GOVERNING PRINCIPLES:
 * 1. TRANSFORMATION, NOT CONTENT GENERATION:
 *    - Language and presentation elevate.
 *    - INPUT FACTS = OUTPUT FACTS.
 *    - Zero added tools, qualifications, certifications, projects, or achievements.
 * 2. STUDENT VOICE:
 *    - Authentic, grounded, clear, and dignified.
 *    - Strips robotic AI jargon ("transformative journey", "passionate pursuit").
 * 3. FACT PRESERVATION:
 *    - Deterministically ensures numbers, dates, scores, and institutions are retained.
 */

import { geminiService, type GeminiResult } from "../gemini/geminiClient";

export type TransformationMode = "HINGLISH_TO_ENGLISH" | "REWRITE_NATURAL";

export interface TransformTextOptions {
  text: string;
  mode?: TransformationMode;
  fieldName?: string;
}

export interface TransformTextResult {
  success: boolean;
  transformedText: string;
  originalText: string;
  mode: TransformationMode;
  modelUsed?: string;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

export const HINGLISH_SYSTEM_INSTRUCTION = `
You are an expert language translator and professional academic editor specializing in converting Indian Hinglish (Hindi written in Roman script mixed with English) and informal draft text into clear, natural, professional English.

CORE DIRECTIVE:
Translate and elevate the user's input text into natural, grammatically correct, professional English suitable for an academic resume or study abroad statement of purpose.

CRITICAL FACTUAL RULES (ZERO FABRICATION):
1. PRESERVE EVERY FACT: All facts, numbers, dates, percentages, scores, university names, companies, roles, and subjects mentioned in the input MUST be accurately preserved in the output.
2. DO NOT INVENT OR ENHANCE: You must NOT add new achievements, qualifications, tools, certifications, projects, work experience, motivations, or career plans.
3. INPUT FACTS = OUTPUT FACTS: If the student says they used Excel, write Excel. Do NOT add Python, SQL, Tableau, PowerBI, or Machine Learning. If they say they did B.Com, keep B.Com / Bachelor of Commerce. Do NOT add engineering or data science.
4. TONE & VOICE: The output should sound like a genuine, articulate student explaining their real background. Do NOT use corporate marketing fluff or AI clichés ("ever-evolving landscape", "passionate pursuit of excellence", "transformative journey", "beacon of excellence", "multidisciplinary ecosystem", "rigorous analytical foundation").
5. DO NOT EXAGGERATE: Do not upgrade minor tasks into grand leadership claims. Keep the scale of responsibilities accurate.
6. OUTPUT FORMAT: Return ONLY the converted English text. Do NOT wrap in quotation marks. Do NOT add bullet points, markdown bolding, introductory preambles, or conversational commentary.
`.trim();

export const REWRITE_NATURAL_SYSTEM_INSTRUCTION = `
You are an expert editor specializing in elevating rough English drafts into authentic, clear, professional student English.

CORE DIRECTIVE:
Improve grammar, sentence structure, flow, and clarity while strictly preserving every single fact, number, score, date, and institution.
Do NOT invent new accomplishments or tools. Strip away robotic AI jargon.
Return ONLY the polished English text without quotation marks or conversational commentary.
`.trim();

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

export function buildHinglishPrompt(text: string, fieldName?: string): { systemInstruction: string; prompt: string } {
  const contextNote = fieldName ? `Context field: ${fieldName}\n` : "";
  const prompt = `${contextNote}Convert the following text into natural, professional English while preserving every single fact exactly:

"""
${text.trim()}
"""`;

  return {
    systemInstruction: HINGLISH_SYSTEM_INSTRUCTION,
    prompt,
  };
}

// ---------------------------------------------------------------------------
// Fact Preservation & Sanitation Checks
// ---------------------------------------------------------------------------

/**
 * Extracts numeric tokens (e.g. 6.5, 2023, 88%, 12th, 3) from input text.
 */
export function extractNumbers(text: string): string[] {
  const matches = text.match(/\b\d+(?:\.\d+)?(?:%|th|st|nd|rd)?(?!\w)/gi);
  if (!matches) return [];
  // Return unique numeric tokens
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

/**
 * Common technical buzzwords frequently hallucinated by generative models.
 */
const COMMONLY_FABRICATED_TERMS = [
  "autocad",
  "python",
  "machine learning",
  "deep learning",
  "artificial intelligence",
  "tableau",
  "power bi",
  "powerbi",
  "aws",
  "docker",
  "kubernetes",
  "solidworks",
  "sql",
  "matlab",
];

export interface FactCheckResult {
  passed: boolean;
  missingNumbers: string[];
  fabricatedTerms: string[];
}

export function verifyFactPreservation(input: string, output: string): FactCheckResult {
  const lowerInput = input.toLowerCase();
  const lowerOutput = output.toLowerCase();

  // 1. Check numbers
  const inputNumbers = extractNumbers(input);
  const missingNumbers: string[] = [];
  for (const num of inputNumbers) {
    // Normalise e.g. "12th" -> check either "12th" or "12" or "class 12"
    const rawDigits = num.replace(/\D/g, "");
    if (!lowerOutput.includes(num) && (!rawDigits || !lowerOutput.includes(rawDigits))) {
      missingNumbers.push(num);
    }
  }

  // 2. Check fabricated buzzwords
  const fabricatedTerms: string[] = [];
  for (const term of COMMONLY_FABRICATED_TERMS) {
    if (!lowerInput.includes(term) && lowerOutput.includes(term)) {
      fabricatedTerms.push(term);
    }
  }

  return {
    passed: missingNumbers.length === 0 && fabricatedTerms.length === 0,
    missingNumbers,
    fabricatedTerms,
  };
}

/**
 * Sanitizes output to remove unwanted quotes, markdown bold, or intro prefixes.
 */
export function cleanTransformedText(raw: string): string {
  let cleaned = raw.trim();

  // Remove leading/trailing quotation marks if wrapped completely
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith("“") && cleaned.endsWith("”"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove markdown bolding markers (**text** -> text)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");

  // Remove conversational preambles if the model accidentally included one
  cleaned = cleaned.replace(/^(Here is the (?:rewritten|converted|natural English) text:?\s*)/i, "");
  cleaned = cleaned.replace(/^(Rewritten English:?\s*)/i, "");
  cleaned = cleaned.replace(/^(Natural English:?\s*)/i, "");

  return cleaned.trim();
}

// ---------------------------------------------------------------------------
// Testing Hooks & Mock Handler
// ---------------------------------------------------------------------------

type MockTransformationHandler = (options: TransformTextOptions) => Promise<string | null>;
let mockHandler: MockTransformationHandler | null = null;

export function setMockTransformationHandler(handler: MockTransformationHandler | null): void {
  mockHandler = handler;
}

// ---------------------------------------------------------------------------
// Master Service Method
// ---------------------------------------------------------------------------

export async function transformText(options: TransformTextOptions): Promise<TransformTextResult> {
  const { text, mode = "HINGLISH_TO_ENGLISH", fieldName } = options;

  // Validation
  const trimmed = text ? text.trim() : "";
  if (!trimmed || trimmed.length < 5) {
    return {
      success: false,
      transformedText: "",
      originalText: text || "",
      mode,
      error: {
        code: "INVALID_INPUT",
        message: "Input text must be at least 5 characters long.",
        statusCode: 400,
      },
    };
  }

  if (trimmed.length > 2500) {
    return {
      success: false,
      transformedText: "",
      originalText: text,
      mode,
      error: {
        code: "TEXT_TOO_LONG",
        message: "Input text exceeds maximum length of 2500 characters.",
        statusCode: 400,
      },
    };
  }

  try {
    // Check mock handler for deterministic unit tests
    if (mockHandler) {
      const mockOutput = await mockHandler(options);
      if (mockOutput !== null) {
        const factCheck = verifyFactPreservation(trimmed, mockOutput);
        if (!factCheck.passed) {
          return {
            success: false,
            transformedText: "",
            originalText: text,
            mode,
            error: {
              code: "FACT_PRESERVATION_FAILED",
              message: `Transformation failed factual fidelity check. Missing: [${factCheck.missingNumbers.join(", ")}], Fabricated: [${factCheck.fabricatedTerms.join(", ")}]`,
              statusCode: 422,
            },
          };
        }
        return {
          success: true,
          transformedText: cleanTransformedText(mockOutput),
          originalText: text,
          mode,
          modelUsed: "mock-model",
        };
      }
    }

    // Assemble system instruction and prompt
    const systemInstruction =
      mode === "REWRITE_NATURAL" ? REWRITE_NATURAL_SYSTEM_INSTRUCTION : HINGLISH_SYSTEM_INSTRUCTION;
    const { prompt } = buildHinglishPrompt(trimmed, fieldName);

    // Invoke Gemini with temperature: 0.2 for strict precision
    const geminiRes: GeminiResult = await geminiService.generate({
      systemInstruction,
      prompt,
      temperature: 0.2,
      maxOutputTokens: 1024,
      timeoutMs: 25000,
      minOutputLength: 5,
    });

    if (!geminiRes.success) {
      return {
        success: false,
        transformedText: "",
        originalText: text,
        mode,
        error: {
          code: geminiRes.error.code,
          message: geminiRes.error.message,
          statusCode: geminiRes.error.statusCode,
        },
      };
    }

    const cleaned = cleanTransformedText(geminiRes.text);

    // Validate facts
    const factCheck = verifyFactPreservation(trimmed, cleaned);
    if (!factCheck.passed) {
      return {
        success: false,
        transformedText: "",
        originalText: text,
        mode,
        error: {
          code: "FACT_PRESERVATION_FAILED",
          message: `Transformation failed factual fidelity check. Missing: [${factCheck.missingNumbers.join(", ")}], Fabricated: [${factCheck.fabricatedTerms.join(", ")}]`,
          statusCode: 422,
        },
      };
    }

    return {
      success: true,
      transformedText: cleaned,
      originalText: text,
      mode,
      modelUsed: geminiRes.model,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Text transformation failed.";
    return {
      success: false,
      transformedText: "",
      originalText: text,
      mode,
      error: {
        code: "TRANSFORMATION_FAILED",
        message,
        statusCode: 500,
      },
    };
  }
}
