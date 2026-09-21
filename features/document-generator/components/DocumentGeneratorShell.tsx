"use client";

import { useState, useMemo, useEffect } from "react";
import { DocumentProvider } from "../state/DocumentContext";
import { AppHeader } from "@/components/common/AppHeader";
import { SectionAccordion } from "./SectionAccordion";
import { DocumentPreview } from "../preview/DocumentPreview";
import { useDocumentState } from "../hooks/useDocumentState";
import type { ResumeDraftRecord } from "../types/draft";
import { ResumeDraftsModal } from "./ResumeDraftsModal";
import { getAllResumeDrafts, saveResumeDraft } from "../lib/resumeDraftStorage";

// Guidance system
import type { ApplicationTarget } from "../guidance/types";
import { getAdmissionsGuidance } from "../guidance/getAdmissionsGuidance";
import { ApplicationTargetForm } from "../forms/ApplicationTargetForm";
import { GuidanceSummaryPanel } from "./GuidanceSummaryPanel";
import { ProfileSuggestionsPanel } from "./ProfileSuggestionsPanel";

// Forms — existing
import { PersonalDetailsForm } from "../forms/PersonalDetailsForm";
import { AboutMeForm } from "../forms/AboutMeForm";
import { EducationForm } from "../forms/EducationForm";
import { RecommendationsForm } from "../forms/RecommendationsForm";
import { LanguagesForm } from "../forms/LanguagesForm";
import { EnglishCertificateForm } from "../forms/EnglishCertificateForm";
import { SkillsForm } from "../forms/SkillsForm";
import { HobbiesForm } from "../forms/HobbiesForm";
import { VolunteeringForm } from "../forms/VolunteeringForm";
import { DeclarationForm } from "../forms/DeclarationForm";

// Forms — university-admissions sections
import { AcademicInterestsForm } from "../forms/AcademicInterestsForm";
import { AcademicProjectsForm } from "../forms/AcademicProjectsForm";
import { AchievementsForm } from "../forms/AchievementsForm";
import { LeadershipForm } from "../forms/LeadershipForm";
import { CertificationsForm } from "../forms/CertificationsForm";
import { InternshipsForm } from "../forms/InternshipsForm";
import { WebhookToolbar } from "./WebhookToolbar";
import { RawDataPanel } from "./RawDataPanel";
import type { CrmSnapshot } from "@/types/crmSnapshot";

/**
 * Plain helper — NOT a hook. Looks up section guidance from an already-computed
 * GuidanceResult so it can safely be called anywhere inside a render function.
 */
function getSectionGuidance(
  guidance: ReturnType<typeof getAdmissionsGuidance>,
  sectionKey: string
) {
  if (!guidance) return undefined;
  const sg = guidance.sections.find((s) => s.sectionKey === sectionKey);
  return sg ? { priority: sg.priority, hint: sg.hint } : undefined;
}

/**
 * Inner shell — rendered inside DocumentProvider so it can read context.
 * Separated from the outer shell to keep the provider boundary clean.
 *
 * ApplicationTarget lives here as local state — it is editor metadata only
 * and must never flow into DocumentData or the PDF template.
 */
function GeneratorLayout() {
  const { data, loadStudent, reset } = useDocumentState();

  // ── Draft management state ─────────────────────────────────────────────
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeDraftStudentName, setActiveDraftStudentName] = useState<string | null>(null);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedNoticeText, setSavedNoticeText] = useState<string | null>(null);
  const [recoveryBanner, setRecoveryBanner] = useState<ResumeDraftRecord | null>(null);

  // ── Application Target (editor-only, NOT in DocumentData) ───────────────
  const [applicationTarget, setApplicationTarget] = useState<ApplicationTarget>({
    destinationCountry: "United Kingdom",
    degreeLevel: "Master's",
    courseCategory: "Business / Management",
    intendedCourse: "MSc Business Analytics",
    universityName: "University of Manchester",
  });
  const guidance = useMemo(
    () => getAdmissionsGuidance(applicationTarget),
    [applicationTarget]
  );

  // ── Check saved drafts on initial mount ──────────────────────────────────
  useEffect(() => {
    const all = getAllResumeDrafts();
    setDraftCount(all.length);
    if (all.length > 0) {
      setRecoveryBanner(all[0]);
    }
  }, []);

  function handleSaveDraft() {
    setIsSavingDraft(true);
    try {
      const studentName = data.personal?.fullName?.trim() || "Unnamed Student";
      const targetUni = applicationTarget.universityName || undefined;
      const targetCourse = applicationTarget.intendedCourse || undefined;
      const destCountry = applicationTarget.destinationCountry || undefined;

      // If student name changed from what active draft was saved under,
      // detach activeDraftId so we save as a new draft rather than overwriting!
      const isDifferentStudent =
        Boolean(activeDraftStudentName) &&
        activeDraftStudentName?.toLowerCase() !== studentName.toLowerCase();

      const targetDraftId = isDifferentStudent ? undefined : (activeDraftId || undefined);

      const saved = saveResumeDraft({
        id: targetDraftId,
        studentName,
        targetUniversity: targetUni,
        intendedCourse: targetCourse,
        destinationCountry: destCountry,
        data,
        applicationTarget,
      });

      setActiveDraftId(saved.id);
      setActiveDraftStudentName(studentName);
      setDraftCount(getAllResumeDrafts().length);
      setRecoveryBanner(null);

      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setSavedNoticeText(`✓ Resume draft saved locally at ${timeStr}.`);
      setTimeout(() => setSavedNoticeText(null), 3500);
    } catch (err) {
      console.error("[Resume Save Draft Error]:", err);
      setSavedNoticeText("⚠️ Failed to save resume draft locally.");
      setTimeout(() => setSavedNoticeText(null), 4000);
    } finally {
      setIsSavingDraft(false);
    }
  }

  function handleRestoreDraft(draft: ResumeDraftRecord) {
    loadStudent(draft.data);
    if (draft.applicationTarget) {
      setApplicationTarget(draft.applicationTarget);
    }
    setActiveDraftId(draft.id);
    setActiveDraftStudentName(draft.studentName);
    setRecoveryBanner(null);
    setSavedNoticeText(`✓ Restored resume draft for "${draft.studentName}".`);
    setTimeout(() => setSavedNoticeText(null), 3500);
  }

  function handleNewResume() {
    reset();
    setApplicationTarget({
      destinationCountry: "United Kingdom",
      degreeLevel: "Master's",
      courseCategory: "Business / Management",
      intendedCourse: "MSc Business Analytics",
      universityName: "University of Manchester",
    });
    setActiveDraftId(null);
    setActiveDraftStudentName(null);
    setRecoveryBanner(null);
    setSavedNoticeText("✓ Started a fresh blank resume.");
    setTimeout(() => setSavedNoticeText(null), 3000);
  }

  function handleToolbarStudentLoaded() {
    setActiveDraftId(null);
    setActiveDraftStudentName(null);
  }

  function handleDismissRecovery() {
    setRecoveryBanner(null);
  }

  // ── Raw CRM snapshot (editor-only, for RawDataPanel) ───────────────────────
  const [rawSnapshot, setRawSnapshot] = useState<CrmSnapshot | null>(null);
  const [rawSource, setRawSource] = useState<"crm-api" | "mock" | null>(null);

  function handleRawSnapshot(snapshot: CrmSnapshot | null, source: "crm-api" | "mock") {
    setRawSnapshot(snapshot);
    setRawSource(source);
  }

  // ── Entry counts for accordion badges ───────────────────────────────────
  const edCount       = (data.education ?? []).length;
  const internCount   = (data.internships ?? []).length;
  const recCount      = (data.recommendations ?? []).length;
  const langCount     = (data.languages ?? []).length;
  const skillCount    = (data.skills ?? []).length;
  const hobbyCount    = (data.hobbies ?? []).length;
  const volCount      = (data.volunteering ?? []).length;
  const interestCount = (data.academicInterests ?? []).length;
  const projectCount  = (data.academicProjects ?? []).length;
  const achvCount     = (data.achievements ?? []).length;
  const leadCount     = (data.leadershipActivities ?? []).length;
  const certCount     = (data.certifications ?? []).length;

  // ── Section guidance resolver (plain function, not a hook) ─────────────
  const sg = (key: string) => getSectionGuidance(guidance, key);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      <AppHeader
        target={applicationTarget}
        onNewResume={handleNewResume}
        onSaveDraft={handleSaveDraft}
        onOpenDrafts={() => setDraftsModalOpen(true)}
        draftCount={draftCount}
        isSavingDraft={isSavingDraft}
      />

      {/* Quick recovery banner */}
      {recoveryBanner && (
        <div
          role="alert"
          className="flex-shrink-0 px-6 py-2 bg-amber-50 border-b border-amber-200
                     text-amber-900 text-xs font-medium flex items-center justify-between gap-4 z-10"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">📁</span>
            <span>
              Found a saved resume draft for{" "}
              <strong className="font-semibold text-amber-950">
                {recoveryBanner.studentName}
              </strong>
              {recoveryBanner.intendedCourse ? ` (${recoveryBanner.intendedCourse})` : ""}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="resume-resume-draft-btn"
              onClick={() => handleRestoreDraft(recoveryBanner)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold transition-colors shadow-xs"
            >
              Resume Editing
            </button>
            <button
              id="resume-dismiss-recovery-btn"
              onClick={handleDismissRecovery}
              className="p-1 text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded transition-colors text-xs"
              title="Dismiss banner"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Save notice */}
      {savedNoticeText && (
        <div
          role="status"
          aria-live="polite"
          className="flex-shrink-0 px-6 py-2 bg-[#F0F7FA] border-b border-[#D2E7F0]
                     text-[#096491] text-xs font-medium flex items-center gap-1.5 z-10"
        >
          <span>✓</span>
          <span>{savedNoticeText}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ── Editor Panel ──────────────────────────────────────────────── */}
        <aside
          className="w-[400px] xl:w-[440px] flex-shrink-0 overflow-y-auto bg-editor-bg border-r border-slate-200"
          aria-label="Document editor"
        >
          <div className="p-4 flex flex-col gap-2.5">

            {/* Editor header */}
            <div className="px-1 pb-1">
              <h1 className="text-sm font-bold text-slate-700">
                Document Editor
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Fill in sections below — the preview updates live.
              </p>
            </div>

            {/* ── Webhook toolbar — loads live student from CRM, auto-fills target ── */}
            <WebhookToolbar
              onTargetDetected={setApplicationTarget}
              onRawSnapshot={handleRawSnapshot}
              onStudentLoaded={handleToolbarStudentLoaded}
            />

            {/* ── Raw Data Panel — shows all CRM fields (editor-only) ── */}
            <RawDataPanel snapshot={rawSnapshot} source={rawSource} />

            {/* 0. Application Target (editor-only — never in PDF) */}
            <SectionAccordion
              title="Application Target"
              icon="🎯"
              defaultOpen={true}
            >
              <ApplicationTargetForm
                value={applicationTarget}
                onChange={setApplicationTarget}
              />
            </SectionAccordion>

            {/* Guidance Summary Panel — appears when target is set */}
            <GuidanceSummaryPanel
              target={applicationTarget}
              guidance={guidance}
            />

            {/* Profile Suggestions Panel — editor-only suggestion builder */}
            <ProfileSuggestionsPanel target={applicationTarget} />

            {/* 1. Personal Details */}
            <SectionAccordion
              title="Personal Details"
              icon="👤"
              defaultOpen={true}
            >
              <PersonalDetailsForm />
            </SectionAccordion>

            {/* 2. Academic Profile */}
            <SectionAccordion
              title="Academic Profile"
              icon="📝"
              defaultOpen={true}
              guidance={sg("aboutMe")}
            >
              <AboutMeForm />
            </SectionAccordion>

            {/* 3. Education & Training */}
            <SectionAccordion
              title="Education & Training"
              icon="🎓"
              defaultOpen={true}
              badge={edCount > 0 ? String(edCount) : undefined}
              guidance={sg("education")}
            >
              <EducationForm />
            </SectionAccordion>

            {/* 3.5. Internships & Work Experience */}
            <SectionAccordion
              title="Internships & Work Experience"
              icon="💼"
              badge={internCount > 0 ? String(internCount) : undefined}
            >
              <InternshipsForm />
            </SectionAccordion>

            {/* 4. Academic Interests */}
            <SectionAccordion
              title="Academic Interests"
              icon="🔬"
              badge={interestCount > 0 ? String(interestCount) : undefined}
              guidance={sg("academicInterests")}
            >
              <AcademicInterestsForm />
            </SectionAccordion>

            {/* 5. Academic Projects */}
            <SectionAccordion
              title="Academic Projects"
              icon="📋"
              badge={projectCount > 0 ? String(projectCount) : undefined}
              guidance={sg("academicProjects")}
            >
              <AcademicProjectsForm />
            </SectionAccordion>

            {/* 6. Achievements & Awards */}
            <SectionAccordion
              title="Achievements & Awards"
              icon="🏆"
              badge={achvCount > 0 ? String(achvCount) : undefined}
              guidance={sg("achievements")}
            >
              <AchievementsForm />
            </SectionAccordion>

            {/* 7. Leadership & Extracurricular */}
            <SectionAccordion
              title="Leadership & Extracurricular"
              icon="🌟"
              badge={leadCount > 0 ? String(leadCount) : undefined}
              guidance={sg("leadershipActivities")}
            >
              <LeadershipForm />
            </SectionAccordion>

            {/* 8. Volunteering */}
            <SectionAccordion
              title="Volunteering"
              icon="🤝"
              badge={volCount > 0 ? String(volCount) : undefined}
              guidance={sg("volunteering")}
            >
              <VolunteeringForm />
            </SectionAccordion>

            {/* 9. Certifications */}
            <SectionAccordion
              title="Certifications"
              icon="📜"
              badge={certCount > 0 ? String(certCount) : undefined}
              guidance={sg("certifications")}
            >
              <CertificationsForm />
            </SectionAccordion>

            {/* 10. Language Skills */}
            <SectionAccordion
              title="Language Skills"
              icon="🌍"
              badge={langCount > 0 ? String(langCount) : undefined}
              guidance={sg("languages")}
            >
              <LanguagesForm />
            </SectionAccordion>

            {/* 11. English Certificate / IELTS */}
            <SectionAccordion
              title="English Certificate / IELTS"
              icon="🗂️"
            >
              <EnglishCertificateForm />
            </SectionAccordion>

            {/* 12. Academic & Transferable Skills */}
            <SectionAccordion
              title="Academic & Transferable Skills"
              icon="⚡"
              badge={skillCount > 0 ? String(skillCount) : undefined}
              guidance={sg("skills")}
            >
              <SkillsForm />
            </SectionAccordion>

            {/* 13. Hobbies & Personal Interests */}
            <SectionAccordion
              title="Hobbies & Personal Interests"
              icon="🎯"
              badge={hobbyCount > 0 ? String(hobbyCount) : undefined}
              guidance={sg("hobbies")}
            >
              <HobbiesForm />
            </SectionAccordion>

            {/* 14. Recommendations */}
            <SectionAccordion
              title="Recommendations"
              icon="💬"
              badge={recCount > 0 ? String(recCount) : undefined}
              guidance={sg("recommendations")}
            >
              <RecommendationsForm />
            </SectionAccordion>

            {/* 15. Declaration */}
            <SectionAccordion title="Declaration" icon="✍️">
              <DeclarationForm />
            </SectionAccordion>

            {/* Bottom spacer */}
            <div className="h-4" />
          </div>
        </aside>

        {/* ── Preview Panel ─────────────────────────────────────────────── */}
        <section
          className="flex-1 overflow-y-auto bg-preview-bg"
          aria-label="Document preview"
        >
          <div className="p-6 xl:p-10 flex flex-col items-center">
            {/* Preview label */}
            <div className="w-full max-w-[794px] mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Live Preview
              </span>
              <span className="text-[11px] text-slate-400">
                Europass · A4
              </span>
            </div>

            {/* Scaled A4 page */}
            <div className="w-full max-w-[794px]">
              <DocumentPreview />
            </div>
          </div>
        </section>
      </div>

      {/* Saved Resume Drafts Modal */}
      <ResumeDraftsModal
        isOpen={draftsModalOpen}
        onClose={() => setDraftsModalOpen(false)}
        onLoadDraft={handleRestoreDraft}
        onNewResume={handleNewResume}
        onDraftsChange={() => setDraftCount(getAllResumeDrafts().length)}
      />
    </div>
  );
}

/**
 * Top-level shell that wraps the generator in the DocumentProvider.
 * This is the component imported by app/page.tsx.
 */
export function DocumentGeneratorShell() {
  return (
    <DocumentProvider>
      <GeneratorLayout />
    </DocumentProvider>
  );
}
