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

export interface StudioTargetAnchor {
  heading: string;
  snippet: string;
}

export interface StudioEditRequest {
  studentId?: string;
  docType: string;
  title?: string;
  sections: StudioSection[];
  instruction: string;
  history?: StudioChatTurn[];
  targetAnchor?: StudioTargetAnchor;
  /** Writing-relevant facts from the student's CRM profile, loaded on the server. */
  profileFacts?: string;
}

export interface StudioEditResult {
  reply: string;
  sections: StudioSection[];
  changedHeadings: string[];
  unverifiedValues: string[];
}

export const STUDIO_SYSTEM_INSTRUCTION = `You are the editing assistant inside a student admissions document studio (visa cover letters, statements of purpose, Europass CVs, recommendation letters). A counsellor gives you an instruction about the current document; you apply it.

Rules — follow all of them:
1. FACTS: Use only facts that appear in the document, in the "Verified student profile" section (from the CRM), or that the counsellor states in their message. Prefer the profile's facts over vague wording when they fit the request. Never invent names, scores, grades, dates, money amounts, employers, institutions, policy/booking numbers, emails or phone numbers.
2. MISSING DATA: Text like [MISSING: field.name] marks data the CRM does not have. Keep each marker exactly as is unless the counsellor's message supplies that value — then replace the marker with the supplied value.
3. SCOPE: Change only what the instruction asks for. Leave every other section's content byte-for-byte identical. Keep section headings unless asked to rename, add or delete a section.
4. FORMAT: Keep **bold** markdown and line breaks style. Write in the student's first-person voice for letters/SOPs; plain, professional, natural English.
5. QUESTIONS & CLARIFICATIONS: If the instruction is an informational question, problem report, or cannot be done without inventing facts, do NOT modify document sections — provide a direct, helpful explanation in "reply" and set "changedHeadings": [].
6. CV CONTACT & HEADER INFO: In CV documents, personal contact details (Home Address, Phone Number, Email Address, Mother Tongue, Nationality, Date of Birth) belong exclusively in the student contact header, NOT inside "ABOUT ME" or narrative body sections. NEVER append or insert home address, phone numbers, or emails into the "ABOUT ME" section.
7. SECTION PRESERVATION: You must return the EXACT same list of sections provided in the input. Return each section as a separate object in the "sections" array with its original "heading". NEVER merge or collapse multiple sections into a single section. NEVER embed "### Heading" or section titles inside the "content" text.
8. IN-PLACE TARGET REPLACEMENT & HUMANIZATION: When the counsellor asks to enhance, humanize, rephrase, rewrite, or improve a specific quoted text snippet, bullet point, or paragraph:
   - Identify the exact location of that snippet within the corresponding section.
   - Rephrase, polish, or humanize ONLY that specific text. Elevate clarity, diction, and impact using active, natural, professional English without artificial buzzwords or clichés.
   - Insert the enhanced text directly back into the EXACT SAME POSITION where the original snippet was located.
   - Keep all other bullets, paragraphs, dates, organizations, and surrounding sections 100% identical and undisturbed.
9. TARGETED ADDITIONS & REMOVALS:
   - When asked to add a skill, bullet, or metric to an existing work experience, education, or section, append or insert it under that specific entry without creating duplicate sections.
   - When asked to remove or delete a specific phrase, bullet, role, or skill, cleanly excise ONLY that targeted item without wiping out the rest of the entry or inserting the user's deletion command as document content.
10. CV ABOUT ME NARRATIVE SYNTHESIS:
   - When asked to add, integrate, highlight, or weave skills, experiences, or achievements into the "ABOUT ME" (or Personal Statement / Summary) section, synthesize them into a fluent, cohesive, professional first-person paragraph.
   - Do NOT append raw bullet lists, comma dumps, or conversational instructions into "ABOUT ME". Write natural, flowing sentences.
   - Strictly leave dedicated sections like "SKILLS" or "WORK EXPERIENCE" completely untouched unless explicitly requested.
11. DETAILED BRIEFS: When the counsellor gives a detailed writing brief (for example a prompt they would give ChatGPT, with tone, length, structure or points to cover), follow that brief fully — its tone, length and structure take priority over your default style — and you may rewrite or draft whole sections to satisfy it. Rule 1 still applies: where the brief needs a fact that is in neither the document nor the brief, write around it or insert a [MISSING: field.name] marker instead of inventing it. Mention any such gaps in "reply".
12. WHOLE-DOCUMENT REQUESTS: When the instruction is general and names no section (e.g. "enhance", "improve my CV", "make it better", "more professional", "proofread", "fix grammar", "make it shorter"), apply it to EVERY section that contains prose or bullet text — letter paragraphs, ABOUT ME / summary, and the description bullets of work experience, projects, internships and activities. Do not stop at one section. Never change names, dates, organisations, institutions, scores, contact details, skill lists or language levels.
13. CV ENTRY STRUCTURE: In CV sections, the first lines of each entry (job title or degree, then "Organisation [ dates ]") are structured data used by the layout. Keep those lines exactly as they are; rewrite only the description lines / bullets under them. Keep "•" bullets as bullets.
14. FOLLOW-UPS: A short follow-up ("shorter", "more formal", "again", "another version", "simpler", "undo the tone") refers to the section(s) you changed in your previous reply in the conversation; apply it there.
15. CONVERSATION STYLE (like ChatGPT): Write "reply" as a friendly, natural message to the counsellor. When you edited, briefly say what you improved — one short bullet per changed section if more than one — then offer ONE useful next step as a question (e.g. "Want me to make the work experience bullets more results-focused?"). When you answer a question or give advice without editing, answer fully and helpfully, as ChatGPT would. Never write boilerplate like "All other sections remain unchanged".
16. ENHANCING MEANS REWORDING: "Enhance", "improve", "polish" and similar mean rewording what is already written so it reads better. Never add sentences that introduce new subjects, interests, passions, strengths, achievements, responsibilities or results that are not stated in the document, the verified profile, or the counsellor's message. Never append commentary lines to data sections (scores, language levels, certificates, skills lists). An empty section is only drafted when asked, or for ABOUT ME / summary, and only from verified facts. Do not add a description line to a CV entry that has none. Do not infer subjects, streams or specialisations (e.g. "science and mathematics", "commerce", "computer science") from a qualification or target course — mention them only if they are written in the document, the profile or the message.
Respond with ONE JSON object only:
{"reply": "<your message to the counsellor, written as described in rule 15>",
 "sections": [{"heading": "<heading>", "content": "<full section text>"}, ...],   // the COMPLETE document after your edit, in order
 "changedHeadings": ["<headings you changed, added or deleted>"]}`;

export function buildStudioPrompt(req: StudioEditRequest): string {
  const doc = req.sections.map((s) => `### ${s.heading}\n${s.content}`).join("\n\n");
  const history = (req.history ?? [])
    .slice(-10)
    .map((t) => `${t.sender === "user" ? "Counsellor" : "Assistant"}: ${t.text}`)
    .join("\n");
  const anchorNotice = req.targetAnchor?.heading
    ? req.targetAnchor.snippet && req.targetAnchor.snippet.trim().length > 0
      ? `TARGETED IN-PLACE EDIT: The counsellor is specifically targeting this text snippet inside section "${req.targetAnchor.heading}":\n<<<TARGET_SNIPPET>>>\n${req.targetAnchor.snippet}\n<<<END_TARGET_SNIPPET>>>\nReplace/enhance ONLY this snippet in-place inside section "${req.targetAnchor.heading}", keeping its exact position and leaving all other text untouched.`
      : `TARGETED SECTION REWRITE: The counsellor is targeting section "${req.targetAnchor.heading}". Rewrite and enhance ONLY section "${req.targetAnchor.heading}". Keep all other sections 100% identical and unchanged. You MUST return "${req.targetAnchor.heading}" in the "changedHeadings" array.`
    : "";
  return [
    `Document type: ${req.docType}${req.title ? ` — "${req.title}"` : ""}`,
    `IMPORTANT: This document has ${req.sections.length} distinct sections. In your JSON response, you MUST return all ${req.sections.length} sections separately in the "sections" array with their original headings. Do NOT merge them into one section. Do NOT write "###" in section content.`,
    anchorNotice,
    req.profileFacts ? `Verified student profile (from the CRM; usable facts):\n${req.profileFacts}` : "",
    cvReadOnlySections(req).length
      ? `Read-only for this request (return unchanged and do not mention them as edited): ${cvReadOnlySections(req).join(", ")}.${ADDS_CONTENT_RE.test(req.instruction) ? "" : " Do not add new lines to CV entries; only reword existing description lines."}`
      : "",
    history ? `Recent conversation:\n${history}` : "",
    `Current document:\n${doc}`,
    `Counsellor instruction:\n<<<\n${req.instruction}\n>>>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** CV sections that hold structured data, and the words that mean the counsellor targets them. */
const CV_DATA_SECTION_KEYS: Array<{ heading: string; mentions: string[] }> = [
  { heading: "language skills", mentions: ["language", "cefr", "mother tongue"] },
  { heading: "language certificate", mentions: ["ielts", "toefl", "pte", "certificate", "band", "trf"] },
  { heading: "digital skills", mentions: ["skill"] },
  { heading: "declaration", mentions: ["declaration"] },
];

/** CV sections made of entries (title, "Organisation [ dates ]", description lines). */
const CV_ENTRY_SECTION_RE = /education|experience|internship|project|volunteer|leadership|achievement|certification/i;
/** Instructions that legitimately add lines to a CV entry. */
const ADDS_CONTENT_RE = /\b(add|include|insert|write|describe|draft|bullet|more\s+detail|expand|elaborate|longer)\b/i;

/** CV sections the model must leave alone for this instruction (shown to it and enforced). */
export function cvReadOnlySections(req: Pick<StudioEditRequest, "docType" | "instruction" | "sections" | "targetAnchor">): string[] {
  if (req.docType !== "CV") return [];
  const instructionLower = `${req.instruction} ${req.targetAnchor?.heading ?? ""}`.toLowerCase();
  return req.sections
    .map((s) => s.heading)
    .filter((h) => {
      const key = CV_DATA_SECTION_KEYS.find((k) => h.toLowerCase().includes(k.heading));
      return key && !key.mentions.some((m) => instructionLower.includes(m));
    });
}

function nonEmptyLineCount(text: string): number {
  return text.split(/\r?\n/).filter((l) => l.trim()).length;
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
    if (typeof json.reply === "string" && json.reply.trim()) {
      return {
        reply: json.reply.trim(),
        sections: req.sections,
        changedHeadings: [],
        unverifiedValues: [],
      };
    }
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

  // Clean unwanted address pollution from ABOUT ME for CV documents
  let sanitizedSections = sections.map((sec) => {
    if (req.docType === "CV" && sec.heading.toLowerCase().includes("about me")) {
      const cleanContent = sec.content
        .replace(/(?:\r?\n|\s+)(?:Home\s+Address|Address)\s*[:\-]\s*[^\n.]+(?:\.)?/gi, "")
        .trim();
      return { ...sec, content: cleanContent };
    }
    return sec;
  });

  // Strict Single-Section Enforcement:
  // If targetAnchor heading is specified, ensure ONLY that section is modified in-place,
  // sanitize it against hallucinations/duplicates, and guarantee all OTHER sections remain untouched.
  if (req.targetAnchor?.heading) {
    const targetNorm = cleanHeading(req.targetAnchor.heading).toLowerCase();
    const targetOriginal = req.sections.find((s) => {
      const norm = cleanHeading(s.heading).toLowerCase();
      return norm === targetNorm || norm.includes(targetNorm) || targetNorm.includes(norm);
    });

    if (targetOriginal) {
      const targetProduced = sanitizedSections.find((s) => {
        const norm = cleanHeading(s.heading).toLowerCase();
        return norm === targetNorm || norm.includes(targetNorm) || targetNorm.includes(norm);
      });

      let updatedContent = targetProduced?.content || targetOriginal.content;

      // 1. Clean markdown headers and echoed titles
      updatedContent = updatedContent
        .replace(new RegExp(`^\\s*#{1,6}\\s*${cleanHeading(targetOriginal.heading)}\\s*\\n?`, "i"), "")
        .replace(/^#+\s+[^\n]+\n?/, "")
        .replace(/^\*\*[^*]+:\*\*\s*\n?/, "")
        .trim();

      // 2. Strip conversational preambles
      updatedContent = updatedContent
        .replace(/^(?:(?:Here\s+(?:is|are)|Below\s+is|Certainly!?|Sure!?)[^\n]*?(?:rewritten|humanized|revised|updated|version|draft|section)[^\n]*?:?\s*)+/i, "")
        .trim();

      // 3. Strip conversational sign-offs
      updatedContent = updatedContent
        .replace(/(?:\n+(?:I\s+hope\s+this\s+helps|Let\s+me\s+know\s+if|Feel\s+free\s+to|Would\s+you\s+like\s+me\s+to)[\s\S]*)$/i, "")
        .trim();

      // 4. Guard against empty response: fallback to original
      if (!updatedContent || updatedContent.trim().length === 0) {
        updatedContent = targetOriginal.content;
      }

      // 5. Cross-Section Contamination Guard:
      // Strip any sentences copied from other sections that were not originally in this section
      const otherSections = req.sections.filter((s) => s.heading !== targetOriginal.heading);
      for (const other of otherSections) {
        const otherSentences = (other.content || "")
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 35);
        for (const os of otherSentences) {
          if (!targetOriginal.content.includes(os) && updatedContent.includes(os)) {
            updatedContent = updatedContent.replace(os, "").replace(/\s{2,}/g, " ").trim();
          }
        }
      }

      // 6. Deduplicate repeated consecutive sentences within updatedContent
      const contentSentences = updatedContent.split(/(?<=[.!?])\s+/);
      const seenSentencesInTarget = new Set<string>();
      const dedupedSentences: string[] = [];
      for (const cs of contentSentences) {
        const norm = cs.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (norm.length > 25 && seenSentencesInTarget.has(norm)) {
          continue;
        }
        if (norm.length > 25) {
          seenSentencesInTarget.add(norm);
        }
        dedupedSentences.push(cs.trim());
      }
      updatedContent = dedupedSentences.join(" ");

      // 7. Guarantee exact section list and order matches req.sections
      sanitizedSections = req.sections.map((orig) => {
        const norm = cleanHeading(orig.heading).toLowerCase();
        const isTarget = norm === targetNorm || norm.includes(targetNorm) || targetNorm.includes(norm);
        return {
          heading: orig.heading,
          content: isTarget ? updatedContent : orig.content,
        };
      });
    }
  }

  // CV data-only sections (language levels, certificates, skills lists) are structured data:
  // unless the counsellor's instruction names them, any change the model made is undone.
  // CV entry sections (education, work, projects…) may be reworded but not padded with
  // extra lines unless the counsellor asked to add or expand something.
  if (req.docType === "CV") {
    const readOnly = new Set(cvReadOnlySections(req));
    const mayAddLines = ADDS_CONTENT_RE.test(req.instruction);
    for (let i = 0; i < sanitizedSections.length; i++) {
      const heading = sanitizedSections[i].heading;
      const original = before.get(heading);
      if (original === undefined) continue;
      const padded =
        !mayAddLines &&
        CV_ENTRY_SECTION_RE.test(heading) &&
        nonEmptyLineCount(sanitizedSections[i].content) > nonEmptyLineCount(original);
      if (readOnly.has(heading) || padded) sanitizedSections[i] = { ...sanitizedSections[i], content: original };
    }
  }

  const changedSections = sanitizedSections.filter((s) => before.get(s.heading) !== s.content);
  const changed = changedSections.map((s) => s.content);
  const unverifiedValues = findUnverifiedValues(changed.join("\n"), [
    req.instruction,
    req.profileFacts ?? "",
    ...req.sections.map((s) => s.content),
    ...(req.history ?? []).filter((t) => t.sender === "user").map((t) => t.text),
  ]);

  // Only sections whose text really changed (the model's own list can include sections it
  // only claims to have edited, or ones restored by the guards above). Added or renamed
  // sections reported by the model are kept.
  const actuallyChanged = new Set(changedSections.map((s) => s.heading));
  const changedHeadings =
    Array.isArray(json.changedHeadings) && json.changedHeadings.length > 0 && !req.targetAnchor?.heading
      ? json.changedHeadings
          .filter((h): h is string => typeof h === "string")
          .map((h) => originalByKey.get(cleanHeading(h).toLowerCase()) ?? cleanHeading(h))
          .filter((h) => actuallyChanged.has(h) || !before.has(h))
      : changedSections.map((s) => s.heading);

  // Sections the model said it edited but whose edit was undone above (protected CV data or
  // added lines): say so, so the reply never claims a change that did not happen.
  const claimed = Array.isArray(json.changedHeadings)
    ? json.changedHeadings
        .filter((h): h is string => typeof h === "string")
        .map((h) => originalByKey.get(cleanHeading(h).toLowerCase()) ?? cleanHeading(h))
    : [];
  const undone = claimed.filter((h) => before.has(h) && !actuallyChanged.has(h) && req.docType === "CV");
  const baseReply = typeof json.reply === "string" && json.reply.trim() ? json.reply.trim() : "Done.";
  const replyNote = undone.length
    ? `\n\n(I kept **${undone.join(", ")}** exactly as it was — it holds fixed details like dates, grades or declarations. Ask me directly if you want to change it.)`
    : "";

  return {
    reply: baseReply + replyNote,
    sections: sanitizedSections,
    changedHeadings,
    unverifiedValues,
  };
}
