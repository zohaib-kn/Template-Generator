/**
 * SOP Generator — domain types.
 *
 * These types describe the SOP document workspace, not the underlying
 * student data (which lives in types/document.ts). The two are connected
 * through the StudentDocumentContext adapter layer.
 *
 * IMPORTANT: These types are intentionally decoupled from DocumentData.
 * Share student facts through the context layer; never import CV rendering
 * code from inside the SOP feature.
 */

// ---------------------------------------------------------------------------
// Content source model
// ---------------------------------------------------------------------------

/**
 * Describes where a section's content originated from.
 *
 * FIXED        — Template-controlled wording; not student-specific.
 * WEBHOOK      — Factual student / application data (name, scores, etc.).
 * DATABASE     — Verified country / university / course data.
 * AI_SUGGESTED — Narrative that AI will eventually generate.
 * HYBRID       — Verified facts combined with generated explanation.
 */
export type ContentSource =
  | "FIXED"
  | "WEBHOOK"
  | "DATABASE"
  | "AI_SUGGESTED"
  | "HYBRID";

/** Human-readable label for each ContentSource. */
export const CONTENT_SOURCE_LABELS: Record<ContentSource, string> = {
  FIXED: "Template Text",
  WEBHOOK: "Student Data",
  DATABASE: "Verified Data",
  AI_SUGGESTED: "AI Suggestion",
  HYBRID: "Mixed Content",
};

/** Emoji icon for each ContentSource (used alongside the label in UI). */
export const CONTENT_SOURCE_ICONS: Record<ContentSource, string> = {
  FIXED: "📋",
  WEBHOOK: "👤",
  DATABASE: "✅",
  AI_SUGGESTED: "✨",
  HYBRID: "🔀",
};

// ---------------------------------------------------------------------------
// Section review status
// ---------------------------------------------------------------------------

/**
 * Counsellor review lifecycle for one template section.
 *
 * NOT_REVIEWED → default state
 * NEEDS_REVIEW → section was edited after approval, or manually flagged
 * APPROVED     → counsellor has explicitly signed off
 *
 * Rule: editing an APPROVED section must revert it to NEEDS_REVIEW.
 */
export type ReviewStatus = "NOT_REVIEWED" | "NEEDS_REVIEW" | "APPROVED";

// ---------------------------------------------------------------------------
// Template section
// ---------------------------------------------------------------------------

/**
 * A single named block within an SOP / cover letter template.
 *
 * `content` may contain `{{namespace.field}}` placeholders which are
 * resolved at render time by `interpolateTemplate()`.
 *
 * `source` describes where the authoritative content comes from.
 * `editable` controls whether the counsellor can free-text edit this section.
 * `regeneratable` marks sections that will eventually support AI re-generation.
 */
export interface TemplateSection {
  /** Stable unique identifier within the template. */
  id: string;
  /** Display title shown in the sidebar and editor header. */
  title: string;
  /** Where this section's content originates. */
  source: ContentSource;
  /** Whether this section must be approved before the document is finalised. */
  required: boolean;
  /** Render order (ascending). */
  order: number;
  /** Raw template string; may contain `{{placeholder}}` tokens. */
  content: string;
  /** Whether the counsellor can edit the resolved content. */
  editable: boolean;
  /** Whether the section supports AI regeneration (Phase 2+). */
  regeneratable?: boolean;
  /**
   * For HYBRID sections: the factual data that anchors the narrative.
   * These values are NEVER AI-generated and are displayed separately.
   */
  sourceFacts?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------------------

export interface SopTemplate {
  id: string;
  name: string;
  country: string;
  visaType: string;
  sections: TemplateSection[];
}

// ---------------------------------------------------------------------------
// Student document context
// ---------------------------------------------------------------------------

/**
 * Normalised student + application data used exclusively by the SOP feature.
 *
 * This is NOT DocumentData. It is produced by `buildStudentDocumentContext()`
 * which adapts raw mock / webhook / database data into one flat, predictable
 * shape that the SOP template placeholders reference.
 *
 * SAFETY RULE: All factual values (name, scores, bank details, etc.) must
 * come from verified sources. AI narrative must never fill these fields.
 */
export interface StudentDocumentContext {
  student: {
    fullName: string;
    dateOfBirth: string;
    placeOfBirth: string;
    city: string;
    country: string;
    nationality: string;
    passportNumber: string;
    phone: string;
    email: string;
    address: string;
    gender: string;
    /** Comma-separated languages, e.g. "Hindi (Native), English (C1)" */
    languages: string;
  };

  academics: {
    latestQualification: string;
    institution: string;
    board: string;
    completionYear: string;
    subjects: string;
    percentage: string;
    previousDegree?: string;
  };

  tests: {
    ielts: {
      overall: string;
      listening: string;
      reading: string;
      writing: string;
      speaking: string;
      dateTaken: string;
    };
  };

  destination: {
    country: string;
    city: string;
    university: string;
    course: string;
    degreeLevel: string;
    duration: string;
    intakeMonth: string;
    intakeYear: string;
    consulate: string;
    consulateCity: string;
    consulateAddress: string;
  };

  career: {
    shortTermGoal: string;
    longTermGoal: string;
    returnIntention: string;
  };

  sponsor: {
    name: string;
    relationship: string;
    occupation: string;
    annualIncome: string;
    incomeSource: string;
  };

  finance: {
    educationLoanAmount: string;
    loanProvider: string;
    bankName: string;
    accountHolderName: string;
    availableBalance: string;
    totalFundsAvailable: string;
    currency: string;
  };

  accommodation: {
    name: string;
    type: string;
    address: string;
    city: string;
    country: string;
    fromDate: string;
    toDate: string;
    bookingReference: string;
  };

  insurance: {
    provider: string;
    policyNumber: string;
    type: string;
    fromDate: string;
    toDate: string;
    coverageAmount: string;
  };

  travel: {
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
    travelDate: string;
    pnr: string;
    returnDate?: string;
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  /** Stable identifier for the issue type. */
  id: string;
  /** Optional dot-path to the relevant field, e.g. "destination.university". */
  field?: string;
  severity: ValidationSeverity;
  message: string;
}

// ---------------------------------------------------------------------------
// Document-level workspace state shapes
// ---------------------------------------------------------------------------

/** Per-section runtime state stored in `SopWorkspace`. */
export interface SopSectionState {
  /** Current (possibly edited) content for this section. */
  content: string;
  /** Counsellor review status. */
  status: ReviewStatus;
}

/** Map from section id → runtime state. */
export type SopDocumentState = Record<string, SopSectionState>;
