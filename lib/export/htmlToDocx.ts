/**
 * lib/export/htmlToDocx.ts
 *
 * Converts editor HTML (Tiptap / document renderer) into docx Paragraphs.
 *
 * A small tokenizer with explicit block and inline-style stacks replaces the old regex
 * approach, which dropped text in nested blocks (non-greedy `<div>…</div>` matching),
 * dropped text outside block tags, and let any `</span>` switch off bold/italic coming
 * from an enclosing `<strong>`/`<em>`.
 */

import { AlignmentType, Paragraph, TextRun, UnderlineType } from "docx";

type Alignment = (typeof AlignmentType)[keyof typeof AlignmentType];

interface InlineStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  link: boolean;
  font: string;
}

interface BlockFrame {
  tag: string;
  alignment: Alignment;
}

const BLOCK_TAGS = new Set(["p", "div", "h1", "h2", "h3", "h4", "li", "blockquote", "section", "article", "ul", "ol"]);
const INLINE_TAGS = new Set(["strong", "b", "em", "i", "u", "s", "strike", "del", "span", "a", "mark", "sub", "sup", "code"]);
const VOID_SKIP = new Set(["img", "hr", "input", "meta", "link"]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", euro: "€", bull: "•",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? m;
  });
}

function alignmentFrom(attrs: string, fallback: Alignment): Alignment {
  const m = attrs.match(/text-align\s*:\s*(left|center|right|justify)/i);
  if (!m) return fallback;
  switch (m[1].toLowerCase()) {
    case "center": return AlignmentType.CENTER;
    case "right": return AlignmentType.RIGHT;
    case "justify": return AlignmentType.JUSTIFIED;
    default: return AlignmentType.LEFT;
  }
}

function applyInlineTag(tag: string, attrs: string, base: InlineStyle): InlineStyle {
  const next = { ...base };
  const a = attrs.toLowerCase();
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italic = true;
  if (tag === "u") next.underline = true;
  if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;
  if (tag === "a") {
    next.link = true;
    next.underline = true;
  }
  if (/font-weight\s*:\s*(bold|[6-9]00)/.test(a)) next.bold = true;
  if (/font-style\s*:\s*italic/.test(a)) next.italic = true;
  if (/text-decoration[^;"]*underline/.test(a)) next.underline = true;
  if (/text-decoration[^;"]*line-through/.test(a)) next.strike = true;
  const fontMatch = attrs.match(/font-family\s*:\s*([^;"]+)/i);
  if (fontMatch) {
    const raw = fontMatch[1].trim().replace(/['"]|&quot;/g, "").split(",")[0].trim();
    if (raw) next.font = raw;
  }
  return next;
}

export interface HtmlToDocxOptions {
  defaultFont: string;
  isCoverLetter: boolean;
  /** Restricts fonts coming from inline styles; unknown fonts fall back to defaultFont. */
  isAllowedFont?: (font: string) => boolean;
}

export function parseHtmlToDocxParagraphs(html: string, options: HtmlToDocxOptions): Paragraph[] {
  const { defaultFont, isCoverLetter, isAllowedFont = () => true } = options;
  const paragraphs: Paragraph[] = [];

  const baseStyle: InlineStyle = { bold: false, italic: false, underline: false, strike: false, link: false, font: defaultFont };
  const inlineStack: Array<{ tag: string; style: InlineStyle }> = [];
  const blockStack: BlockFrame[] = [];
  let runs: TextRun[] = [];
  let runsHaveText = false;

  const currentStyle = () => (inlineStack.length ? inlineStack[inlineStack.length - 1].style : baseStyle);
  const currentBlock = () => blockStack[blockStack.length - 1];

  const sizeFor = (tag: string | undefined) => {
    if (tag === "h1") return isCoverLetter ? 18 : 28;
    if (tag === "h2") return isCoverLetter ? 17 : 24;
    if (tag === "h3" || tag === "h4") return isCoverLetter ? 16 : 22;
    return isCoverLetter ? 16 : 22;
  };
  const spacingFor = (tag: string | undefined) => {
    if (tag === "h1") return isCoverLetter ? { before: 140, after: 100 } : { before: 200, after: 120 };
    if (tag === "h2") return isCoverLetter ? { before: 120, after: 80 } : { before: 180, after: 100 };
    if (tag === "h3" || tag === "h4") return isCoverLetter ? { before: 100, after: 60 } : { before: 140, after: 80 };
    return isCoverLetter ? { after: 110, line: 235 } : { after: 140, line: 260 };
  };

  const flush = () => {
    if (runsHaveText) {
      const block = [...blockStack].reverse().find((b) => b.tag !== "ul" && b.tag !== "ol");
      paragraphs.push(
        new Paragraph({
          children: runs,
          alignment: block?.alignment ?? AlignmentType.LEFT,
          spacing: spacingFor(block?.tag),
        })
      );
    }
    runs = [];
    runsHaveText = false;
  };

  const pushText = (raw: string) => {
    const text = decodeEntities(raw.replace(/\s+/g, " "));
    if (!text.trim() && !runsHaveText) return;
    if (text.trim()) runsHaveText = true;
    const style = currentStyle();
    const block = currentBlock();
    const isHeading = block && /^h[1-4]$/.test(block.tag);
    runs.push(
      new TextRun({
        text,
        bold: style.bold || isHeading,
        italics: style.italic,
        underline: style.underline || style.link ? { type: UnderlineType.SINGLE } : undefined,
        color: style.link ? "1D4ED8" : undefined,
        strike: style.strike,
        font: isAllowedFont(style.font) ? style.font : defaultFont,
        size: sizeFor(block?.tag),
      })
    );
  };

  const tokenRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(html)) !== null) {
    if (m[0].startsWith("<!--")) continue;
    if (m[3] !== undefined) {
      pushText(m[3]);
      continue;
    }
    const tag = m[1].toLowerCase();
    const attrs = m[2] || "";
    const closing = m[0][1] === "/";

    if (tag === "br") {
      runs.push(new TextRun({ break: 1 }));
    } else if (BLOCK_TAGS.has(tag)) {
      flush();
      if (closing) {
        const idx = blockStack.map((b) => b.tag).lastIndexOf(tag);
        if (idx >= 0) blockStack.length = idx;
      } else {
        const parentAlign = currentBlock()?.alignment ?? AlignmentType.LEFT;
        blockStack.push({ tag, alignment: alignmentFrom(attrs, parentAlign) });
        if (tag === "li") pushText("• ");
      }
    } else if (INLINE_TAGS.has(tag)) {
      if (closing) {
        const idx = inlineStack.map((f) => f.tag).lastIndexOf(tag);
        if (idx >= 0) inlineStack.length = idx;
      } else if (!attrs.trim().endsWith("/")) {
        inlineStack.push({ tag, style: applyInlineTag(tag, attrs, currentStyle()) });
      }
    } else if (VOID_SKIP.has(tag)) {
      // no text content
    }
    // Unknown tags are ignored but their text content is still emitted.
  }
  flush();

  return paragraphs;
}
