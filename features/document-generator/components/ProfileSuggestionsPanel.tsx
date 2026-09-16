"use client";

import { useState, useMemo } from "react";
import type { ApplicationTarget } from "../guidance/types";
import type { DocumentData } from "@/types";
import { getProfileSuggestions, VISIBLE_LIMITS } from "../guidance/profileSuggestions/getProfileSuggestions";
import type { ProfileSuggestion } from "../guidance/profileSuggestions/profileSuggestions.types";
import { SuggestionChip } from "./SuggestionChip";
import { AddSuggestionDialog, type AddSuggestionDialogState } from "./AddSuggestionDialog";
import { useDocumentState } from "../hooks/useDocumentState";

interface ProfileSuggestionsPanelProps {
  target: ApplicationTarget;
}

// ---------------------------------------------------------------------------
// "Already added" detection — normalised case-insensitive comparison
// ---------------------------------------------------------------------------

function normalise(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function isHobbyAdded(label: string, hobbies: DocumentData["hobbies"]): boolean {
  return (hobbies ?? []).some((h) => normalise(h.name) === normalise(label));
}

function isSkillAdded(label: string, skills: DocumentData["skills"]): boolean {
  return (skills ?? []).some((s) => normalise(s.name) === normalise(label));
}

function isInterestAdded(label: string, interests: DocumentData["academicInterests"]): boolean {
  return (interests ?? []).some((i) => normalise(i.name) === normalise(label));
}

function isActivityAdded(label: string, activities: DocumentData["leadershipActivities"]): boolean {
  return (activities ?? []).some((a) => normalise(a.activity) === normalise(label));
}

// ---------------------------------------------------------------------------
// Context tag builder
// ---------------------------------------------------------------------------

function buildContextTag(target: ApplicationTarget): string {
  const parts: string[] = [];
  if (target.destinationCountry) parts.push(target.destinationCountry);
  if (target.degreeLevel) parts.push(target.degreeLevel);
  if (target.courseCategory) parts.push(target.courseCategory);
  if (target.intendedCourse?.trim()) parts.push(target.intendedCourse.trim());
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Chip group sub-component
// ---------------------------------------------------------------------------

function ChipGroup({
  title,
  suggestions,
  visibleLimit,
  isAdded,
  onChipClick,
}: {
  title: string;
  suggestions: ProfileSuggestion[];
  visibleLimit: number;
  isAdded: (s: ProfileSuggestion) => boolean;
  onChipClick: (s: ProfileSuggestion) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  if (suggestions.length === 0) return null;

  const visible = showAll ? suggestions : suggestions.slice(0, visibleLimit);
  const hasMore = suggestions.length > visibleLimit;

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((s) => (
          <SuggestionChip
            key={s.id}
            suggestion={s}
            isAdded={isAdded(s)}
            onClick={() => onChipClick(s)}
          />
        ))}
        {hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium
              text-slate-400 border border-dashed border-slate-200 hover:text-slate-600
              hover:border-slate-300 transition-colors cursor-pointer"
          >
            +{suggestions.length - visibleLimit} more
          </button>
        )}
        {showAll && hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium
              text-slate-400 border border-dashed border-slate-200 hover:text-slate-600
              hover:border-slate-300 transition-colors cursor-pointer"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ProfileSuggestionsPanel
// ---------------------------------------------------------------------------

/**
 * ProfileSuggestionsPanel — editor-only component.
 *
 * Shows suggestion chips derived from the student's Application Target.
 * Clicking a chip opens a confirmation dialog. Only confirmed, genuine
 * entries are written to DocumentData via useDocumentState helpers.
 *
 * Changing the Application Target refreshes suggestions but NEVER removes
 * existing CV content.
 *
 * This component is NEVER rendered inside any PDF template.
 */
export function ProfileSuggestionsPanel({ target }: ProfileSuggestionsPanelProps) {
  const {
    data,
    addHobbyWithData,
    addSkillWithData,
    addAcademicInterestWithData,
    addLeadershipActivityWithData,
  } = useDocumentState();

  const [dialogState, setDialogState] = useState<AddSuggestionDialogState>({
    open: false,
    suggestion: null,
  });

  const suggestions = useMemo(
    () => getProfileSuggestions(target),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      target.courseCategory,
      target.destinationCountry,
      target.degreeLevel,
      target.intendedCourse,
    ]
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!suggestions) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
          Profile Suggestions
        </p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Select a destination and course above to see profile suggestions.
        </p>
      </div>
    );
  }

  const contextTag = buildContextTag(target);

  // ── "Already added" dispatcher ───────────────────────────────────────────
  const isAdded = (s: ProfileSuggestion): boolean => {
    switch (s.type) {
      case "hobby":            return isHobbyAdded(s.label, data.hobbies);
      case "skill":            return isSkillAdded(s.label, data.skills);
      case "academicInterest": return isInterestAdded(s.label, data.academicInterests);
      case "activity":         return isActivityAdded(s.label, data.leadershipActivities);
    }
  };

  const openDialog = (suggestion: ProfileSuggestion) => {
    if (isAdded(suggestion)) return; // chip is disabled when already added
    setDialogState({ open: true, suggestion });
  };

  const closeDialog = () => setDialogState({ open: false, suggestion: null });

  return (
    <>
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 space-y-3">
        {/* Header */}
        <div>
          <p className="text-[9px] font-bold text-indigo-600/70 uppercase tracking-widest mb-0.5">
            Profile Suggestions
          </p>
          {contextTag && (
            <p className="text-[10px] text-slate-500 font-medium leading-snug">
              Based on: {contextTag}
            </p>
          )}
          {target.universityName?.trim() && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {target.universityName.trim()} · context only
            </p>
          )}
        </div>

        {/* Chip groups */}
        <div className="space-y-3">
          <ChipGroup
            title="Hobbies & Interests"
            suggestions={suggestions.hobbies}
            visibleLimit={VISIBLE_LIMITS.hobbies}
            isAdded={isAdded}
            onChipClick={openDialog}
          />
          <ChipGroup
            title="Skills"
            suggestions={suggestions.skills}
            visibleLimit={VISIBLE_LIMITS.skills}
            isAdded={isAdded}
            onChipClick={openDialog}
          />
          <ChipGroup
            title="Activities"
            suggestions={suggestions.activities}
            visibleLimit={VISIBLE_LIMITS.activities}
            isAdded={isAdded}
            onChipClick={openDialog}
          />
          <ChipGroup
            title="Academic Interests"
            suggestions={suggestions.academicInterests}
            visibleLimit={VISIBLE_LIMITS.academicInterests}
            isAdded={isAdded}
            onChipClick={openDialog}
          />
        </div>

        {/* Truthfulness disclaimer */}
        <div className="border-t border-indigo-100 pt-2.5">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-amber-600">Important:</span>{" "}
            Only add suggestions that genuinely apply to the student. These are ideas to check — not claims to make.
          </p>
        </div>
      </div>

      {/* Confirmation dialog */}
      <AddSuggestionDialog
        state={dialogState}
        onClose={closeDialog}
        onAddHobby={(entry) => {
          if (!isHobbyAdded(entry.name ?? "", data.hobbies)) {
            addHobbyWithData(entry);
          }
        }}
        onAddSkill={(entry) => {
          if (!isSkillAdded(entry.name ?? "", data.skills)) {
            addSkillWithData(entry);
          }
        }}
        onAddAcademicInterest={(entry) => {
          if (!isInterestAdded(entry.name ?? "", data.academicInterests)) {
            addAcademicInterestWithData(entry);
          }
        }}
        onAddActivity={(entry) => {
          if (!isActivityAdded(entry.activity ?? "", data.leadershipActivities)) {
            addLeadershipActivityWithData(entry);
          }
        }}
      />
    </>
  );
}
