/**
 * profileSuggestions/getProfileSuggestions.ts
 *
 * Main function that merges course + country + degree + intended-course
 * suggestions into a ranked, deduplicated ProfileSuggestionsResult.
 *
 * Priority order:
 *   1. Course Category  (primary — highest weight)
 *   2. Intended Course  (keyword refinement — boosts specific items)
 *   3. Degree Level     (adjusts emphasis)
 *   4. Destination Country (secondary — low-priority supplements only)
 *
 * IMPORTANT:
 * - This function is EDITOR-ONLY. Its output is NEVER written to DocumentData.
 * - Returns null when no meaningful target is selected.
 * - All merging is deterministic — no AI, no API, no backend.
 */

import type { ApplicationTarget } from "../types";
import type {
  ProfileSuggestion,
  ProfileSuggestionsResult,
  RawSuggestionItem,
  SuggestionPriority,
  SuggestionSource,
  SuggestionType,
} from "./profileSuggestions.types";
import { courseSuggestions } from "./courseSuggestions";
import { countrySuggestions } from "./countrySuggestions";
import { intendedCourseMatchers } from "./intendedCourseSuggestions";

// ---------------------------------------------------------------------------
// Visible limits per category
// ---------------------------------------------------------------------------

const VISIBLE_LIMITS = {
  hobbies: 6,
  skills: 8,
  activities: 6,
  academicInterests: 6,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a label for deduplication: trim + lowercase. */
function normalise(label: string): string {
  return label.trim().toLowerCase();
}

/** Build a stable ID from a label. */
function toId(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const SOURCE_ORDER: Record<SuggestionSource, number> = {
  course: 0,
  intendedCourse: 1,
  degree: 2,
  country: 3,
};

/** Sort comparator: by source rank first, then priority. */
function sortSuggestions(a: ProfileSuggestion, b: ProfileSuggestion): number {
  const sourceA = SOURCE_ORDER[a.source];
  const sourceB = SOURCE_ORDER[b.source];
  if (sourceA !== sourceB) return sourceA - sourceB;
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
}

/** Convert raw items from course config into ProfileSuggestion objects. */
function toSuggestions(
  items: RawSuggestionItem[],
  type: SuggestionType,
  source: SuggestionSource
): ProfileSuggestion[] {
  return items.map((item) => ({
    id: toId(item.label),
    label: item.label,
    type,
    source,
    priority: item.priority,
  }));
}

/**
 * Merge a new batch of suggestions into the accumulator map.
 * Deduplicates by normalised label — first occurrence wins (course > country).
 * If a duplicate is found with a higher priority, the higher priority is kept.
 */
function mergeBatch(
  acc: Map<string, ProfileSuggestion>,
  batch: ProfileSuggestion[]
): void {
  for (const s of batch) {
    const key = normalise(s.label);
    const existing = acc.get(key);
    if (!existing) {
      acc.set(key, s);
    } else {
      // Keep existing source/priority — first-come (course) wins
      // but if new has higher priority, upgrade the priority only
      if (PRIORITY_ORDER[s.priority] < PRIORITY_ORDER[existing.priority]) {
        acc.set(key, { ...existing, priority: s.priority });
      }
    }
  }
}

/**
 * Apply intended-course keyword boosting.
 * Upgrades priority to "high" for matching labels.
 */
function applyIntendedCourseBoosts(
  acc: Map<string, ProfileSuggestion>,
  boostLabels: string[]
): void {
  for (const label of boostLabels) {
    const key = normalise(label);
    const existing = acc.get(key);
    if (existing) {
      // Boost priority to high and mark source as intendedCourse
      acc.set(key, { ...existing, priority: "high", source: "intendedCourse" });
    }
  }
}

/**
 * Degree-level adjustments — slightly re-weight suggestions.
 * PhD emphasises research; Master's emphasises technical/professional;
 * Bachelor's keeps school-activity emphasis unchanged.
 */
function applyDegreeLevelEmphasis(
  acc: Map<string, ProfileSuggestion>,
  degreeLevel: ApplicationTarget["degreeLevel"]
): void {
  if (!degreeLevel) return;

  const researchLabels = [
    "Research", "Academic Research", "Scientific Research", "Legal Research",
    "Research Methods", "Research Projects", "Laboratory Skills", "Laboratory Techniques",
    "Academic Writing", "Analytical Writing",
  ];

  const professionalLabels = [
    "Internships", "Work Experience",
  ];

  if (degreeLevel === "PhD") {
    // Boost research-oriented items
    for (const label of researchLabels) {
      const key = normalise(label);
      const existing = acc.get(key);
      if (existing) {
        acc.set(key, { ...existing, priority: "high", source: "degree" });
      }
    }
  } else if (degreeLevel === "Master's") {
    // Boost research and professional items to medium if not already higher
    for (const label of [...researchLabels, ...professionalLabels]) {
      const key = normalise(label);
      const existing = acc.get(key);
      if (existing && existing.priority === "low") {
        acc.set(key, { ...existing, priority: "medium", source: "degree" });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Compute profile suggestions from an ApplicationTarget.
 *
 * Returns null when no course or country is selected (empty target).
 * The result is editor-only — NEVER write this to DocumentData.
 */
export function getProfileSuggestions(
  target: ApplicationTarget
): ProfileSuggestionsResult | null {
  const hasTarget =
    target.courseCategory || target.destinationCountry || target.intendedCourse;

  if (!hasTarget) return null;

  // Accumulator maps: normalised-label → ProfileSuggestion
  const hobbiesMap = new Map<string, ProfileSuggestion>();
  const skillsMap = new Map<string, ProfileSuggestion>();
  const activitiesMap = new Map<string, ProfileSuggestion>();
  const interestsMap = new Map<string, ProfileSuggestion>();

  // ── Step 1: Course Category (primary) ─────────────────────────────────
  if (target.courseCategory) {
    const cfg = courseSuggestions[target.courseCategory];
    mergeBatch(hobbiesMap, toSuggestions(cfg.hobbies, "hobby", "course"));
    mergeBatch(skillsMap, toSuggestions(cfg.skills, "skill", "course"));
    mergeBatch(activitiesMap, toSuggestions(cfg.activities, "activity", "course"));
    mergeBatch(interestsMap, toSuggestions(cfg.academicInterests, "academicInterest", "course"));
  }

  // ── Step 2: Intended Course keyword refinement ────────────────────────
  if (target.intendedCourse && target.intendedCourse.trim().length > 0) {
    const courseText = target.intendedCourse.toLowerCase();
    for (const matcher of intendedCourseMatchers) {
      const matches = matcher.keywords.some((kw) => courseText.includes(kw));
      if (matches) {
        applyIntendedCourseBoosts(skillsMap, matcher.boostSkills);
        applyIntendedCourseBoosts(activitiesMap, matcher.boostActivities);
        applyIntendedCourseBoosts(interestsMap, matcher.boostAcademicInterests);
        applyIntendedCourseBoosts(hobbiesMap, matcher.boostHobbies);
        // Only apply first matching rule to avoid over-boosting
        break;
      }
    }
  }

  // ── Step 3: Degree Level adjustments ─────────────────────────────────
  applyDegreeLevelEmphasis(hobbiesMap, target.degreeLevel);
  applyDegreeLevelEmphasis(skillsMap, target.degreeLevel);
  applyDegreeLevelEmphasis(activitiesMap, target.degreeLevel);
  applyDegreeLevelEmphasis(interestsMap, target.degreeLevel);

  // ── Step 4: Country secondary suggestions ────────────────────────────
  if (target.destinationCountry) {
    const cfg = countrySuggestions[target.destinationCountry];
    // Country interests → hobbies (secondary, will not override course items)
    mergeBatch(hobbiesMap, toSuggestions(cfg.interests, "hobby", "country"));
    // Country activities → activities (secondary)
    mergeBatch(activitiesMap, toSuggestions(cfg.activities, "activity", "country"));
  }

  // ── Step 5: Sort and cap ─────────────────────────────────────────────

  const sortedHobbies = Array.from(hobbiesMap.values()).sort(sortSuggestions);
  const sortedSkills = Array.from(skillsMap.values()).sort(sortSuggestions);
  const sortedActivities = Array.from(activitiesMap.values()).sort(sortSuggestions);
  const sortedInterests = Array.from(interestsMap.values()).sort(sortSuggestions);

  return {
    hobbies: sortedHobbies.slice(0, VISIBLE_LIMITS.hobbies + 6), // extra for "Show More"
    skills: sortedSkills.slice(0, VISIBLE_LIMITS.skills + 6),
    activities: sortedActivities.slice(0, VISIBLE_LIMITS.activities + 6),
    academicInterests: sortedInterests.slice(0, VISIBLE_LIMITS.academicInterests + 6),
  };
}

// Re-export the visible limits so the panel can use them
export { VISIBLE_LIMITS };
