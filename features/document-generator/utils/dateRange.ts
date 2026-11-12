/**
 * Pure date formatting and date-range parsing utilities shared across
 * CV hydration, inline editing, and studio synchronization.
 */

export function formatDateDMY(iso?: string): string {
  if (!iso) return "";
  if (iso.includes("/")) return iso;
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return iso;
}

export function parseDateRange(input: string): { startDate: string; endDate: string } {
  const raw = input.trim().replace(/^\[\s*|\s*\]$/g, "").trim();
  if (!raw) return { startDate: "", endDate: "" };

  // Check for en-dash (–) or em-dash (—)
  if (/[–—]/.test(raw)) {
    const [s, ...rest] = raw.split(/[–—]/);
    return {
      startDate: s.trim(),
      endDate: rest.join("–").trim(),
    };
  }

  // Check for " to " (case-insensitive)
  if (/\s+to\s+/i.test(raw)) {
    const [s, ...rest] = raw.split(/\s+to\s+/i);
    return {
      startDate: s.trim(),
      endDate: rest.join(" to ").trim(),
    };
  }

  // Check for " - " (hyphen with surrounding whitespace)
  if (/\s+-\s+/.test(raw)) {
    const [s, ...rest] = raw.split(/\s+-\s+/);
    return {
      startDate: s.trim(),
      endDate: rest.join(" - ").trim(),
    };
  }

  // Check for 4-digit years joined by hyphen: e.g. "2022-2025" or "2022-Present"
  const yearHyphenMatch = raw.match(/^(\d{4})\s*-\s*(\d{4}|present)$/i);
  if (yearHyphenMatch) {
    return {
      startDate: yearHyphenMatch[1].trim(),
      endDate: yearHyphenMatch[2].trim(),
    };
  }

  // Check for full ISO / YYYY-MM / DD/MM/YYYY ranges joined by hyphen without spaces
  const fullDateHyphenMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2}|\d{4}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{4}-\d{2}-\d{2}|\d{4}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|present)$/i
  );
  if (fullDateHyphenMatch) {
    return {
      startDate: fullDateHyphenMatch[1].trim(),
      endDate: fullDateHyphenMatch[2].trim(),
    };
  }

  // Single date or year entered
  return {
    startDate: raw,
    endDate: "",
  };
}

