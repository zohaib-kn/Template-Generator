import { memo } from "react";
import type { SkillEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface SkillsSectionProps {
  entries?: SkillEntry[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<SkillEntry>) => void;
}

export const SkillsSection = memo(function SkillsSection({
  entries,
  title,
  isInteractive = false,
  onUpdate,
}: SkillsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "SKILLS"} />
      )}
      <div className={styles.slashSkillsContainer}>
        {entries.map((skill, idx) => (
          <span key={skill.id} className={styles.slashSkillItem}>
            {idx > 0 && <span className={styles.slashDivider}>&nbsp;/&nbsp;</span>}
            {isInteractive && onUpdate ? (
              <EditableText
                value={skill.name ?? ""}
                onChange={(v) => onUpdate(skill.id, { name: v })}
                isInteractive={isInteractive}
                placeholder="Skill"
              />
            ) : (
              <span>{skill.name}</span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
});
