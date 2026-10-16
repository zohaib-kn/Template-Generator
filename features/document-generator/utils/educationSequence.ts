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

export function getOrderedEducationParts(entry: EducationEntry): string[] {
  let address = entry.address?.trim();
  let website = entry.website?.trim();
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
        if (!website) website = part.replace(/^website\s*:\s*/i, "").trim();
      } else if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
        if (!website) website = part;
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
  if (!website && entry.institution) {
    website = getInstitutionWebsite(entry.institution);
  }

  const parts: string[] = [];

  // 1. Address
  if (address) {
    parts.push(address.startsWith("Address:") ? address : `Address: ${address}`);
  }

  // 2. Website URL (clickable)
  if (website) {
    parts.push(website.startsWith("Website:") ? website : `Website: ${website}`);
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
