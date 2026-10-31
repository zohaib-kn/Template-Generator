"use client";

import {
  Fragment,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { DEFAULT_MOVABLE_SECTION_ORDER, type DocumentData } from "@/types";
import styles from "./europass.module.css";
import { EuropassPage } from "./EuropassPage";
import { EuropassHeader } from "./EuropassHeader";
import { EuropassSectionTitle } from "./EuropassSectionTitle";
import { AboutSection } from "./sections/AboutSection";
import { EducationSection } from "./sections/EducationSection";
import { InternshipSection } from "./sections/InternshipSection";
import { AcademicInterestsSection } from "./sections/AcademicInterestsSection";
import { AcademicProjectsSection } from "./sections/AcademicProjectsSection";
import { AchievementsSection } from "./sections/AchievementsSection";
import { LeadershipSection } from "./sections/LeadershipSection";
import { CertificationsSection } from "./sections/CertificationsSection";
import { VolunteeringSection } from "./sections/VolunteeringSection";
import { RecommendationsSection } from "./sections/RecommendationsSection";
import { LanguageSkillsSection } from "./sections/LanguageSkillsSection";
import { EnglishCertificateSection } from "./sections/EnglishCertificateSection";
import { SkillsSection } from "./sections/SkillsSection";
import { HobbiesSection } from "./sections/HobbiesSection";
import { DeclarationSection } from "./sections/DeclarationSection";
import { ResumeInteractiveSection } from "@/features/document-generator/components/ResumeInteractiveSection";
import { RESUME_SECTION_METADATA } from "@/features/document-generator/components/ResumeSectionSidebar";
import { parseDescriptionToBullets, stripLeadingMarkers } from "./utils/descriptionParser";
import { useDocumentState } from "@/features/document-generator/hooks/useDocumentState";

interface EuropassTemplateProps {
  data: DocumentData;
  isInteractive?: boolean;
  activeSectionId?: string;
  onSelectSection?: (sectionId: string) => void;
}

interface PageItemAssignment {
  key: string;
  secKey: string;
  title?: string;
  startIndex?: number;
  endIndex?: number;
  splitEntryIndex?: number;
  bulletSplitCount?: number;
  splitPart?: 1 | 2;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function getElementHeightWithMargins(el: HTMLElement): number {
  const inner = (el.firstElementChild as HTMLElement) || el;
  const style = window.getComputedStyle(inner);
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  return el.offsetHeight + marginTop + marginBottom;
}

function getSplittableEntryHeight(el: HTMLElement): number {
  const section = (el.firstElementChild as HTMLElement) || el;
  const entryChild = (section.firstElementChild as HTMLElement) || section;
  const childStyle = window.getComputedStyle(entryChild);
  const childMarginBottom = parseFloat(childStyle.marginBottom) || 0;
  return Math.max(el.offsetHeight, section.offsetHeight, entryChild.offsetHeight + childMarginBottom);
}

function arePagesEqual(
  a: PageItemAssignment[][] | null,
  b: PageItemAssignment[][]
): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every(
    (page, i) =>
      page.length === b[i].length &&
      page.every(
        (item, j) =>
          item.key === b[i][j].key &&
          item.startIndex === b[i][j].startIndex &&
          item.endIndex === b[i][j].endIndex &&
          item.splitEntryIndex === b[i][j].splitEntryIndex &&
          item.bulletSplitCount === b[i][j].bulletSplitCount &&
          item.splitPart === b[i][j].splitPart
      )
  );
}

export const EUROPASS_DEFAULT_SECTION_ORDER: string[] = [
  "aboutMe",
  "education",
  "languages",
  "englishCertificate",
  "hobbies",
  "internships",
  "academicProjects",
  "achievements",
  "certifications",
  "skills",
  "leadershipActivities",
  "volunteering",
  "academicInterests",
  "recommendations",
  "declaration",
];

/**
 * Authoritative Europass template renderer.
 * Reconstructs the exact single-column layout, header, and light-blue decorations
 * from the reference Cairo-generated PDF.
 *
 * Dynamic Flow & Entry-Level Splitting:
 * Measures actual rendered heights and distributes content into physical A4 pages.
 * Multi-item sections (Education, Projects, Internships, etc.) can split their cards
 * across pages so that unused space on Page 1 is fully utilized, while preventing
 * overflow clipping on subsequent pages.
 */
export function EuropassTemplate({
  data,
  isInteractive = false,
  activeSectionId,
  onSelectSection,
}: EuropassTemplateProps) {
  const measureRef = useRef<HTMLDivElement>(null);

  const {
    setPersonal,
    setAboutMe,
    setDeclaration,
    setMotherTongue,
    setEnglishCertificate,
    updateEducation,
    updateInternship,
    removeInternship,
    updateAcademicProject,
    updateAchievement,
    updateLeadershipActivity,
    updateCertification,
    updateVolunteering,
    updateLanguage,
    updateSkill,
    updateHobby,
    updateRecommendation,
    updateAcademicInterest,
  } = useDocumentState();

  // Normalize repeatable arrays
  const educationEntries = useMemo(
    () => (data.education ?? []).filter((e) => e.institution || e.qualification),
    [data.education]
  );
  const internshipEntries = useMemo(
    () => (data.internships ?? []).filter((e) => e.role || e.company),
    [data.internships]
  );
  const projectEntries = useMemo(
    () => (data.academicProjects ?? []).filter((e) => e.title || e.description),
    [data.academicProjects]
  );
  const achievementEntries = useMemo(
    () => (data.achievements ?? []).filter((e) => e.title || e.description),
    [data.achievements]
  );
  const leadershipEntries = useMemo(
    () =>
      (data.leadershipActivities ?? []).filter(
        (e) => e.activity || e.description
      ),
    [data.leadershipActivities]
  );
  const volunteeringEntries = useMemo(
    () => (data.volunteering ?? []).filter((e) => e.organization || e.role),
    [data.volunteering]
  );
  const certificationEntries = useMemo(
    () => (data.certifications ?? []).filter((e) => e.name || e.provider),
    [data.certifications]
  );

  // ── Stable primitive/memoized refs for fields used directly in useIsomorphicLayoutEffect ──
  // Using individual stable values instead of the whole `data` object prevents the
  // effect from re-running on every render (data is a new object reference each time).
  const aboutMe            = data.aboutMe ?? "";
  const academicInterests  = useMemo(() => data.academicInterests  ?? [], [data.academicInterests]);
  const motherTongue       = data.motherTongue ?? "";
  const languages          = useMemo(() => data.languages          ?? [], [data.languages]);
  const hasLanguages = useMemo(
    () =>
      Boolean(
        motherTongue.trim() ||
          (languages &&
            languages.length > 0 &&
            languages.some((l) => l.language?.trim()))
      ),
    [motherTongue, languages]
  );
  const skills             = useMemo(() => data.skills             ?? [], [data.skills]);
  const hobbies            = useMemo(() => data.hobbies            ?? [], [data.hobbies]);
  const recommendations    = useMemo(() => data.recommendations    ?? [], [data.recommendations]);
  const declaration        = data.declaration ?? "";
  const englishCertificate = useMemo(() => data.englishCertificate ?? null, [data.englishCertificate]);
  const hasEnglishCert = useMemo(
    () =>
      Boolean(
        englishCertificate &&
          (englishCertificate.examName ||
            englishCertificate.score ||
            englishCertificate.listening ||
            englishCertificate.reading ||
            englishCertificate.writing ||
            englishCertificate.speaking ||
            englishCertificate.issuingBody ||
            englishCertificate.trfNumber)
      ),
    [englishCertificate]
  );

  const movableOrder = useMemo(() => {
    const custom = data.sectionOrder;
    const isGenericDefault =
      custom &&
      custom.length === DEFAULT_MOVABLE_SECTION_ORDER.length &&
      custom.every((id, idx) => id === DEFAULT_MOVABLE_SECTION_ORDER[idx]);

    if (!custom || custom.length === 0 || isGenericDefault) {
      return EUROPASS_DEFAULT_SECTION_ORDER;
    }
    return [
      ...custom,
      ...EUROPASS_DEFAULT_SECTION_ORDER.filter((id) => !custom.includes(id)),
    ];
  }, [data.sectionOrder]);

  // Fallback initial distribution before layout measurement runs
  const fallbackPages = useMemo<PageItemAssignment[][]>(() => {
    const allItems: PageItemAssignment[] = [];

    for (const secId of movableOrder) {
      switch (secId) {
        case "aboutMe":
        case "about":
          if (aboutMe && aboutMe.trim().length > 0) {
            allItems.push({ key: "about", secKey: "about", title: "ABOUT ME" });
          }
          break;
        case "education":
          if (educationEntries.length > 0) {
            allItems.push({
              key: "education_all",
              secKey: "education",
              startIndex: 0,
              endIndex: educationEntries.length,
            });
          }
          break;
        case "internships":
          if (internshipEntries.length > 0) {
            allItems.push({
              key: "internships_all",
              secKey: "internships",
              startIndex: 0,
              endIndex: internshipEntries.length,
            });
          }
          break;
        case "academicInterests":
          if (academicInterests && academicInterests.length > 0) {
            allItems.push({ key: "academicInterests", secKey: "academicInterests" });
          }
          break;
        case "academicProjects":
          if (projectEntries.length > 0) {
            allItems.push({
              key: "academicProjects_all",
              secKey: "academicProjects",
              startIndex: 0,
              endIndex: projectEntries.length,
            });
          }
          break;
        case "achievements":
          if (achievementEntries.length > 0) {
            allItems.push({
              key: "achievements_all",
              secKey: "achievements",
              startIndex: 0,
              endIndex: achievementEntries.length,
            });
          }
          break;
        case "leadershipActivities":
        case "leadership":
          if (leadershipEntries.length > 0) {
            allItems.push({
              key: "leadership_all",
              secKey: "leadership",
              startIndex: 0,
              endIndex: leadershipEntries.length,
            });
          }
          break;
        case "volunteering":
          if (volunteeringEntries.length > 0) {
            allItems.push({
              key: "volunteering_all",
              secKey: "volunteering",
              startIndex: 0,
              endIndex: volunteeringEntries.length,
            });
          }
          break;
        case "certifications":
          if (certificationEntries.length > 0) {
            allItems.push({
              key: "certifications_all",
              secKey: "certifications",
              startIndex: 0,
              endIndex: certificationEntries.length,
            });
          }
          break;
        case "languages":
          if (hasLanguages) {
            allItems.push({ key: "languages", secKey: "languages", title: "LANGUAGE SKILLS" });
          }
          break;
        case "englishCertificate":
          if (hasEnglishCert) {
            allItems.push({ key: "englishCertificate", secKey: "englishCertificate", title: "ENGLISH LANGUAGE CERTIFICATE" });
          }
          break;
        case "skills":
          if (skills && skills.length > 0) {
            allItems.push({ key: "skills", secKey: "skills", title: "SKILLS" });
          }
          break;
        case "hobbies":
          if (hobbies && hobbies.length > 0) {
            allItems.push({ key: "hobbies", secKey: "hobbies", title: "HOBBIES AND INTERESTS" });
          }
          break;
        case "recommendations":
          if (recommendations && recommendations.length > 0) {
            allItems.push({ key: "recommendations", secKey: "recommendations", title: "RECOMMENDATIONS" });
          }
          break;
        case "declaration":
          if (declaration && declaration.trim().length > 0) {
            allItems.push({ key: "declaration", secKey: "declaration", title: "DECLARATION" });
          }
          break;
      }
    }

    // Estimated packing for initial fallback before layout measurement completes
    const pages: PageItemAssignment[][] = [[]];
    let pIdx = 0;
    // Page 1 has header (~220px), so ~820px remaining. Subsequent pages ~1040px.
    let remH = 820;

    const estimateItemHeight = (item: PageItemAssignment) => {
      switch (item.secKey) {
        case "about":
        case "aboutMe":
          return 140;
        case "education":
          return 38 + educationEntries.length * 110;
        case "languages":
          return 110;
        case "englishCertificate":
          return 200;
        case "internships":
          return 38 + internshipEntries.length * 130;
        case "academicProjects":
          return 38 + projectEntries.length * 120;
        case "achievements":
          return 38 + achievementEntries.length * 70;
        case "certifications":
          return 38 + certificationEntries.length * 45;
        case "skills":
          return 50;
        case "hobbies":
          return 90;
        case "recommendations":
          return 38 + recommendations.length * 150;
        default:
          return 100;
      }
    };

    for (const item of allItems) {
      const estH = estimateItemHeight(item);
      if (estH <= remH || pages[pIdx].length === 0) {
        pages[pIdx].push(item);
        remH -= estH;
      } else {
        pIdx++;
        pages[pIdx] = [item];
        remH = 1000 - estH;
      }
    }

    return pages;
  }, [
    movableOrder,
    aboutMe,
    academicInterests,
    motherTongue,
    hasLanguages,
    languages,
    englishCertificate,
    hasEnglishCert,
    skills,
    hobbies,
    recommendations,
    declaration,
    educationEntries.length,
    internshipEntries.length,
    projectEntries.length,
    achievementEntries.length,
    leadershipEntries.length,
    volunteeringEntries.length,
    certificationEntries.length,
  ]);

  const [pageAssignments, setPageAssignments] = useState<
    PageItemAssignment[][] | null
  >(null);
  const [fontReadyTrigger, setFontReadyTrigger] = useState(0);

  useEffect(() => {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        setFontReadyTrigger((v) => v + 1);
      });
    }
  }, []);

  const renderPageItem = useCallback(
    (item: PageItemAssignment) => {
      switch (item.secKey) {
        case "about":
        case "aboutMe":
          return aboutMe.trim().length > 0 || isInteractive ? (
            <AboutSection
              text={aboutMe}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={setAboutMe}
            />
          ) : null;
        case "education": {
          const slice = educationEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? educationEntries.length
          );
          return slice.length > 0 ? (
            <EducationSection
              entries={slice}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateEducation}
            />
          ) : null;
        }
        case "internships": {
          let slice: typeof internshipEntries;
          if (
            item.splitEntryIndex !== undefined &&
            item.bulletSplitCount !== undefined &&
            item.splitPart !== undefined
          ) {
            const splitIdx = item.splitEntryIndex;
            const bCount = item.bulletSplitCount;
            const target = internshipEntries[splitIdx];
            const allBullets = parseDescriptionToBullets(target?.description || "");

            if (item.splitPart === 1) {
              const regular = internshipEntries.slice(
                item.startIndex ?? 0,
                splitIdx
              );
              const part1Target = {
                ...target,
                description: allBullets
                  .slice(0, bCount)
                  .map(stripLeadingMarkers)
                  .map((b) => `• ${b}`)
                  .join("\n"),
              };
              slice = [...regular, part1Target];
            } else {
              const part2Target = {
                ...target,
                hideHeader: true,
                description: allBullets
                  .slice(bCount)
                  .map(stripLeadingMarkers)
                  .map((b) => `• ${b}`)
                  .join("\n"),
              };
              const regular = internshipEntries.slice(
                splitIdx + 1,
                item.endIndex ?? internshipEntries.length
              );
              slice = [part2Target, ...regular];
            }
          } else {
            slice = internshipEntries.slice(
              item.startIndex ?? 0,
              item.endIndex ?? internshipEntries.length
            );
          }
          return slice.length > 0 ? (
            <InternshipSection
              entries={slice}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateInternship}
              onRemove={removeInternship}
            />
          ) : null;
        }
        case "academicInterests":
          return academicInterests.length > 0 || isInteractive ? (
            <AcademicInterestsSection
              entries={academicInterests}
              isInteractive={isInteractive}
              onUpdate={updateAcademicInterest}
            />
          ) : null;
        case "academicProjects": {
          const slice = projectEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? projectEntries.length
          );
          return slice.length > 0 ? (
            <AcademicProjectsSection
              entries={slice}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateAcademicProject}
            />
          ) : null;
        }
        case "achievements": {
          const slice = achievementEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? achievementEntries.length
          );
          return slice.length > 0 ? (
            <AchievementsSection
              entries={slice}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateAchievement}
            />
          ) : null;
        }
        case "leadership":
        case "leadershipActivities": {
          const slice = leadershipEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? leadershipEntries.length
          );
          return slice.length > 0 ? (
            <LeadershipSection
              entries={slice}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateLeadershipActivity}
            />
          ) : null;
        }
        case "volunteering": {
          const slice = volunteeringEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? volunteeringEntries.length
          );
          return slice.length > 0 ? (
            <VolunteeringSection
              entries={slice}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateVolunteering}
            />
          ) : null;
        }
        case "certifications": {
          const slice = certificationEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? certificationEntries.length
          );
          return slice.length > 0 ? (
            <CertificationsSection
              entries={slice}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateCertification}
            />
          ) : null;
        }
        case "languages":
          return hasLanguages || isInteractive ? (
            <LanguageSkillsSection
              motherTongue={motherTongue}
              entries={languages}
              title={item.title}
              isInteractive={isInteractive}
              onUpdateMotherTongue={setMotherTongue}
              onUpdateEntry={updateLanguage}
            />
          ) : null;
        case "englishCertificate":
          return (hasEnglishCert && englishCertificate) || isInteractive ? (
            <EnglishCertificateSection
              cert={englishCertificate || undefined}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={setEnglishCertificate}
            />
          ) : null;
        case "skills":
          return skills.length > 0 || isInteractive ? (
            <SkillsSection
              entries={skills}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateSkill}
            />
          ) : null;
        case "hobbies":
          return hobbies.length > 0 || isInteractive ? (
            <HobbiesSection
              entries={hobbies}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateHobby}
            />
          ) : null;
        case "recommendations": {
          const slice = recommendations.slice(
            item.startIndex ?? 0,
            item.endIndex ?? recommendations.length
          );
          return slice.length > 0 ? (
            <RecommendationsSection
              entries={slice}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={updateRecommendation}
            />
          ) : null;
        }
        case "declaration":
          return declaration.trim().length > 0 || isInteractive ? (
            <DeclarationSection
              text={declaration}
              title={item.title}
              isInteractive={isInteractive}
              onUpdate={setDeclaration}
            />
          ) : null;
        default:
          return null;
      }
    },
    [
      isInteractive,
      aboutMe,
      declaration,
      englishCertificate,
      hasEnglishCert,
      educationEntries,
      internshipEntries,
      academicInterests,
      projectEntries,
      achievementEntries,
      leadershipEntries,
      volunteeringEntries,
      certificationEntries,
      motherTongue,
      hasLanguages,
      languages,
      skills,
      hobbies,
      recommendations,
      setAboutMe,
      setDeclaration,
      setMotherTongue,
      setEnglishCertificate,
      updateEducation,
      updateInternship,
      updateAcademicInterest,
      updateAcademicProject,
      updateAchievement,
      updateLeadershipActivity,
      updateVolunteering,
      updateCertification,
      updateLanguage,
      updateSkill,
      updateHobby,
      updateRecommendation,
    ]
  );

  useIsomorphicLayoutEffect(() => {
    if (!measureRef.current) return;
    const container = measureRef.current;

    // A4 height is 297mm. Measured padding is 7.3mm top + 11.2mm bottom = 18.5mm.
    // Usable height inside padding: 278.5mm (~1052.6px at 96 DPI).
    // Reserve 28px safety buffer (~7.4mm) to account for sub-pixel text rendering,
    // interactive focus borders, and avoid clipping near the bottom page decoration.
    const PAGE_SAFETY_BUFFER = 28;
    const A4_USABLE_HEIGHT_PX = 278.5 * (96 / 25.4) - PAGE_SAFETY_BUFFER;
    const pageContentEl = container.querySelector(
      "[data-measure-page]"
    ) as HTMLElement | null;
    const measuredPageH = pageContentEl?.offsetHeight ?? 0;
    const usableHeight = measuredPageH > 500 ? measuredPageH - PAGE_SAFETY_BUFFER : A4_USABLE_HEIGHT_PX;

    const headerEl = container.querySelector(
      '[data-measure="header"]'
    ) as HTMLElement | null;
    const headerHeight = headerEl ? getElementHeightWithMargins(headerEl) : 200;

    const maxPage1 = Math.max(100, usableHeight - headerHeight);
    const maxPageN = usableHeight;

    const computedPages: PageItemAssignment[][] = [[]];
    let pageIdx = 0;
    let remainingHeight = maxPage1;

    // Helper: start next page
    const advanceToNextPage = () => {
      pageIdx++;
      computedPages[pageIdx] = [];
      remainingHeight = maxPageN;
    };

    // Helper: place an atomic section with strict height check
    const placeAtomic = (key: string, defaultTitle?: string) => {
      const el = container.querySelector(
        `[data-measure="${key}"]`
      ) as HTMLElement | null;
      const h = el ? getElementHeightWithMargins(el) : 80;

      if (h <= remainingHeight || computedPages[pageIdx].length === 0) {
        computedPages[pageIdx].push({ key, secKey: key, title: defaultTitle });
        remainingHeight -= h;
      } else {
        advanceToNextPage();
        computedPages[pageIdx].push({ key, secKey: key, title: defaultTitle });
        remainingHeight = maxPageN - h;
      }
    };

    // Helper: place a repeatable/splittable section
    // Helper: place a repeatable/splittable section with bullet-level split support
    function placeSplittable<T extends { id?: string; description?: string }>(
      secKey: string,
      defaultTitle: string,
      entries: T[]
    ) {
      if (entries.length === 0) return;

      const titleEl = container.querySelector(
        `[data-measure-title="${secKey}"]`
      ) as HTMLElement | null;
      const titleHeight = titleEl ? getElementHeightWithMargins(titleEl) : 38;

      const entryHeights = entries.map((_, i) => {
        const el = container.querySelector(
          `[data-measure-entry="${secKey}"][data-index="${i}"]`
        ) as HTMLElement | null;
        return el ? getSplittableEntryHeight(el) : 100;
      });

      const totalHeight =
        titleHeight + entryHeights.reduce((acc, val) => acc + val, 0);

      // 1. Entire section fits on current page cleanly
      if (totalHeight <= remainingHeight) {
        computedPages[pageIdx].push({
          key: `${secKey}_all`,
          secKey,
          title: defaultTitle,
          startIndex: 0,
          endIndex: entries.length,
        });
        remainingHeight -= totalHeight;
        return;
      }

      // Helper function to check if entry `entryIdx` can split its bullet points
      const getBulletSplitInfo = (entryIdx: number, availableHeight: number) => {
        const entryEl = container.querySelector(
          `[data-measure-entry="${secKey}"][data-index="${entryIdx}"]`
        ) as HTMLElement | null;
        if (!entryEl) return null;

        const bulletEls = entryEl.querySelectorAll<HTMLElement>(`.${styles.bulletItem}`);
        if (bulletEls.length < 2) return null;

        const bulletHeights = Array.from(bulletEls).map((b) => getElementHeightWithMargins(b));
        const totalBulletsHeight = bulletHeights.reduce((a, b) => a + b, 0);
        const headerHeight = Math.max(30, entryHeights[entryIdx] - totalBulletsHeight);

        // Header + at least 1 bullet must fit with small buffer
        if (headerHeight + bulletHeights[0] + 4 > availableHeight) {
          return null;
        }

        let remH = availableHeight - headerHeight - 4;
        let bCount = 0;
        while (bCount < bulletHeights.length && bulletHeights[bCount] <= remH) {
          remH -= bulletHeights[bCount];
          bCount++;
        }

        // Must fit at least 1 bullet on current page, and leave at least 1 bullet for next page
        if (bCount >= 1 && bCount < bulletHeights.length) {
          const part2Height = bulletHeights.slice(bCount).reduce((a, b) => a + b, 0);
          return { bCount, part2Height };
        }
        return null;
      };

      // 2. Section doesn't fit entirely on current page.
      // Check if at least 1 entry fits or entry 0 can split its bullets:
      if (
        titleHeight + entryHeights[0] <= remainingHeight ||
        getBulletSplitInfo(0, remainingHeight - titleHeight) !== null
      ) {
        let rem = remainingHeight - titleHeight;
        let k = 0;
        while (k < entries.length && entryHeights[k] <= rem) {
          rem -= entryHeights[k];
          k++;
        }

        // Check if entry k can split its bullets into the remaining space
        if (k < entries.length) {
          const splitInfo = getBulletSplitInfo(k, rem);
          if (splitInfo) {
            // Entry k splits its bullets across the page boundary
            computedPages[pageIdx].push({
              key: `${secKey}_part1`,
              secKey,
              title: defaultTitle,
              startIndex: 0,
              endIndex: k + 1,
              splitEntryIndex: k,
              bulletSplitCount: splitInfo.bCount,
              splitPart: 1,
            });

            advanceToNextPage();
            const remainingEntriesHeight = entryHeights.slice(k + 1).reduce((acc, val) => acc + val, 0);
            const totalPart2Height = splitInfo.part2Height + remainingEntriesHeight;

            if (totalPart2Height <= maxPageN) {
              computedPages[pageIdx].push({
                key: `${secKey}_part2`,
                secKey,
                title: "",
                startIndex: k,
                endIndex: entries.length,
                splitEntryIndex: k,
                bulletSplitCount: splitInfo.bCount,
                splitPart: 2,
              });
              remainingHeight = maxPageN - totalPart2Height;
            } else {
              let k2 = k + 1;
              let rem2 = maxPageN - splitInfo.part2Height;
              while (k2 < entries.length && entryHeights[k2] <= rem2) {
                rem2 -= entryHeights[k2];
                k2++;
              }
              computedPages[pageIdx].push({
                key: `${secKey}_part2`,
                secKey,
                title: "",
                startIndex: k,
                endIndex: k2,
                splitEntryIndex: k,
                bulletSplitCount: splitInfo.bCount,
                splitPart: 2,
              });
              advanceToNextPage();
              computedPages[pageIdx].push({
                key: `${secKey}_part3`,
                secKey,
                title: "",
                startIndex: k2,
                endIndex: entries.length,
              });
              const remHeights3 = entryHeights.slice(k2);
              remainingHeight = maxPageN - remHeights3.reduce((acc, val) => acc + val, 0);
            }
            return;
          }
        }

        if (k > 0) {
          computedPages[pageIdx].push({
            key: `${secKey}_part1`,
            secKey,
            title: defaultTitle,
            startIndex: 0,
            endIndex: k,
          });

          // Move remaining entries to next page
          advanceToNextPage();
          const remEntries = entries.slice(k);
          const remHeights = entryHeights.slice(k);
          const remTotal = remHeights.reduce((acc, val) => acc + val, 0);

          if (remTotal <= maxPageN) {
            computedPages[pageIdx].push({
              key: `${secKey}_part2`,
              secKey,
              title: "",
              startIndex: k,
              endIndex: entries.length,
            });
            remainingHeight = maxPageN - remTotal;
          } else {
            let k2 = 0;
            let rem2 = maxPageN;
            while (k2 < remEntries.length && remHeights[k2] <= rem2) {
              rem2 -= remHeights[k2];
              k2++;
            }
            computedPages[pageIdx].push({
              key: `${secKey}_part2`,
              secKey,
              title: "",
              startIndex: k,
              endIndex: k + k2,
            });
            advanceToNextPage();
            computedPages[pageIdx].push({
              key: `${secKey}_part3`,
              secKey,
              title: "",
              startIndex: k + k2,
              endIndex: entries.length,
            });
            const remHeights3 = remHeights.slice(k2);
            remainingHeight =
              maxPageN -
              remHeights3.reduce((acc, val) => acc + val, 0);
          }
          return;
        }
      }

      // 3. Doesn't fit at all on current page — start new page
      advanceToNextPage();
      if (totalHeight <= maxPageN) {
        computedPages[pageIdx].push({
          key: `${secKey}_all`,
          secKey,
          title: defaultTitle,
          startIndex: 0,
          endIndex: entries.length,
        });
        remainingHeight = maxPageN - totalHeight;
      } else {
        let k = 0;
        let rem = maxPageN - titleHeight;
        while (k < entries.length && entryHeights[k] <= rem) {
          rem -= entryHeights[k];
          k++;
        }

        // Check if entry k can split its bullets into remaining space on this new page
        if (k < entries.length) {
          const splitInfo = getBulletSplitInfo(k, rem);
          if (splitInfo) {
            computedPages[pageIdx].push({
              key: `${secKey}_part1`,
              secKey,
              title: defaultTitle,
              startIndex: 0,
              endIndex: k + 1,
              splitEntryIndex: k,
              bulletSplitCount: splitInfo.bCount,
              splitPart: 1,
            });

            advanceToNextPage();
            const remainingEntriesHeight = entryHeights.slice(k + 1).reduce((acc, val) => acc + val, 0);
            const totalPart2Height = splitInfo.part2Height + remainingEntriesHeight;

            if (totalPart2Height <= maxPageN) {
              computedPages[pageIdx].push({
                key: `${secKey}_part2`,
                secKey,
                title: "",
                startIndex: k,
                endIndex: entries.length,
                splitEntryIndex: k,
                bulletSplitCount: splitInfo.bCount,
                splitPart: 2,
              });
              remainingHeight = maxPageN - totalPart2Height;
            } else {
              let k2 = k + 1;
              let rem2 = maxPageN - splitInfo.part2Height;
              while (k2 < entries.length && entryHeights[k2] <= rem2) {
                rem2 -= entryHeights[k2];
                k2++;
              }
              computedPages[pageIdx].push({
                key: `${secKey}_part2`,
                secKey,
                title: "",
                startIndex: k,
                endIndex: k2,
                splitEntryIndex: k,
                bulletSplitCount: splitInfo.bCount,
                splitPart: 2,
              });
              advanceToNextPage();
              computedPages[pageIdx].push({
                key: `${secKey}_part3`,
                secKey,
                title: "",
                startIndex: k2,
                endIndex: entries.length,
              });
              const remHeights3 = entryHeights.slice(k2);
              remainingHeight = maxPageN - remHeights3.reduce((acc, val) => acc + val, 0);
            }
            return;
          }
        }

        if (k > 0) {
          computedPages[pageIdx].push({
            key: `${secKey}_part1`,
            secKey,
            title: defaultTitle,
            startIndex: 0,
            endIndex: k,
          });
          advanceToNextPage();
          const remHeights = entryHeights.slice(k);
          const remTotal = remHeights.reduce((acc, val) => acc + val, 0);
          if (remTotal <= maxPageN) {
            computedPages[pageIdx].push({
              key: `${secKey}_part2`,
              secKey,
              title: "",
              startIndex: k,
              endIndex: entries.length,
            });
            remainingHeight = maxPageN - remTotal;
          } else {
            let k2 = 0;
            let rem2 = maxPageN;
            const remEntries = entries.slice(k);
            while (k2 < remEntries.length && remHeights[k2] <= rem2) {
              rem2 -= remHeights[k2];
              k2++;
            }
            computedPages[pageIdx].push({
              key: `${secKey}_part2`,
              secKey,
              title: "",
              startIndex: k,
              endIndex: k + k2,
            });
            advanceToNextPage();
            computedPages[pageIdx].push({
              key: `${secKey}_part3`,
              secKey,
              title: "",
              startIndex: k + k2,
              endIndex: entries.length,
            });
            const remHeights3 = remHeights.slice(k2);
            remainingHeight = maxPageN - remHeights3.reduce((acc, val) => acc + val, 0);
          }
        } else {
          computedPages[pageIdx].push({
            key: `${secKey}_all`,
            secKey,
            title: defaultTitle,
            startIndex: 0,
            endIndex: entries.length,
          });
          remainingHeight = maxPageN - totalHeight;
        }
      }
    }

    // Sequence of sections to place, dynamically determined by movableOrder:
    for (const secId of movableOrder) {
      switch (secId) {
        case "aboutMe":
        case "about":
          if (aboutMe && aboutMe.trim().length > 0) {
            placeAtomic("about", "ABOUT ME");
          }
          break;
        case "education":
          placeSplittable("education", "EDUCATION AND TRAINING", educationEntries);
          break;
        case "internships":
          placeSplittable("internships", "WORK EXPERIENCE / INTERNSHIPS", internshipEntries);
          break;
        case "academicInterests":
          if (academicInterests && academicInterests.length > 0) {
            placeAtomic("academicInterests");
          }
          break;
        case "academicProjects":
          placeSplittable("academicProjects", "ACADEMIC PROJECTS", projectEntries);
          break;
        case "achievements":
          placeSplittable("achievements", "ACHIEVEMENTS & AWARDS", achievementEntries);
          break;
        case "leadershipActivities":
        case "leadership":
          placeSplittable("leadership", "LEADERSHIP & EXTRACURRICULAR", leadershipEntries);
          break;
        case "volunteering":
          placeSplittable("volunteering", "VOLUNTEERING / COMMUNITY ENGAGEMENT", volunteeringEntries);
          break;
        case "certifications":
          placeSplittable("certifications", "CERTIFICATIONS", certificationEntries);
          break;
        case "languages":
          if (hasLanguages) {
            placeAtomic("languages", "LANGUAGE SKILLS");
          }
          break;
        case "englishCertificate":
          if (hasEnglishCert) {
            const isIeltsExam = (englishCertificate?.examName || "IELTS").toUpperCase().includes("IELTS");
            placeAtomic("englishCertificate", isIeltsExam ? "IELTS" : (englishCertificate?.examName?.toUpperCase() || "ENGLISH LANGUAGE CERTIFICATE"));
          }
          break;
        case "skills":
          if (skills && skills.length > 0) {
            placeAtomic("skills", "SKILLS");
          }
          break;
        case "hobbies":
          if (hobbies && hobbies.length > 0) {
            placeAtomic("hobbies", "HOBBIES AND INTERESTS");
          }
          break;
        case "recommendations":
          placeSplittable("recommendations", "RECOMMENDATIONS", recommendations);
          break;
        case "declaration":
          if (declaration && declaration.trim().length > 0) {
            placeAtomic("declaration", "DECLARATION");
          }
          break;
      }
    }

    setPageAssignments((prev) =>
      arePagesEqual(prev, computedPages) ? prev : computedPages
    );
  }, [
    movableOrder,
    aboutMe,
    academicInterests,
    motherTongue,
    hasLanguages,
    languages,
    englishCertificate,
    hasEnglishCert,
    skills,
    hobbies,
    recommendations,
    declaration,
    educationEntries,
    internshipEntries,
    projectEntries,
    achievementEntries,
    leadershipEntries,
    volunteeringEntries,
    certificationEntries,
    fontReadyTrigger,
  ]);

  const currentPages = pageAssignments ?? fallbackPages;

  return (
    <div className={styles.templateContainer}>
      {/* Invisible measurement sandbox */}
      <div
        ref={measureRef}
        className={styles.page}
        style={{
          position: "absolute",
          top: "-99999px",
          left: "-99999px",
          height: "auto",
          maxHeight: "none",
          minHeight: "auto",
          overflow: "visible",
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: -9999,
        }}
        aria-hidden="true"
      >
        <div
          className={styles.pageContent}
          style={{ height: "auto", minHeight: "auto", padding: "7.3mm 8.9mm 11.2mm 9.2mm", boxSizing: "border-box" }}
        >
          <div
            data-measure-page
            style={{ height: "278.5mm", boxSizing: "border-box" }}
          />
        <div data-measure="header">
          <EuropassHeader personal={data.personal} />
        </div>

        {/* Atomic sections */}
        {data.aboutMe && (
          <div data-measure="about">
            <AboutSection text={data.aboutMe} />
          </div>
        )}
        {data.academicInterests && (
          <div data-measure="academicInterests">
            <AcademicInterestsSection entries={data.academicInterests} />
          </div>
        )}
        {hasLanguages && (
          <div data-measure="languages">
            <LanguageSkillsSection motherTongue={motherTongue} entries={languages} />
          </div>
        )}
        {hasEnglishCert && englishCertificate && (
          <div data-measure="englishCertificate">
            <EnglishCertificateSection cert={englishCertificate} />
          </div>
        )}
        {data.skills && (
          <div data-measure="skills">
            <SkillsSection entries={data.skills} />
          </div>
        )}
        {data.hobbies && (
          <div data-measure="hobbies">
            <HobbiesSection entries={data.hobbies} />
          </div>
        )}
        {data.declaration && (
          <div data-measure="declaration">
            <DeclarationSection text={data.declaration} />
          </div>
        )}

        {/* Splittable repeatable sections */}
        {/* Education */}
        <div data-measure-title="education" className={styles.sectionWrapper}>
          <EuropassSectionTitle title="EDUCATION AND TRAINING" />
        </div>
        {educationEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="education" data-index={idx}>
            <EducationSection entries={[e]} title="" />
          </div>
        ))}

        {/* Internships */}
        <div data-measure-title="internships" className={styles.sectionWrapper}>
          <EuropassSectionTitle title="WORK EXPERIENCE / INTERNSHIPS" />
        </div>
        {internshipEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="internships" data-index={idx}>
            <InternshipSection entries={[e]} title="" />
          </div>
        ))}

        {/* Academic Projects */}
        <div data-measure-title="academicProjects" className={styles.sectionWrapper}>
          <EuropassSectionTitle title="ACADEMIC PROJECTS" />
        </div>
        {projectEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="academicProjects" data-index={idx}>
            <AcademicProjectsSection entries={[e]} title="" />
          </div>
        ))}

        {/* Achievements */}
        <div data-measure-title="achievements" className={styles.sectionWrapper}>
          <EuropassSectionTitle title="ACHIEVEMENTS & AWARDS" />
        </div>
        {achievementEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="achievements" data-index={idx}>
            <AchievementsSection entries={[e]} title="" />
          </div>
        ))}

        {/* Leadership */}
        <div data-measure-title="leadership" className={styles.sectionWrapper}>
          <EuropassSectionTitle title="LEADERSHIP & EXTRACURRICULAR" />
        </div>
        {leadershipEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="leadership" data-index={idx}>
            <LeadershipSection entries={[e]} title="" />
          </div>
        ))}

        {/* Volunteering */}
        <div data-measure-title="volunteering" className={styles.sectionWrapper}>
          <EuropassSectionTitle title="VOLUNTEERING / COMMUNITY ENGAGEMENT" />
        </div>
        {volunteeringEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="volunteering" data-index={idx}>
            <VolunteeringSection entries={[e]} title="" />
          </div>
        ))}

        {/* Certifications */}
        <div data-measure-title="certifications" className={styles.sectionWrapper}>
          <EuropassSectionTitle title="CERTIFICATIONS" />
        </div>
        {certificationEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="certifications" data-index={idx}>
            <CertificationsSection entries={[e]} title="" />
          </div>
        ))}

        {/* Recommendations */}
        <div data-measure-title="recommendations" className={styles.sectionWrapper}>
          <EuropassSectionTitle title="RECOMMENDATIONS" />
        </div>
        {recommendations.map((e, idx) => (
          <div key={e.id || idx} data-measure-entry="recommendations" data-index={idx}>
            <RecommendationsSection entries={[e]} title="" />
          </div>
        ))}
        </div>
      </div>

      {/* Rendered Physical Pages */}
      {currentPages.map((pageItems, pIdx) => {
        const pageNumber = pIdx + 1;
        return (
          <EuropassPage key={pageNumber} pageNumber={pageNumber}>
            {pageNumber === 1 && (
              isInteractive ? (
                <ResumeInteractiveSection
                  sectionId="personalDetails"
                  title="Personal Details"
                  isSelected={activeSectionId === "personalDetails"}
                  onEdit={() => onSelectSection?.("personalDetails")}
                >
                  <EuropassHeader
                    personal={data.personal}
                    isInteractive={isInteractive}
                    onUpdatePersonal={setPersonal}
                  />
                </ResumeInteractiveSection>
              ) : (
                <EuropassHeader personal={data.personal} />
              )
            )}
            {pageItems.map((item) => {
              const content = renderPageItem(item);
              if (!content) return null;
              if (!isInteractive) {
                return <Fragment key={item.key}>{content}</Fragment>;
              }

              const canonicalKey =
                item.secKey === "about"
                  ? "aboutMe"
                  : item.secKey === "leadership"
                  ? "leadershipActivities"
                  : item.secKey;

              const meta = RESUME_SECTION_METADATA[canonicalKey] ?? { title: canonicalKey };

              const isContinuation = item.title === "";

              return (
                <Fragment key={item.key}>
                  <ResumeInteractiveSection
                    sectionId={canonicalKey}
                    title={meta.title}
                    isSelected={activeSectionId === canonicalKey}
                    onEdit={() => onSelectSection?.(canonicalKey)}
                  >
                    {content}
                  </ResumeInteractiveSection>
                </Fragment>
              );
            })}
          </EuropassPage>
        );
      })}
    </div>
  );
}
