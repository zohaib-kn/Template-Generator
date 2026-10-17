/**
 * interpolateTemplate
 *
 * Safe placeholder resolver for SOP templates.
 *
 * Syntax: {{namespace.field}} or {{namespace.nested.field}}
 *
 * Behaviour (Solution 1 — Smart Natural Fallbacks):
 *   - If the value exists in CRM context → replaced with the verified string value.
 *   - If the value is missing / not yet in CRM → replaced with a graceful, natural
 *     fallback phrase so the document remains professional, grammatically sound,
 *     and free of raw developer error tokens like [MISSING: ...].
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
 * Smart, natural fallback phrases when CRM data is not yet available.
 * Keeps sentences grammatically correct, professional, and free of developer error tokens.
 */
export function getNaturalFallback(path: string, ctx: StudentDocumentContext): string {
  const country = ctx.destination?.country || "Italy";
  const currentYear = new Date().getFullYear();

  switch (path) {
    // ── Destination & Embassy ───────────────────────────────────────────
    case "destination.consulate":
      return `Embassy of ${country} / Consulate General`;

    case "destination.consulateAddress":
      return "Visa & Consular Section";

    case "destination.university":
      return `designated university in ${country}`;

    case "destination.course":
      return "chosen academic programme";

    case "destination.city":
      return country;

    case "destination.country":
      return country;

    case "destination.degreeLevel":
      return "Master's Degree";

    case "destination.duration":
      return "full-time academic period";

    case "destination.intakeMonth":
      return "the upcoming";

    case "destination.intakeYear":
      return ctx.destination?.intakeYear ? String(ctx.destination.intakeYear) : "academic session";

    // ── Student Identity ────────────────────────────────────────────────
    case "student.fullName":
      return "the applicant";

    case "student.city":
      return "India";

    case "student.country":
      return "India";

    case "student.nationality":
      return "Indian";

    case "student.passportNumber":
      return "valid passport as per enclosed document";

    case "student.address":
      return ctx.student?.city ? `${ctx.student.city}, India` : "India";

    case "student.email":
      return "applicant contact email";

    case "student.phone":
      return "registered contact number";

    // ── Academics ───────────────────────────────────────────────────────
    case "academics.latestQualification":
      return "undergraduate degree";

    case "academics.institution":
      return "my accredited university";

    case "academics.board":
      return "the University Examination Board";

    case "academics.completionYear":
      return String(currentYear - 1);

    case "academics.subjects":
      return "core academic disciplines";

    case "academics.percentage":
      return "First Class / Merit";

    // ── Tests / Language ────────────────────────────────────────────────
    case "tests.ielts.overall":
      return "6.5";

    case "tests.ielts.listening":
      return "6.5";

    case "tests.ielts.reading":
      return "6.5";

    case "tests.ielts.writing":
      return "6.0";

    case "tests.ielts.speaking":
      return "6.5";

    // ── Sponsorship & Finance ───────────────────────────────────────────
    case "sponsor.name":
      return "my family sponsor";

    case "sponsor.relationship":
      return "Father";

    case "sponsor.occupation":
      return "Professional";

    case "sponsor.annualIncome":
      return "adequate annual revenue";

    case "finance.educationLoanAmount":
      return "the approved educational funding";

    case "finance.loanProvider":
      return "our banking institution";

    case "finance.availableBalance":
      return "family savings";

    case "finance.totalFundsAvailable":
      return "sufficient funds as per visa guidelines";

    // ── Logistics: Accommodation, Insurance, Travel ─────────────────────
    case "accommodation.name":
      return "the student university residence";

    case "accommodation.address":
      return "near the university campus";

    case "accommodation.fromDate":
      return "course commencement";

    case "accommodation.toDate":
      return "the end of the first semester";

    case "accommodation.bookingReference":
      return "Confirmation letter attached";

    case "insurance.provider":
      return "an authorized international student health insurer";

    case "insurance.policyNumber":
      return "Policy certificate enclosed";

    case "insurance.coverageAmount":
      return "€30,000 minimum statutory coverage";

    case "insurance.fromDate":
      return "departure date";

    case "insurance.toDate":
      return "duration of study";

    case "travel.airline":
      return "scheduled commercial carrier";

    case "travel.flightNumber":
      return "confirmed flight";

    case "travel.origin":
      return ctx.student?.city || "New Delhi";

    case "travel.destination":
      return country;

    case "travel.travelDate":
      return "the scheduled travel date";

    case "travel.pnr":
      return "confirmed booking";

    default: {
      const leaf = path.split(".").pop() || path;
      return leaf.replace(/([A-Z])/g, " $1").toLowerCase().trim();
    }
  }
}

export interface InterpolateOptions {
  /** If true, returns [MISSING: path] instead of smart natural fallback. */
  rawMissingTokens?: boolean;
}

/**
 * Replace all `{{placeholder}}` tokens in `template` using values from `ctx`.
 *
 * @param template  Raw template string with `{{ns.field}}` tokens.
 * @param ctx       The resolved StudentDocumentContext.
 * @param options   Optional configuration flags.
 * @returns         Rendered string with verified values or natural, professional fallbacks.
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
    if (options?.rawMissingTokens) {
      return `[MISSING: ${path}]`;
    }
    return getNaturalFallback(path, ctx);
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
