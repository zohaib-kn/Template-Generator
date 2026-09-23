/**
 * services/import/normalizers/deterministicParser.ts
 *
 * Fast, 100% deterministic text extraction for resume documents.
 * Extracts contact information, links, dates, and splits text into
 * sections matching the 16 Resume Builder sections without using AI.
 */

import type { DocumentData, PersonalDetails, SkillEntry, LanguageEntry } from "@/types";
import { generateId } from "@/lib/generateId";

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,6}/g;
const URL_REGEX = /\b(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;

const SECTION_PATTERNS: { key: keyof DocumentData; regex: RegExp }[] = [
  {
    key: "aboutMe",
    regex: /^(?:summary|professional summary|executive summary|profile|about me|academic profile|career objective|objective)\b/i,
  },
  {
    key: "education",
    regex: /^(?:education|academic background|academic qualifications|academics|education & training|qualifications|degrees)\b/i,
  },
  {
    key: "internships",
    regex: /^(?:experience|work experience|professional experience|employment history|internships|internships & work experience|career history|work history)\b/i,
  },
  {
    key: "academicProjects",
    regex: /^(?:academic projects|projects|key projects|capstone projects|personal projects|technical projects)\b/i,
  },
  {
    key: "skills",
    regex: /^(?:skills|technical skills|core competencies|key skills|academic & transferable skills|competencies|areas of expertise|technologies)\b/i,
  },
  {
    key: "languages",
    regex: /^(?:languages|language skills|language proficiency|languages known)\b/i,
  },
  {
    key: "certifications",
    regex: /^(?:certifications|courses & certifications|certificates|professional certifications|licenses & certifications|licenses)\b/i,
  },
  {
    key: "achievements",
    regex: /^(?:achievements|awards|achievements & awards|honors|honours & awards|key achievements)\b/i,
  },
  {
    key: "leadershipActivities",
    regex: /^(?:leadership|leadership activities|extracurricular activities|leadership & extracurricular|positions of responsibility)\b/i,
  },
  {
    key: "volunteering",
    regex: /^(?:volunteering|volunteer experience|community service|social work)\b/i,
  },
  {
    key: "academicInterests",
    regex: /^(?:academic interests|areas of interest|research interests|fields of interest)\b/i,
  },
  {
    key: "hobbies",
    regex: /^(?:hobbies|personal interests|hobbies & personal interests|interests|leisure activities)\b/i,
  },
  {
    key: "recommendations",
    regex: /^(?:recommendations|references|referees)\b/i,
  },
  {
    key: "declaration",
    regex: /^(?:declaration|statement of integrity)\b/i,
  },
];

export interface SectionChunk {
  key: keyof DocumentData;
  heading: string;
  lines: string[];
}

export interface DeterministicParseResult {
  personal: PersonalDetails;
  sectionChunks: SectionChunk[];
  unmappedLines: string[];
  candidateData: DocumentData;
}

export function parseDocumentDeterministically(rawText: string): DeterministicParseResult {
  const allLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const personal: PersonalDetails = {};
  const unmappedLines: string[] = [];

  // 1. Extract contact details from first 30 lines
  const headerLines = allLines.slice(0, 30);
  const headerBlock = headerLines.join(" ");

  const emails = headerBlock.match(EMAIL_REGEX);
  if (emails && emails.length > 0) {
    personal.email = emails[0];
  }

  const phones = headerBlock.match(PHONE_REGEX);
  if (phones && phones.length > 0) {
    // Filter out strings that look like years (e.g. 2020-2024)
    const validPhones = phones.filter((p) => p.replace(/\D/g, "").length >= 7 && !p.includes("2020") && !p.includes("2024"));
    if (validPhones.length > 0) {
      personal.phone = validPhones[0].trim();
    }
  }

  // Name is typically in the first 3 lines, excluding emails/phones
  for (const line of allLines.slice(0, 5)) {
    if (
      line.length > 2 &&
      line.length < 50 &&
      !line.includes("@") &&
      !line.match(PHONE_REGEX) &&
      !line.match(URL_REGEX) &&
      !line.toLowerCase().includes("resume") &&
      !line.toLowerCase().includes("curriculum vitae")
    ) {
      personal.fullName = line;
      break;
    }
  }

  // 2. Segment lines by section headings
  const sectionChunks: SectionChunk[] = [];
  let currentChunk: SectionChunk | null = null;

  for (const line of allLines) {
    const matched = SECTION_PATTERNS.find((pattern) => pattern.regex.test(line));

    if (matched) {
      if (currentChunk) {
        sectionChunks.push(currentChunk);
      }
      currentChunk = {
        key: matched.key,
        heading: line,
        lines: [],
      };
    } else if (currentChunk) {
      currentChunk.lines.push(line);
    } else {
      unmappedLines.push(line);
    }
  }

  if (currentChunk) {
    sectionChunks.push(currentChunk);
  }

  // 3. Build candidate initial DocumentData for straightforward sections
  const candidateData: DocumentData = {
    personal,
  };

  for (const chunk of sectionChunks) {
    if (chunk.key === "aboutMe") {
      candidateData.aboutMe = chunk.lines.join(" ");
    } else if (chunk.key === "declaration") {
      candidateData.declaration = chunk.lines.join(" ");
    } else if (chunk.key === "skills") {
      const skillNames: string[] = [];
      for (const line of chunk.lines) {
        const parts = line.split(/[,•|·;]/).map((s) => s.trim()).filter(Boolean);
        skillNames.push(...parts);
      }
      if (skillNames.length > 0) {
        candidateData.skills = skillNames.map(
          (name): SkillEntry => ({
            id: generateId(),
            name,
          })
        );
      }
    } else if (chunk.key === "languages") {
      const langs: string[] = [];
      for (const line of chunk.lines) {
        const parts = line.split(/[,•|·;]/).map((s) => s.trim()).filter(Boolean);
        langs.push(...parts);
      }
      if (langs.length > 0) {
        candidateData.languages = langs.map(
          (lang): LanguageEntry => ({
            id: generateId(),
            language: lang,
          })
        );
      }
    }
  }

  return {
    personal,
    sectionChunks,
    unmappedLines,
    candidateData,
  };
}
