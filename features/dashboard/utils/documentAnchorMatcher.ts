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

  // Guard: Adding new entries into a section is an add directive, not an in-place snippet replacement
  const isAddDirective = /^(?:add|insert|append|put)\s*(?:this\s+)?(?:text\s+|entry\s+|content\s+)?([\s\S]+?)\s+\b(?:into|in|to)\b\s+(?:my\s+)?(?:work\s*experience|internship|education|training|academic\s*project|project|digital\s*skill|skill|hobby|hobbies|certif|language|volunteering|leadership|responsibilit)/i.test(trimmed);
  if (isAddDirective) {
    return {
      directive: trimmed,
      snippet: undefined,
      isSnippetProvided: false,
    };
  }

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

    const isRightDirective =
      /\b(enhance|humanize|better|improve|rephrase|rewrite|polish|elevate|expand|shorten|refine|fix|update|change|replace|more\s+professional|sound\s+natural|convincing|informative)\b/i.test(right);

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

    // Pattern 1B: Section heading on the left, directive on the right
    // e.g., "Future Academic Plan: make this section more professional and convincing"
    if (!isDirective && isRightDirective) {
      return {
        directive: right,
        snippet: undefined,
        isSnippetProvided: false,
      };
    }
  }

  // Pattern 2: Quoted block in prompt
  // e.g., 'Enhance "I built three projects in HTML, CSS" and humanize it'
  // Supports double quotes, smart quotes, and single quotes
  const quoteMatch = trimmed.match(/["“]([^"”]{8,})["”]/) || trimmed.match(/['‘]([^'’]{10,})['’]/);
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

  // Pattern 4: Multiline input with directive at the beginning or end
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];
    const isDirectiveLine = (l: string) =>
      /\b(humanize|make\s+(?:this|it)?\s*(?:more\s+)?(?:natural|professional|compelling|formal|informative|engaging|better|impactful)|improve(?:\s+the)?\s*(?:sentence\s+structure|readability|flow|tone)?|rewrite|rephrase|polish|elevate|expand|shorten|refine|fix\s+grammar|correct\s+gramm\w*)\b/i.test(l) &&
      l.length < 160;

    // Subpattern 4A: Last line is a directive
    if (isDirectiveLine(lastLine)) {
      const snippetLines = lines.slice(0, -1).join("\n").trim();
      if (snippetLines.length >= 20) {
        return {
          directive: lastLine,
          snippet: snippetLines,
          isSnippetProvided: true,
        };
      }
    }

    // Subpattern 4B: First line is a directive
    if (isDirectiveLine(firstLine)) {
      const snippetLines = lines.slice(1).join("\n").trim();
      if (snippetLines.length >= 20) {
        return {
          directive: firstLine,
          snippet: snippetLines,
          isSnippetProvided: true,
        };
      }
    }
  }

  // Pattern 5: Single-block text ending with a directive sentence
  // e.g. "I chose Italy because it is home to... Humanize this section and make it sound natural"
  const trailingDirectiveMatch = trimmed.match(
    /^([\s\S]{30,}?)[.\n\s]+((?:please\s+)?(?:humanize|rewrite|make\s+this|make\s+it|improve|polish|rephrase|refine|fix\s+grammar|correct\s+grammar)[\s\S]{4,140}\.?)$/i
  );
  if (trailingDirectiveMatch && trailingDirectiveMatch[1]?.trim()) {
    return {
      directive: trailingDirectiveMatch[2].trim(),
      snippet: trailingDirectiveMatch[1].trim(),
      isSnippetProvided: true,
    };
  }

  // Pattern 6: Pure pasted text snippet (e.g. user pasted raw section text without directive)
  // Substantial narrative text (>= 80 chars) that does not start with an imperative directive or question
  if (
    trimmed.length >= 80 &&
    !/^(?:hi|hello|hey|help|who|what|why|how|when|can\s+you|could\s+you|please|is\s+there|show\s+me|improve|enhance|make|rewrite|rephrase|polish|fix|correct|change|update|add|remove|delete|insert|write|draft|proofread|format|shorten|expand|elaborate)\b/i.test(trimmed)
  ) {
    return {
      directive: "Rewrite, polish, and humanize this section for natural flow and professional impact while preserving all facts",
      snippet: trimmed,
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
    if (normSnippet.includes(normContent) && normContent.length > 20) {
      return {
        sectionHeading: sec.heading,
        sectionIndex: sIdx,
        matchedText: rawContent,
        fullContent: rawContent,
        confidence: 0.95,
      };
    }
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

      const isLineInSnippet =
        normLine.length >= 25 &&
        normSnippet.includes(normLine) &&
        normLine.length >= normSnippet.length * 0.4;

      if (normLine.includes(normSnippet) || isLineInSnippet) {
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

  // 3. Fallback: Section-level token overlap
  if (!bestMatch || highestScore < 0.6) {
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      const normContent = normalizeSearchText(sec.content || "");
      const contentTokens = new Set(normContent.split(" ").filter((t) => t.length > 2));
      if (contentTokens.size === 0) continue;

      let overlap = 0;
      for (const token of snippetTokens) {
        if (contentTokens.has(token)) overlap++;
      }
      const score = Math.max(
        overlap / Math.max(snippetTokens.length, 1),
        overlap / Math.max(contentTokens.size, 1)
      );
      if (score > highestScore && score >= 0.5) {
        highestScore = score;
        bestMatch = {
          sectionHeading: sec.heading,
          sectionIndex: sIdx,
          matchedText: cleanSnippet,
          fullContent: sec.content || "",
          confidence: Math.min(score, 0.88),
        };
      }
    }
  }

  return bestMatch;
}
