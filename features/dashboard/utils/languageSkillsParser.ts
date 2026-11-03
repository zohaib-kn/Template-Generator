/**
 * features/dashboard/utils/languageSkillsParser.ts
 *
 * Robust natural-language parser for Language Skills inputs in the Europass Studio chat.
 * Correctly distinguishes Mother Tongue from Other Languages across multi-line inputs,
 * handles varied delimiters (commas, semicolons, "and", " . "), extracts optional CEFR levels,
 * strips redundant prefixes (e.g. "Other languages:"), and deduplicates entries.
 */

export interface ParsedLanguageEntry {
  language: string;
  level?: string;
}

export interface ParsedLanguageSkills {
  motherTongue: string;
  otherLanguages: ParsedLanguageEntry[];
  hasExplicitMotherTongue: boolean;
}

/**
 * Normalizes a language name to Title Case (e.g. "hindi" -> "Hindi", "swiss german" -> "Swiss German").
 */
export function normalizeLanguageName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Parses user input for language skills into structured mother tongue and other languages.
 */
export function parseLanguageSkillsInput(
  rawInput: string,
  existingMotherTongue?: string
): ParsedLanguageSkills {
  const text = (rawInput || "").trim();
  const defaultMt = existingMotherTongue ? normalizeLanguageName(existingMotherTongue) : "Hindi";

  if (!text) {
    return {
      motherTongue: defaultMt,
      otherLanguages: [],
      hasExplicitMotherTongue: false,
    };
  }

  let motherTongue = defaultMt;
  let hasExplicitMotherTongue = false;
  let otherLangsRaw = "";

  // ── 1. Check for explicit "X as mother tongue / native language" ────────────
  const asMtMatch = text.match(
    /(?:add|set|update|change)?\s*([a-zA-Z\s]+?)\s+as\s+(?:mother\s*tongue|native(?:\s*language)?|mother\s*language|first\s*language)\b/i
  );

  // ── 2. Check for explicit "Mother tongue: X", "Native language is X", "Mother tongue X" ─
  // Terminates on comma, semicolon, newline, period, end of line, or keyword "other"
  const prefixMtMatch = text.match(
    /(?:mother\s*tou?ngue|native(?:\s*language)?|mother\s*language|first\s*language)\s*(?:is|to|:|-)?\s*([a-zA-Z\s]+?)(?=(?:,|\r?\n|;|\.|$|\b(?:other|foreign|second|additional)\b))/i
  );

  if (asMtMatch && asMtMatch[1]?.trim()) {
    motherTongue = normalizeLanguageName(asMtMatch[1]);
    hasExplicitMotherTongue = true;
    otherLangsRaw = text.replace(asMtMatch[0], "").trim();
  } else if (prefixMtMatch && prefixMtMatch[1]?.trim()) {
    motherTongue = normalizeLanguageName(prefixMtMatch[1]);
    hasExplicitMotherTongue = true;
    otherLangsRaw = text.replace(prefixMtMatch[0], "").trim();
    // If otherLangsRaw begins with a comma or separator, strip it
    otherLangsRaw = otherLangsRaw.replace(/^[,\s;:-]+/, "").trim();
  } else {
    // ── 3. Multi-line without explicit labels ──────────────────────────────────
    // e.g. Line 1: "hindi", Line 2: "german , french . tamil"
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length >= 2) {
      const firstLine = lines[0];
      const isFirstLineSingleLang =
        !firstLine.includes(",") &&
        !firstLine.includes(";") &&
        !/\b(?:and|other|skills?|levels?)\b/i.test(firstLine) &&
        firstLine.split(/\s+/).length <= 2;

      if (isFirstLineSingleLang) {
        motherTongue = normalizeLanguageName(firstLine);
        hasExplicitMotherTongue = true;
        otherLangsRaw = lines.slice(1).join(", ");
      } else {
        otherLangsRaw = text;
      }
    } else {
      // Single line without explicit label
      const isSingleLanguageName =
        !text.includes(",") &&
        !text.includes(";") &&
        !/\b(?:and|other|skills?|levels?)\b/i.test(text) &&
        text.split(/\s+/).length <= 2;

      if (isSingleLanguageName) {
        motherTongue = normalizeLanguageName(text);
        hasExplicitMotherTongue = true;
        otherLangsRaw = "";
      } else {
        otherLangsRaw = text;
      }
    }
  }

  // ── 4. Clean otherLangsRaw of common prefixes and trailing target phrases ──
  otherLangsRaw = otherLangsRaw
    // Strip trailing clauses like "to other languages", "in my cv", "to cv"
    .replace(/\s+(?:to|in|for)\s+(?:other\s+)?languages?.*$/i, "")
    .replace(/\s+(?:in|to)\s+(?:my\s+)?(?:cv|resume).*$/i, "")
    // Strip "Other languages:", "Other language:", "Languages:", "Other:", "Foreign languages:"
    .replace(/(?:other|foreign|second|additional)?\s*languages?\s*[:=-]*/gi, "")
    .replace(/^other\s*[:=-]*/gi, "")
    .replace(/^also\s*(?:know|fluent\s*in)?\s*[:=-]*/gi, "")
    .replace(/^(?:add|set|include)\s+/i, "")
    .trim();

  // ── 5. Split other languages by separators ──────────────────────────────────
  const rawItems = otherLangsRaw
    .split(/(?:[,;\n\r•]+|\s+and\s+|\s+\.\s+)/i)
    .map((s) => s.trim().replace(/^[•\-*0-9.)\s]+/, "").trim())
    .filter(Boolean);

  // ── 6. Extract language name & optional proficiency level ───────────────────
  const parsedLangs: ParsedLanguageEntry[] = [];
  const mtLower = motherTongue.toLowerCase();
  const seenLangs = new Set<string>([mtLower]);

  for (const item of rawItems) {
    if (!item) continue;

    // Check for level in parentheses: e.g. "German (B2)", "French (Fluent)"
    const parenMatch = item.match(/^(.+?)\s*\(([^)]+)\)$/);
    // Check for level with dash/colon: e.g. "German - B2", "French: Fluent"
    const dashMatch = item.match(/^([a-zA-Z\s]+)\s*[:–-]\s*([a-zA-Z0-9\s]+)$/);

    let langName = item;
    let level: string | undefined = undefined;

    if (parenMatch) {
      langName = parenMatch[1].trim();
      level = parenMatch[2].trim();
    } else if (dashMatch && !dashMatch[1].toLowerCase().includes("language")) {
      langName = dashMatch[1].trim();
      level = dashMatch[2].trim();
    }

    // Clean any stray prefix like "Other languages:" that might have adhered to the first token
    langName = langName
      .replace(/^(?:other\s*languages?|languages?)\s*[:=-]*/i, "")
      .replace(/\s+(?:to|in|for)\s+(?:other\s+)?languages?.*$/i, "")
      .trim();

    const normalizedName = normalizeLanguageName(langName);
    const key = normalizedName.toLowerCase();

    if (!normalizedName || seenLangs.has(key)) {
      continue;
    }

    seenLangs.add(key);
    parsedLangs.push({
      language: normalizedName,
      level: level ? normalizeLanguageName(level) : undefined,
    });
  }

  return {
    motherTongue,
    otherLanguages: parsedLangs,
    hasExplicitMotherTongue,
  };
}
