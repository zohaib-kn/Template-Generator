"use client";

import React, { useState } from "react";
import type {
  EducationEntry,
  InternshipEntry,
  LanguageEntry,
  SkillEntry,
  Certification,
  AcademicProject,
  Achievement,
  LeadershipActivity,
  VolunteeringEntry,
  AcademicInterest,
  RecommendationEntry,
  HobbyEntry,
} from "@/types";
import styles from "../europass.module.css";

// ── Shared UI Primitives ───────────────────────────────────────────────────

interface FormFooterProps {
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  canSave: boolean;
  isNew?: boolean;
}

function FormFooter({
  onSave,
  onCancel,
  onDelete,
  canSave,
  isNew = false,
}: FormFooterProps) {
  return (
    <div className={styles.inlineFormFooter}>
      <div className={styles.inlineFormBtnGroup}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canSave) onSave();
          }}
          disabled={!canSave}
          className={styles.inlineFormSaveBtn}
        >
          {isNew ? "Add Entry" : "Save"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className={styles.inlineFormCancelBtn}
        >
          Cancel
        </button>
      </div>
      {!isNew && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={styles.inlineFormDeleteBtn}
          title="Delete this entry"
        >
          Delete Entry
        </button>
      )}
    </div>
  );
}

// ── 1. Education and Training ──────────────────────────────────────────────

interface EducationInlineFormProps {
  initialData?: Partial<EducationEntry>;
  onSave: (data: Omit<EducationEntry, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function EducationInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: EducationInlineFormProps) {
  const [qualification, setQualification] = useState(initialData?.qualification || "");
  const [institution, setInstitution] = useState(initialData?.institution || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [finalGrade, setFinalGrade] = useState(initialData?.finalGrade || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const canSave = Boolean(qualification.trim() || institution.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      qualification: qualification.trim(),
      institution: institution.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      address: address.trim(),
      finalGrade: finalGrade.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Qualification / Degree *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            placeholder="e.g. Bachelor of Technology in Computer Science"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Institution *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. University of Delhi"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Start Date</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="YYYY-MM (e.g. 2020-08)"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>End Date / Ongoing</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="YYYY-MM or Ongoing (e.g. 2024-05)"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>City / Country</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. New Delhi, India"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Final Grade</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={finalGrade}
            onChange={(e) => setFinalGrade(e.target.value)}
            placeholder="e.g. 8.4/10 or First Class with Distinction"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Description / Additional Details</label>
          <textarea
            className={styles.inlineFormTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Major courses, honors, or thesis topic..."
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 2. Work Experience / Internships ───────────────────────────────────────

interface InternshipInlineFormProps {
  initialData?: Partial<InternshipEntry>;
  onSave: (data: Omit<InternshipEntry, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function InternshipInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: InternshipInlineFormProps) {
  const [role, setRole] = useState(initialData?.role || "");
  const [company, setCompany] = useState(initialData?.company || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const canSave = Boolean(role.trim() || company.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      role: role.trim(),
      company: company.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      location: location.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Job Title / Role *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Software Engineer Intern"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Company / Organization *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Google India"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Start Date</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="YYYY-MM (e.g. 2023-06)"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>End Date / Ongoing</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="YYYY-MM or Ongoing (e.g. 2023-12)"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Location</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Bangalore, India"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Responsibilities / Description (bullet points)</label>
          <textarea
            className={styles.inlineFormTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="• Formulated and implemented detailed marketing strategies&#10;• Supported collaborative initiatives and team productivity"
            rows={4}
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 3. Language Skills ─────────────────────────────────────────────────────

interface LanguageInlineFormProps {
  initialData?: Partial<LanguageEntry>;
  onSave: (data: Omit<LanguageEntry, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function LanguageInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: LanguageInlineFormProps) {
  const [language, setLanguage] = useState(initialData?.language || "");
  const [level, setLevel] = useState(initialData?.level || "");
  const [listening, setListening] = useState(initialData?.listening || "");
  const [reading, setReading] = useState(initialData?.reading || "");
  const [writing, setWriting] = useState(initialData?.writing || "");
  const [spokenProduction, setSpokenProduction] = useState(initialData?.spokenProduction || "");
  const [spokenInteraction, setSpokenInteraction] = useState(initialData?.spokenInteraction || "");

  const canSave = Boolean(language.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      language: language.trim(),
      level: level.trim(),
      listening: listening.trim(),
      reading: reading.trim(),
      writing: writing.trim(),
      spokenProduction: spokenProduction.trim(),
      spokenInteraction: spokenInteraction.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Language *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="e.g. German, French, Spanish"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Overall Level / Proficiency</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="e.g. B2, C1, Fluent, Intermediate"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Listening (CEFR)</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={listening}
            onChange={(e) => setListening(e.target.value)}
            placeholder="e.g. B2 or C1"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Reading (CEFR)</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            placeholder="e.g. B2 or C1"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Writing (CEFR)</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={writing}
            onChange={(e) => setWriting(e.target.value)}
            placeholder="e.g. B2 or C1"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Spoken Interaction</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={spokenInteraction}
            onChange={(e) => setSpokenInteraction(e.target.value)}
            placeholder="e.g. B2 or C1"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Spoken Production</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={spokenProduction}
            onChange={(e) => setSpokenProduction(e.target.value)}
            placeholder="e.g. B2 or C1"
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 4. Digital Skills / Skills ─────────────────────────────────────────────

interface SkillInlineFormProps {
  initialData?: Partial<SkillEntry>;
  onSave: (data: Omit<SkillEntry, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function SkillInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: SkillInlineFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [proficiency, setProficiency] = useState(initialData?.proficiency || "");

  const canSave = Boolean(name.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      proficiency: proficiency.trim() || undefined,
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Skill Name or Skill Group *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Python, Machine Learning, React, TypeScript"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Proficiency Level (optional)</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value)}
            placeholder="e.g. Advanced, Proficient, Intermediate"
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 5. Certifications ──────────────────────────────────────────────────────

interface CertificationInlineFormProps {
  initialData?: Partial<Certification>;
  onSave: (data: Omit<Certification, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function CertificationInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: CertificationInlineFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [provider, setProvider] = useState(initialData?.provider || "");
  const [completionDate, setCompletionDate] = useState(initialData?.completionDate || "");
  const [credentialLink, setCredentialLink] = useState(initialData?.credentialLink || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const canSave = Boolean(name.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      provider: provider.trim(),
      completionDate: completionDate.trim(),
      credentialLink: credentialLink.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Certificate Name *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AWS Certified Solutions Architect"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Issuing Organization</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. Amazon Web Services"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Issue Date</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            placeholder="e.g. 2024-03"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Credential Link / URL</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={credentialLink}
            onChange={(e) => setCredentialLink(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Description (optional)</label>
          <textarea
            className={styles.inlineFormTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Credential ID, score, or core skills validated..."
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 6. Academic Projects ───────────────────────────────────────────────────

interface AcademicProjectInlineFormProps {
  initialData?: Partial<AcademicProject>;
  onSave: (data: Omit<AcademicProject, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function AcademicProjectInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: AcademicProjectInlineFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [role, setRole] = useState(initialData?.role || "");
  const [dateYear, setDateYear] = useState(initialData?.dateYear || "");
  const [skillsText, setSkillsText] = useState(initialData?.skills || "");
  const [link, setLink] = useState(initialData?.link || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const canSave = Boolean(title.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      role: role.trim(),
      dateYear: dateYear.trim(),
      skills: skillsText.trim(),
      link: link.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Project Name *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AI-Powered Medical Image Diagnostic System"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Role in Project</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Lead Developer, Researcher"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Date / Year</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={dateYear}
            onChange={(e) => setDateYear(e.target.value)}
            placeholder="e.g. 2024"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Technologies / Skills</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="e.g. Python, TensorFlow, React, FastAPI"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Project Link / Repository URL</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://github.com/..."
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Description / Key Contributions</label>
          <textarea
            className={styles.inlineFormTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="• Designed convolutional neural network architecture with 94.2% accuracy&#10;• Deployed real-time inference microservice"
            rows={3}
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 7. Achievements & Awards ───────────────────────────────────────────────

interface AchievementInlineFormProps {
  initialData?: Partial<Achievement>;
  onSave: (data: Omit<Achievement, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function AchievementInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: AchievementInlineFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [organisation, setOrganisation] = useState(initialData?.organisation || "");
  const [dateYear, setDateYear] = useState(initialData?.dateYear || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const canSave = Boolean(title.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      organisation: organisation.trim(),
      dateYear: dateYear.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Award / Achievement Title *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. First Prize in National Coding Hackathon"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Awarding Organization</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="e.g. IEEE Student Chapter"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Year / Date</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={dateYear}
            onChange={(e) => setDateYear(e.target.value)}
            placeholder="e.g. 2023"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Description</label>
          <textarea
            className={styles.inlineFormTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details of the award or recognition..."
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 8. Leadership & Extracurricular ────────────────────────────────────────

interface LeadershipInlineFormProps {
  initialData?: Partial<LeadershipActivity>;
  onSave: (data: Omit<LeadershipActivity, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function LeadershipInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: LeadershipInlineFormProps) {
  const [activity, setActivity] = useState(initialData?.activity || "");
  const [organisation, setOrganisation] = useState(initialData?.organisation || "");
  const [duration, setDuration] = useState(initialData?.duration || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const canSave = Boolean(activity.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      activity: activity.trim(),
      organisation: organisation.trim(),
      duration: duration.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Role / Activity Title *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="e.g. President of Robotics Society"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Organization / Club</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="e.g. University Student Council"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Duration / Dates</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 2022 – 2023"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Description / Responsibilities</label>
          <textarea
            className={styles.inlineFormTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Led a 25-member organizing team, managed budget and annual workshops..."
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 9. Volunteering ────────────────────────────────────────────────────────

interface VolunteeringInlineFormProps {
  initialData?: Partial<VolunteeringEntry>;
  onSave: (data: Omit<VolunteeringEntry, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function VolunteeringInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: VolunteeringInlineFormProps) {
  const [role, setRole] = useState(initialData?.role || "");
  const [organization, setOrganization] = useState(initialData?.organization || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const canSave = Boolean(role.trim() || organization.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      role: role.trim(),
      organization: organization.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Volunteer Role *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Community Educator, Relief Volunteer"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Organization *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. Red Cross Youth"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Start Date</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="YYYY-MM (e.g. 2022-01)"
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>End Date</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="YYYY-MM or Ongoing"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Description / Contributions</label>
          <textarea
            className={styles.inlineFormTextarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe activities, hours, and impact..."
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 10. Academic Interests ─────────────────────────────────────────────────

interface AcademicInterestInlineFormProps {
  initialData?: Partial<AcademicInterest>;
  onSave: (data: Omit<AcademicInterest, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function AcademicInterestInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: AcademicInterestInlineFormProps) {
  const [name, setName] = useState(initialData?.name || "");

  const canSave = Boolean(name.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim() });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Academic Subject / Field of Interest *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Deep Learning, Computational Biology, Quantum Computing"
            autoFocus
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 11. Recommendations ────────────────────────────────────────────────────

interface RecommendationInlineFormProps {
  initialData?: Partial<RecommendationEntry>;
  onSave: (data: Omit<RecommendationEntry, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function RecommendationInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: RecommendationInlineFormProps) {
  const [recommenderName, setRecommenderName] = useState(initialData?.recommenderName || "");
  const [recommenderTitle, setRecommenderTitle] = useState(initialData?.recommenderTitle || "");
  const [organization, setOrganization] = useState(initialData?.organization || "");
  const [text, setText] = useState(initialData?.text || "");

  const canSave = Boolean(recommenderName.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      recommenderName: recommenderName.trim(),
      recommenderTitle: recommenderTitle.trim(),
      organization: organization.trim(),
      text: text.trim(),
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Referee Name *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={recommenderName}
            onChange={(e) => setRecommenderName(e.target.value)}
            placeholder="e.g. Dr. Jane Smith"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Referee Title / Designation</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={recommenderTitle}
            onChange={(e) => setRecommenderTitle(e.target.value)}
            placeholder="e.g. Professor & Head of Department"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Organization / University</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. University of Delhi"
          />
        </div>
        <div className={styles.inlineFormFieldFull}>
          <label className={styles.inlineFormLabel}>Contact Details / Reference Note</label>
          <textarea
            className={styles.inlineFormTextarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Email: j.smith@university.edu | Phone: (+91) 9876543210"
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

// ── 12. Hobbies and Interests ──────────────────────────────────────────────

interface HobbyInlineFormProps {
  initialData?: Partial<HobbyEntry>;
  onSave: (data: Omit<HobbyEntry, "id">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function HobbyInlineForm({
  initialData,
  onSave,
  onCancel,
  onDelete,
}: HobbyInlineFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");

  const canSave = Boolean(name.trim());

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div
      className={styles.inlineEditorContainer}
      onClick={(e) => e.stopPropagation()}
      data-html2canvas-ignore="true"
      data-pdf-ignore="true"
      data-no-print="true"
    >
      <div className={styles.inlineFormGrid}>
        <div>
          <label className={styles.inlineFormLabel}>Hobby / Interest *</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Creative Writing, Chess, Landscape Photography"
            autoFocus
          />
        </div>
        <div>
          <label className={styles.inlineFormLabel}>Description (optional)</label>
          <input
            type="text"
            className={styles.inlineFormInput}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Ranked tournament player, author of blog..."
          />
        </div>
      </div>
      <FormFooter
        onSave={handleSave}
        onCancel={onCancel}
        onDelete={onDelete}
        canSave={canSave}
        isNew={!initialData}
      />
    </div>
  );
}

