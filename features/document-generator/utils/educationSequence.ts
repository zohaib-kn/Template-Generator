/**
 * features/document-generator/utils/educationSequence.ts
 *
 * Formats education entry details in the required Europass sequence:
 * 1. Address
 * 2. Website URL (clickable)
 * 3. Final grade
 * Followed by Subjects, Language of instruction, and other details.
 */

import type { EducationEntry } from "@/types";
import { getInstitutionWebsite } from "./institutionWebsites";
import { cleanWebsiteUrl } from "./linkUtils";

export function getOrderedEducationParts(entry: EducationEntry): string[] {
  let address = entry.address?.trim();
  let website = entry.website !== undefined ? entry.website.trim() : undefined;
  let finalGrade = entry.finalGrade?.trim();
  const otherParts: string[] = [];

  if (entry.description) {
    const rawParts = entry.description
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of rawParts) {
      if (/^address\s*:\s*/i.test(part)) {
        if (!address) address = part.replace(/^address\s*:\s*/i, "").trim();
      } else if (/^city\s*:\s*/i.test(part)) {
        if (!address) address = part.replace(/^city\s*:\s*/i, "").trim();
      } else if (/^website\s*:\s*/i.test(part)) {
        if (website === undefined) website = part.replace(/^website\s*:\s*/i, "").trim();
      } else if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
        if (website === undefined) website = part;
      } else if (/^final\s*grade\s*:\s*/i.test(part)) {
        if (!finalGrade)
          finalGrade = part.replace(/^final\s*grade\s*:\s*/i, "").trim();
      } else if (/^score\s*:\s*/i.test(part)) {
        if (!finalGrade)
          finalGrade = part.replace(/^score\s*:\s*/i, "").trim();
      } else {
        otherParts.push(part);
      }
    }
  }

  // Fallback for website if still missing and institution has a known homepage
  if (entry.website === undefined && !website && entry.institution) {
    website = getInstitutionWebsite(entry.institution);
  }

  const parts: string[] = [];

  // 1. Address
  if (address) {
    parts.push(address.startsWith("Address:") ? address : `Address: ${address}`);
  }

  // 2. Website URL (clickable)
  if (website) {
    const cleanWeb = cleanWebsiteUrl(website);
    if (cleanWeb) {
      parts.push(cleanWeb.startsWith("Website:") ? cleanWeb : `Website: ${cleanWeb}`);
    }
  }

  // 3. Final grade
  if (finalGrade) {
    parts.push(
      finalGrade.startsWith("Final grade:")
        ? finalGrade
        : `Final grade: ${finalGrade}`
    );
  }

  // 4. Other parts (Subjects, Language of instruction, Backlogs, etc.)
  parts.push(...otherParts);

  return parts;
}

function parseEducationDateScore(dateStr?: string): number {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  if (!trimmed) return 0;
  if (/^(present|current|ongoing|now|till\s*date)$/i.test(trimmed)) return 999999;

  const ymd = trimmed.match(/(\d{4})\s*[-–/.]\s*(\d{1,2})/);
  if (ymd) {
    return parseInt(ymd[1], 10) * 100 + Math.min(12, Math.max(1, parseInt(ymd[2], 10)));
  }

  const mdy = trimmed.match(/(\d{1,2})\s*[-–/.]\s*(\d{4})/);
  if (mdy) {
    return parseInt(mdy[2], 10) * 100 + Math.min(12, Math.max(1, parseInt(mdy[1], 10)));
  }

  const yr = trimmed.match(/\b(19\d{2}|20\d{2})\b/);
  if (yr) {
    return parseInt(yr[1], 10) * 100;
  }

  return 0;
}

function getQualificationRank(qualification?: string): number {
  if (!qualification) return 0;
  const q = qualification.trim();
  if (!q) return 0;

  if (/\b(ph\.?d|doctorate|doctoral)\b/i.test(q)) return 6;
  if (/\b(m\.?tech|m\.?e\.?|m\.?sc|m\.?com|m\.?a\.?|mba|mca|llm|master(?:'s)?|post\s*graduate|postgraduate)\b/i.test(q)) return 5;
  if (/\b(b\.?tech|b\.?e\.?|b\.?sc|b\.?com|b\.?a\.?|bba|bca|llb|bachelor(?:'s)?|under\s*graduate|undergraduate)\b/i.test(q)) return 4;
  if (/\b(diploma|associate)\b/i.test(q)) return 3;
  if (/\b(grade\s*12(?:th)?|class\s*12(?:th)?|12th|senior\s*secondary|higher\s*secondary|hsc|intermediate|\+2|plus\s*two)\b/i.test(q)) return 2;
  if (/\b(grade\s*10(?:th)?|class\s*10(?:th)?|10th|secondary|matriculation|ssc|high\s*school)\b/i.test(q)) return 1;

  return 0;
}

/**
 * Sorts education entries reverse-chronologically (most recent / highest qualification first),
 * so Grade 12th appears before Grade 10th while preserving relative order for equal items.
 */
export function sortEducationEntries(entries: EducationEntry[]): EducationEntry[] {
  if (!entries || entries.length <= 1) return entries;

  return entries
    .map((entry, idx) => ({ entry, idx }))
    .sort((a, b) => {
      const dateA = parseEducationDateScore(a.entry.endDate) || parseEducationDateScore(a.entry.startDate);
      const dateB = parseEducationDateScore(b.entry.endDate) || parseEducationDateScore(b.entry.startDate);
      if (dateA > 0 && dateB > 0 && dateA !== dateB) {
        return dateB - dateA;
      }

      const rankA = getQualificationRank(a.entry.qualification);
      const rankB = getQualificationRank(b.entry.qualification);
      if (rankA !== rankB) {
        return rankB - rankA;
      }

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      return a.idx - b.idx;
    })
    .map((item) => item.entry);
}
