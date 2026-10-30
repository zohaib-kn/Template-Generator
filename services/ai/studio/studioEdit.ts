/**
 * services/ai/studio/studioEdit.ts
 *
 * Prompt building and response checking for the Document Studio assistant: the operator
 * types an instruction, the model returns the edited sections plus a short reply.
 *
 * Guardrails: the model may only use facts already in the document or supplied by the
 * operator; [MISSING: …] markers stay until the operator provides the value; any number
 * or email in the output that appears in neither source is reported back as unverified.
 */

export interface StudioSection {
  heading: string;
  content: string;
}

export interface StudioChatTurn {
  sender: "user" | "assistant";
  text: string;
}

export interface StudioEditRequest {
  studentId?: string;
  docType: string;
  title?: string;
  sections: StudioSection[];
  instruction: string;
  history?: StudioChatTurn[];
}

export interface StudioEditResult {
  reply: string;
  sections: StudioSection[];
  changedHeadings: string[];
  unverifiedValues: string[];
}

export const STUDIO_SYSTEM_INSTRUCTION = `You are the editing assistant inside a student admissions document studio (visa cover letters, statements of purpose, Europass CVs, recommendation letters). A counsellor gives you an instruction about the current document; you apply it.

Rules — follow all of them:
1. FACTS: Use only facts that already appear in the document or that the counsellor states in their message. Never invent names, scores, grades, dates, money amounts, employers, institutions, policy/booking numbers, emails or phone numbers.
2. MISSING DATA: Text like [MISSING: field.name] marks data the CRM does not have. Keep each marker exactly as is unless the counsellor's message supplies that value — then replace the marker with the supplied value.
3. SCOPE: Change only what the instruction asks for. Leave every other section's content byte-for-byte identical. Keep section headings unless asked to rename, add or delete a section.
4. FORMAT: Keep **bold** markdown and line breaks style. Write in the student's first-person voice for letters/SOPs; plain, professional, natural English.
5. If the instruction is a question or cannot be done without inventing facts, do not edit — explain in "reply" what information you need.
6. CV CONTACT & HEADER INFO: In CV documents, personal contact details (Home Address, Phone Number, Email Address, Mother Tongue, Nationality, Date of Birth) belong exclusively in the student contact header, NOT inside "ABOUT ME" or narrative body sections. NEVER append or insert home address, phone numbers, or emails into the "ABOUT ME" section.
7. SECTION PRESERVATION: You must return the EXACT same list of sections provided in the input. Return each section as a separate object in the "sections" array with its original "heading". NEVER merge or collapse multiple sections into a single section. NEVER embed "### Heading" or section titles inside the "content" text.

Respond with ONE JSON object only:
{"reply": "<one or two sentences telling the counsellor what you changed or what you need>",
 "sections": [{"heading": "<heading>", "content": "<full section text>"}, ...],   // the COMPLETE document after your edit, in order
 "changedHeadings": ["<headings you changed, added or deleted>"]}`;

export function buildStudioPrompt(req: StudioEditRequest): string {
  const doc = req.sections.map((s) => `### ${s.heading}\n${s.content}`).join("\n\n");
  const history = (req.history ?? [])
    .slice(-6)
    .map((t) => `${t.sender === "user" ? "Counsellor" : "Assistant"}: ${t.text}`)
    .join("\n");
  return [
    `Document type: ${req.docType}${req.title ? ` — "${req.title}"` : ""}`,
    `IMPORTANT: This document has ${req.sections.length} distinct sections. In your JSON response, you MUST return all ${req.sections.length} sections separately in the "sections" array with their original headings. Do NOT merge them into one section. Do NOT write "###" in section content.`,
    history ? `Recent conversation:\n${history}` : "",
    `Current document:\n${doc}`,
    `Counsellor instruction:\n<<<\n${req.instruction}\n>>>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Strips "Section 3:" / "### " style prefixes a model may echo back from the prompt layout. */
function cleanHeading(heading: string): string {
  return heading.replace(/^\s*#+\s*/, "").replace(/^(section\s*\d+\s*[:.\-–]\s*)+/i, "").trim();
}

const VALUE_RE = /[\w.+-]+@[\w-]+\.[\w.-]+|\d[\d,.:/%-]*\d|\d/g;

/** Numbers / emails present in `output` but in none of the sources. */
export function findUnverifiedValues(output: string, sources: string[]): string[] {
  const known = new Set<string>();
  for (const src of sources) for (const m of src.match(VALUE_RE) ?? []) known.add(m.replace(/[.,]$/, ""));
  const unverified = new Set<string>();
  for (const m of output.match(VALUE_RE) ?? []) {
    const v = m.replace(/[.,]$/, "");
    if (!known.has(v) && !/^\d$/.test(v)) unverified.add(v);
  }
  return [...unverified];
}

/** Parses and sanity-checks the model's JSON. Throws on anything unusable. */
export function parseStudioResponse(raw: string, req: StudioEditRequest): StudioEditResult {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const json = JSON.parse(cleaned) as Partial<StudioEditResult> & { sections?: unknown };
  if (!Array.isArray(json.sections) || json.sections.length === 0 || json.sections.length > 80) {
    throw new Error("Model returned no usable sections.");
  }
  // Auto-unbundle: If input had multiple sections but model collapsed into 1 section with ### markers
  let unbundledJsonSections = json.sections as Partial<StudioSection>[];
  if (
    req.sections.length > 1 &&
    unbundledJsonSections.length === 1 &&
    typeof unbundledJsonSections[0]?.content === "string" &&
    unbundledJsonSections[0].content.includes("###")
  ) {
    const rawSingle = unbundledJsonSections[0].content;
    const lines = rawSingle.split(/\r?\n/);
    const splitSections: { heading: string; content: string }[] = [];
    let curHeading = unbundledJsonSections[0].heading || req.sections[0]?.heading || "Recipient / Consulate";
    let curLines: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\s*#{1,6}\s+(.+)$/);
      if (match) {
        if (curLines.length > 0 || splitSections.length > 0) {
          splitSections.push({ heading: curHeading, content: curLines.join("\n").trim() });
          curLines = [];
        }
        curHeading = match[1].trim();
      } else {
        curLines.push(line);
      }
    }
    if (curLines.length > 0) {
      splitSections.push({ heading: curHeading, content: curLines.join("\n").trim() });
    }

    if (splitSections.length > 1) {
      unbundledJsonSections = splitSections;
    }
  }

  // Headings are template keys (exports map sections by them), so a returned heading that
  // matches an original one after cleanup is restored to the exact original text.
  const originalByKey = new Map(req.sections.map((s) => [cleanHeading(s.heading).toLowerCase(), s.heading]));
  const sections: StudioSection[] = unbundledJsonSections.map((s) => {
    const sec = s as Partial<StudioSection>;
    if (typeof sec?.heading !== "string" || typeof sec?.content !== "string") throw new Error("Malformed section.");
    const cleaned = cleanHeading(sec.heading);
    let content = sec.content;
    // Strip echoed markdown heading prefixes at start of content
    content = content.replace(new RegExp(`^\\s*#{1,6}\\s*${cleaned}\\s*\\n?`, "i"), "").trim();
    content = content.replace(/^#+\s+[^\n]+\n/, "").trim();
    return { heading: originalByKey.get(cleaned.toLowerCase()) ?? cleaned, content };
  });

  const before = new Map(req.sections.map((s) => [s.heading, s.content]));
  const changed = sections.filter((s) => before.get(s.heading) !== s.content).map((s) => s.content);
  const unverifiedValues = findUnverifiedValues(changed.join("\n"), [
    req.instruction,
    ...req.sections.map((s) => s.content),
    ...(req.history ?? []).filter((t) => t.sender === "user").map((t) => t.text),
  ]);

  // Clean unwanted address pollution from ABOUT ME for CV documents
  const sanitizedSections = sections.map((sec) => {
    if (req.docType === "CV" && sec.heading.toLowerCase().includes("about me")) {
      const cleanContent = sec.content
        .replace(/(?:\r?\n|\s+)(?:Home\s+Address|Address)\s*[:\-]\s*[^\n.]+(?:\.)?/gi, "")
        .trim();
      return { ...sec, content: cleanContent };
    }
    return sec;
  });

  const changedSections = sanitizedSections.filter((s) => before.get(s.heading) !== s.content);
  const changedHeadings =
    Array.isArray(json.changedHeadings) && json.changedHeadings.length > 0
      ? json.changedHeadings
          .filter((h): h is string => typeof h === "string")
          .map((h) => originalByKey.get(cleanHeading(h).toLowerCase()) ?? cleanHeading(h))
      : changedSections.map((s) => s.heading);

  return {
    reply: typeof json.reply === "string" && json.reply.trim() ? json.reply.trim() : "Done.",
    sections: sanitizedSections,
    changedHeadings,
    unverifiedValues,
  };
}
