"use client";

import { useState, useMemo } from "react";
import { DocumentProvider } from "../state/DocumentContext";
import { AppHeader } from "@/components/common/AppHeader";
import { SectionAccordion } from "./SectionAccordion";
import { DocumentPreview } from "../preview/DocumentPreview";
import { useDocumentState } from "../hooks/useDocumentState";

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
  const { data } = useDocumentState();

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
      <AppHeader target={applicationTarget} />

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
