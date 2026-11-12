import { memo, useState } from "react";
import type { SkillEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { SkillInlineForm } from "../components/EuropassSectionEditors";

interface SkillsSectionProps {
  entries?: SkillEntry[];
  title?: string;
  isInteractive?: boolean;
  onAdd?: (entry: Omit<SkillEntry, "id">) => void;
  onUpdate?: (id: string, patch: Partial<SkillEntry>) => void;
  onRemove?: (id: string) => void;
  onDeleteSection?: () => void;
}

interface FlattenedSkillItem {
  id: string;
  name: string;
  originalId: string;
}

export const SkillsSection = memo(function SkillsSection({
  entries = [],
  title,
  isInteractive = false,
  onAdd,
  onUpdate,
  onRemove,
  onDeleteSection,
}: SkillsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);

  if (!entries || entries.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  // Flatten any entries that contain newlines, slashes, or multiple items
  const visibleSkills: FlattenedSkillItem[] = [];
  entries.forEach((skill, entryIdx) => {
    if (!skill.name || !skill.name.trim()) return;

    const parts = skill.name
      .split(/[\n\r/•]+/g)
      .map((item) => item.replace(/^[•*\-\s/]+/, "").trim())
      .filter((item) => item.length > 0);

    if (parts.length > 1) {
      parts.forEach((p, partIdx) => {
        visibleSkills.push({
          id: `${skill.id || entryIdx}-${partIdx}`,
          name: p,
          originalId: skill.id || `skill-${entryIdx}`,
        });
      });
    } else {
      const clean = (parts[0] || skill.name.trim()).replace(/^[•*\-\s/]+/, "").trim();
      if (clean) {
        visibleSkills.push({
          id: skill.id || `skill-${entryIdx}`,
          name: clean,
          originalId: skill.id || `skill-${entryIdx}`,
        });
      }
    }
  });

  const displayList =
    visibleSkills.length > 0
      ? visibleSkills
      : entries.map((s, i) => ({
          id: s.id || `skill-${i}`,
          name: (s.name ?? "").replace(/^[•*\-\s/]+/, "").trim(),
          originalId: s.id || `skill-${i}`,
        }));

  if (displayList.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle
          title={title || "KEY SKILLS"}
          isInteractive={isInteractive}
          onAddEntry={onAdd ? () => setIsAdding(true) : undefined}
          addLabel="Add Key Skill entry"
          onDeleteSection={onDeleteSection}
        />
      )}

      {/* Inline entry editor for adding new skill */}
      {isInteractive && isAdding && onAdd && (
        <SkillInlineForm
          onSave={(data) => {
            onAdd(data);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <div className={styles.skillsBulletList}>
        {displayList.map((skill) => (
          <div key={skill.id} className={styles.skillsBulletItem}>
            <span className={styles.skillsBulletDot} aria-hidden="true">
              •
            </span>
            <span className={styles.bulletText}>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={skill.name}
                  onChange={(v) => onUpdate(skill.originalId, { name: v })}
                  isInteractive={isInteractive}
                  placeholder="Skill"
                />
              ) : (
                skill.name
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});
