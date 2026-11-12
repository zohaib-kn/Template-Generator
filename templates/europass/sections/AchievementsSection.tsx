import { memo, useState } from "react";
import type { Achievement } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { AchievementInlineForm } from "../components/EuropassSectionEditors";

interface AchievementsSectionProps {
  entries?: Achievement[];
  title?: string;
  isInteractive?: boolean;
  onAdd?: (entry: Omit<Achievement, "id">) => void;
  onUpdate?: (id: string, patch: Partial<Achievement>) => void;
  onRemove?: (id: string) => void;
  onDeleteSection?: () => void;
}

export const AchievementsSection = memo(function AchievementsSection({
  entries = [],
  title,
  isInteractive = false,
  onAdd,
  onUpdate,
  onRemove,
  onDeleteSection,
}: AchievementsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => e.title || e.description);
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle
          title={title || "ACHIEVEMENTS & AWARDS"}
          isInteractive={isInteractive}
          onAddEntry={onAdd ? () => setIsAdding(true) : undefined}
          addLabel="Add Achievement entry"
          onDeleteSection={onDeleteSection}
        />
      )}

      {/* Inline entry editor for adding new achievement */}
      {isInteractive && isAdding && onAdd && (
        <AchievementInlineForm
          onSave={(data) => {
            onAdd(data);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <div className={styles.achievementList}>
        {visible.map((achievement) => {
          const hasYearInTitle = Boolean(
            achievement.dateYear &&
              achievement.title?.toLowerCase().includes(achievement.dateYear.toLowerCase())
          );
          const yearPrefix =
            achievement.dateYear && !hasYearInTitle
              ? `${achievement.dateYear} — `
              : "";
          const orgText = achievement.organisation
            ? `, ${achievement.organisation}`
            : "";
          const descText = achievement.description
            ? `: ${achievement.description}`
            : "";

          return (
            <div
              key={achievement.id}
              className={styles.achievementBulletItem}
            >
              <span className={styles.achievementBulletDot} aria-hidden="true">
                ●
              </span>
              <span className={styles.achievementBulletText}>
                {yearPrefix ? (
                  isInteractive && onUpdate ? (
                    <span className={styles.achievementYear}>
                      <EditableText
                        value={achievement.dateYear ?? ""}
                        onChange={(v) => onUpdate(achievement.id, { dateYear: v })}
                        isInteractive={isInteractive}
                        placeholder="Year"
                      />{" "}
                      —{" "}
                    </span>
                  ) : (
                    <span className={styles.achievementYear}>{yearPrefix}</span>
                  )
                ) : null}
                {isInteractive && onUpdate ? (
                  <>
                    <EditableText
                      value={achievement.title ?? ""}
                      onChange={(v) => onUpdate(achievement.id, { title: v })}
                      isInteractive={isInteractive}
                      className={styles.achievementTitle}
                      placeholder="Achievement / Award Title"
                    />
                    {achievement.organisation && (
                      <>
                        <span className={styles.achievementOrg}>, </span>
                        <EditableText
                          value={achievement.organisation ?? ""}
                          onChange={(v) => onUpdate(achievement.id, { organisation: v })}
                          isInteractive={isInteractive}
                          className={styles.achievementOrg}
                          placeholder="Organisation"
                        />
                      </>
                    )}
                    {achievement.description && (
                      <>
                        <span className={styles.achievementDesc}>: </span>
                        <EditableText
                          value={achievement.description ?? ""}
                          onChange={(v) => onUpdate(achievement.id, { description: v })}
                          isInteractive={isInteractive}
                          multiline
                          className={styles.achievementDesc}
                          placeholder="Description / Context"
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className={styles.achievementTitle}>{achievement.title}</span>
                    {orgText && <span className={styles.achievementOrg}>{orgText}</span>}
                    {descText && <span className={styles.achievementDesc}>{descText}</span>}
                  </>
                )}
              </span>

              
            </div>
          );
        })}
      </div>
    </section>
  );
});
