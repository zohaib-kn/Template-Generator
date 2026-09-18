/**
 * interpolateTemplate
 *
 * Safe placeholder resolver for SOP templates.
 *
 * Syntax: {{namespace.field}} or {{namespace.nested.field}}
 *
 * Behaviour:
 *   - If the value exists → replaced with the string value.
 *   - If the value is missing / empty → replaced with [MISSING: namespace.field]
 *     so counsellors immediately see what data is absent.
 *
 * This function is intentionally pure and side-effect free.
 * It only resolves values from the provided context object — it
 * does NOT call any external service or generate any content.
 *
 * SAFETY: AI-generated narrative is pre-stored in the template content
 * string before this function is called; interpolation only fills factual
 * placeholders from the StudentDocumentContext.
 */

import type { StudentDocumentContext } from "../types/sop-generator";

/** The regex that matches {{any.path.here}} */
const PLACEHOLDER_RE = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

/**
 * Resolve a dot-separated path against an arbitrary nested object.
 * Returns `undefined` if any segment is missing.
 */
function resolvePath(obj: unknown, path: string): string | undefined {
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
 * Replace all `{{placeholder}}` tokens in `template` using values from `ctx`.
 *
 * @param template  Raw template string with `{{ns.field}}` tokens.
 * @param ctx       The resolved StudentDocumentContext.
 * @returns         Rendered string. Missing values appear as `[MISSING: path]`.
 */
export function interpolate(
  template: string,
  ctx: StudentDocumentContext
): string {
  return template.replace(PLACEHOLDER_RE, (_match, path: string) => {
    const value = resolvePath(ctx, path);
    return value !== undefined ? value : `[MISSING: ${path}]`;
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
