/**
 * interpolateTemplate
 *
 * Safe placeholder resolver for SOP templates.
 *
 * Syntax: {{namespace.field}} or {{namespace.nested.field}}
 *
 * Behaviour:
 *   - If the value exists in CRM context → replaced with the verified string value.
 *   - If it is missing and the field is purely descriptive (see NEUTRAL_FALLBACKS) →
 *     replaced with neutral wording that asserts no fact about the student.
 *   - Otherwise → a visible `[MISSING: path]` marker. Embassy and admissions letters must
 *     never contain invented scores, sponsors, insurance, nationality or other facts; the
 *     marker keeps the gap visible to the counsellor and is caught by pre-export checks.
 *
 * This function is intentionally pure and side-effect free.
 * It only resolves values from the provided context object — it
 * does NOT call any external service or generate any content.
 */

import type { StudentDocumentContext } from "../types/sop-generator";

/** The regex that matches {{any.path.here}} */
const PLACEHOLDER_RE = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

/**
 * Resolve a dot-separated path against an arbitrary nested object.
 * Returns `undefined` if any segment is missing or empty string.
 */
export function resolvePath(obj: unknown, path: string): string | undefined {
  const segments = path.split(".");
  let current: unknown = obj;

  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[seg];
  }

  if (current === undefined || current === null || current === "") {
    return undefined;
  }

  return String(current);
}

/**
 * Checks whether a path in ctx is genuinely resolved with a non-empty value,
 * or whether it is missing and would require a fallback.
 */
export function isPlaceholderMissing(ctx: StudentDocumentContext, path: string): boolean {
  return resolvePath(ctx, path) === undefined;
}

/**
 * Fields whose absence may be bridged with neutral wording. Everything else is a
 * factual claim (identity, scores, money, sponsor, logistics, institution facts) and is
 * rendered as a `[MISSING: path]` marker instead of an invented value.
 */
const NEUTRAL_FALLBACKS: Record<string, string> = {
  // Optional trailing sentence about extra entrance tests; omitted entirely when absent.
  "tests.additionalTestsText": "",
};

/** Matches the visible marker emitted for unresolved factual placeholders. */
export const MISSING_MARKER_RE = /\[MISSING:\s*([^\]]+)\]/g;

/**
 * Neutral wording for a missing descriptive field, or `null` when the field is factual
 * and must be shown as missing rather than filled in.
 */
export function getNaturalFallback(path: string): string | null {
  return Object.prototype.hasOwnProperty.call(NEUTRAL_FALLBACKS, path) ? NEUTRAL_FALLBACKS[path] : null;
}

export interface InterpolateOptions {
  /** If true, every missing value (including neutral fields) renders as [MISSING: path]. */
  rawMissingTokens?: boolean;
}

/**
 * Replace all `{{placeholder}}` tokens in `template` using values from `ctx`.
 *
 * @param template  Raw template string with `{{ns.field}}` tokens.
 * @param ctx       The resolved StudentDocumentContext.
 * @param options   Optional configuration flags.
 * @returns         Rendered string with verified values, neutral wording for descriptive
 *                  fields, and `[MISSING: path]` for any missing factual field.
 */
export function interpolate(
  template: string,
  ctx: StudentDocumentContext,
  options?: InterpolateOptions
): string {
  return template.replace(PLACEHOLDER_RE, (_match, path: string) => {
    const value = resolvePath(ctx, path);
    if (value !== undefined) {
      return value;
    }
    const neutral = options?.rawMissingTokens ? null : getNaturalFallback(path);
    return neutral !== null ? neutral : `[MISSING: ${path}]`;
  });
}

/**
 * Returns a list of all placeholder paths used in the given template string.
 * Useful for ahead-of-time validation — checking which fields are required.
 */
export function extractPlaceholders(template: string): string[] {
  const found: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE.source, "g");

  while ((match = re.exec(template)) !== null) {
    if (!found.includes(match[1])) {
      found.push(match[1]);
    }
  }

  return found;
}

/** Unique placeholder paths still shown as `[MISSING: …]` in rendered text. */
export function findMissingMarkers(rendered: string): string[] {
  const found = new Set<string>();
  for (const m of rendered.matchAll(MISSING_MARKER_RE)) found.add(m[1].trim());
  return [...found];
}
