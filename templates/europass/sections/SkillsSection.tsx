import { memo } from "react";
import type { SkillEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface SkillsSectionProps {
  entries?: SkillEntry[];
  title?: string;
}

export const SkillsSection = memo(function SkillsSection({
  entries,
  title,
}: SkillsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "SKILLS"} />
      )}
      <ul className={styles.simpleList}>
        {entries.map((skill) => (
          <li key={skill.id}>
            {skill.name}
            {skill.proficiency && (
              <span className={styles.datesBadge}> — {skill.proficiency}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
});
