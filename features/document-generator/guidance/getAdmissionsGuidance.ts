/**
 * guidance/getAdmissionsGuidance.ts
 *
 * Combines course + country config into a single GuidanceResult.
 *
 * Steps:
 * 1. Look up course config → base sections + suggestions
 * 2. Look up country config → additional suggestions + priority overrides
 * 3. Apply country priority overrides to the base sections
 * 4. Append university-specific disclaimer if universityName is provided
 * 5. Return null if neither course nor country is selected
 */

import type { ApplicationTarget, GuidanceResult, SectionGuidance } from "./types";
import { courseGuidance } from "./courseGuidance";
import { countryGuidance } from "./countryGuidance";

/**
 * Computes editor-only admissions guidance from an ApplicationTarget.
 *
 * Returns null when no meaningful target is set yet (nothing selected).
 * Never writes to DocumentData; result is consumed only by editor UI.
 */
export function getAdmissionsGuidance(
  target: ApplicationTarget
): GuidanceResult | null {
  const hasTarget =
    target.destinationCountry || target.courseCategory || target.intendedCourse;

  if (!hasTarget) return null;

  // --- 1. Course baseline -----------------------------------------------
  const courseConfig = target.courseCategory
    ? courseGuidance[target.courseCategory]
    : null;

  let sections: SectionGuidance[] = courseConfig
    ? courseConfig.sections.map((s) => ({ ...s }))
    : getGenericSections();

  const suggestions: string[] = courseConfig
    ? [...courseConfig.suggestions]
    : [];

  // --- 2. Country overlay -----------------------------------------------
  const countryConfig = target.destinationCountry
    ? countryGuidance[target.destinationCountry]
    : null;

  if (countryConfig) {
    // Prepend country suggestions before course suggestions so country
    // context appears first in the panel
    suggestions.unshift(...countryConfig.suggestions);

    // Apply priority overrides: if country specifies a higher/lower priority
    // for a section, replace the course-level priority
    if (countryConfig.priorityOverrides) {
      sections = sections.map((section) => {
        const override = countryConfig.priorityOverrides?.[section.sectionKey];
        if (override) {
          return { ...section, priority: override };
        }
        return section;
      });
    }
  }

  // --- 3. Warnings -------------------------------------------------------
  const warnings: string[] = [];

  if (target.universityName && target.universityName.trim().length > 0) {
    warnings.push(
      `University-specific requirements for "${target.universityName.trim()}" should be verified separately with the institution.`
    );
  }

  warnings.push(
    "This guidance is general CV preparation advice only. It does not represent official admission requirements from any university."
  );

  // --- 4. Sort sections by priority -------------------------------------
  const priorityOrder = { "highly-relevant": 0, recommended: 1, optional: 2 };
  sections.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return { sections, suggestions, warnings };
}

/**
 * Fallback section list when no course category is selected.
 * Shows all major sections at a sensible default priority.
 */
function getGenericSections(): SectionGuidance[] {
  return [
    { sectionKey: "education", label: "Education & Training", priority: "highly-relevant" },
    { sectionKey: "aboutMe", label: "Academic Profile", priority: "highly-relevant" },
    { sectionKey: "academicInterests", label: "Academic Interests", priority: "recommended" },
    { sectionKey: "academicProjects", label: "Academic Projects", priority: "recommended" },
    { sectionKey: "achievements", label: "Achievements & Awards", priority: "recommended" },
    { sectionKey: "skills", label: "Academic & Transferable Skills", priority: "recommended" },
    { sectionKey: "leadershipActivities", label: "Leadership & Extracurricular", priority: "recommended" },
    { sectionKey: "volunteering", label: "Volunteering", priority: "optional" },
    { sectionKey: "certifications", label: "Certifications", priority: "optional" },
    { sectionKey: "languages", label: "Language Skills", priority: "recommended" },
    { sectionKey: "hobbies", label: "Hobbies & Personal Interests", priority: "optional" },
    { sectionKey: "recommendations", label: "Recommendations", priority: "optional" },
  ];
}
