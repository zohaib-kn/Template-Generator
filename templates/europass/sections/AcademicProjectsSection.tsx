import { memo } from "react";
import type { AcademicProject } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface AcademicProjectsSectionProps {
  entries?: AcademicProject[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<AcademicProject>) => void;
}

export const AcademicProjectsSection = memo(function AcademicProjectsSection({
  entries,
  title,
  isInteractive = false,
  onUpdate,
}: AcademicProjectsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => isInteractive || e.title || e.description);
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "ACADEMIC PROJECTS"} />
      )}
      {visible.map((project) => (
        <div key={project.id} className={styles.educationEntry}>
          {isInteractive && onUpdate ? (
            <EditableText
              value={project.title ?? ""}
              onChange={(v) => onUpdate(project.id, { title: v })}
              isInteractive={isInteractive}
              className={styles.qualificationTitle}
              placeholder="Project Title"
              as="h3"
            />
          ) : (
            project.title && (
              <h3 className={styles.qualificationTitle}>{project.title}</h3>
            )
          )}

          {(isInteractive || project.role || project.dateYear) && (
            <div className={styles.institutionRow}>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={project.role ?? ""}
                  onChange={(v) => onUpdate(project.id, { role: v })}
                  isInteractive={isInteractive}
                  className={styles.institutionName}
                  placeholder="Role in project"
                />
              ) : (
                project.role && (
                  <span className={styles.institutionName}>{project.role}</span>
                )
              )}
              {project.dateYear && (
                <span className={styles.datesBadge}>[ {project.dateYear} ]</span>
              )}
            </div>
          )}

          {isInteractive && onUpdate ? (
            <EditableText
              value={project.description ?? ""}
              onChange={(v) => onUpdate(project.id, { description: v })}
              isInteractive={isInteractive}
              multiline
              className={styles.educationDetails}
              placeholder="Project description, objectives, and key results..."
            />
          ) : (
            project.description && (
              <div className={styles.educationDetails}>{project.description}</div>
            )
          )}

          {(isInteractive || project.skills) && (
            <div className={styles.entrySubRow}>
              <span className={styles.institutionName}>Skills: </span>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={project.skills ?? ""}
                  onChange={(v) => onUpdate(project.id, { skills: v })}
                  isInteractive={isInteractive}
                  placeholder="Technologies used (e.g. Python, SQL)"
                />
              ) : (
                project.skills
              )}
            </div>
          )}

          {(isInteractive || project.link) && (
            <div className={styles.entryLinkRow}>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={project.link ?? ""}
                  onChange={(v) => onUpdate(project.id, { link: v })}
                  isInteractive={isInteractive}
                  className={styles.blueLink}
                  placeholder="https://github.com/..."
                />
              ) : (
                project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.blueLink}
                  >
                    {project.link}
                  </a>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  );
});
