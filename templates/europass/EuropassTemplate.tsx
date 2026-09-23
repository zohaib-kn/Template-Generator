"use client";

import {
  Fragment,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
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

interface PageItemAssignment {
  key: string;
  secKey: string;
  title?: string;
  startIndex?: number;
  endIndex?: number;
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
          item.endIndex === b[i][j].endIndex
      )
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
  const fallbackPages = useMemo<PageItemAssignment[][]>(() => {
    const p1: PageItemAssignment[] = [];
    const p2: PageItemAssignment[] = [];

    if (aboutMe && aboutMe.trim().length > 0) {
      p1.push({ key: "about", secKey: "about" });
    }
    if (educationEntries.length > 0) {
      p1.push({
        key: "education_all",
        secKey: "education",
        startIndex: 0,
        endIndex: educationEntries.length,
      });
    }
    if (internshipEntries.length > 0) {
      p1.push({
        key: "internships_all",
        secKey: "internships",
        startIndex: 0,
        endIndex: internshipEntries.length,
      });
    }
    if (academicInterests && academicInterests.length > 0) {
      p1.push({ key: "academicInterests", secKey: "academicInterests" });
    }
    if (projectEntries.length > 0) {
      p2.push({
        key: "academicProjects_all",
        secKey: "academicProjects",
        startIndex: 0,
        endIndex: projectEntries.length,
      });
    }
    if (achievementEntries.length > 0) {
      p2.push({
        key: "achievements_all",
        secKey: "achievements",
        startIndex: 0,
        endIndex: achievementEntries.length,
      });
    }
    if (leadershipEntries.length > 0) {
      p2.push({
        key: "leadership_all",
        secKey: "leadership",
        startIndex: 0,
        endIndex: leadershipEntries.length,
      });
    }
    if (volunteeringEntries.length > 0) {
      p2.push({
        key: "volunteering_all",
        secKey: "volunteering",
        startIndex: 0,
        endIndex: volunteeringEntries.length,
      });
    }
    if (certificationEntries.length > 0) {
      p2.push({
        key: "certifications_all",
        secKey: "certifications",
        startIndex: 0,
        endIndex: certificationEntries.length,
      });
    }
    if (languages && languages.length > 0) {
      p2.push({ key: "languages", secKey: "languages" });
    }
    if (
      englishCertificate &&
      (englishCertificate.examName || englishCertificate.score)
    ) {
      p2.push({ key: "englishCertificate", secKey: "englishCertificate" });
    }
    if (skills && skills.length > 0) {
      p2.push({ key: "skills", secKey: "skills" });
    }
    if (hobbies && hobbies.length > 0) {
      p2.push({ key: "hobbies", secKey: "hobbies" });
    }
    if (recommendations && recommendations.length > 0) {
      p2.push({ key: "recommendations", secKey: "recommendations" });
    }
    if (declaration && declaration.trim().length > 0) {
      p2.push({ key: "declaration", secKey: "declaration" });
    }

    const pages: PageItemAssignment[][] = [p1];
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

  const renderPageItem = useCallback(
    (item: PageItemAssignment) => {
      switch (item.secKey) {
        case "about":
          return aboutMe.trim().length > 0 ? (
            <AboutSection text={aboutMe} />
          ) : null;
        case "education": {
          const slice = educationEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? educationEntries.length
          );
          return slice.length > 0 ? (
            <EducationSection entries={slice} title={item.title} />
          ) : null;
        }
        case "internships": {
          const slice = internshipEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? internshipEntries.length
          );
          return slice.length > 0 ? (
            <InternshipSection entries={slice} title={item.title} />
          ) : null;
        }
        case "academicInterests":
          return academicInterests.length > 0 ? (
            <AcademicInterestsSection entries={academicInterests} />
          ) : null;
        case "academicProjects": {
          const slice = projectEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? projectEntries.length
          );
          return slice.length > 0 ? (
            <AcademicProjectsSection entries={slice} title={item.title} />
          ) : null;
        }
        case "achievements": {
          const slice = achievementEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? achievementEntries.length
          );
          return slice.length > 0 ? (
            <AchievementsSection entries={slice} title={item.title} />
          ) : null;
        }
        case "leadership": {
          const slice = leadershipEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? leadershipEntries.length
          );
          return slice.length > 0 ? (
            <LeadershipSection entries={slice} title={item.title} />
          ) : null;
        }
        case "volunteering": {
          const slice = volunteeringEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? volunteeringEntries.length
          );
          return slice.length > 0 ? (
            <VolunteeringSection entries={slice} title={item.title} />
          ) : null;
        }
        case "certifications": {
          const slice = certificationEntries.slice(
            item.startIndex ?? 0,
            item.endIndex ?? certificationEntries.length
          );
          return slice.length > 0 ? (
            <CertificationsSection entries={slice} title={item.title} />
          ) : null;
        }
        case "languages":
          return languages.length > 0 ? (
            <LanguageSkillsSection entries={languages} />
          ) : null;
        case "englishCertificate":
          return englishCertificate &&
            (englishCertificate.examName || englishCertificate.score) ? (
            <EnglishCertificateSection cert={englishCertificate} />
          ) : null;
        case "skills":
          return skills.length > 0 ? <SkillsSection entries={skills} /> : null;
        case "hobbies":
          return hobbies.length > 0 ? <HobbiesSection entries={hobbies} /> : null;
        case "recommendations":
          return recommendations.length > 0 ? (
            <RecommendationsSection entries={recommendations} />
          ) : null;
        case "declaration":
          return declaration.trim().length > 0 ? (
            <DeclarationSection text={declaration} />
          ) : null;
        default:
          return null;
      }
    },
    [
      aboutMe,
      declaration,
      englishCertificate,
      educationEntries,
      internshipEntries,
      academicInterests,
      projectEntries,
      achievementEntries,
      leadershipEntries,
      volunteeringEntries,
      certificationEntries,
      languages,
      skills,
      hobbies,
      recommendations,
    ]
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

    const computedPages: PageItemAssignment[][] = [[]];
    let pageIdx = 0;
    let remainingHeight = maxPage1;

    // Helper: start next page
    const advanceToNextPage = () => {
      pageIdx++;
      computedPages[pageIdx] = [];
      remainingHeight = maxPageN;
    };

    // Helper: place an atomic section
    const placeAtomic = (key: string) => {
      const el = container.querySelector(
        `[data-measure="${key}"]`
      ) as HTMLElement | null;
      const h = el ? getElementHeightWithMargins(el) : 80;

      if (h <= remainingHeight || computedPages[pageIdx].length === 0) {
        computedPages[pageIdx].push({ key, secKey: key });
        remainingHeight -= h;
      } else {
        advanceToNextPage();
        computedPages[pageIdx].push({ key, secKey: key });
        remainingHeight = maxPageN - h;
      }
    };

    // Helper: place a repeatable/splittable section
    function placeSplittable<T>(
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
        return el ? getElementHeightWithMargins(el) : 100;
      });

      const totalHeight =
        titleHeight + entryHeights.reduce((acc, val) => acc + val, 0);

      // 1. Entire section fits on current page
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
            secKey,
            title: defaultTitle,
            startIndex: 0,
            endIndex: k,
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
              secKey,
              title: `${defaultTitle} (Continued)`,
              startIndex: k,
              endIndex: entries.length,
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
              secKey,
              title: `${defaultTitle} (Continued)`,
              startIndex: k,
              endIndex: k + k2,
            });
            advanceToNextPage();
            computedPages[pageIdx].push({
              key: `${secKey}_part3`,
              secKey,
              title: `${defaultTitle} (Continued)`,
              startIndex: k + k2,
              endIndex: entries.length,
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
        computedPages[pageIdx].push({
          key: `${secKey}_part1`,
          secKey,
          title: defaultTitle,
          startIndex: 0,
          endIndex: k,
        });
        advanceToNextPage();
        computedPages[pageIdx].push({
          key: `${secKey}_part2`,
          secKey,
          title: `${defaultTitle} (Continued)`,
          startIndex: k,
          endIndex: entries.length,
        });
        const remHeights = entryHeights.slice(k);
        remainingHeight =
          maxPageN -
          (titleHeight + remHeights.reduce((acc, val) => acc + val, 0));
      }
    }

    // Sequence of sections to place:
    if (aboutMe && aboutMe.trim().length > 0) {
      placeAtomic("about");
    }

    placeSplittable(
      "education",
      "EDUCATION AND TRAINING",
      educationEntries
    );

    placeSplittable(
      "internships",
      "WORK EXPERIENCE / INTERNSHIPS",
      internshipEntries
    );

    if (academicInterests && academicInterests.length > 0) {
      placeAtomic("academicInterests");
    }

    placeSplittable(
      "academicProjects",
      "ACADEMIC PROJECTS",
      projectEntries
    );

    placeSplittable(
      "achievements",
      "ACHIEVEMENTS & AWARDS",
      achievementEntries
    );

    placeSplittable(
      "leadership",
      "LEADERSHIP & EXTRACURRICULAR",
      leadershipEntries
    );

    placeSplittable(
      "volunteering",
      "VOLUNTEERING / COMMUNITY ENGAGEMENT",
      volunteeringEntries
    );

    placeSplittable(
      "certifications",
      "CERTIFICATIONS",
      certificationEntries
    );

    if (languages && languages.length > 0) {
      placeAtomic("languages");
    }

    if (
      englishCertificate &&
      (englishCertificate.examName || englishCertificate.score)
    ) {
      placeAtomic("englishCertificate");
    }

    if (skills && skills.length > 0) {
      placeAtomic("skills");
    }

    if (hobbies && hobbies.length > 0) {
      placeAtomic("hobbies");
    }

    if (recommendations && recommendations.length > 0) {
      placeAtomic("recommendations");
    }

    if (declaration && declaration.trim().length > 0) {
      placeAtomic("declaration");
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
              <Fragment key={item.key}>{renderPageItem(item)}</Fragment>
            ))}
          </EuropassPage>
        );
      })}
    </div>
  );
}
