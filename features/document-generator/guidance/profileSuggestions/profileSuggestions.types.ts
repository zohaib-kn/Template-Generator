/**
 * profileSuggestions/profileSuggestions.types.ts
 *
 * Type definitions for the Profile Suggestion Builder.
 *
 * IMPORTANT:
 * - ProfileSuggestion is editor-only metadata. It is NEVER stored in DocumentData.
 * - Suggestions are ideas the counsellor/student should CHECK against the student's
 *   real profile. Only explicitly confirmed suggestions may enter DocumentData.
 * - Source labels are for UX transparency only, not admission claims.
 */

// ---------------------------------------------------------------------------
// Core suggestion types
// ---------------------------------------------------------------------------

/** Where this suggestion originates — for UX transparency labelling only. */
export type SuggestionSource =
  | "course"       // derived from CourseCategory config
  | "intendedCourse" // refined by keyword match on intendedCourse field
  | "country"      // derived from DestinationCountry config (secondary)
  | "degree";      // adjusted by DegreeLevel (tertiary)

export type SuggestionType =
  | "hobby"
  | "skill"
  | "activity"
  | "academicInterest";

export type SuggestionPriority = "high" | "medium" | "low";

export interface ProfileSuggestion {
  /** Stable identifier — label normalised to kebab-case. */
  id: string;
  /** Human-readable label displayed in chip UI. */
  label: string;
  type: SuggestionType;
  source: SuggestionSource;
  priority: SuggestionPriority;
}

// ---------------------------------------------------------------------------
// Config types (internal to config files)
// ---------------------------------------------------------------------------

export interface RawSuggestionItem {
  label: string;
  priority: SuggestionPriority;
}

export interface CourseSuggestionConfig {
  hobbies: RawSuggestionItem[];
  skills: RawSuggestionItem[];
  activities: RawSuggestionItem[];
  academicInterests: RawSuggestionItem[];
}

export interface CountrySuggestionConfig {
  /** General interest ideas — treated as secondary (low priority). */
  interests: RawSuggestionItem[];
  /** Activity ideas — treated as secondary (low priority). */
  activities: RawSuggestionItem[];
}

export interface IntendedCourseMatcher {
  /** Lowercase keywords matched against the intendedCourse field. */
  keywords: string[];
  /** Labels to boost in skills. */
  boostSkills: string[];
  /** Labels to boost in activities. */
  boostActivities: string[];
  /** Labels to boost in academicInterests. */
  boostAcademicInterests: string[];
  /** Labels to boost in hobbies. */
  boostHobbies: string[];
}

// ---------------------------------------------------------------------------
// Result type returned by getProfileSuggestions
// ---------------------------------------------------------------------------

export interface ProfileSuggestionsResult {
  hobbies: ProfileSuggestion[];
  skills: ProfileSuggestion[];
  activities: ProfileSuggestion[];
  academicInterests: ProfileSuggestion[];
}
