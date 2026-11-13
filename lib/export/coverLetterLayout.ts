export function unbundleCoverLetterSections(singleSectionContent: string, defaultHeading = "Recipient / Consulate"): ExportSection[] {
  if (!singleSectionContent || !singleSectionContent.includes("###")) {
    return [{ title: defaultHeading, content: singleSectionContent }];
  }

  const result: ExportSection[] = [];
  const lines = singleSectionContent.split(/\r?\n/);
  let currentTitle = defaultHeading;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*#{1,6}\s+(.+)$/);
    if (match) {
      if (currentLines.length > 0 || currentTitle !== defaultHeading) {
        result.push({
          title: currentTitle,
          content: currentLines.join("\n").trim(),
        });
        currentLines = [];
      }
      currentTitle = match[1].trim();
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 || result.length === 0) {
    result.push({
      title: currentTitle,
      content: currentLines.join("\n").trim(),
    });
  }

  return result.filter((sec) => sec.content.length > 0);
}

/**
 * lib/export/coverLetterLayout.ts
 *
 * Maps cover-letter template sections onto the master letter layout
 * (recipient, subject, 8 flowing paragraphs, signature) for the PDF and DOCX exporters.
 *
 * Every section is assigned to exactly one slot, so a section can never be printed twice
 * (e.g. "Travel & Health Insurance" used to match both "insurance" and "travel"), and
 * sections that match no slot are kept, not dropped.
 */

export interface ExportSection {
  title: string;
  content: string;
}

type Slot =
  | "recipient" | "subject" | "intro" | "academics" | "whyCourse" | "whyUniversity" | "whyCountry"
  | "futurePlan" | "careerPlan" | "returnIntent" | "finance" | "accommodation" | "insurance"
  | "travel" | "closing" | "signature";

/** Ordered rules: the first matching rule wins, so more specific titles come first. */
const SLOT_RULES: Array<[Slot, RegExp]> = [
  ["recipient", /recipient|consulate|embassy/],
  ["subject", /subject/],
  ["signature", /signature|contact/],
  ["insurance", /insurance/],
  ["travel", /travel|flight/],
  ["accommodation", /accommodation|housing/],
  ["finance", /financ|sponsor|funding/],
  ["intro", /student introduction|introduction/],
  ["academics", /academic background|academics/],
  ["whyCourse", /why (this )?course|programme|program/],
  ["whyUniversity", /why (this )?university/],
  ["whyCountry", /why italy|why this country|why .*country/],
  ["futurePlan", /future academic plan|future plan/],
  ["careerPlan", /career/],
  ["returnIntent", /return|home country/],
  ["closing", /closing/],
];

export function classifyCoverLetterSection(title: string): Slot | null {
  const t = title.toLowerCase();
  for (const [slot, re] of SLOT_RULES) if (re.test(t)) return slot;
  return null;
}

export interface CoverLetterLayout {
  recipient: string;
  subject: string;
  /** Body paragraphs in master order; unclassified sections are placed before the closing. */
  paragraphs: string[];
  signature: string;
}

export function isMetadataOrScaffoldingSection(title: string, content: string): boolean {
  const t = (title || "").toLowerCase();
  const c = (content || "").toLowerCase();
  if (/architecture|core pillar|prompt|guidance|instruction|pillar/i.test(t)) return true;
  if (/^-\s*core pillar/im.test(c)) return true;
  return false;
}

export function deduplicateSentencesAcrossParagraphs(paragraphs: string[]): string[] {
  const seenSentences = new Set<string>();
  const cleanedParagraphs: string[] = [];

  for (const p of paragraphs) {
    if (!p || !p.trim()) continue;
    const sentences = p.split(/(?<=[.!?])\s+/);
    const kept: string[] = [];
    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      const norm = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (norm.length > 25 && seenSentences.has(norm)) {
        continue;
      }
      if (norm.length > 25) {
        seenSentences.add(norm);
      }
      kept.push(trimmed);
    }
    const joined = kept.join(" ").trim();
    if (joined) {
      cleanedParagraphs.push(joined);
    }
  }

  return cleanedParagraphs;
}

export function buildCoverLetterLayout(sections: ExportSection[]): CoverLetterLayout {
  let effectiveSections = sections;
  if (sections.length === 1 && sections[0]?.content && (sections[0].content.includes("###") || sections[0].content.includes("Subject:"))) {
    effectiveSections = unbundleCoverLetterSections(sections[0].content, sections[0].title || "Recipient / Consulate");
  }

  const bySlot = new Map<Slot, string[]>();
  const unclassified: string[] = [];

  for (const s of effectiveSections) {
    const content = (s.content || "").trim();
    if (!content) continue;
    if (isMetadataOrScaffoldingSection(s.title || "", content)) continue;
    const slot = classifyCoverLetterSection(s.title || "");
    if (!slot) {
      unclassified.push(content);
      continue;
    }
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), content]);
  }

  const get = (...slots: Slot[]) => slots.flatMap((slot) => bySlot.get(slot) ?? []).join(" ");

  const introList = bySlot.get("intro") ?? [];
  const academicsList = bySlot.get("academics") ?? [];
  let firstParagraph = "";
  if (introList.length > 0 && academicsList.length > 0) {
    const introText = introList.join(" ").trim();
    const acadText = academicsList.join(" ").trim();
    const introClean = introText.replace(/\*\*/g, "").toLowerCase().replace(/\s+/g, " ").slice(0, 30);
    const acadClean = acadText.replace(/\*\*/g, "").toLowerCase().replace(/\s+/g, " ");
    if (introClean.length > 10 && acadClean.includes(introClean)) {
      firstParagraph = acadText;
    } else {
      firstParagraph = `${introText} ${acadText}`.trim();
    }
  } else {
    firstParagraph = [...introList, ...academicsList].join(" ").trim();
  }

  const futureList = bySlot.get("futurePlan") ?? [];
  const careerList = bySlot.get("careerPlan") ?? [];
  const returnList = bySlot.get("returnIntent") ?? [];

  let plansParagraph = "";
  const futureText = futureList.join(" ").trim();
  const careerText = careerList.join(" ").trim();
  const returnText = returnList.join(" ").trim();

  // If futurePlan is already a comprehensive synthesis of academic plans, career progression, and return intent,
  // do not re-append redundant legacy career/return sections that would create duplicate sentences.
  const futureHasReturn = /\b(?:return(?:ing)?|home\s+country|back\s+to\s+(?:india|my\s+home))\b/i.test(futureText);
  const futureHasCareer = /\b(?:career|entry-level|profession(?:al)?|workplace|responsibilit(?:y|ies))\b/i.test(futureText);

  if (futureText.length > 250 && futureHasReturn && futureHasCareer) {
    plansParagraph = futureText;
  } else if (futureText.length > 200 && futureHasCareer) {
    plansParagraph = futureText;
    if (returnText && !futureHasReturn) {
      plansParagraph = `${futureText} ${returnText}`.trim();
    }
  } else {
    plansParagraph = [futureText, careerText, returnText].filter(Boolean).join(" ").trim();
  }

  const rawParagraphs = [
    firstParagraph,
    get("whyCourse"),
    get("whyUniversity"),
    get("whyCountry"),
    plansParagraph,
    get("finance"),
    get("accommodation", "insurance", "travel"),
    ...unclassified,
    get("closing"),
  ].filter(Boolean);

  const paragraphs = deduplicateSentencesAcrossParagraphs(rawParagraphs);

  return {
    recipient: get("recipient"),
    subject: get("subject"),
    paragraphs,
    signature: (bySlot.get("signature") ?? []).join("\n"),
  };
}
