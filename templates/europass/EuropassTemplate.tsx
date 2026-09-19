"use client";

import {
  Fragment,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import type { DocumentData } from "@/types";
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

interface EuropassTemplateProps {
  data: DocumentData;
}

interface PageItem {
  key: string;
  node: ReactNode;
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

function arePagesEqual(a: PageItem[][] | null, b: PageItem[][]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every(
    (page, i) =>
      page.length === b[i].length &&
      page.every((item, j) => item.key === b[i][j].key)
  );
}

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
export function EuropassTemplate({ data }: EuropassTemplateProps) {
  const measureRef = useRef<HTMLDivElement>(null);

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
  const languages          = useMemo(() => data.languages          ?? [], [data.languages]);
  const skills             = useMemo(() => data.skills             ?? [], [data.skills]);
  const hobbies            = useMemo(() => data.hobbies            ?? [], [data.hobbies]);
  const recommendations    = useMemo(() => data.recommendations    ?? [], [data.recommendations]);
  const declaration        = data.declaration ?? "";
  const englishCertificate = useMemo(() => data.englishCertificate ?? null, [data.englishCertificate]);

  // Fallback initial distribution before layout measurement runs
  const fallbackPages = useMemo<PageItem[][]>(() => {
    const p1: PageItem[] = [];
    const p2: PageItem[] = [];

    if (aboutMe && aboutMe.trim().length > 0) {
      p1.push({
        key: "about",
        node: <AboutSection text={aboutMe} />,
      });
    }
    if (educationEntries.length > 0) {
      p1.push({
        key: "education_all",
        node: <EducationSection entries={educationEntries} />,
      });
    }
    if (internshipEntries.length > 0) {
      p1.push({
        key: "internships_all",
        node: <InternshipSection entries={internshipEntries} />,
      });
    }
    if (academicInterests && academicInterests.length > 0) {
      p1.push({
        key: "academicInterests",
        node: <AcademicInterestsSection entries={academicInterests} />,
      });
    }
    if (projectEntries.length > 0) {
      p2.push({
        key: "academicProjects_all",
        node: <AcademicProjectsSection entries={projectEntries} />,
      });
    }
    if (achievementEntries.length > 0) {
      p2.push({
        key: "achievements_all",
        node: <AchievementsSection entries={achievementEntries} />,
      });
    }
    if (leadershipEntries.length > 0) {
      p2.push({
        key: "leadership_all",
        node: <LeadershipSection entries={leadershipEntries} />,
      });
    }
    if (volunteeringEntries.length > 0) {
      p2.push({
        key: "volunteering_all",
        node: <VolunteeringSection entries={volunteeringEntries} />,
      });
    }
    if (certificationEntries.length > 0) {
      p2.push({
        key: "certifications_all",
        node: <CertificationsSection entries={certificationEntries} />,
      });
    }
    if (languages && languages.length > 0) {
      p2.push({
        key: "languages",
        node: <LanguageSkillsSection entries={languages} />,
      });
    }
    if (
      englishCertificate &&
      (englishCertificate.examName || englishCertificate.score)
    ) {
      p2.push({
        key: "englishCertificate",
        node: <EnglishCertificateSection cert={englishCertificate} />,
      });
    }
    if (skills && skills.length > 0) {
      p2.push({
        key: "skills",
        node: <SkillsSection entries={skills} />,
      });
    }
    if (hobbies && hobbies.length > 0) {
      p2.push({
        key: "hobbies",
        node: <HobbiesSection entries={hobbies} />,
      });
    }
    if (recommendations && recommendations.length > 0) {
      p2.push({
        key: "recommendations",
        node: <RecommendationsSection entries={recommendations} />,
      });
    }
    if (declaration && declaration.trim().length > 0) {
      p2.push({
        key: "declaration",
        node: <DeclarationSection text={declaration} />,
      });
    }

    const pages: PageItem[][] = [p1];
    if (p2.length > 0) pages.push(p2);
    return pages;
  }, [
    aboutMe,
    academicInterests,
    languages,
    englishCertificate,
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
  ]);

  const [pageAssignments, setPageAssignments] = useState<PageItem[][] | null>(
    null
  );

  useIsomorphicLayoutEffect(() => {
    if (!measureRef.current) return;
    const container = measureRef.current;

    // A4 height is 297mm. Padding is 8.5mm top + 26mm bottom = 34.5mm.
    // Usable height inside padding: ~262.5mm (~992px at 96 DPI).
    // Reserve safety buffer from bottom decorations.
    const pageContentEl = container.querySelector(
      "[data-measure-page]"
    ) as HTMLElement | null;
    const usableHeight = pageContentEl
      ? pageContentEl.offsetHeight - 26
      : 262 * (96 / 25.4) - 26;

    const headerEl = container.querySelector(
      '[data-measure="header"]'
    ) as HTMLElement | null;
    const headerHeight = headerEl ? getElementHeightWithMargins(headerEl) : 200;

    const maxPage1 = Math.max(100, usableHeight - headerHeight);
    const maxPageN = usableHeight;

    const computedPages: PageItem[][] = [[]];
    let pageIdx = 0;
    let remainingHeight = maxPage1;

    // Helper: start next page
    const advanceToNextPage = () => {
      pageIdx++;
      computedPages[pageIdx] = [];
      remainingHeight = maxPageN;
    };

    // Helper: place an atomic section
    const placeAtomic = (key: string, node: ReactNode) => {
      const el = container.querySelector(
        `[data-measure="${key}"]`
      ) as HTMLElement | null;
      const h = el ? getElementHeightWithMargins(el) : 80;

      if (h <= remainingHeight || computedPages[pageIdx].length === 0) {
        computedPages[pageIdx].push({ key, node });
        remainingHeight -= h;
      } else {
        advanceToNextPage();
        computedPages[pageIdx].push({ key, node });
        remainingHeight = maxPageN - h;
      }
    };

    // Helper: place a repeatable/splittable section
    function placeSplittable<T>(
      secKey: string,
      defaultTitle: string,
      entries: T[],
      renderSection: (subEntries: T[], title?: string) => ReactNode
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
        return el ? getElementHeightWithMargins(el) : 100;
      });

      const totalHeight =
        titleHeight + entryHeights.reduce((acc, val) => acc + val, 0);

      // 1. Entire section fits on current page
      if (totalHeight <= remainingHeight) {
        computedPages[pageIdx].push({
          key: `${secKey}_all`,
          node: renderSection(entries, defaultTitle),
        });
        remainingHeight -= totalHeight;
        return;
      }

      // 2. Section doesn't fit entirely, check if title + at least 1 entry fits
      if (titleHeight + entryHeights[0] + 16 <= remainingHeight) {
        let rem = remainingHeight - titleHeight;
        let k = 0;
        while (k < entries.length && entryHeights[k] + 16 <= rem) {
          rem -= entryHeights[k];
          k++;
        }

        if (k > 0) {
          computedPages[pageIdx].push({
            key: `${secKey}_part1`,
            node: renderSection(entries.slice(0, k), defaultTitle),
          });

          // Move remaining entries to next page
          advanceToNextPage();
          const remEntries = entries.slice(k);
          const remHeights = entryHeights.slice(k);
          const remTotal =
            titleHeight + remHeights.reduce((acc, val) => acc + val, 0);

          if (remTotal <= maxPageN) {
            computedPages[pageIdx].push({
              key: `${secKey}_part2`,
              node: renderSection(
                remEntries,
                `${defaultTitle} (Continued)`
              ),
            });
            remainingHeight = maxPageN - remTotal;
          } else {
            let k2 = 0;
            let rem2 = maxPageN - titleHeight;
            while (k2 < remEntries.length && remHeights[k2] <= rem2) {
              rem2 -= remHeights[k2];
              k2++;
            }
            computedPages[pageIdx].push({
              key: `${secKey}_part2`,
              node: renderSection(
                remEntries.slice(0, k2),
                `${defaultTitle} (Continued)`
              ),
            });
            advanceToNextPage();
            computedPages[pageIdx].push({
              key: `${secKey}_part3`,
              node: renderSection(
                remEntries.slice(k2),
                `${defaultTitle} (Continued)`
              ),
            });
            const remHeights3 = remHeights.slice(k2);
            remainingHeight =
              maxPageN -
              (titleHeight + remHeights3.reduce((acc, val) => acc + val, 0));
          }
          return;
        }
      }

      // 3. Doesn't fit at all on current page — start new page
      advanceToNextPage();
      if (totalHeight <= maxPageN) {
        computedPages[pageIdx].push({
          key: `${secKey}_all`,
          node: renderSection(entries, defaultTitle),
        });
        remainingHeight = maxPageN - totalHeight;
      } else {
        let k = 0;
        let rem = maxPageN - titleHeight;
        while (k < entries.length && entryHeights[k] <= rem) {
          rem -= entryHeights[k];
          k++;
        }
        computedPages[pageIdx].push({
          key: `${secKey}_part1`,
          node: renderSection(entries.slice(0, k), defaultTitle),
        });
        advanceToNextPage();
        computedPages[pageIdx].push({
          key: `${secKey}_part2`,
          node: renderSection(
            entries.slice(k),
            `${defaultTitle} (Continued)`
          ),
        });
        const remHeights = entryHeights.slice(k);
        remainingHeight =
          maxPageN -
          (titleHeight + remHeights.reduce((acc, val) => acc + val, 0));
      }
    }

    // Sequence of sections to place:
    if (aboutMe && aboutMe.trim().length > 0) {
      placeAtomic("about", <AboutSection text={aboutMe} />);
    }

    placeSplittable(
      "education",
      "EDUCATION AND TRAINING",
      educationEntries,
      (sub, t) => <EducationSection entries={sub} title={t} />
    );

    placeSplittable(
      "internships",
      "WORK EXPERIENCE / INTERNSHIPS",
      internshipEntries,
      (sub, t) => <InternshipSection entries={sub} title={t} />
    );

    if (academicInterests && academicInterests.length > 0) {
      placeAtomic(
        "academicInterests",
        <AcademicInterestsSection entries={academicInterests} />
      );
    }

    placeSplittable(
      "academicProjects",
      "ACADEMIC PROJECTS",
      projectEntries,
      (sub, t) => <AcademicProjectsSection entries={sub} title={t} />
    );

    placeSplittable(
      "achievements",
      "ACHIEVEMENTS & AWARDS",
      achievementEntries,
      (sub, t) => <AchievementsSection entries={sub} title={t} />
    );

    placeSplittable(
      "leadership",
      "LEADERSHIP & EXTRACURRICULAR",
      leadershipEntries,
      (sub, t) => <LeadershipSection entries={sub} title={t} />
    );

    placeSplittable(
      "volunteering",
      "VOLUNTEERING / COMMUNITY ENGAGEMENT",
      volunteeringEntries,
      (sub, t) => <VolunteeringSection entries={sub} title={t} />
    );

    placeSplittable(
      "certifications",
      "CERTIFICATIONS",
      certificationEntries,
      (sub, t) => <CertificationsSection entries={sub} title={t} />
    );

    if (languages && languages.length > 0) {
      placeAtomic(
        "languages",
        <LanguageSkillsSection entries={languages} />
      );
    }

    if (
      englishCertificate &&
      (englishCertificate.examName || englishCertificate.score)
    ) {
      placeAtomic(
        "englishCertificate",
        <EnglishCertificateSection cert={englishCertificate} />
      );
    }

    if (skills && skills.length > 0) {
      placeAtomic("skills", <SkillsSection entries={skills} />);
    }

    if (hobbies && hobbies.length > 0) {
      placeAtomic("hobbies", <HobbiesSection entries={hobbies} />);
    }

    if (recommendations && recommendations.length > 0) {
      placeAtomic(
        "recommendations",
        <RecommendationsSection entries={recommendations} />
      );
    }

    if (declaration && declaration.trim().length > 0) {
      placeAtomic(
        "declaration",
        <DeclarationSection text={declaration} />
      );
    }

    setPageAssignments((prev) =>
      arePagesEqual(prev, computedPages) ? prev : computedPages
    );
  }, [
    aboutMe,
    academicInterests,
    languages,
    englishCertificate,
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
          data-measure-page
          style={{ height: "262mm", boxSizing: "border-box" }}
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
        {data.languages && (
          <div data-measure="languages">
            <LanguageSkillsSection entries={data.languages} />
          </div>
        )}
        {data.englishCertificate && (
          <div data-measure="englishCertificate">
            <EnglishCertificateSection cert={data.englishCertificate} />
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
        {data.recommendations && (
          <div data-measure="recommendations">
            <RecommendationsSection entries={data.recommendations} />
          </div>
        )}
        {data.declaration && (
          <div data-measure="declaration">
            <DeclarationSection text={data.declaration} />
          </div>
        )}

        {/* Splittable repeatable sections */}
        {/* Education */}
        <div data-measure-title="education">
          <EuropassSectionTitle title="EDUCATION AND TRAINING" />
        </div>
        {educationEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="education" data-index={idx}>
            <EducationSection entries={[e]} title="" />
          </div>
        ))}

        {/* Internships */}
        <div data-measure-title="internships">
          <EuropassSectionTitle title="WORK EXPERIENCE / INTERNSHIPS" />
        </div>
        {internshipEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="internships" data-index={idx}>
            <InternshipSection entries={[e]} title="" />
          </div>
        ))}

        {/* Academic Projects */}
        <div data-measure-title="academicProjects">
          <EuropassSectionTitle title="ACADEMIC PROJECTS" />
        </div>
        {projectEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="academicProjects" data-index={idx}>
            <AcademicProjectsSection entries={[e]} title="" />
          </div>
        ))}

        {/* Achievements */}
        <div data-measure-title="achievements">
          <EuropassSectionTitle title="ACHIEVEMENTS & AWARDS" />
        </div>
        {achievementEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="achievements" data-index={idx}>
            <AchievementsSection entries={[e]} title="" />
          </div>
        ))}

        {/* Leadership */}
        <div data-measure-title="leadership">
          <EuropassSectionTitle title="LEADERSHIP & EXTRACURRICULAR" />
        </div>
        {leadershipEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="leadership" data-index={idx}>
            <LeadershipSection entries={[e]} title="" />
          </div>
        ))}

        {/* Volunteering */}
        <div data-measure-title="volunteering">
          <EuropassSectionTitle title="VOLUNTEERING / COMMUNITY ENGAGEMENT" />
        </div>
        {volunteeringEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="volunteering" data-index={idx}>
            <VolunteeringSection entries={[e]} title="" />
          </div>
        ))}

        {/* Certifications */}
        <div data-measure-title="certifications">
          <EuropassSectionTitle title="CERTIFICATIONS" />
        </div>
        {certificationEntries.map((e, idx) => (
          <div key={e.id} data-measure-entry="certifications" data-index={idx}>
            <CertificationsSection entries={[e]} title="" />
          </div>
        ))}
      </div>

      {/* Rendered Physical Pages */}
      {currentPages.map((pageItems, pIdx) => {
        const pageNumber = pIdx + 1;
        return (
          <EuropassPage key={pageNumber} pageNumber={pageNumber}>
            {pageNumber === 1 && <EuropassHeader personal={data.personal} />}
            {pageItems.map((item) => (
              <Fragment key={item.key}>{item.node}</Fragment>
            ))}
          </EuropassPage>
        );
      })}
    </div>
  );
}
