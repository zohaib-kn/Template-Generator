import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerateSectionRequest {
  sectionId: string;
  sectionTitle: string;
  context: StudentDocumentContext;
  currentContent?: string;
}

// Fast, verified Gemini Flash models (flash-lite first for high-throughput & generous quota)
const FAST_FLASH_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
];

// ---------------------------------------------------------------------------
// Academic Domain Detection
// ---------------------------------------------------------------------------

function detectAcademicDomain(courseName?: string): string {
  if (!courseName) return "General Academic Discipline";
  const lower = courseName.toLowerCase();

  if (
    lower.includes("finance") ||
    lower.includes("economic") ||
    lower.includes("business") ||
    lower.includes("commerce") ||
    lower.includes("accounting") ||
    lower.includes("management") ||
    lower.includes("marketing") ||
    lower.includes("banking") ||
    lower.includes("mba")
  ) {
    return "Business, Finance, Economics & Corporate Governance (Focus strictly on economic analysis, financial markets, trade, and commercial decision-making; STRICTLY avoid engineering, electronics, coding, or robotics)";
  }

  if (
    lower.includes("medicine") ||
    lower.includes("surgery") ||
    lower.includes("health") ||
    lower.includes("clinical") ||
    lower.includes("biomed") ||
    lower.includes("pharmacy") ||
    lower.includes("nursing")
  ) {
    return "Medicine, Surgery & Healthcare (Focus on medical science, clinical practice, patient care, pathology, and healthcare systems)";
  }

  if (
    lower.includes("law") ||
    lower.includes("legal") ||
    lower.includes("llm") ||
    lower.includes("llb") ||
    lower.includes("juris") ||
    lower.includes("dispute")
  ) {
    return "Law, Jurisprudence & Legal Regulation (Focus on international legal frameworks, statutory analysis, corporate law, and dispute resolution)";
  }

  if (
    lower.includes("computer") ||
    lower.includes("software") ||
    lower.includes("data") ||
    lower.includes("artificial intelligence") ||
    lower.includes("ai") ||
    lower.includes("cyber") ||
    lower.includes("information tech") ||
    lower.includes("computing")
  ) {
    return "Computer Science, Artificial Intelligence & Data Technologies (Focus on algorithmic problem solving, software engineering, and intelligent systems)";
  }

  if (
    lower.includes("engineer") ||
    lower.includes("mechanical") ||
    lower.includes("civil") ||
    lower.includes("electrical") ||
    lower.includes("building")
  ) {
    return "Applied Engineering & Technical Systems (Focus on design principles, infrastructure, and technical execution)";
  }

  if (
    lower.includes("humanities") ||
    lower.includes("history") ||
    lower.includes("philosophy") ||
    lower.includes("literature") ||
    lower.includes("art") ||
    lower.includes("design") ||
    lower.includes("culture")
  ) {
    return "Humanities, Social Sciences & Cultural Studies (Focus on critical inquiry, historical analysis, and social impact)";
  }

  return "Academic Discipline of " + courseName;
}

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

function buildSectionPrompt(
  sectionId: string,
  sectionTitle: string,
  ctx: StudentDocumentContext,
  currentContent?: string
): string {
  const { student, academics, destination, career, sponsor } = ctx;
  const domain = detectAcademicDomain(destination.course);

  const baseContext = `
Applicant Context:
- Full Name: ${student.fullName || "Applicant"}
- Nationality / Home Country: ${student.nationality || "Indian"}, ${student.country || "India"}
- Previous Education: ${academics.latestQualification || "Higher Secondary"} from ${academics.institution || "School/College"} (${academics.board || "CBSE"}, ${academics.completionYear || ""})
- Previous Academic Stream / Subjects: ${academics.subjects || "General Curriculum"} (Score: ${academics.percentage || "Merit"})
- Target Degree & Course: ${destination.degreeLevel || "Degree"} in "${destination.course || ""}" (${destination.duration || "Standard Duration"})
- Target University: "${destination.university || ""}", located in ${destination.city || "Italy"}, ${destination.country || "Italy"}
- Target Intake: ${destination.intakeMonth || "Autumn"} ${destination.intakeYear || "2026"}
- Primary Academic Domain: ${domain}
- Career Aspirations: ${career.shortTermGoal || "Professional specialization in " + (destination.course || "the field")}${career.longTermGoal ? `; ${career.longTermGoal}` : ""}
- Financial Sponsor: ${sponsor.name || "Parents"} (${sponsor.relationship || "Father"}${sponsor.occupation ? `, ${sponsor.occupation}` : ""})
`.trim();

  let sectionInstruction = "";

  switch (sectionId) {
    case "student-introduction":
      sectionInstruction = `
Task: Write an authoritative, formal "Student Introduction" paragraph for a University Visa Cover Letter / Statement of Purpose.
- State applicant's full name, citizenship from their home city/country, valid passport number, and permanent address.
- Respectfully declare application for the student visa to pursue full-time studies in "${destination.course}" at "${destination.university}", commencing ${destination.intakeMonth || ""} ${destination.intakeYear || ""}.
- Tone: Diplomatic, formal, and precise. Word count: 75–100 words.`;
      break;

    case "why-course":
      sectionInstruction = `
Task: Write a compelling, field-specific "Why This Course" paragraph for "${destination.course}".
- Directly connect previous studies (${academics.subjects || "foundational coursework"}) to the intellectual motivation for studying "${destination.course}".
- Discuss key thematic pillars of "${destination.course}" (e.g. theoretical depth, analytical rigor, modern industry applications) that align with the student's career aspirations.
- CRITICAL: Keep every single sentence strictly within the ${domain}. NEVER mention robotics, embedded systems, physics, or engineering unless the course is explicitly an engineering course.
- Tone: Passionate yet scholarly. Word count: 95–130 words.`;
      break;

    case "why-university":
      sectionInstruction = `
Task: Write a persuasive "Why This University" paragraph explaining the choice of "${destination.university}" in ${destination.city || "the city"}, ${destination.country || "Italy"}.
- Highlight "${destination.university}"'s distinguished academic legacy, research and teaching faculty in "${destination.course}", international student body, and well-structured curriculum.
- Do NOT describe the university as a technical or engineering institute if the course is in business, finance, law, or medicine.
- Tone: Respectful, well-informed, and purposeful. Word count: 85–115 words.`;
      break;

    case "why-italy":
      sectionInstruction = `
Task: Write an articulate "Why This Country" paragraph explaining why ${destination.country || "Italy"} and ${destination.city || "the host city"} are the ideal destination for this academic endeavor.
- Mention ${destination.country || "Italy"}'s historic academic heritage, Bologna degree structure, safe environment, and international recognition of diplomas.
- Tone: Sincere and culturally appreciative. Word count: 75–100 words.`;
      break;

    case "future-academic-plan":
      sectionInstruction = `
Task: Write a concise "Future Academic Plan" statement.
- Outline post-graduation progression following this degree in "${destination.course}" (e.g. pursuing advanced postgraduate master's specializations or professional credentials in this exact field).
- Tone: Dedicated and forward-looking. Word count: 45–70 words.`;
      break;

    case "career-plan":
      sectionInstruction = `
Task: Write a realistic, goal-oriented "Career Plan" paragraph.
- Connect competencies and insights gained in "${destination.course}" directly to professional roles in the student's home country (${student.country || "India"}).
- Mention legitimate career titles appropriate for ${domain} (e.g. financial analyst, economic consultant, corporate strategist, clinical specialist, legal counsel).
- Tone: Grounded, ambitious, and purposeful. Word count: 80–110 words.`;
      break;

    case "return-intent":
      sectionInstruction = `
Task: Write a firm, convincing "Return / Home Country Intent" paragraph.
- Emphasize deep family bonds in ${student.country || "India"} (mentioning sponsor ${sponsor.name || "parents"}, ${sponsor.relationship || "family"}).
- State a clear, unwavering commitment to return home immediately upon graduation to apply acquired global knowledge and build a long-term career.
- Tone: Reassuring and firm. Word count: 75–105 words.`;
      break;

    default:
      sectionInstruction = `
Task: Write a professional academic paragraph for the section "${sectionTitle}".
- Accurately reference "${destination.course}" at "${destination.university}".
- Word count: 85–120 words.`;
      break;
  }

  // Filter out stale legacy template drafts from being fed back as reference
  const isDefaultStaticDraft =
    currentContent &&
    (currentContent.includes("automation and embedded systems") ||
      currentContent.includes("engineering education, modern laboratory") ||
      currentContent.includes("robotics to prepare for specialized") ||
      currentContent.includes("Padova in particular offers") ||
      currentContent.includes("As the only daughter in my family"));

  const existingDraftNotice =
    currentContent && !isDefaultStaticDraft
      ? `\nCounsellor Prior Notes / Current Draft for Reference:\n"${currentContent}"\n`
      : "";

  return `You are an elite university admissions advisor and consular documentation specialist writing a Statement of Purpose / Visa Cover Letter section.

${baseContext}
${existingDraftNotice}
${sectionInstruction}

STRICT WRITING RULES:
1. Ground every sentence in the student's chosen discipline: "${destination.course}". Do NOT invent conflicting facts, unverified grades, or unrelated technical jargon.
2. Return ONLY the finalized, continuous paragraph text.
3. Do NOT include markdown bold (**text**), bullet points, title headers, quotation marks, or conversational notes.`;
}

// ---------------------------------------------------------------------------
// POST /api/sop/generate
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_KEY_MISSING",
          message: "GEMINI_API_KEY is not configured on the server.",
        },
      },
      { status: 500 }
    );
  }

  let body: GenerateSectionRequest;
  try {
    body = (await req.json()) as GenerateSectionRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid JSON request body.",
        },
      },
      { status: 400 }
    );
  }

  const { sectionId, sectionTitle, context, currentContent } = body;

  if (!sectionId || !context) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELDS",
          message: "Missing required fields: sectionId and context.",
        },
      },
      { status: 400 }
    );
  }

  // Initialize Gemini SDK
  let ai: GoogleGenAI;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GEMINI_INIT_FAILED",
          message: "Failed to initialize Gemini SDK.",
        },
      },
      { status: 500 }
    );
  }

  const prompt = buildSectionPrompt(sectionId, sectionTitle, context, currentContent);

  // Try fast Flash models in sequence with a tight 8s timeout safeguard
  let lastError: unknown = null;

  for (const modelName of FAST_FLASH_MODELS) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 8_000)
      );

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const text = response?.text?.trim();

      if (text && text.length > 20) {
        return NextResponse.json(
          {
            success: true,
            sectionId,
            model: modelName,
            text,
          },
          { status: 200 }
        );
      }
    } catch (err: unknown) {
      lastError = err;
      const errStr = err instanceof Error ? err.message : String(err);

      // On temporary unavailable (503), timeout, not found (404), or quota limit (429), try next Flash model in cascade
      if (
        errStr.includes("503") ||
        errStr.includes("TIMEOUT") ||
        errStr.includes("404") ||
        errStr.includes("429") ||
        errStr.includes("quota") ||
        errStr.includes("RESOURCE_EXHAUSTED")
      ) {
        continue;
      }
      break;
    }
  }

  const errMessage =
    lastError instanceof Error ? lastError.message : String(lastError ?? "");

  let code = "GENERATION_FAILED";
  let message = "Unable to generate narrative with Gemini.";
  let status = 502;

  if (errMessage.includes("429") || errMessage.includes("quota")) {
    code = "QUOTA_EXCEEDED";
    message = "Gemini API rate limit or quota exceeded. Please try again in a moment.";
    status = 429;
  } else if (errMessage.includes("401") || errMessage.includes("API key not valid")) {
    code = "INVALID_API_KEY";
    message = "Configured Gemini API key is invalid.";
    status = 401;
  } else if (errMessage.includes("TIMEOUT")) {
    code = "TIMEOUT";
    message = "AI generation timed out. Please try again.";
    status = 504;
  }

  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}
