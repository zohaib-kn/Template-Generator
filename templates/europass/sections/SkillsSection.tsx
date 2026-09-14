import type { SkillEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface SkillsSectionProps {
  entries?: SkillEntry[];
}

export function SkillsSection({ entries }: SkillsSectionProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="SKILLS" />
      <div className={styles.subheadingGray}>Skills</div>
      <ul className={styles.simpleList}>
        {entries.map((skill) => (
          <li key={skill.id}>{skill.name}</li>
        ))}
      </ul>
    </section>
  );
}
