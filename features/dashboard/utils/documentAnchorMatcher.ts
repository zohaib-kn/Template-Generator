/**
 * features/dashboard/utils/documentAnchorMatcher.ts
 *
 * Utilities to detect whether a user prompt contains a quoted or copied snippet
 * from the active document (CV or Cover Letter), locate its exact section and entry,
 * and separate the user's directive (e.g. "enhance and humanize") from the content snippet.
 */

export interface TextSnippetAnchor {
  sectionHeading: string;
  sectionIndex: number;
  matchedText: string;
  fullContent: string;
  confidence: number; // 0 to 1
  entryIndex?: number;
  bulletIndex?: number;
}

export interface ExtractedDirective {
  directive: string;
  snippet?: string;
  isSnippetProvided: boolean;
}

/**
 * Normalizes text for robust comparison by stripping markdown asterisks,
 * bullet dots, extra whitespace, and smart quotes.
 */
export function normalizeSearchText(text: string): string {
  return text
    .replace(/[“”"']/g, '"')
    .replace(/^[•\-\*0-9.)\s]+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Extracts common framing prefixes like:
 * - "Enhance this text: [snippet]"
 * - "Make this better and humanize it: [snippet]"
 * - "Improve this bullet: [snippet]"
 * - "Rephrase: [snippet]"
 * - "[snippet] -> make it more impactful"
 */
export function extractUserDirectiveAndSnippet(prompt: string): ExtractedDirective {
  const trimmed = prompt.trim();

  // Pattern 1: Directive prefix followed by colon/dash/arrow
  // e.g., "Enhance this text: I designed and developed..."
  // e.g., "Make this better and humanize it: 'I built three projects...'"
  // Matches any directive phrase before the colon
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex > 3 && colonIndex < 120) {
    const left = trimmed.slice(0, colonIndex).trim();
    const right = trimmed.slice(colonIndex + 1).replace(/^["'“\s]+|["'”\s]+$/g, "").trim();

    const isDirective =
      /\b(enhance|humanize|better|improve|rephrase|rewrite|polish|elevate|expand|shorten|refine|fix|update|change|replace)\b/i.test(left) ||
      /\b(this\s+text|this\s+bullet|this\s+part|this\s+sentence|this\s+paragraph|this\s+experience)\b/i.test(left);

    if (isDirective && right.length >= 8) {
      const cleanDirective = left
        .replace(/\s+(?:this\s+)?(?:text|bullet(?:\s*point)?|paragraph|sentence|part|section|description)\b/i, "")
        .trim();
      return {
        directive: cleanDirective || left,
        snippet: right,
        isSnippetProvided: true,
      };
    }
  }

  // Pattern 2: Quoted block in prompt
  // e.g., 'Enhance "I built three projects in HTML, CSS" and humanize it'
  const quoteMatch = trimmed.match(/["“]([^"”]{15,})["”]/);
  if (quoteMatch) {
    const snippet = quoteMatch[1].trim();
    const directive = trimmed.replace(quoteMatch[0], "").replace(/\s+/g, " ").trim();
    return {
      directive: directive || "Enhance and humanize this text",
      snippet,
      isSnippetProvided: true,
    };
  }

  // Pattern 3: Trailing directive e.g. "[Long snippet] - make this more humanized"
  const suffixMatch = trimmed.match(/^([\s\S]{20,}?)\s*[-–—]\s*(?:please\s+)?(enhance|humanize|make\s+better|improve|rewrite|rephrase)[\s\S]*$/i);
  if (suffixMatch && suffixMatch[1]?.trim()) {
    return {
      directive: suffixMatch[2].trim(),
      snippet: suffixMatch[1].trim(),
      isSnippetProvided: true,
    };
  }

  return {
    directive: trimmed,
    snippet: undefined,
    isSnippetProvided: false,
  };
}

/**
 * Searches across document sections to find where a snippet exists.
 * Supports exact substring matching and high-confidence fuzzy token overlap.
 */
export function findSnippetInSections(
  snippet: string,
  sections: Array<{ heading: string; content: string }>
): TextSnippetAnchor | null {
  if (!snippet || !sections || sections.length === 0) return null;

  const cleanSnippet = snippet.trim();
  if (cleanSnippet.length < 8) return null;

  const normSnippet = normalizeSearchText(cleanSnippet);
  if (!normSnippet) return null;

  // 1. Try exact or normalized substring match
  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const rawContent = sec.content || "";
    if (rawContent.includes(cleanSnippet)) {
      return {
        sectionHeading: sec.heading,
        sectionIndex: sIdx,
        matchedText: cleanSnippet,
        fullContent: rawContent,
        confidence: 1.0,
      };
    }

    const normContent = normalizeSearchText(rawContent);
    if (normContent.includes(normSnippet)) {
      return {
        sectionHeading: sec.heading,
        sectionIndex: sIdx,
        matchedText: cleanSnippet,
        fullContent: rawContent,
        confidence: 0.95,
      };
    }
  }

  // 2. Try line-by-line / bullet-by-bullet matching
  const snippetTokens = normSnippet.split(" ").filter((t) => t.length > 2);
  if (snippetTokens.length === 0) return null;

  let bestMatch: TextSnippetAnchor | null = null;
  let highestScore = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const lines = (sec.content || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];
      const normLine = normalizeSearchText(line);
      if (!normLine) continue;

      if (normLine.includes(normSnippet) || normSnippet.includes(normLine)) {
        return {
          sectionHeading: sec.heading,
          sectionIndex: sIdx,
          matchedText: line,
          fullContent: sec.content,
          confidence: 0.9,
          bulletIndex: lIdx,
        };
      }

      // Token overlap score
      const lineTokens = new Set(normLine.split(" ").filter((t) => t.length > 2));
      if (lineTokens.size === 0) continue;

      let overlap = 0;
      for (const token of snippetTokens) {
        if (lineTokens.has(token)) overlap++;
      }
      const score = overlap / Math.max(snippetTokens.length, 1);

      if (score > highestScore && score >= 0.6) {
        highestScore = score;
        bestMatch = {
          sectionHeading: sec.heading,
          sectionIndex: sIdx,
          matchedText: line,
          fullContent: sec.content,
          confidence: Math.min(score, 0.89),
          bulletIndex: lIdx,
        };
      }
    }
  }

  return bestMatch;
}
