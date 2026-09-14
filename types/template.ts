/**
 * Template domain types.
 *
 * A Template is a reusable document layout definition. It controls visual
 * presentation; content is supplied separately via DocumentData.
 *
 * Multiple templates may exist (europass, student-modern, professional, …).
 * Each template may have multiple versions (europass-v1, europass-v2, …).
 * The renderer selects the correct template component based on these identifiers.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/**
 * Stable string identifier for a template.
 * Use kebab-case, e.g. "europass", "student-modern".
 */
export type TemplateId = string;

/**
 * Semantic version string for a template, e.g. "1.0.0" or "v1".
 * Versions allow old documents to keep rendering correctly while new
 * template iterations are introduced.
 */
export type TemplateVersion = string;

// ---------------------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------------------

/**
 * Describes a template available for selection.
 * The renderer uses `id` and `version` to resolve the correct React component.
 */
export interface TemplateDefinition {
  id: TemplateId;
  version: TemplateVersion;
  /** Human-readable display name shown in template selection UI. */
  displayName: string;
  /** Short description of the template's visual style. */
  description?: string;
  /** URL of a thumbnail preview image (static asset). */
  thumbnailUrl?: string;
  /**
   * Which sections this template supports.
   * The renderer may use this to conditionally show/hide section editors.
   * Kept as a plain string union for flexibility; a stricter union can be
   * added once the section list is finalised.
   */
  supportedSections?: string[];
}
