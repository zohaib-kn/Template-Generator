/**
 * guidance/types.ts
 *
 * All shared types for the Application Target + Admissions Guidance system.
 *
 * ApplicationTarget — editor-only metadata. NEVER added to DocumentData.
 * GuidanceResult    — computed from target; consumed only by editor UI.
 */

// ---------------------------------------------------------------------------
// Application Target fields
// ---------------------------------------------------------------------------

export type DestinationCountry =
  | "United Kingdom"
  | "Canada"
  | "Australia"
  | "Italy"
  | "France"
  | "Poland"
  | "Georgia"
  | "Kazakhstan"
  | "Other";

export type DegreeLevel = "Bachelor's" | "Master's" | "PhD" | "Other";

export type CourseCategory =
  | "Computer Science / IT"
  | "Engineering"
  | "Business / Management"
  | "Economics / Finance"
  | "Political Science / International Relations"
  | "Social Sciences"
  | "Arts / Media / Design"
  | "Health / Life Sciences"
  | "Natural Sciences"
  | "Law"
  | "Hospitality / Tourism"
  | "Other";

export interface ApplicationTarget {
  destinationCountry?: DestinationCountry;
  degreeLevel?: DegreeLevel;
  courseCategory?: CourseCategory;
  /** Free text — student enters their exact program name. */
  intendedCourse?: string;
  /** Optional — triggers a general disclaimer only. */
  universityName?: string;
}

// ---------------------------------------------------------------------------
// Guidance output
// ---------------------------------------------------------------------------

/** How important a CV section is for the selected target. */
export type SectionPriority = "highly-relevant" | "recommended" | "optional";

/**
 * Guidance for one CV section.
 * `hint` is an editor-only contextual tip — it must never appear in the PDF.
 */
export interface SectionGuidance {
  /** Matches the key used in DocumentData, e.g. "academicProjects". */
  sectionKey: string;
  /** Human-readable section name shown in the editor panel. */
  label: string;
  priority: SectionPriority;
  /** Optional contextual editor hint for this section + course combo. */
  hint?: string;
}

/**
 * The full guidance result computed from an ApplicationTarget.
 * All fields are editor-only — none of this is written to DocumentData
 * or rendered in the PDF template.
 */
export interface GuidanceResult {
  sections: SectionGuidance[];
  /** General advice bullets for this country + course combination. */
  suggestions: string[];
  /**
   * Disclaimers or cautions.
   * Always includes the university-specific disclaimer when universityName is set.
   */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Internal config types (used by courseGuidance.ts and countryGuidance.ts)
// ---------------------------------------------------------------------------

/** One entry in the course config table. */
export interface CourseSectionConfig {
  sectionKey: string;
  label: string;
  priority: SectionPriority;
  hint?: string;
}

export interface CourseConfig {
  sections: CourseSectionConfig[];
  suggestions: string[];
}

export interface CountryConfig {
  /** Extra bullet points merged into GuidanceResult.suggestions. */
  suggestions: string[];
  /**
   * Optional priority overrides: raise/lower priority for specific sections
   * relative to what the course config specifies.
   */
  priorityOverrides?: Partial<Record<string, SectionPriority>>;
}


