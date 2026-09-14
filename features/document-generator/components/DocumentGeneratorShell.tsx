"use client";

import { DocumentProvider } from "../state/DocumentContext";
import { AppHeader } from "@/components/common/AppHeader";
import { SectionAccordion } from "./SectionAccordion";
import { DocumentPreview } from "../preview/DocumentPreview";
import { useDocumentState } from "../hooks/useDocumentState";

// Forms
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

/**
 * Inner shell — rendered inside DocumentProvider so it can read context.
 * Separated from the outer shell to keep the provider boundary clean.
 */
function GeneratorLayout() {
  const { data } = useDocumentState();

  const edCount = (data.education ?? []).length;
  const recCount = (data.recommendations ?? []).length;
  const langCount = (data.languages ?? []).length;
  const skillCount = (data.skills ?? []).length;
  const hobbyCount = (data.hobbies ?? []).length;
  const volCount = (data.volunteering ?? []).length;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      <AppHeader />

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

            <SectionAccordion
              title="Personal Details"
              icon="👤"
              defaultOpen={true}
            >
              <PersonalDetailsForm />
            </SectionAccordion>

            <SectionAccordion title="About Me" icon="📝" defaultOpen={true}>
              <AboutMeForm />
            </SectionAccordion>

            <SectionAccordion
              title="Education &amp; Training"
              icon="🎓"
              defaultOpen={true}
              badge={edCount > 0 ? String(edCount) : undefined}
            >
              <EducationForm />
            </SectionAccordion>

            <SectionAccordion
              title="Recommendations"
              icon="💬"
              badge={recCount > 0 ? String(recCount) : undefined}
            >
              <RecommendationsForm />
            </SectionAccordion>

            <SectionAccordion
              title="Language Skills"
              icon="🌍"
              badge={langCount > 0 ? String(langCount) : undefined}
            >
              <LanguagesForm />
            </SectionAccordion>

            <SectionAccordion
              title="English Certificate / IELTS"
              icon="📜"
            >
              <EnglishCertificateForm />
            </SectionAccordion>

            <SectionAccordion
              title="Skills"
              icon="⚡"
              badge={skillCount > 0 ? String(skillCount) : undefined}
            >
              <SkillsForm />
            </SectionAccordion>

            <SectionAccordion
              title="Hobbies &amp; Interests"
              icon="🎯"
              badge={hobbyCount > 0 ? String(hobbyCount) : undefined}
            >
              <HobbiesForm />
            </SectionAccordion>

            <SectionAccordion
              title="Volunteering"
              icon="🤝"
              badge={volCount > 0 ? String(volCount) : undefined}
            >
              <VolunteeringForm />
            </SectionAccordion>

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
