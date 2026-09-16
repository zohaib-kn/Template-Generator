import { memo } from "react";
import type { SkillEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface SkillsSectionProps {
  entries?: SkillEntry[];
}

export const SkillsSection = memo(function SkillsSection({
  entries,
}: SkillsSectionProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="ACADEMIC & TRANSFERABLE SKILLS" />
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
