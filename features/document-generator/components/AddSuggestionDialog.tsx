"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { ProfileSuggestion } from "../guidance/profileSuggestions/profileSuggestions.types";
import type {
  HobbyEntry,
  SkillEntry,
  AcademicInterest,
  LeadershipActivity,
} from "@/types";

// ---------------------------------------------------------------------------
// Dialog state
// ---------------------------------------------------------------------------

export interface AddSuggestionDialogState {
  open: boolean;
  suggestion: ProfileSuggestion | null;
}

// ---------------------------------------------------------------------------
// Callback types — one per suggestion type
// ---------------------------------------------------------------------------

interface AddSuggestionDialogProps {
  state: AddSuggestionDialogState;
  onClose: () => void;
  onAddHobby: (entry: Omit<HobbyEntry, "id">) => void;
  onAddSkill: (entry: Omit<SkillEntry, "id">) => void;
  onAddAcademicInterest: (entry: Omit<AcademicInterest, "id">) => void;
  onAddActivity: (entry: Omit<LeadershipActivity, "id">) => void;
}

// ---------------------------------------------------------------------------
// Sub-dialogs
// ---------------------------------------------------------------------------

function HobbyDialog({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: (entry: Omit<HobbyEntry, "id">) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Only add this if it genuinely applies to the student.
        </p>
      </div>

      <div>
        <Label htmlFor="add-hobby-name">Interest / Hobby</Label>
        <div className="mt-1 px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700 border border-slate-200">
          {label}
        </div>
      </div>

      <div>
        <Label htmlFor="add-hobby-desc">Short Description (optional)</Label>
        <Textarea
          id="add-hobby-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Enjoys playing chess as a strategic exercise."
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Leave blank if you prefer to add a description later.
        </p>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onConfirm({ name: label, description: description.trim() })}
        >
          Add to CV
        </Button>
      </div>
    </div>
  );
}

function SkillDialog({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: (entry: Omit<SkillEntry, "id">) => void;
  onCancel: () => void;
}) {
  const [proficiency, setProficiency] = useState("");

  const proficiencyOptions = [
    { value: "", label: "Not specified" },
    { value: "Beginner", label: "Beginner" },
    { value: "Intermediate", label: "Intermediate" },
    { value: "Proficient", label: "Proficient" },
    { value: "Advanced", label: "Advanced" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Only add this skill if the student genuinely has it.
          A suggestion means this skill <em>may be relevant</em> — not that the student possesses it.
        </p>
      </div>

      <div>
        <Label>Skill</Label>
        <div className="mt-1 px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700 border border-slate-200">
          {label}
        </div>
      </div>

      <div>
        <Label htmlFor="add-skill-prof">Proficiency (optional)</Label>
        <select
          id="add-skill-prof"
          value={proficiency}
          onChange={(e) => setProficiency(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700
            focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy/40 transition-colors"
        >
          {proficiencyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onConfirm({ name: label, proficiency: proficiency || undefined })}
        >
          Add to CV
        </Button>
      </div>
    </div>
  );
}

function AcademicInterestDialog({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: (entry: Omit<AcademicInterest, "id">) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Only add this if the student has a genuine interest in this area.
        </p>
      </div>

      <div>
        <Label>Academic Interest</Label>
        <div className="mt-1 px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700 border border-slate-200">
          {label}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onConfirm({ name: label })}
        >
          Add to CV
        </Button>
      </div>
    </div>
  );
}

function ActivityDialog({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: (entry: Omit<LeadershipActivity, "id">) => void;
  onCancel: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [activity, setActivity] = useState(label);
  const [organisation, setOrganisation] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");

  if (!confirmed) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-[11px] font-semibold text-amber-800 mb-1">
            ⚠ Activity suggestion — student must verify
          </p>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <strong>{label}</strong> is an activity idea based on the student&apos;s course area.
          </p>
          <p className="text-[11px] text-amber-700 leading-relaxed mt-1">
            Only proceed if the student has <em>actually participated</em> in this activity.
            Do not invent details.
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Not Applicable
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setConfirmed(true)}
          >
            I Have Done This →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Please enter the factual details. Only include information the student can verify.
      </p>

      <div>
        <Label htmlFor="add-act-activity" required>Activity / Role</Label>
        <Input
          id="add-act-activity"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="e.g. Hackathon Participant"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="add-act-org">Organisation</Label>
          <Input
            id="add-act-org"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="School, club, event…"
          />
        </div>
        <div>
          <Label htmlFor="add-act-duration">Duration / Date</Label>
          <Input
            id="add-act-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. March 2024"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="add-act-desc">Description</Label>
        <Textarea
          id="add-act-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you do? What was your role?"
        />
      </div>

      <div>
        <Label htmlFor="add-act-impact">Impact / Outcome (optional)</Label>
        <Input
          id="add-act-impact"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          placeholder="Key result or contribution…"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={activity.trim().length === 0}
          onClick={() =>
            onConfirm({
              activity: activity.trim(),
              organisation: organisation.trim() || undefined,
              duration: duration.trim() || undefined,
              description: description.trim() || undefined,
              impact: impact.trim() || undefined,
            })
          }
        >
          Add to CV
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dialog component
// ---------------------------------------------------------------------------

/**
 * AddSuggestionDialog — editor-only modal.
 *
 * Renders a type-appropriate confirmation dialog before adding any suggestion
 * to DocumentData. Each type enforces truthfulness differently:
 * - Hobby:           name + optional description
 * - Skill:           name + optional proficiency
 * - Academic Interest: simple confirm
 * - Activity:        first confirms the student actually participated,
 *                    then collects factual details
 *
 * Nothing is added to DocumentData unless the student confirms.
 * NEVER appears in PDF output.
 */
export function AddSuggestionDialog({
  state,
  onClose,
  onAddHobby,
  onAddSkill,
  onAddAcademicInterest,
  onAddActivity,
}: AddSuggestionDialogProps) {
  if (!state.open || !state.suggestion) return null;

  const { suggestion } = state;

  const titleMap: Record<ProfileSuggestion["type"], string> = {
    hobby: `Add "${suggestion.label}" to Hobbies & Interests?`,
    skill: `Add "${suggestion.label}" to Skills?`,
    activity: `Activity Suggestion: "${suggestion.label}"`,
    academicInterest: `Add "${suggestion.label}" to Academic Interests?`,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestion-dialog-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
          w-[min(420px,calc(100vw-32px))] bg-white rounded-2xl shadow-2xl
          border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">
            Profile Suggestion
          </p>
          <h2
            id="suggestion-dialog-title"
            className="text-[13px] font-bold text-slate-800 leading-snug"
          >
            {titleMap[suggestion.type]}
          </h2>
        </div>

        {/* Body — keyed by suggestion id so sub-dialog state resets when suggestion changes */}
        <div className="px-5 py-4" key={suggestion.id}>
          {suggestion.type === "hobby" && (
            <HobbyDialog
              label={suggestion.label}
              onConfirm={(entry) => {
                onAddHobby(entry);
                onClose();
              }}
              onCancel={onClose}
            />
          )}
          {suggestion.type === "skill" && (
            <SkillDialog
              label={suggestion.label}
              onConfirm={(entry) => {
                onAddSkill(entry);
                onClose();
              }}
              onCancel={onClose}
            />
          )}
          {suggestion.type === "academicInterest" && (
            <AcademicInterestDialog
              label={suggestion.label}
              onConfirm={(entry) => {
                onAddAcademicInterest(entry);
                onClose();
              }}
              onCancel={onClose}
            />
          )}
          {suggestion.type === "activity" && (
            <ActivityDialog
              label={suggestion.label}
              onConfirm={(entry) => {
                onAddActivity(entry);
                onClose();
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </>
  );
}
