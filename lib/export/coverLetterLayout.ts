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

export function buildCoverLetterLayout(sections: ExportSection[]): CoverLetterLayout {
  const bySlot = new Map<Slot, string[]>();
  const unclassified: string[] = [];

  for (const s of sections) {
    const content = (s.content || "").trim();
    if (!content) continue;
    const slot = classifyCoverLetterSection(s.title || "");
    if (!slot) {
      unclassified.push(content);
      continue;
    }
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), content]);
  }

  const get = (...slots: Slot[]) => slots.flatMap((slot) => bySlot.get(slot) ?? []).join(" ");

  const paragraphs = [
    get("intro", "academics"),
    get("whyCourse"),
    get("whyUniversity"),
    get("whyCountry"),
    get("futurePlan", "careerPlan", "returnIntent"),
    get("finance"),
    get("accommodation", "insurance", "travel"),
    ...unclassified,
    get("closing"),
  ].filter(Boolean);

  return {
    recipient: get("recipient"),
    subject: get("subject"),
    paragraphs,
    signature: (bySlot.get("signature") ?? []).join("\n"),
  };
}
