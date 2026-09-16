"use client";

import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import type { ApplicationTarget, CourseCategory, DegreeLevel, DestinationCountry } from "../guidance/types";

const COUNTRIES: DestinationCountry[] = [
  "United Kingdom",
  "Canada",
  "Australia",
  "Italy",
  "France",
  "Poland",
  "Georgia",
  "Kazakhstan",
  "Other",
];

const DEGREE_LEVELS: DegreeLevel[] = [
  "Bachelor's",
  "Master's",
  "PhD",
  "Other",
];

const COURSE_CATEGORIES: CourseCategory[] = [
  "Computer Science / IT",
  "Engineering",
  "Business / Management",
  "Economics / Finance",
  "Political Science / International Relations",
  "Social Sciences",
  "Arts / Media / Design",
  "Health / Life Sciences",
  "Natural Sciences",
  "Law",
  "Hospitality / Tourism",
  "Other",
];

interface ApplicationTargetFormProps {
  value: ApplicationTarget;
  onChange: (updated: ApplicationTarget) => void;
}

/**
 * Editor-only form for Application Target (destination country, degree, course).
 *
 * IMPORTANT: This data is NOT written to DocumentData and will NOT appear in the
 * generated PDF. It is editor metadata used only for guidance computation.
 */
export function ApplicationTargetForm({
  value,
  onChange,
}: ApplicationTargetFormProps) {
  const update = (patch: Partial<ApplicationTarget>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 pt-2">
      {/* Country */}
      <div>
        <Label htmlFor="target-country">Destination Country</Label>
        <select
          id="target-country"
          value={value.destinationCountry ?? ""}
          onChange={(e) =>
            update({
              destinationCountry:
                (e.target.value as DestinationCountry) || undefined,
            })
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/40 transition-all duration-150"
        >
          <option value="">— Select country —</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Degree Level */}
      <div>
        <Label htmlFor="target-degree">Degree Level</Label>
        <select
          id="target-degree"
          value={value.degreeLevel ?? ""}
          onChange={(e) =>
            update({ degreeLevel: (e.target.value as DegreeLevel) || undefined })
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/40 transition-all duration-150"
        >
          <option value="">— Select level —</option>
          {DEGREE_LEVELS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Course Category */}
      <div>
        <Label htmlFor="target-category">Course Category</Label>
        <select
          id="target-category"
          value={value.courseCategory ?? ""}
          onChange={(e) =>
            update({
              courseCategory: (e.target.value as CourseCategory) || undefined,
            })
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/40 transition-all duration-150"
        >
          <option value="">— Select category —</option>
          {COURSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Intended Course — free text */}
      <div>
        <Label htmlFor="target-course">Intended Course / Programme</Label>
        <Input
          id="target-course"
          value={value.intendedCourse ?? ""}
          onChange={(e) => update({ intendedCourse: e.target.value })}
          placeholder="e.g. BSc Artificial Intelligence"
        />
      </div>

      {/* University Name — optional */}
      <div>
        <Label htmlFor="target-university">
          University Name{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id="target-university"
          value={value.universityName ?? ""}
          onChange={(e) => update({ universityName: e.target.value })}
          placeholder="e.g. University of Edinburgh"
        />
        {value.universityName && value.universityName.trim().length > 0 && (
          <p className="mt-1 text-[10px] text-slate-400 leading-snug">
            University-specific requirements should be verified separately with the institution.
          </p>
        )}
      </div>

      {/* Persistent integrity reminder */}
      <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
        <p className="text-[11px] text-amber-700 leading-snug">
          Only include activities, skills, achievements and experiences that are
          genuinely true and can be supported if required.
        </p>
      </div>
    </div>
  );
}
