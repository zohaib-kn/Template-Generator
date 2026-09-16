import { memo } from "react";
import type { AcademicProject } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface AcademicProjectsSectionProps {
  entries?: AcademicProject[];
  title?: string;
}

export const AcademicProjectsSection = memo(function AcademicProjectsSection({
  entries,
  title,
}: AcademicProjectsSectionProps) {
  if (!entries || entries.length === 0) return null;

  // Only render entries that have at least a title or description
  const visible = entries.filter((e) => e.title || e.description);
  if (visible.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title={title ?? "ACADEMIC PROJECTS"} />
      {visible.map((project) => (
        <div key={project.id} className={styles.educationEntry}>
          {project.title && (
            <h3 className={styles.qualificationTitle}>{project.title}</h3>
          )}

          {(project.role || project.dateYear) && (
            <div className={styles.institutionRow}>
              {project.role && (
                <span className={styles.institutionName}>{project.role}</span>
              )}
              {project.dateYear && (
                <span className={styles.datesBadge}>[{project.dateYear}]</span>
              )}
            </div>
          )}

          {project.description && (
            <div className={styles.educationDetails}>{project.description}</div>
          )}

          {project.skills && (
            <div className={styles.educationDetails}>
              <span className={styles.institutionName}>Skills: </span>
              {project.skills}
            </div>
          )}

          {project.link && (
            <div className={styles.educationDetails}>
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className={styles.blueLink}
              >
                {project.link}
              </a>
            </div>
          )}
        </div>
      ))}
    </section>
  );
});
